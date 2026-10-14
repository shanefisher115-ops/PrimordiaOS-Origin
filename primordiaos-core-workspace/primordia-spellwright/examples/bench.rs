//! Throughput benchmark: one GPU pass (frame → parse → respond) over batches of
//! 1, 100 and 4000 messages, against a single-threaded CPU port of the same
//! framing / parsing / routing / reply work.
//!
//!     cargo run --release --example bench

use primordia_spellwright::grimoire::fnv1a;
use primordia_spellwright::ritual::Ritual;
use std::time::Instant;

const BATCHES: [usize; 3] = [1, 100, 4000];

/// A realistic mix of small requests that stay on the GPU.
fn batch(n: usize) -> Vec<u8> {
    let mut out = Vec::new();
    for i in 0..n {
        let line = match i % 3 {
            0 => format!(r#"{{"jsonrpc":"2.0","id":{i},"method":"ping"}}"#),
            1 => format!(
                r#"{{"jsonrpc":"2.0","id":{i},"method":"tools/call","params":{{"name":"mcp.vulkan.readReliquary","arguments":{{"offset":{},"count":16}}}}}}"#,
                i % 4000
            ),
            _ => format!(r#"{{"jsonrpc":"2.0","id":"req-{i}","method":"tools/call","params":{{"name":"mcp.vulkan.agentStatus"}}}}"#),
        };
        out.extend_from_slice(line.as_bytes());
        out.push(b'\n');
    }
    out
}

// ---- CPU reference: same algorithm as shaders/json.glsl + respond.comp ----

fn skip_ws(b: &[u8], mut p: usize) -> usize {
    while p < b.len() && matches!(b[p], b' ' | b'\t' | b'\n' | b'\r') {
        p += 1;
    }
    p
}

fn skip_string(b: &[u8], mut p: usize) -> usize {
    p += 1;
    while p < b.len() {
        match b[p] {
            b'\\' => p += 2,
            b'"' => return p + 1,
            _ => p += 1,
        }
    }
    b.len() + 1
}

fn skip_value(b: &[u8], p: usize) -> usize {
    let mut p = skip_ws(b, p);
    if p >= b.len() {
        return b.len();
    }
    match b[p] {
        b'"' => skip_string(b, p),
        b'{' | b'[' => {
            let mut depth = 0u32;
            while p < b.len() {
                match b[p] {
                    b'"' => {
                        p = skip_string(b, p);
                        continue;
                    }
                    b'{' | b'[' => depth += 1,
                    b'}' | b']' => {
                        depth -= 1;
                        if depth == 0 {
                            return p + 1;
                        }
                    }
                    _ => {}
                }
                p += 1;
            }
            b.len() + 1
        }
        _ => {
            while p < b.len() && !matches!(b[p], b',' | b'}' | b']' | b' ' | b'\t' | b'\n' | b'\r') {
                p += 1;
            }
            p
        }
    }
}

fn member<'a>(b: &'a [u8], key: &[u8]) -> Option<&'a [u8]> {
    let mut p = skip_ws(b, 0);
    if b.get(p) != Some(&b'{') {
        return None;
    }
    p += 1;
    loop {
        p = skip_ws(b, p);
        match *b.get(p)? {
            b'}' => return None,
            b',' => {
                p += 1;
                continue;
            }
            b'"' => {}
            _ => return None,
        }
        let kend = skip_string(b, p);
        let k = b.get(p + 1..kend - 1)?;
        p = skip_ws(b, kend);
        if b.get(p) != Some(&b':') {
            return None;
        }
        p = skip_ws(b, p + 1);
        let v1 = skip_value(b, p);
        if k == key {
            return b.get(p..v1);
        }
        p = v1;
    }
}

fn parse_uint(b: &[u8]) -> Option<u32> {
    if b.is_empty() || b.len() > 9 || !b.iter().all(u8::is_ascii_digit) {
        return None;
    }
    Some(b.iter().fold(0, |v, d| v * 10 + (d - b'0') as u32))
}

struct CpuServer {
    scratch: Vec<u32>,
    tick: u32,
    msgs: u32,
    bytes: u32,
    ping: u32,
    call: u32,
    read: u32,
    status: u32,
}

impl CpuServer {
    fn new() -> Self {
        Self {
            scratch: vec![0; 4096],
            tick: 0,
            msgs: 0,
            bytes: 0,
            ping: fnv1a(b"ping"),
            call: fnv1a(b"tools/call"),
            read: fnv1a(b"mcp.vulkan.readReliquary"),
            status: fnv1a(b"mcp.vulkan.agentStatus"),
        }
    }

