//! Load test for spellwright-daemon: N concurrent clients, each sending M
//! requests (ping / readReliquary / agentStatus) with up to --depth K in flight
//! (default 1: one at a time), and checking that every reply carries an id the
//! client is still waiting for. Replies may come back out of order within a
//! client. Runs a no-batching baseline (--max-batch 1) and then each --windows
//! value: note that window 0 still batches whatever queued up while the previous
//! tick ran.
//!
//!     cargo build --release --bins --examples
//!     cargo run --release --example daemon_load -- [--clients 1,16,64] [--requests 200] [--depth 1] [--windows 0,1000]
//!
//! The example spawns target/<profile>/spellwright-daemon itself (one per window,
//! on --port and up). Pass --attach PORT to load an already-running daemon instead.

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Barrier};
use std::time::{Duration, Instant};

struct Args {
    clients: Vec<usize>,
    requests: usize,
    depth: usize,
    windows: Vec<u64>,
    port: u16,
    attach: Option<u16>,
}

fn list<T: std::str::FromStr>(s: &str) -> Vec<T> {
    s.split(',').filter_map(|x| x.trim().parse().ok()).collect()
}

fn parse_args() -> Args {
    let mut a =
        Args { clients: vec![1, 16, 64], requests: 200, depth: 1, windows: vec![0, 1000], port: 7400, attach: None };
    let mut it = std::env::args().skip(1);
    while let Some(k) = it.next() {
        let v = it.next().unwrap_or_default();
        match k.as_str() {
            "--clients" => a.clients = list(&v),
            "--requests" => a.requests = v.parse().expect("--requests"),
            "--depth" => a.depth = v.parse::<usize>().expect("--depth").max(1),
            "--windows" => a.windows = list(&v),
            "--port" => a.port = v.parse().expect("--port"),
            "--attach" => a.attach = Some(v.parse().expect("--attach")),
            _ => panic!("unknown argument {k}"),
        }
    }
    a
}

struct Daemon(Child);

