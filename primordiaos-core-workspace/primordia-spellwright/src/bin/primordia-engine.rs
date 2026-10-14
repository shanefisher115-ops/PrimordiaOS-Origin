//! primordia-engine: one GPU ritual shared by many MCP clients over local IPC —
//! a named pipe on Windows, a Unix domain socket elsewhere. Same batching and
//! reply routing as spellwright-daemon (`primordia_spellwright::batcher`), same
//! newline-delimited JSON-RPC, one MCP client per connection.
//!
//!     primordia-engine [--pipe \\.\pipe\primordia-spellwright]       (Windows)
//!     primordia-engine [--socket /tmp/primordia-spellwright.sock]     (Unix)
//!                      [--window-us 0] [--max-batch 256] [--verbose]
//!
//! Windows: each client gets its own byte-mode pipe instance opened for
//! overlapped I/O, so the reader thread's pending ReadFile never blocks the
//! writer thread's reply WriteFile on the same handle (see `ipc`).

use primordia_spellwright::batcher::{self, Intake};
use primordia_spellwright::{ipc, ritual};

const USAGE: &str = if cfg!(windows) {
    r"usage: primordia-engine [--pipe \\.\pipe\primordia-spellwright] [--window-us 0] [--max-batch 256] [--verbose]"
} else {
    "usage: primordia-engine [--socket /tmp/primordia-spellwright.sock] [--window-us 0] [--max-batch 256] [--verbose]"
};

struct Config {
    endpoint: String,
    batch: batcher::Config,
}

fn parse_args() -> Result<Config, String> {
    let default = if cfg!(windows) { ipc::DEFAULT_PIPE } else { ipc::DEFAULT_SOCKET };
    let mut cfg = Config { endpoint: default.to_string(), batch: batcher::Config::default() };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        if cfg.batch.take_flag(&a, &mut args)? {
            continue;
        }
        match a.as_str() {
            "--pipe" if cfg!(windows) => {
                let v = args.next().ok_or("--pipe needs a value")?;
                cfg.endpoint = if v.starts_with(r"\\") { v } else { format!(r"\\.\pipe\{v}") };
            }
            "--socket" if cfg!(unix) => cfg.endpoint = args.next().ok_or("--socket needs a value")?,
            "--help" | "-h" => {
                eprintln!("{USAGE}");
                std::process::exit(0);
            }
            other => return Err(format!("unknown argument {other}\n{USAGE}")),
        }
    }
    Ok(cfg)
}

fn main() {
    let cfg = match parse_args() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("primordia-engine: {e}");
            std::process::exit(2);
        }
    };
    if let Err(e) = run(cfg) {
        eprintln!("primordia-engine: {e}");
        std::process::exit(1);
    }
}

fn run(cfg: Config) -> Result<(), Box<dyn std::error::Error>> {
    // Claim the endpoint first so a second engine fails fast; clients that connect
    // before the glyphs are bound just wait for their first reply.
    let listener = listen(&cfg.endpoint)?;
    let mut ritual = ritual::Ritual::new()?;
    eprintln!(
        "primordia-engine: glyphs bound on {} (window {}us, max batch {})",
        ritual.device_name,
        cfg.batch.window.as_micros(),
        cfg.batch.max_batch
    );
    eprintln!("primordia-engine: listening on {}", cfg.endpoint);

    let (intake, rx) = batcher::channel();
    std::thread::spawn(move || accept_loop(listener, intake));
    batcher::run(&mut ritual, &rx, &cfg.batch, "primordia-engine")
}

#[cfg(windows)]
fn listen(name: &str) -> Result<ipc::PipeListener, String> {
    ipc::PipeListener::bind(name).map_err(|e| format!("cannot serve {name} (is another engine running?): {e}"))
}

#[cfg(windows)]
fn accept_loop(mut listener: ipc::PipeListener, mut intake: Intake) {
    loop {
        let pipe = match listener.accept() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("primordia-engine: accept failed: {e}");
                std::process::exit(1);
            }
        };
        let Ok(mut write_end) = pipe.try_clone() else { continue };
        let Some((conn, replies)) = intake.connect() else { return };
        // The pipe instance closes when both threads have dropped their end.
        std::thread::spawn(move || batcher::write_replies(&mut write_end, replies));
        std::thread::spawn(move || conn.read_lines(pipe));
    }
}

#[cfg(unix)]
fn listen(path: &str) -> Result<std::os::unix::net::UnixListener, String> {
    use std::os::unix::net::{UnixListener, UnixStream};
    if std::path::Path::new(path).exists() {
        if UnixStream::connect(path).is_ok() {
            return Err(format!("{path} is already served by another engine"));
        }
        // Left behind by an engine that did not exit cleanly.
        std::fs::remove_file(path).map_err(|e| format!("remove stale {path}: {e}"))?;
    }
    UnixListener::bind(path).map_err(|e| format!("bind {path}: {e}"))
}

#[cfg(unix)]
fn accept_loop(listener: std::os::unix::net::UnixListener, mut intake: Intake) {
    use std::net::Shutdown;
    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        let Ok(mut write_half) = stream.try_clone() else { continue };
        let Some((conn, replies)) = intake.connect() else { return };
        std::thread::spawn(move || {
            batcher::write_replies(&mut write_half, replies);
            // All senders gone: the engine is done with this client.
            let _ = write_half.shutdown(Shutdown::Write);
        });
        std::thread::spawn(move || conn.read_lines(stream));
    }
}
