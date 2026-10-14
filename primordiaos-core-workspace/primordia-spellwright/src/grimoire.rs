//! The grimoire: MCP methods, tools, key hashes and response fragments, packed
//! into the sigil the glyphs read. Constants mirror `shaders/common.glsl`.

pub const MAX_MSGS: usize = 4096;
pub const IN_CAP: usize = 1024 * 1024;
pub const OUT_CAP: usize = 4 * 1024 * 1024;
pub const SCRATCH_WORDS: usize = 4096;
pub const MSG_RECORD_WORDS: usize = 12;

// Spell IDs.
pub const SP_INITIALIZE: u32 = 10;
pub const SP_PING: u32 = 11;
pub const SP_TOOLS_LIST: u32 = 12;
pub const SP_TOOLS_CALL: u32 = 13;
pub const SP_AGENT_STATUS: u32 = 20;
pub const SP_READ_RELIQ: u32 = 21;
pub const SP_WRITE_RELIQ: u32 = 22;
pub const SP_HOST_LIST_DEVICES: u32 = 100;
pub const SP_HOST_PIPELINE_INFO: u32 = 101;

pub const PROTOCOL_VERSION: &str = "2025-06-18";

const METHODS: &[(&str, u32)] = &[
    ("initialize", SP_INITIALIZE),
    ("ping", SP_PING),
    ("tools/list", SP_TOOLS_LIST),
    ("tools/call", SP_TOOLS_CALL),
];

/// Order matches the K_* slots in common.glsl.
const KEYS: &[&str] = &[
    "id", "method", "params", "name", "arguments", "offset", "count", "values", "result", "error",
];

pub struct Tool {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: &'static str,
    pub spell: u32,
}

pub const TOOLS: &[Tool] = &[
    Tool {
        name: "mcp.vulkan.agentStatus",
        description: "GPU spell: report the agent's tick count and lifetime message, byte and host-spell counters, read from the control sigil on the GPU.",
        input_schema: r#"{"type":"object","properties":{}}"#,
        spell: SP_AGENT_STATUS,
    },
    Tool {
        name: "mcp.vulkan.readReliquary",
        description: "GPU spell: read up to 256 u32 words from the scratch reliquary (4096 words).",
        input_schema: r#"{"type":"object","properties":{"offset":{"type":"integer","minimum":0,"default":0},"count":{"type":"integer","minimum":1,"maximum":256,"default":16}}}"#,
        spell: SP_READ_RELIQ,
    },
    Tool {
        name: "mcp.vulkan.writeReliquary",
        description: "GPU spell: write u32 values into the scratch reliquary starting at offset.",
        input_schema: r#"{"type":"object","properties":{"offset":{"type":"integer","minimum":0,"default":0},"values":{"type":"array","items":{"type":"integer","minimum":0}}},"required":["values"]}"#,
        spell: SP_WRITE_RELIQ,
    },
    Tool {
        name: "mcp.vulkan.listDevices",
        description: "Host spell: enumerate Vulkan physical devices (name, type, API version, compute queues).",
        input_schema: r#"{"type":"object","properties":{}}"#,
        spell: SP_HOST_LIST_DEVICES,
    },
    Tool {
        name: "mcp.vulkan.pipelineInfo",
        description: "Host spell: describe the MCP glyph pipelines, their workgroup sizes, dispatch geometry and sigil bindings.",
        input_schema: r#"{"type":"object","properties":{}}"#,
        spell: SP_HOST_PIPELINE_INFO,
    },
];

pub fn fnv1a(bytes: &[u8]) -> u32 {
    bytes.iter().fold(2166136261u32, |h, &b| (h ^ b as u32).wrapping_mul(16777619))
}

pub fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn initialize_result() -> String {
    format!(
        r#"{{"protocolVersion":"{PROTOCOL_VERSION}","capabilities":{{"tools":{{"listChanged":false}}}},"serverInfo":{{"name":"primordia-spellwright","version":"{}"}},"instructions":"PrimordiaOS GPU-resident MCP layer. Requests are framed, parsed, routed and answered by Vulkan compute glyphs."}}"#,
        env!("CARGO_PKG_VERSION")
    )
}

fn tools_list_result() -> String {
    let tools: Vec<String> = TOOLS
        .iter()
        .map(|t| {
            format!(
                r#"{{"name":"{}","description":"{}","inputSchema":{}}}"#,
                escape(t.name),
                escape(t.description),
                t.input_schema
            )
        })
        .collect();
    format!(r#"{{"tools":[{}]}}"#, tools.join(","))
}

/// Byte fragments the response glyph composes replies from, in F_* order.
fn fragments() -> Vec<String> {
    let err = |code: i32, msg: &str| format!(r#","error":{{"code":{code},"message":"{msg}"}}}}"#) + "\n";
    vec![
        r#"{"jsonrpc":"2.0","id":"#.into(),
        "null".into(),
        r#","result":"#.into(),
        "}\n".into(),
        initialize_result(),
        tools_list_result(),
        "{}".into(),
        r#"{"content":[{"type":"text","text":""#.into(),
        r#""}],"isError":false}"#.into(),
        err(-32700, "Parse error"),
        err(-32600, "Invalid Request"),
        err(-32601, "Method not found"),
        err(-32602, "Unknown tool"),
        err(-32602, "Invalid arguments"),
        "tick=".into(),
        " messages=".into(),
        " bytes=".into(),
        " hostSpells=".into(),
        "wrote ".into(),
        " values at offset ".into(),
    ]
}

/// Packs (grimoire sigil bytes, template reliquary bytes).
pub fn inscribe() -> (Vec<u8>, Vec<u8>) {
    let mut templates = Vec::new();
    let mut frags = [[0u32; 2]; 32];
    for (i, f) in fragments().iter().enumerate() {
        frags[i] = [templates.len() as u32, f.len() as u32];
        templates.extend_from_slice(f.as_bytes());
    }

    let mut words: Vec<u32> = vec![METHODS.len() as u32, TOOLS.len() as u32, 0, 0];
    let mut keys = [0u32; 16];
    for (i, k) in KEYS.iter().enumerate() {
        keys[i] = fnv1a(k.as_bytes());
    }
    words.extend_from_slice(&keys);
    words.extend(frags.iter().flatten());
    for (name, spell) in METHODS {
        words.extend([fnv1a(name.as_bytes()), *spell]);
    }
    for t in TOOLS {
        words.extend([fnv1a(t.name.as_bytes()), t.spell]);
    }

    let grimoire = words.iter().flat_map(|w| w.to_le_bytes()).collect();
    (grimoire, templates)
}
