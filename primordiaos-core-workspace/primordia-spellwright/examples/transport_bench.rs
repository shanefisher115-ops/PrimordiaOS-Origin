//! Transport comparison: the same request mix (ping / readReliquary / agentStatus)
//! over the stdio server, the TCP daemon and the named-pipe engine, for a matrix of
//! concurrent clients x requests in flight per client.
//!
//!     cargo build --release --bins --examples
//!     cargo run --release --example transport_bench -- [--transports stdio,tcp,pipe] [--clients 1,16,64] [--depths 1,8,64] [--requests 600]
//!
//! Every server is spawned from target/<profile>/ and killed when its rows are done
//! (also on panic, and by a per-row watchdog if a row stalls). stdio is one client per
//! process, so it only runs the 1-client rows. If primordia-engine is not built yet,
//! the pipe rows are skipped with a note.
//!
//! Each client is single-threaded: it writes whatever it may send (up to `depth`
//! outstanding), then reads one reply. A synchronous Windows pipe handle serializes
//! I/O, so a reader thread blocked in ReadFile would stall a writer on the same
//! handle; TCP and stdio clients use the same loop so the comparison is fair.

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc;
use std::sync::{Arc, Barrier, Mutex};
use std::time::{Duration, Instant};

/// Every server child ever spawned, so the panic hook can kill them all.
static CHILDREN: Mutex<Vec<Arc<Mutex<Child>>>> = Mutex::new(Vec::new());

/// Rows that take longer than this have their server killed (clients then see EOF).
const ROW_DEADLINE: Duration = Duration::from_secs(120);

#[derive(Clone, Copy, PartialEq)]
enum Transport {
    Stdio,
    Tcp,
    Pipe,
}

impl Transport {
    fn name(self) -> &'static str {
        match self {
            Transport::Stdio => "stdio",
            Transport::Tcp => "tcp",
            Transport::Pipe => "pipe",
        }
    }

    fn bin(self) -> &'static str {
        match self {
            Transport::Stdio => "primordia-spellwright",
            Transport::Tcp => "spellwright-daemon",
            Transport::Pipe => "primordia-engine",
        }
    }
}

struct Args {
    transports: Vec<Transport>,
    clients: Vec<usize>,
    depths: Vec<usize>,
    requests: usize,
}

fn list<T: std::str::FromStr>(s: &str) -> Vec<T> {
    s.split(',').filter_map(|x| x.trim().parse().ok()).collect()
}

fn parse_args() -> Args {
    let mut a = Args {
        transports: vec![Transport::Stdio, Transport::Tcp, Transport::Pipe],
        clients: vec![1, 16, 64],
        depths: vec![1, 8, 64],
        requests: 600,
    };
    let mut it = std::env::args().skip(1);
    while let Some(k) = it.next() {
        let v = it.next().unwrap_or_default();
        match k.as_str() {
            "--transports" => {
                a.transports = v
                    .split(',')
                    .map(|t| match t.trim() {
                        "stdio" => Transport::Stdio,
                        "tcp" => Transport::Tcp,
                        "pipe" => Transport::Pipe,
                        other => panic!("unknown transport {other}"),
                    })
                    .collect()
            }
            "--clients" => a.clients = list(&v),
            "--depths" => a.depths = list::<usize>(&v).into_iter().map(|d| d.max(1)).collect(),
            "--requests" => a.requests = v.parse().expect("--requests"),
            _ => panic!("unknown argument {k}"),
        }
    }
    a
}

fn bin_path(name: &str) -> std::path::PathBuf {
    let exe = std::env::current_exe().expect("current_exe");
    // target/<profile>/examples/transport_bench(.exe) -> target/<profile>/<name>(.exe)
    exe.parent()
        .and_then(|p| p.parent())
        .expect("target dir")
        .join(format!("{name}{}", std::env::consts::EXE_SUFFIX))
}

struct Server {
    child: Arc<Mutex<Child>>,
    /// stdio only: the single client's ends, consumed by one row.
    stdio: Option<(ChildStdin, ChildStdout)>,
    /// TCP `host:port` or pipe path, from the server's "listening on" line.
    endpoint: String,
}

