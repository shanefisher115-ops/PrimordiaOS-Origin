//! Transport-independent core of the multi-client servers (spellwright-daemon over
//! TCP, primordia-engine over named pipes / Unix sockets).
//!
//! Each connection speaks newline-delimited JSON-RPC (the stdio framing). Reader
//! threads push complete lines into one queue; the GPU thread gathers lines from
//! all clients for a short batching window, runs a single tick over the
//! concatenation, and routes each reply back by the byte offset of the message
//! it answers (`ReplySpan::msg_start` / `HostCall::msg_start`), since different
//! clients reuse the same JSON-RPC ids.
//!
//! A transport only has to: call [`Intake::connect`] per accepted connection, run
//! [`Connection::read_lines`] on the read side and [`write_replies`] on the write
//! side (each on its own thread), and run [`run`] on the GPU thread.

use crate::grimoire::{IN_CAP, MAX_MSGS};
use crate::{host_spells, ritual};
use std::collections::{HashMap, HashSet, VecDeque};
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::time::{Duration, Instant};

const TOO_LARGE: &[u8] =
    b"{\"jsonrpc\":\"2.0\",\"id\":null,\"error\":{\"code\":-32600,\"message\":\"Message exceeds request reliquary\"}}\n";
const TOO_MANY_REPLIES: &[u8] =
    b"{\"jsonrpc\":\"2.0\",\"id\":null,\"error\":{\"code\":-32603,\"message\":\"Reply exceeds response reliquary\"}}\n";

/// Below this much remaining window, wait by yielding rather than an OS timed wait.
const SHORT_WAIT: Duration = Duration::from_millis(2);

pub type ClientId = u64;

pub enum Event {
    Connected(ClientId, Sender<Vec<u8>>),
    Line(ClientId, Vec<u8>),
    Closed(ClientId),
}

/// Batching knobs shared by every transport.
pub struct Config {
    pub window: Duration,
    pub max_batch: usize,
    pub verbose: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config { window: Duration::from_micros(0), max_batch: 256, verbose: false }
    }
}

impl Config {
    /// Consumes `--window-us N`, `--max-batch N` or `--verbose`/`-v` if `arg` is one of them.
    pub fn take_flag(&mut self, arg: &str, args: &mut impl Iterator<Item = String>) -> Result<bool, String> {
        let mut value = |name: &str| args.next().ok_or(format!("{name} needs a value"));
        match arg {
            "--window-us" => {
                self.window = Duration::from_micros(value(arg)?.parse().map_err(|e| format!("{arg}: {e}"))?)
            }
            "--max-batch" => {
                let n: usize = value(arg)?.parse().map_err(|e| format!("{arg}: {e}"))?;
                self.max_batch = n.clamp(1, MAX_MSGS);
            }
            "--verbose" | "-v" => self.verbose = true,
            _ => return Ok(false),
        }
        Ok(true)
    }
}

/// Hands out client ids and registers each connection with the GPU thread.
pub struct Intake {
    tx: Sender<Event>,
    next_id: ClientId,
}

/// The read side of one registered connection.
pub struct Connection {
    id: ClientId,
    tx: Sender<Event>,
    replies: Sender<Vec<u8>>,
}

/// The queue between transports and [`run`].
pub fn channel() -> (Intake, Receiver<Event>) {
    let (tx, rx) = mpsc::channel();
    (Intake { tx, next_id: 0 }, rx)
}

impl Intake {
    /// Registers a new client. Returns its read side and the queue of reply bytes to
    /// write to it, or None once the GPU thread has gone.
    pub fn connect(&mut self) -> Option<(Connection, Receiver<Vec<u8>>)> {
        self.next_id += 1;
        let id = self.next_id;
        let (wtx, wrx) = mpsc::channel::<Vec<u8>>();
        // Register before any of this client's lines can reach the queue.
        self.tx.send(Event::Connected(id, wtx.clone())).ok()?;
        Some((Connection { id, tx: self.tx.clone(), replies: wtx }, wrx))
    }
}

/// Owns the connection's write side so a slow client never stalls the GPU thread.
/// Returns once the daemon is done with this client (or a write fails); the caller
/// then closes or half-closes the stream.
pub fn write_replies<W: Write>(stream: &mut W, rx: Receiver<Vec<u8>>) {
    for chunk in rx {
        if stream.write_all(&chunk).and_then(|_| stream.flush()).is_err() {
            break;
        }
    }
}

