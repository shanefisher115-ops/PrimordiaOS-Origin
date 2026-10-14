//! primordia-pipe-bridge: lets an ordinary stdio MCP client talk to primordia-engine.
//! stdin is copied to the engine's pipe/socket and the pipe/socket to stdout.
//!
//!     primordia-pipe-bridge [--pipe \\.\pipe\primordia-spellwright]       (Windows)
//!     primordia-pipe-bridge [--socket /tmp/primordia-spellwright.sock]     (Unix)
//!
//! Windows: the pipe handle is overlapped and the stdin->pipe and pipe->stdout
//! threads each use their own clone (own OVERLAPPED + event), so a request write
//! never waits behind the reply read that is always outstanding (see `ipc`).
//! A pipe has no half-close, so at stdin EOF the bridge sends a `ping` with a
//! private id as a barrier: replies come back in request order, so once the
//! barrier's reply arrives every earlier reply has been forwarded. The barrier
//! reply itself is not forwarded.

use primordia_spellwright::ipc;
use std::io::{Read, Write};

fn main() {
    let mut endpoint = (if cfg!(windows) { ipc::DEFAULT_PIPE } else { ipc::DEFAULT_SOCKET }).to_string();
    let usage = if cfg!(windows) {
        r"usage: primordia-pipe-bridge [--pipe \\.\pipe\primordia-spellwright]"
    } else {
        "usage: primordia-pipe-bridge [--socket /tmp/primordia-spellwright.sock]"
    };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match (a.as_str(), args.next()) {
            ("--pipe", Some(v)) if cfg!(windows) => {
                endpoint = if v.starts_with(r"\\") { v } else { format!(r"\\.\pipe\{v}") }
            }
            ("--socket", Some(v)) if cfg!(unix) => endpoint = v,
            _ => fail(usage),
        }
    }
    bridge(&endpoint);
}

#[cfg(windows)]
fn bridge(name: &str) {
    let pipe = ipc::connect(name, std::time::Duration::from_secs(5)).unwrap_or_else(|e| fail(&format!("connect {name}: {e}")));
    let mut up = pipe.try_clone().unwrap_or_else(|e| fail(&e.to_string()));
    let token = format!(
        "primordia-pipe-bridge-eof-{}-{}",
        std::process::id(),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_nanos())
    );
    let barrier = format!("{{\"jsonrpc\":\"2.0\",\"id\":\"{token}\",\"method\":\"ping\"}}\n");

    // stdin -> engine; at EOF, end any unterminated line and send the barrier.
    std::thread::spawn(move || {
        let mut stdin = std::io::stdin().lock();
        let mut buf = vec![0u8; 64 * 1024];
        let mut last = b'\n';
        loop {
            match stdin.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    if up.write_all(&buf[..n]).is_err() {
                        return;
                    }
                    last = buf[n - 1];
                }
            }
        }
        if last != b'\n' && up.write_all(b"\n").is_err() {
            return;
        }
        let _ = up.write_all(barrier.as_bytes());
    });

    // engine -> stdout, whole lines at a time, until the barrier reply (or the engine hangs up).
    let mut down = pipe;
    let mut stdout = std::io::stdout().lock();
    let mut buf = vec![0u8; 64 * 1024];
    let mut pending: Vec<u8> = Vec::new();
    let token = token.as_bytes();
    loop {
        let n = match down.read(&mut buf) {
            Ok(0) | Err(_) => break,
            Ok(n) => n,
        };
        pending.extend_from_slice(&buf[..n]);
        let Some(end) = pending.iter().rposition(|&b| b == b'\n').map(|p| p + 1) else { continue };
        if let Some(at) = pending[..end].windows(token.len()).position(|w| w == token) {
            let line_start = pending[..at].iter().rposition(|&b| b == b'\n').map_or(0, |p| p + 1);
            let _ = stdout.write_all(&pending[..line_start]).and_then(|_| stdout.flush());
            return;
        }
        if stdout.write_all(&pending[..end]).and_then(|_| stdout.flush()).is_err() {
            break;
        }
        pending.drain(..end);
    }
    let _ = stdout.write_all(&pending).and_then(|_| stdout.flush());
}

#[cfg(unix)]
fn bridge(path: &str) {
    use std::net::Shutdown;
    use std::os::unix::net::UnixStream;
    let sock = UnixStream::connect(path).unwrap_or_else(|e| fail(&format!("connect {path}: {e}")));
    let mut up = sock.try_clone().unwrap_or_else(|e| fail(&e.to_string()));

    // stdin -> engine; on EOF half-close so the engine finishes our replies and hangs up.
    std::thread::spawn(move || {
        let mut stdin = std::io::stdin().lock();
        let mut buf = vec![0u8; 64 * 1024];
        while let Ok(n) = stdin.read(&mut buf) {
            if n == 0 || up.write_all(&buf[..n]).is_err() {
                break;
            }
        }
        let _ = up.shutdown(Shutdown::Write);
    });

    // engine -> stdout until the engine closes the connection.
    let mut down = sock;
    let mut stdout = std::io::stdout().lock();
    let mut buf = vec![0u8; 64 * 1024];
    while let Ok(n) = down.read(&mut buf) {
        if n == 0 || stdout.write_all(&buf[..n]).and_then(|_| stdout.flush()).is_err() {
            break;
        }
    }
}

fn fail(msg: &str) -> ! {
    eprintln!("primordia-pipe-bridge: {msg}");
    std::process::exit(1);
}