impl Server {
    fn spawn(t: Transport) -> Result<Server, String> {
        let bin = bin_path(t.bin());
        if !bin.exists() {
            return Err(format!("{} not found", bin.display()));
        }
        let mut cmd = Command::new(&bin);
        match t {
            Transport::Stdio => {}
            Transport::Tcp => {
                let port = TcpListener::bind("127.0.0.1:0").and_then(|l| l.local_addr()).map_err(|e| e.to_string())?.port();
                cmd.args(["--port", &port.to_string(), "--window-us", "0", "--max-batch", "4096"]);
            }
            Transport::Pipe => {
                static SEQ: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
                let n = SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                let name = format!("primordia-transport-bench-{}-{n}", std::process::id());
                cmd.args(["--pipe", &name, "--window-us", "0", "--max-batch", "4096"]);
            }
        }
        let piped = |on: bool| if on { Stdio::piped() } else { Stdio::null() };
        let mut child = cmd
            .stdin(piped(t == Transport::Stdio))
            .stdout(piped(t == Transport::Stdio))
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("spawn {}: {e}", bin.display()))?;
        let stdio = match t {
            Transport::Stdio => Some((child.stdin.take().unwrap(), child.stdout.take().unwrap())),
            _ => None,
        };
        let stderr = child.stderr.take().unwrap();
        let child = Arc::new(Mutex::new(child));
        CHILDREN.lock().unwrap_or_else(|e| e.into_inner()).push(child.clone());
        let mut server = Server { child, stdio, endpoint: String::new() };

        // Wait for the ready line, then keep draining stderr so the server never blocks on it.
        let marker = if t == Transport::Stdio { "glyphs bound" } else { "listening on " };
        let (tx, rx) = mpsc::channel::<Result<String, String>>();
        std::thread::spawn(move || {
            let mut seen = Vec::new();
            let mut tx = Some(tx);
            for line in BufReader::new(stderr).lines() {
                let Ok(line) = line else { break };
                if tx.is_some() && line.contains(marker) {
                    let _ = tx.take().unwrap().send(Ok(line));
                } else if tx.is_some() {
                    seen.push(line);
                }
            }
            if let Some(tx) = tx {
                let _ = tx.send(Err(seen.join(" | ")));
            }
        });
        match rx.recv_timeout(Duration::from_secs(60)) {
            Ok(Ok(line)) => {
                if let Some(i) = line.find("listening on ") {
                    server.endpoint = line[i + 13..].split_whitespace().next().unwrap_or("").to_string();
                }
                Ok(server)
            }
            Ok(Err(log)) => Err(format!("{} exited before it was ready: {log}", t.bin())),
            Err(_) => Err(format!("{} did not become ready within 60s", t.bin())),
        }
    }

    fn alive(&self) -> bool {
        matches!(self.child.lock().unwrap_or_else(|e| e.into_inner()).try_wait(), Ok(None))
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.stdio = None;
        let mut c = self.child.lock().unwrap_or_else(|e| e.into_inner());
        let _ = c.kill();
        let _ = c.wait();
    }
}

fn kill_all_children() {
    if let Ok(list) = CHILDREN.try_lock() {
        for c in list.iter() {
            if let Ok(mut c) = c.try_lock() {
                let _ = c.kill();
            }
        }
    }
}

struct Conn {
    r: BufReader<Box<dyn Read + Send>>,
    w: Box<dyn Write + Send>,
}

fn connect(t: Transport, endpoint: &str) -> std::io::Result<Conn> {
    match t {
        Transport::Tcp => {
            let s = TcpStream::connect(endpoint)?;
            s.set_nodelay(true).ok();
            s.set_read_timeout(Some(Duration::from_secs(30))).ok();
            let w = s.try_clone()?;
            Ok(Conn { r: BufReader::new(Box::new(s)), w: Box::new(w) })
        }
        Transport::Pipe => {
            // All instances busy (231) or not created yet (2): retry for a while.
            let t0 = Instant::now();
            loop {
                match std::fs::OpenOptions::new().read(true).write(true).open(endpoint) {
                    Ok(f) => {
                        let w = f.try_clone()?;
                        return Ok(Conn { r: BufReader::new(Box::new(f)), w: Box::new(w) });
                    }
                    Err(e) if matches!(e.raw_os_error(), Some(2 | 231)) && t0.elapsed() < Duration::from_secs(20) => {
                        std::thread::sleep(Duration::from_millis(2));
                    }
                    Err(e) => return Err(e),
                }
            }
        }
        Transport::Stdio => unreachable!("stdio connections come from the spawned server"),
    }
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
    note: Option<String>,
}