    fn tick(&mut self, input: &[u8], out: &mut Vec<u8>) {
        use std::io::Write;
        self.tick += 1;
        out.clear();
        for line in input.split(|&c| c == b'\n') {
            if line.is_empty() {
                continue;
            }
            self.msgs += 1;
            self.bytes += line.len() as u32;
            let (Some(id), Some(method)) = (member(line, b"id"), member(line, b"method")) else { continue };
            out.extend_from_slice(br#"{"jsonrpc":"2.0","id":"#);
            out.extend_from_slice(id);
            let h = fnv1a(&method[1..method.len() - 1]);
            if h == self.ping {
                out.extend_from_slice(br#","result":{}}"#);
            } else if h == self.call {
                let params = member(line, b"params").unwrap_or(b"{}");
                let name = member(params, b"name").unwrap_or(b"\"\"");
                let args = member(params, b"arguments").unwrap_or(b"{}");
                let t = fnv1a(&name[1..name.len() - 1]);
                out.extend_from_slice(br#","result":{"content":[{"type":"text","text":""#);
                if t == self.read {
                    let off = member(args, b"offset").and_then(parse_uint).unwrap_or(0) as usize;
                    let cnt = member(args, b"count").and_then(parse_uint).unwrap_or(16) as usize;
                    out.push(b'[');
                    for (k, v) in self.scratch[off..off + cnt].iter().enumerate() {
                        if k > 0 {
                            out.push(b',');
                        }
                        write!(out, "{v}").unwrap();
                    }
                    out.push(b']');
                } else if t == self.status {
                    write!(out, "tick={} messages={} bytes={} hostSpells=0", self.tick, self.msgs, self.bytes).unwrap();
                }
                out.extend_from_slice(br#""}],"isError":false}"#);
            }
            out.extend_from_slice(b"}\n");
        }
    }
}

// ---- Harness ----

fn stats(mut v: Vec<f64>) -> (f64, f64) {
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    (v[v.len() / 2], v[(v.len() * 95 / 100).min(v.len() - 1)])
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut gpu = Ritual::new()?;
    let mut cpu = CpuServer::new();
    let mut cpu_out = Vec::new();
    println!("device: {}\n", gpu.device_name);
    println!(
        "{:>6} {:>9} | {:>10} {:>10} {:>10} {:>12} | {:>10} {:>12} | {:>8}",
        "batch", "input", "gpu p50", "gpu p95", "gpu-only", "gpu msg/s", "cpu p50", "cpu msg/s", "gpu/cpu"
    );

    for n in BATCHES {
        let input = batch(n);
        let iters = match n {
            1 => 500,
            100 => 300,
            _ => 100,
        };

        // Warm up and check every message got exactly one reply.
        for _ in 0..20 {
            let r = gpu.tick(&input)?;
            let replies = r.out.iter().filter(|&&b| b == b'\n').count();
            assert!(!r.overflow && replies == n && r.consumed == input.len(), "GPU pass dropped replies ({replies}/{n})");
            cpu.tick(&input, &mut cpu_out);
            assert_eq!(cpu_out.iter().filter(|&&b| b == b'\n').count(), n);
        }

        let (mut wall, mut kernel) = (Vec::new(), Vec::new());
        for _ in 0..iters {
            let t = Instant::now();
            let r = gpu.tick(&input)?;
            wall.push(t.elapsed().as_secs_f64() * 1e6);
            std::hint::black_box(&r.out);
            if let Some(ns) = gpu.last_gpu_ns {
                kernel.push(ns / 1e3);
            }
        }
        let mut cpu_t = Vec::new();
        for _ in 0..iters {
            let t = Instant::now();
            cpu.tick(&input, &mut cpu_out);
            std::hint::black_box(&cpu_out);
            cpu_t.push(t.elapsed().as_secs_f64() * 1e6);
        }

        let (g50, g95) = stats(wall);
        let k50 = if kernel.is_empty() { f64::NAN } else { stats(kernel).0 };
        let (c50, _) = stats(cpu_t);
        println!(
            "{:>6} {:>8.1}K | {:>8.1}us {:>8.1}us {:>8.1}us {:>12.0} | {:>8.1}us {:>12.0} | {:>7.2}x",
            n,
            input.len() as f64 / 1024.0,
            g50,
            g95,
            k50,
            n as f64 / (g50 / 1e6),
            c50,
            n as f64 / (c50 / 1e6),
            c50 / g50
        );
    }
    println!("\ngpu p50/p95: wall time per pass (copy in, submit, fence wait, copy out)");
    println!("gpu-only:    timestamp delta across the three dispatches (p50)");
    println!("gpu/cpu:     >1 means the GPU pass is faster than the single-threaded CPU port");
    Ok(())
}
