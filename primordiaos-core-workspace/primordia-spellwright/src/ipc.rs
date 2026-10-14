//! Local IPC endpoints for primordia-engine and its clients: a named pipe on
//! Windows, a Unix domain socket elsewhere. Both carry newline-delimited JSON-RPC.
//!
//! Windows pitfall this module exists for: I/O on a synchronous (non-overlapped)
//! pipe handle is serialized, so a thread blocked in ReadFile stalls every
//! WriteFile on the same handle until the read completes. Server and client
//! handles here are opened with FILE_FLAG_OVERLAPPED, and every [`PipeEnd`]
//! issues each ReadFile/WriteFile with its own OVERLAPPED and event, so a reader
//! thread and a writer thread can use clones of one handle independently.

/// Default engine endpoint on Windows.
pub const DEFAULT_PIPE: &str = r"\\.\pipe\primordia-spellwright";
/// Default engine endpoint on Unix.
pub const DEFAULT_SOCKET: &str = "/tmp/primordia-spellwright.sock";

#[cfg(windows)]
pub use self::windows::{connect, PipeEnd, PipeListener};

#[cfg(windows)]
mod windows {
    use std::ffi::c_void;
    use std::io::{self, Read, Write};
    use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle};
    use std::sync::Arc;
    use std::time::{Duration, Instant};

    type Handle = *mut c_void;
    type Bool = i32;

    #[repr(C)]
    struct Overlapped {
        internal: usize,
        internal_high: usize,
        offset: u32,
        offset_high: u32,
        h_event: Handle,
    }

    const INVALID_HANDLE_VALUE: Handle = -1isize as Handle;
    const PIPE_ACCESS_DUPLEX: u32 = 0x3;
    const FILE_FLAG_OVERLAPPED: u32 = 0x4000_0000;
    const FILE_FLAG_FIRST_PIPE_INSTANCE: u32 = 0x0008_0000;
    const PIPE_TYPE_BYTE: u32 = 0x0;
    const PIPE_READMODE_BYTE: u32 = 0x0;
    const PIPE_WAIT: u32 = 0x0;
    const PIPE_REJECT_REMOTE_CLIENTS: u32 = 0x8;
    const PIPE_UNLIMITED_INSTANCES: u32 = 255;
    const GENERIC_READ: u32 = 0x8000_0000;
    const GENERIC_WRITE: u32 = 0x4000_0000;
    const OPEN_EXISTING: u32 = 3;
    // The client only lets the server identify it, never impersonate it.
    const SECURITY_SQOS_PRESENT: u32 = 0x0010_0000;
    const SECURITY_IDENTIFICATION: u32 = 0x0001_0000;
    const ERROR_BROKEN_PIPE: i32 = 109;
    const ERROR_PIPE_BUSY: i32 = 231;
    const ERROR_PIPE_NOT_CONNECTED: i32 = 233;
    const ERROR_PIPE_CONNECTED: i32 = 535;
    const ERROR_IO_PENDING: i32 = 997;
    const INFINITE: u32 = 0xFFFF_FFFF;
    const WAIT_OBJECT_0: u32 = 0;

    const PIPE_BUFFER: u32 = 64 * 1024;
    /// Instances kept waiting for a client, so a burst of connects rarely sees ERROR_PIPE_BUSY.
    const LISTEN_POOL: usize = 8;

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateNamedPipeW(
            name: *const u16,
            open_mode: u32,
            pipe_mode: u32,
            max_instances: u32,
            out_buffer: u32,
            in_buffer: u32,
            default_timeout: u32,
            security: *mut c_void,
        ) -> Handle;
        fn ConnectNamedPipe(pipe: Handle, ov: *mut Overlapped) -> Bool;
        fn CreateFileW(
            name: *const u16,
            access: u32,
            share: u32,
            security: *mut c_void,
            disposition: u32,
            flags: u32,
            template: Handle,
        ) -> Handle;
        fn WaitNamedPipeW(name: *const u16, timeout_ms: u32) -> Bool;
        fn ReadFile(h: Handle, buf: *mut u8, len: u32, read: *mut u32, ov: *mut Overlapped) -> Bool;
        fn WriteFile(h: Handle, buf: *const u8, len: u32, written: *mut u32, ov: *mut Overlapped) -> Bool;
        fn GetOverlappedResult(h: Handle, ov: *mut Overlapped, n: *mut u32, wait: Bool) -> Bool;
        fn CancelIoEx(h: Handle, ov: *mut Overlapped) -> Bool;
        fn CreateEventW(security: *mut c_void, manual_reset: Bool, initial: Bool, name: *const u16) -> Handle;
        fn SetEvent(h: Handle) -> Bool;
        fn WaitForMultipleObjects(n: u32, handles: *const Handle, wait_all: Bool, ms: u32) -> u32;
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn owned(h: Handle) -> io::Result<OwnedHandle> {
        if h.is_null() || h == INVALID_HANDLE_VALUE {
            Err(io::Error::last_os_error())
        } else {
            Ok(unsafe { OwnedHandle::from_raw_handle(h as RawHandle) })
        }
    }

    fn new_event() -> io::Result<OwnedHandle> {
        // Manual-reset, as overlapped I/O requires; ReadFile/WriteFile reset it on entry.
        owned(unsafe { CreateEventW(std::ptr::null_mut(), 1, 0, std::ptr::null()) })
    }

    fn raw(h: &OwnedHandle) -> Handle {
        h.as_raw_handle() as Handle
    }

    /// One end of a connected pipe (server or client side). Clone it with
    /// [`PipeEnd::try_clone`] to read on one thread and write on another: clones
    /// share the pipe handle but each has its own completion event.
    pub struct PipeEnd {
        pipe: Arc<OwnedHandle>,
        event: OwnedHandle,
    }

    impl PipeEnd {
        fn new(pipe: OwnedHandle) -> io::Result<Self> {
            Ok(PipeEnd { pipe: Arc::new(pipe), event: new_event()? })
        }

        pub fn try_clone(&self) -> io::Result<Self> {
            Ok(PipeEnd { pipe: self.pipe.clone(), event: new_event()? })
        }

        /// One overlapped ReadFile/WriteFile, waited on with this end's own event.
        fn io(&self, ptr: *mut u8, len: usize, write: bool) -> io::Result<usize> {
            let len = len.min(u32::MAX as usize) as u32;
            let h = raw(&self.pipe);
            let mut ov = Overlapped { internal: 0, internal_high: 0, offset: 0, offset_high: 0, h_event: raw(&self.event) };
            let ok = unsafe {
                if write {
                    WriteFile(h, ptr, len, std::ptr::null_mut(), &mut ov)
                } else {
                    ReadFile(h, ptr, len, std::ptr::null_mut(), &mut ov)
                }
            };
            if ok == 0 {
                let e = io::Error::last_os_error();
                if e.raw_os_error() != Some(ERROR_IO_PENDING) {
                    return Err(e);
                }
            }
            // `ov` and the buffer must outlive the operation: always wait for it here.
            let mut n = 0u32;
            if unsafe { GetOverlappedResult(h, &mut ov, &mut n, 1) } == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(n as usize)
        }
    }

    fn is_hangup(e: &io::Error) -> bool {
        matches!(e.raw_os_error(), Some(ERROR_BROKEN_PIPE | ERROR_PIPE_NOT_CONNECTED))
    }

    impl Read for PipeEnd {
        fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
            if buf.is_empty() {
                return Ok(0);
            }
            match self.io(buf.as_mut_ptr(), buf.len(), false) {
                Err(e) if is_hangup(&e) => Ok(0), // the other end closed: EOF
                r => r,
            }
        }
    }

    impl Write for PipeEnd {
        fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
            if buf.is_empty() {
                return Ok(0);
            }
            self.io(buf.as_ptr() as *mut u8, buf.len(), true)
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    /// Opens the client end of `name` (e.g. `\\.\pipe\primordia-spellwright`),
    /// waiting up to `timeout` while every server instance is busy.
    pub fn connect(name: &str, timeout: Duration) -> io::Result<PipeEnd> {
        let w = wide(name);
        let deadline = Instant::now() + timeout;
        loop {
            let h = unsafe {
                CreateFileW(
                    w.as_ptr(),
                    GENERIC_READ | GENERIC_WRITE,
                    0,
                    std::ptr::null_mut(),
                    OPEN_EXISTING,
                    FILE_FLAG_OVERLAPPED | SECURITY_SQOS_PRESENT | SECURITY_IDENTIFICATION,
                    std::ptr::null_mut(),
                )
            };
            match owned(h) {
                Ok(h) => return PipeEnd::new(h),
                Err(e) if e.raw_os_error() == Some(ERROR_PIPE_BUSY) => {
                    let left = deadline.saturating_duration_since(Instant::now());
                    if left.is_zero() {
                        return Err(e);
                    }
                    // Returns early when an instance frees up; failures just loop to the deadline.
                    unsafe { WaitNamedPipeW(w.as_ptr(), left.as_millis().clamp(1, 1000) as u32) };
                }
                Err(e) => return Err(e),
            }
        }
    }

    /// A server instance waiting (overlapped) for a client.
    struct Pending {
        pipe: Option<OwnedHandle>,
        event: OwnedHandle,
        ov: Box<Overlapped>,
        /// The client connected before ConnectNamedPipe was called (no I/O was queued).
        early: bool,
    }

    // `ov.h_event` is a raw copy of `event`'s handle, which any thread may wait on.
    unsafe impl Send for Pending {}

    impl Pending {
        fn new(name: &[u16], first: bool) -> io::Result<Self> {
            let open_mode = PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED | if first { FILE_FLAG_FIRST_PIPE_INSTANCE } else { 0 };
            let pipe = owned(unsafe {
                CreateNamedPipeW(
                    name.as_ptr(),
                    open_mode,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                    PIPE_UNLIMITED_INSTANCES,
                    PIPE_BUFFER,
                    PIPE_BUFFER,
                    0,
                    std::ptr::null_mut(),
                )
            })?;
            let event = new_event()?;
            let mut ov = Box::new(Overlapped { internal: 0, internal_high: 0, offset: 0, offset_high: 0, h_event: raw(&event) });
            let mut early = false;
            if unsafe { ConnectNamedPipe(raw(&pipe), &mut *ov) } == 0 {
                let e = io::Error::last_os_error();
                match e.raw_os_error() {
                    Some(ERROR_IO_PENDING) => {}
                    Some(ERROR_PIPE_CONNECTED) => {
                        early = true;
                        unsafe { SetEvent(raw(&event)) };
                    }
                    _ => return Err(e),
                }
            } else {
                early = true;
                unsafe { SetEvent(raw(&event)) };
            }
            Ok(Pending { pipe: Some(pipe), event, ov, early })
        }

        /// Called once the event fired: the connected pipe, or why the connect failed.
        fn finish(mut self) -> io::Result<OwnedHandle> {
            let pipe = self.pipe.take().expect("pipe present until finished");
            if !self.early {
                let mut n = 0u32;
                if unsafe { GetOverlappedResult(raw(&pipe), &mut *self.ov, &mut n, 0) } == 0 {
                    return Err(io::Error::last_os_error());
                }
            }
            Ok(pipe)
        }
    }

    impl Drop for Pending {
        fn drop(&mut self) {
            // A still-queued ConnectNamedPipe points at `ov`: cancel and reap it first.
            if let Some(pipe) = &self.pipe {
                if !self.early {
                    let mut n = 0u32;
                    unsafe {
                        CancelIoEx(raw(pipe), &mut *self.ov);
                        GetOverlappedResult(raw(pipe), &mut *self.ov, &mut n, 1);
                    }
                }
            }
        }
    }

    /// Server side of a named pipe: one byte-mode instance per client, unlimited
    /// instances, local clients only.
    pub struct PipeListener {
        name: Vec<u16>,
        pending: Vec<Pending>,
    }

    impl PipeListener {
        /// Fails (access denied) if another process already serves `name`.
        pub fn bind(name: &str) -> io::Result<Self> {
            let name = wide(name);
            let mut pending = Vec::with_capacity(LISTEN_POOL);
            for i in 0..LISTEN_POOL {
                pending.push(Pending::new(&name, i == 0)?);
            }
            Ok(PipeListener { name, pending })
        }

        /// Blocks until a client connects and returns its server end.
        pub fn accept(&mut self) -> io::Result<PipeEnd> {
            loop {
                let events: Vec<Handle> = self.pending.iter().map(|p| raw(&p.event)).collect();
                let r = unsafe { WaitForMultipleObjects(events.len() as u32, events.as_ptr(), 0, INFINITE) };
                let i = r.wrapping_sub(WAIT_OBJECT_0) as usize;
                if i >= self.pending.len() {
                    return Err(io::Error::last_os_error());
                }
                // Keep the pool full before handing this instance over.
                let fresh = Pending::new(&self.name, false)?;
                let done = std::mem::replace(&mut self.pending[i], fresh);
                match done.finish() {
                    Ok(pipe) => return PipeEnd::new(pipe),
                    // The client vanished before we saw it: just wait for the next one.
                    Err(_) => continue,
                }
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::sync::mpsc;

        fn unique_name(tag: &str) -> String {
            let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
            format!(r"\\.\pipe\primordia-spellwright-test-{tag}-{}-{nanos}", std::process::id())
        }

        /// The pitfall fix: while a reader thread has a ReadFile outstanding on a pipe
        /// end, a writer thread can still write replies through a clone of it, on
        /// both the server and the client side.
        #[test]
        fn writes_complete_while_read_is_outstanding() {
            let name = unique_name("overlapped");
            let mut listener = PipeListener::bind(&name).unwrap();
            let server_thread = std::thread::spawn(move || listener.accept().unwrap());
            let mut client = connect(&name, Duration::from_secs(5)).unwrap();
            let mut server = server_thread.join().unwrap();

            // Server side: a reader thread parks in ReadFile on one clone...
            let (tx, rx) = mpsc::channel();
            let mut server_reader = server.try_clone().unwrap();
            std::thread::spawn(move || {
                let mut b = [0u8; 16];
                let n = server_reader.read(&mut b).unwrap();
                tx.send(b[..n].to_vec()).unwrap();
            });
            std::thread::sleep(Duration::from_millis(100)); // let the read get queued
            // ...while a writer thread writes 100 replies through another.
            let (wtx, wrx) = mpsc::channel();
            let mut sw = server.try_clone().unwrap();
            std::thread::spawn(move || {
                for i in 0..100u8 {
                    sw.write_all(&[b'r', i, b'\n']).unwrap();
                }
                wtx.send(()).unwrap();
            });
            wrx.recv_timeout(Duration::from_secs(5)).expect("server write stalled behind a pending read");
            assert!(rx.try_recv().is_err(), "read should still be outstanding");
            let mut got = vec![0u8; 300];
            client.read_exact(&mut got).unwrap();
            assert_eq!(&got[297..], b"r\x63\n");
            // The read still completes afterwards.
            client.write_all(b"ping\n").unwrap();
            assert_eq!(rx.recv_timeout(Duration::from_secs(5)).unwrap(), b"ping\n");

            // Same on the client side (what primordia-pipe-bridge relies on).
            let (tx, rx) = mpsc::channel();
            let mut client_reader = client.try_clone().unwrap();
            std::thread::spawn(move || {
                let mut b = [0u8; 16];
                let n = client_reader.read(&mut b).unwrap();
                tx.send(b[..n].to_vec()).unwrap();
            });
            std::thread::sleep(Duration::from_millis(100));
            let (wtx, wrx) = mpsc::channel();
            let mut cw = client.try_clone().unwrap();
            std::thread::spawn(move || {
                cw.write_all(b"request\n").unwrap();
                wtx.send(()).unwrap();
            });
            wrx.recv_timeout(Duration::from_secs(5)).expect("client write stalled behind a pending read");
            let mut got = [0u8; 8];
            server.read_exact(&mut got).unwrap();
            assert_eq!(&got, b"request\n");
            server.write_all(b"reply\n").unwrap();
            assert_eq!(rx.recv_timeout(Duration::from_secs(5)).unwrap(), b"reply\n");

            // EOF when the client hangs up.
            drop(client);
            let mut b = [0u8; 4];
            assert_eq!(server.read(&mut b).unwrap(), 0);
        }

        /// Control: the same pattern on a synchronous handle really does stall the
        /// write until the read completes, so the test above is meaningful.
        #[test]
        fn synchronous_handle_serializes_read_and_write() {
            let name = unique_name("sync");
            let w = wide(&name);
            let server = owned(unsafe {
                CreateNamedPipeW(
                    w.as_ptr(),
                    PIPE_ACCESS_DUPLEX,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                    1,
                    PIPE_BUFFER,
                    PIPE_BUFFER,
                    0,
                    std::ptr::null_mut(),
                )
            })
            .unwrap();
            let mut client = std::fs::OpenOptions::new().read(true).write(true).open(&name).unwrap();
            let mut server = std::fs::File::from(server);

            let mut reader_end = server.try_clone().unwrap();
            let (tx, rx) = mpsc::channel();
            std::thread::spawn(move || {
                let mut b = [0u8; 16];
                let n = reader_end.read(&mut b).unwrap();
                tx.send(b[..n].to_vec()).unwrap();
            });
            std::thread::sleep(Duration::from_millis(100));
            let (wtx, wrx) = mpsc::channel();
            std::thread::spawn(move || {
                server.write_all(b"reply\n").unwrap();
                wtx.send(()).unwrap();
            });
            assert!(
                wrx.recv_timeout(Duration::from_millis(500)).is_err(),
                "expected the synchronous write to wait for the pending read"
            );
            // Unblock the read; only then does the write go through.
            client.write_all(b"go\n").unwrap();
            assert_eq!(rx.recv_timeout(Duration::from_secs(5)).unwrap(), b"go\n");
            wrx.recv_timeout(Duration::from_secs(5)).unwrap();
            let mut got = [0u8; 6];
            client.read_exact(&mut got).unwrap();
            assert_eq!(&got, b"reply\n");
        }
    }
}
