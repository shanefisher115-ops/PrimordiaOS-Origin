//! spellwright-bridge: lets an ordinary stdio MCP client talk to spellwright-daemon.
//! stdin is copied to the daemon socket and the socket to stdout.
//!
//!     spellwright-bridge [--port 7341]

use std::io::{Read, Write};
use std::net::{Shutdown, TcpStream};

fn main() {
    let mut port: u16 = 7341;
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match (a.as_str(), args.next()) {
            ("--port", Some(v)) => match v.parse() {
                Ok(p) => port = p,
                Err(e) => fail(&format!("--port: {e}")),
            },
            _ => fail("usage: spellwright-bridge [--port 7341]"),
        }
    }

    let sock = TcpStream::connect(("127.0.0.1", port)).unwrap_or_else(|e| fail(&format!("connect 127.0.0.1:{port}: {e}")));
    let _ = sock.set_nodelay(true);
    let mut up = sock.try_clone().unwrap_or_else(|e| fail(&e.to_string()));

    // stdin -> daemon; on EOF half-close so the daemon finishes our replies and hangs up.
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

    // daemon -> stdout until the daemon closes the connection.
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
    eprintln!("spellwright-bridge: {msg}");
    std::process::exit(1);
}