impl Connection {
    /// Splits the stream into complete lines, never buffering more than IN_CAP per line.
    /// Returns at EOF or on a read error, after telling the GPU thread.
    pub fn read_lines<R: Read>(self, stream: R) {
        let Connection { id, tx, replies } = self;
        let mut r = BufReader::with_capacity(64 * 1024, stream);
        let mut line: Vec<u8> = Vec::new();
        let mut oversized = false;
        loop {
            let buf = match r.fill_buf() {
                Ok([]) | Err(_) => break,
                Ok(b) => b,
            };
            let (take, done) = match buf.iter().position(|&b| b == b'\n') {
                Some(p) => (p + 1, true),
                None => (buf.len(), false),
            };
            if !oversized {
                line.extend_from_slice(&buf[..take]);
                if line.len() > IN_CAP {
                    oversized = true;
                    line = Vec::new();
                }
            }
            r.consume(take);
            if done {
                if oversized {
                    let _ = replies.send(TOO_LARGE.to_vec());
                } else if line.iter().any(|b| !b.is_ascii_whitespace()) {
                    if tx.send(Event::Line(id, std::mem::take(&mut line))).is_err() {
                        return;
                    }
                }
                line.clear();
                oversized = false;
            }
        }
        // A final line without '\n' still counts, as with stdio EOF.
        if !oversized && line.iter().any(|b| !b.is_ascii_whitespace()) {
            line.push(b'\n');
            let _ = tx.send(Event::Line(id, line));
        }
        let _ = tx.send(Event::Closed(id));
    }
}

struct Clients {
    writers: HashMap<ClientId, Sender<Vec<u8>>>,
    closing: HashSet<ClientId>,
}

impl Clients {
    fn handle(&mut self, ev: Event, carry: &mut VecDeque<(ClientId, Vec<u8>)>) {
        match ev {
            Event::Connected(id, w) => {
                self.writers.insert(id, w);
            }
            Event::Line(id, l) => carry.push_back((id, l)),
            Event::Closed(id) => {
                self.closing.insert(id);
            }
        }
    }

    /// Connected clients that may still send requests.
    fn live(&self) -> usize {
        self.writers.keys().filter(|id| !self.closing.contains(id)).count()
    }

    fn send(&mut self, id: ClientId, bytes: Vec<u8>) {
        if let Some(w) = self.writers.get(&id) {
            if w.send(bytes).is_err() {
                // Writer gave up (client went away): drop its replies from now on.
                self.writers.remove(&id);
            }
        }
    }

    /// Forget clients that hung up once none of their requests are still queued.
    fn reap(&mut self, carry: &VecDeque<(ClientId, Vec<u8>)>) {
        if self.closing.is_empty() {
            return;
        }
        let queued: HashSet<ClientId> = carry.iter().map(|(c, _)| *c).collect();
        self.closing.retain(|id| {
            if queued.contains(id) {
                true
            } else {
                self.writers.remove(id);
                false
            }
        });
    }
}

