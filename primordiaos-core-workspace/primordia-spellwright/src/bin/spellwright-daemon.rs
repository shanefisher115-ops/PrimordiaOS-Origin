//! spellwright-daemon: one GPU ritual shared by many MCP clients over TCP.
//!
//! Each connection speaks newline-delimited JSON-RPC (the stdio framing). The
//! batching and reply routing live in `primordia_spellwright::batcher`, shared
//! with primordia-engine (named pipes / Unix sockets).
//!
//!     spellwright-daemon [--port 7341] [--window-us 0] [--max-batch 256] [--verbose]

use primordia_spellwright::batcher::{self, Intake};
use primordia_spellwright::ritual;
use std::net::{Shutdown, TcpListener};

struct Config {
    port: u16,
    batch: batcher::Config,
}

fn parse_args() -> Result<Config, String> {
    let mut cfg = Config { port: 7341, batch: batcher::Config::default() };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        if cfg.batch.take_flag(&a, &mut args)? {
            continue;
        }
        match a.as_str() {
            "--port" => {
                let v = args.next().ok_or("--port needs a value")?;
                cfg.port = v.parse().map_err(|e| format!("--port: {e}"))?;
            }
            "--help" | "-h" => {
                eprintln!("usage: spellwright-daemon [--port 7341] [--window-us 0] [--max-batch 256] [--verbose]");
                std::process::exit(0);
            }
            other => return Err(format!("unknown argument {other}")),
        }
    }
    Ok(cfg)
}

fn main() {
    let cfg = match parse_args() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("spellwright-daemon: {e}");
            std::process::exit(2);
        }
    };
    if let Err(e) = run(cfg) {
        eprintln!("spellwright-daemon: {e}");
        std::process::exit(1);
    }
}

fn run(cfg: Config) -> Result<(), Box<dyn std::error::Error>> {
    let mut ritual = ritual::Ritual::new()?;
    let listener = TcpListener::bind(("127.0.0.1", cfg.port))?;
    eprintln!(
        "spellwright-daemon: glyphs bound on {}, listening on {} (window {}us, max batch {})",
        ritual.device_name,
        listener.local_addr()?,
        cfg.batch.window.as_micros(),
        cfg.batch.max_batch
    );

    let (intake, rx) = batcher::channel();
    std::thread::spawn(move || accept_loop(listener, intake));
    batcher::run(&mut ritual, &rx, &cfg.batch, "spellwright-daemon")
}

fn accept_loop(listener: TcpListener, mut intake: Intake) {
    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        let Ok(mut write_half) = stream.try_clone() else { continue };
        let _ = stream.set_nodelay(true);
        let Some((conn, replies)) = intake.connect() else { return };
        std::thread::spawn(move || {
            batcher::write_replies(&mut write_half, replies);
            // All senders gone: the daemon is done with this client.
            let _ = write_half.shutdown(Shutdown::Write);
        });
        std::thread::spawn(move || conn.read_lines(stream));
    }
}