/// One client: keep up to `depth` requests in flight until `m` have been sent.
fn run_client(conn: &mut Conn, client: usize, m: usize, depth: usize, start: &Barrier) -> ClientReport {
    let mut rep = ClientReport::default();
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
            if let Err(e) = conn.w.write_all(batch.as_bytes()).and_then(|_| conn.w.flush()) {
                rep.note = Some(format!("client {client} write: {e}"));
                break;
            }
        }
        if outstanding.is_empty() {
            break;
        }
        line.clear();
        match conn.r.read_line(&mut line) {
            Ok(n) if n > 0 => {}
            Ok(_) => {
                rep.note = Some(format!("client {client}: server closed the connection"));
                break;
            }
            Err(e) => {
                rep.note = Some(format!("client {client} read: {e}"));
                break;
            }
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

/// Runs one row; returns false if anything was misrouted, missing, duplicated or an error.
fn run_row(t: Transport, server: &mut Server, n: usize, depth: usize, m: usize) -> bool {
    let mut conns: Vec<Conn> = Vec::with_capacity(n);
    if t == Transport::Stdio {
        let (w, r) = server.stdio.take().expect("stdio ends");
        conns.push(Conn { r: BufReader::new(Box::new(r)), w: Box::new(w) });
    } else {
        for _ in 0..n {
            match connect(t, &server.endpoint) {
                Ok(c) => conns.push(c),
                Err(e) => {
                    println!("| {} | {n} | {depth} | connect failed: {e} | | | | | | | |", t.name());
                    return false;
                }
            }
        }
    }

    // Watchdog: a stalled row gets its server killed, which unblocks every client read.
    let (done_tx, done_rx) = mpsc::channel::<()>();
    let child = server.child.clone();
    let watchdog = std::thread::spawn(move || {
        if done_rx.recv_timeout(ROW_DEADLINE) == Err(mpsc::RecvTimeoutError::Timeout) {
            eprintln!("row stalled for {}s: killing the server", ROW_DEADLINE.as_secs());
            let _ = child.lock().unwrap_or_else(|e| e.into_inner()).kill();
        }
    });

    let barrier = Arc::new(Barrier::new(n + 1));
    let handles: Vec<_> = conns
        .into_iter()
        .enumerate()
        .map(|(c, mut conn)| {
            let b = barrier.clone();
            std::thread::spawn(move || {
                let rep = run_client(&mut conn, c, m, depth, &b);
                (rep, conn)
            })
        })
        .collect();
    barrier.wait();
    let t0 = Instant::now();
    let results: Vec<(ClientReport, Conn)> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    let wall = t0.elapsed().as_secs_f64();
    let _ = done_tx.send(());
    let _ = watchdog.join();

    let mut lat: Vec<f64> = results.iter().flat_map(|(r, _)| r.latencies_us.iter().copied()).collect();
    lat.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let (mis, miss, dup, err) = results.iter().fold((0, 0, 0, 0), |a, (r, _)| {
        (a.0 + r.misrouted, a.1 + r.missing, a.2 + r.duplicates, a.3 + r.errors)
    });
    println!(
        "| {} | {n} | {depth} | {} | {:.0} | {:.0} | {:.0} | {mis} | {miss} | {dup} | {err} |",
        t.name(),
        lat.len(),
        pct(&lat, 0.50),
        pct(&lat, 0.95),
        lat.len() as f64 / wall,
    );
    for note in results.iter().filter_map(|(r, _)| r.note.as_ref()).take(3) {
        eprintln!("  {note}");
    }
    mis + miss + dup + err == 0
}

fn main() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        kill_all_children();
        default_hook(info);
    }));

    let args = parse_args();
    println!("{} requests per client; servers run --window-us 0 --max-batch 4096\n", args.requests);
    println!("| transport | clients | depth | replies | p50 us | p95 us | msg/s | misrouted | missing | duplicate | error replies |");
    println!("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    let mut bad = false;
    let mut notes = Vec::new();
    for &t in &args.transports {
        if t == Transport::Pipe && !bin_path(t.bin()).exists() {
            notes.push(format!(
                "pipe rows skipped: {} not built yet (cargo build --release --bins)",
                bin_path(t.bin()).display()
            ));
            continue;
        }
        let mut server: Option<Server> = None;
        for &n in &args.clients {
            if t == Transport::Stdio && n != 1 {
                continue; // one client per stdio process
            }
            for &depth in &args.depths {
                // stdio rows each get a fresh process: its pipe ends are consumed by the row.
                if t == Transport::Stdio || !server.as_ref().is_some_and(Server::alive) {
                    server = None;
                    match Server::spawn(t) {
                        Ok(s) => server = Some(s),
                        Err(e) => {
                            println!("| {} | {n} | {depth} | server failed: {e} | | | | | | | |", t.name());
                            bad = true;
                            continue;
                        }
                    }
                }
                bad |= !run_row(t, server.as_mut().unwrap(), n, depth, args.requests);
            }
        }
    }
    for note in &notes {
        println!("\nnote: {note}");
    }
    if bad {
        eprintln!("\nFAIL: misrouted, missing, duplicate or error replies (or a server failed)");
        std::process::exit(1);
    }
}
