//! primordia-spellwright: a GPU-resident MCP server over stdio.
//!
//! The host is only a conduit: it moves stdin bytes into the request reliquary,
//! submits the ritual, and copies the response reliquary to stdout. Framing,
//! JSON-RPC parsing, method/tool routing and reply serialization all run in
//! Vulkan compute glyphs. Logs go to stderr; stdout carries only JSON-RPC.

use primordia_spellwright::grimoire::IN_CAP;
use primordia_spellwright::{host_spells, ritual};
use std::io::{Read, Write};
use std::sync::mpsc;

fn main() {
    if let Err(e) = run() {
        eprintln!("spellwright: {e}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut ritual = ritual::Ritual::new()?;
    eprintln!("spellwright: glyphs bound on {}", ritual.device_name);

    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    std::thread::spawn(move || {
        let mut stdin = std::io::stdin().lock();
        let mut buf = vec![0u8; 64 * 1024];
        while let Ok(n) = stdin.read(&mut buf) {
            if n == 0 || tx.send(buf[..n].to_vec()).is_err() {
                break;
            }
        }
    });

    let mut stdout = std::io::stdout().lock();
    let mut pending: Vec<u8> = Vec::new();
    let mut eof = false;
    let mut need_more = true;

    loop {
        if need_more || pending.is_empty() {
            if eof {
                break;
            }
            match rx.recv() {
                Ok(chunk) => pending.extend(chunk),
                Err(_) => {
                    eof = true;
                    if pending.is_empty() {
                        break;
                    }
                }
            }
        }
        while let Ok(chunk) = rx.try_recv() {
            pending.extend(chunk);
        }

        // Too many messages or replies for one tick: retry with half the input.
        let mut n = pending.len().min(IN_CAP);
        let result = loop {
            let r = ritual.tick(&pending[..n])?;
            if r.overflow && n > 1 {
                n /= 2;
                continue;
            }
            break r;
        };

        stdout.write_all(&result.out)?;
        for call in &result.host_calls {
            stdout.write_all(&host_spells::cast(&ritual, call))?;
        }
        stdout.flush()?;

        if result.consumed == 0 {
            if n == IN_CAP {
                // One line larger than the request reliquary: drop it and report.
                let cut = pending.iter().position(|&b| b == b'\n').map_or(pending.len(), |p| p + 1);
                pending.drain(..cut);
                stdout.write_all(b"{\"jsonrpc\":\"2.0\",\"id\":null,\"error\":{\"code\":-32600,\"message\":\"Message exceeds request reliquary\"}}\n")?;
                stdout.flush()?;
                need_more = false;
            } else {
                need_more = true;
            }
        } else {
            pending.drain(..result.consumed);
            need_more = false;
        }
    }
    Ok(())
}