/// The GPU thread: batches queued lines, ticks, routes replies. `tag` prefixes log lines.
/// Returns when every [`Intake`] and [`Connection`] has been dropped.
pub fn run(ritual: &mut ritual::Ritual, rx: &Receiver<Event>, cfg: &Config, tag: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut clients = Clients { writers: HashMap::new(), closing: HashSet::new() };
    let mut carry: VecDeque<(ClientId, Vec<u8>)> = VecDeque::new();
    let mut input: Vec<u8> = Vec::with_capacity(IN_CAP);
    // (start, end, client) of each line in `input`, sorted by start.
    let mut spans: Vec<(usize, usize, ClientId)> = Vec::new();

    loop {
        // ---- gather ----
        if carry.is_empty() {
            clients.reap(&carry);
            while carry.is_empty() {
                match rx.recv() {
                    Ok(ev) => clients.handle(ev, &mut carry),
                    Err(_) => return Ok(()),
                }
                // A hang-up while idle: release its writer so the stream gets closed.
                clients.reap(&carry);
            }
        }
        let deadline = Instant::now() + cfg.window;
        let mut queued_bytes: usize = carry.iter().map(|(_, l)| l.len()).sum();
        let mut waiting: HashSet<ClientId> = carry.iter().map(|(c, _)| *c).collect();
        while carry.len() < cfg.max_batch && queued_bytes < IN_CAP {
            let ev = match rx.try_recv() {
                Ok(ev) => ev,
                Err(_) => {
                    // Every live client already has a request queued: nobody else can join this batch.
                    if waiting.len() >= clients.live() {
                        break;
                    }
                    let now = Instant::now();
                    if now >= deadline {
                        break;
                    }
                    let left = deadline - now;
                    if left <= SHORT_WAIT {
                        // OS timed waits round up to the scheduler tick (~15.6ms on Windows),
                        // so the tail of a sub-ms window is a yield loop instead.
                        std::thread::yield_now();
                        continue;
                    }
                    match rx.recv_timeout(left - SHORT_WAIT) {
                        Ok(ev) => ev,
                        Err(RecvTimeoutError::Timeout) => continue,
                        Err(RecvTimeoutError::Disconnected) => break,
                    }
                }
            };
            if let Event::Line(c, l) = &ev {
                queued_bytes += l.len();
                waiting.insert(*c);
            }
            clients.handle(ev, &mut carry);
        }

        // ---- build the batch: whole lines only, at most IN_CAP bytes / max_batch lines ----
        let mut take = 0;
        let mut bytes = 0;
        for (_, l) in carry.iter() {
            if take == cfg.max_batch || bytes + l.len() > IN_CAP {
                break;
            }
            bytes += l.len();
            take += 1;
        }

        // ---- tick, halving on overflow (as the stdio server does) ----
        let t0 = Instant::now();
        let planned = take;
        let result = loop {
            input.clear();
            spans.clear();
            for (c, l) in carry.iter().take(take) {
                spans.push((input.len(), input.len() + l.len(), *c));
                input.extend_from_slice(l);
            }
            let r = ritual.tick(&input)?;
            if r.overflow && take > 1 {
                take /= 2;
                continue;
            }
            break r;
        };
        let tick_us = t0.elapsed().as_micros();

        if result.overflow {
            // A single message whose replies do not fit: report and drop it.
            let (c, _) = carry.pop_front().expect("batch has one line");
            clients.send(c, TOO_MANY_REPLIES.to_vec());
            continue;
        }

        // ---- route replies by the offset of the message they answer ----
        let owner = |msg_start: usize| -> Option<ClientId> {
            let i = spans.partition_point(|&(s, _, _)| s <= msg_start);
            let &(_, e, c) = spans.get(i.checked_sub(1)?)?;
            (msg_start < e).then_some(c)
        };
        let mut routed: Vec<(usize, ClientId, Vec<u8>)> = Vec::with_capacity(result.replies.len() + result.host_calls.len());
        let mut unrouted = 0usize;
        for rep in &result.replies {
            let Some(c) = owner(rep.msg_start) else {
                unrouted += 1;
                continue;
            };
            let end = (rep.out_offset + rep.out_len).min(result.out.len());
            let start = rep.out_offset.min(end);
            routed.push((rep.msg_start, c, result.out[start..end].to_vec()));
        }
        for call in &result.host_calls {
            let Some(c) = owner(call.msg_start) else {
                unrouted += 1;
                continue;
            };
            routed.push((call.msg_start, c, host_spells::cast(ritual, call)));
        }
        // Each client gets its replies in request order, in one write.
        routed.sort_by_key(|&(m, _, _)| m);
        let mut per_client: Vec<(ClientId, Vec<u8>)> = Vec::new();
        for (_, c, bytes) in routed {
            match per_client.iter_mut().find(|(pc, _)| *pc == c) {
                Some((_, buf)) => buf.extend_from_slice(&bytes),
                None => per_client.push((c, bytes)),
            }
        }
        let clients_in_batch = per_client.len();
        for (c, buf) in per_client {
            clients.send(c, buf);
        }

        // ---- retire consumed lines ----
        let consumed = result.consumed.min(input.len());
        let mut retired = spans.iter().take_while(|&&(_, e, _)| e <= consumed).count();
        if retired == 0 {
            // Nothing framed (should not happen with whole lines): drop one to make progress.
            retired = 1;
            if let Some(&(_, _, c)) = spans.first() {
                clients.send(c, TOO_LARGE.to_vec());
            }
        }
        carry.drain(..retired.min(carry.len()));
        clients.reap(&carry);

        if cfg.verbose {
            eprintln!(
                "{tag}: batch {} msgs / {} B from {} clients, tick {}us{}{}{}",
                retired,
                consumed,
                clients_in_batch,
                tick_us,
                ritual.last_gpu_ns.map_or(String::new(), |ns| format!(" (gpu {:.0}us)", ns / 1000.0)),
                if take < planned { " [halved]" } else { "" },
                if unrouted > 0 { format!(" [{unrouted} unrouted]") } else { String::new() }
            );
        }
    }
}