impl Drop for Daemon {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn spawn_daemon(port: u16, window_us: u64, max_batch: usize) -> Daemon {
    let exe = std::env::current_exe().expect("current_exe");
    // target/<profile>/examples/daemon_load(.exe) -> target/<profile>/spellwright-daemon(.exe)
    let bin = exe
        .parent()
        .and_then(|p| p.parent())
        .expect("target dir")
        .join(format!("spellwright-daemon{}", std::env::consts::EXE_SUFFIX));
    assert!(bin.exists(), "{} not found: run `cargo build --release --bins --examples` first", bin.display());
    let child = Command::new(&bin)
        .args(["--port", &port.to_string(), "--window-us", &window_us.to_string(), "--max-batch", &max_batch.to_string()])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn daemon");
    let daemon = Daemon(child);
    // Wait for Vulkan setup and the listener.
    let t0 = Instant::now();
    while TcpStream::connect(("127.0.0.1", port)).is_err() {
        assert!(t0.elapsed() < Duration::from_secs(30), "daemon did not start listening on {port}");
        std::thread::sleep(Duration::from_millis(50));
    }
    daemon
}

/// The `"id":` value of a reply, as raw JSON text.
fn reply_id(line: &str) -> Option<&str> {
    let start = line.find("\"id\":")? + 5;
    let rest = &line[start..];
    if rest.starts_with('"') {
        let b = rest.as_bytes();
        let mut i = 1;
        while i < b.len() {
            match b[i] {
                b'\\' => i += 2,
                b'"' => return Some(&rest[..=i]),
                _ => i += 1,
            }
        }
        None
    } else {
        rest.find([',', '}']).map(|e| &rest[..e])
    }
}

fn request(client: usize, i: usize) -> (String, String) {
    match i % 3 {
        // Numeric ids are shared by every client on purpose: only offset routing can tell them apart.
        0 => (i.to_string(), format!(r#"{{"jsonrpc":"2.0","id":{i},"method":"ping"}}"#)),
        1 => {
            let id = format!("\"c{client}-r{i}\"");
            let line = format!(
                r#"{{"jsonrpc":"2.0","id":{id},"method":"tools/call","params":{{"name":"mcp.vulkan.readReliquary","arguments":{{"offset":{},"count":8}}}}}}"#,
                (client * 31 + i) % 4000
            );
            (id, line)
        }
        _ => {
            let id = format!("\"c{client}-a{i}\"");
            (id.clone(), format!(r#"{{"jsonrpc":"2.0","id":{id},"method":"tools/call","params":{{"name":"mcp.vulkan.agentStatus"}}}}"#))
        }
    }
}

#[derive(Default)]
struct ClientReport {
    latencies_us: Vec<f64>,
    misrouted: usize,
    missing: usize,
    duplicates: usize,
    errors: usize,
}

/// One client: keep up to `depth` requests in flight until `m` have been sent.
/// Single-threaded on purpose (write whatever may be sent, then read one reply),
/// the shape a client on a synchronous Windows pipe handle has to use.
fn run_client(port: u16, client: usize, m: usize, depth: usize, start: Arc<Barrier>) -> ClientReport {
    let mut rep = ClientReport::default();
    let sock = TcpStream::connect(("127.0.0.1", port)).expect("connect");
    sock.set_nodelay(true).ok();
    sock.set_read_timeout(Some(Duration::from_secs(10))).ok();
    let mut w = sock.try_clone().unwrap();
    let mut r = BufReader::new(sock);
    let mut line = String::new();
    let mut batch = String::new();
    let mut outstanding: HashMap<String, Instant> = HashMap::new();
    let mut answered: HashSet<String> = HashSet::new();
    let mut next = 0;
    start.wait();
    loop {
        if next < m && outstanding.len() < depth {
            batch.clear();
            let t = Instant::now();
            while next < m && outstanding.len() < depth {
                let (id, req) = request(client, next);
                batch.push_str(&req);
                batch.push('\n');
                outstanding.insert(id, t);
                next += 1;
            }
            if w.write_all(batch.as_bytes()).is_err() {
                break;
            }
        }
        if outstanding.is_empty() {
            break;
        }
        line.clear();
        match r.read_line(&mut line) {
            Ok(n) if n > 0 => {}
            _ => break,
        }
        let id = reply_id(&line).unwrap_or("");
        if let Some(t) = outstanding.remove(id) {
            rep.latencies_us.push(t.elapsed().as_secs_f64() * 1e6);
            answered.insert(id.to_string());
            if !line.contains("\"result\"") {
                rep.errors += 1;
            }
        } else if answered.contains(id) {
            rep.duplicates += 1;
        } else {
            if rep.misrouted == 0 {
                eprintln!("client {client} got a reply it is not waiting for: {}", line.trim_end());
            }
            rep.misrouted += 1;
        }
    }
    rep.missing = outstanding.len() + (m - next);
    rep
}

fn pct(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return f64::NAN;
    }
    sorted[((sorted.len() - 1) as f64 * p).round() as usize]
}

fn main() {
    let args = parse_args();
    println!("{} requests per client, up to {} in flight per client\n", args.requests, args.depth);
    println!("| daemon | clients | depth | replies | p50 us | p95 us | msg/s | misrouted | missing | duplicate | error replies |");
    println!("|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    // (label, Some((window_us, max_batch))) per daemon configuration; None = attached.
    let configs: Vec<(String, Option<(u64, usize)>)> = match args.attach {
        Some(p) => vec![(format!("attached :{p}"), None)],
        None => std::iter::once(("no batching (max-batch 1)".to_string(), Some((0, 1))))
            .chain(args.windows.iter().map(|&w| (format!("window {w}us"), Some((w, 256)))))
            .collect(),
    };
    let mut bad = false;
    for (k, (label, cfg)) in configs.iter().enumerate() {
        let port = args.attach.unwrap_or(args.port + k as u16);
        let _daemon = cfg.map(|(w, b)| spawn_daemon(port, w, b));
        for &n in &args.clients {
            let barrier = Arc::new(Barrier::new(n + 1));
            let handles: Vec<_> = (0..n)
                .map(|c| {
                    let b = barrier.clone();
                    let (m, d) = (args.requests, args.depth);
                    std::thread::spawn(move || run_client(port, c, m, d, b))
                })
                .collect();
            barrier.wait();
            let t0 = Instant::now();
            let reports: Vec<ClientReport> = handles.into_iter().map(|h| h.join().unwrap()).collect();
            let wall = t0.elapsed().as_secs_f64();
            let mut lat: Vec<f64> = reports.iter().flat_map(|r| r.latencies_us.iter().copied()).collect();
            lat.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let (mis, miss, dup, err) = reports.iter().fold((0, 0, 0, 0), |a, r| {
                (a.0 + r.misrouted, a.1 + r.missing, a.2 + r.duplicates, a.3 + r.errors)
            });
            bad |= mis + miss + dup + err > 0;
            println!(
                "| {label} | {n} | {} | {} | {:.0} | {:.0} | {:.0} | {mis} | {miss} | {dup} | {err} |",
                args.depth,
                lat.len(),
                pct(&lat, 0.50),
                pct(&lat, 0.95),
                lat.len() as f64 / wall,
            );
        }
    }
    if bad {
        eprintln!("\nFAIL: misrouted, missing, duplicate or error replies");
        std::process::exit(1);
    }
}
