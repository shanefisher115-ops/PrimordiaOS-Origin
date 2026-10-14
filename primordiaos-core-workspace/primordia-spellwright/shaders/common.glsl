// Shared sigils (descriptor bindings), spell IDs and byte helpers for every glyph.
// Every constant here is mirrored in src/grimoire.rs — change both together.

#define MAX_MSGS      4096u
#define OUT_CAP       (4u * 1024u * 1024u)
#define SCRATCH_WORDS 4096u
#define NOT_FOUND     0xFFFFFFFFu

// ---- Spell IDs -------------------------------------------------------------
#define SP_NONE          0u   // empty line, notification, or client response: no reply
#define SP_UNKNOWN       1u   // -32601 Method not found
#define SP_PARSE_ERR     2u   // -32700 Parse error
#define SP_INVALID       3u   // -32600 Invalid Request
#define SP_UNKNOWN_TOOL  4u   // -32602 Unknown tool
#define SP_BAD_ARGS      5u   // -32602 Invalid arguments
#define SP_INITIALIZE   10u
#define SP_PING         11u
#define SP_TOOLS_LIST   12u
#define SP_TOOLS_CALL   13u
#define SP_AGENT_STATUS 20u   // GPU-resident tool spells
#define SP_READ_RELIQ   21u
#define SP_WRITE_RELIQ  22u
#define SP_HOST_BASE   100u   // >= this: the host performs the Vulkan API call

// ---- Key-hash slots in the grimoire header ---------------------------------
#define K_ID        0
#define K_METHOD    1
#define K_PARAMS    2
#define K_NAME      3
#define K_ARGUMENTS 4
#define K_OFFSET    5
#define K_COUNT     6
#define K_VALUES    7
#define K_RESULT    8
#define K_ERROR     9

// ---- Response fragment IDs (bytes live in the template reliquary) ----------
#define F_HEAD        0u
#define F_NULL        1u
#define F_RESULT      2u
#define F_END         3u
#define F_INIT        4u
#define F_TOOLS       5u
#define F_EMPTY       6u
#define F_TEXT_OPEN   7u
#define F_TEXT_CLOSE  8u
#define F_ERR_PARSE   9u
#define F_ERR_INVALID 10u
#define F_ERR_METHOD  11u
#define F_ERR_TOOL    12u
#define F_ERR_ARGS    13u
#define F_ST_TICKS    14u
#define F_ST_MSGS     15u
#define F_ST_BYTES    16u
#define F_ST_HOST     17u
#define F_WROTE       18u
#define F_VALUES      19u

struct MsgRecord {
    uint start;  uint end;       // trimmed message span in the request reliquary
    uint id_s;   uint id_e;      // raw JSON id token (id_e == id_s: absent)
    uint params_s; uint params_e;
    uint args_s; uint args_e;    // tools/call "arguments"
    uint spell;
    uint aux0; uint aux1; uint aux2;
};

layout(std430, set = 0, binding = 0) readonly buffer RequestReliquary { uint in_words[]; };
layout(std430, set = 0, binding = 1) buffer ControlSigil {
    uint in_len; uint msg_count; uint consumed; uint out_len;
    uint host_call_count; uint flags;
    uint tick; uint total_msgs; uint total_bytes; uint total_host_calls;
    uint _pad[6];
} ctl;
layout(std430, set = 0, binding = 2) buffer MessageSigil { MsgRecord msgs[]; };
layout(std430, set = 0, binding = 3) buffer ResponseReliquary { uint out_words[]; };
layout(std430, set = 0, binding = 4) readonly buffer Grimoire {
    uint method_count; uint tool_count; uint _g0; uint _g1;
    uint keys[16];
    uvec2 frags[32];   // (byte offset, byte length) into the template reliquary
    uvec2 entries[];   // methods, then tools: (fnv1a hash, spell)
} gr;
layout(std430, set = 0, binding = 5) readonly buffer TemplateReliquary { uint tmpl_words[]; };
layout(std430, set = 0, binding = 6) buffer HostCallSigil { uvec2 host_calls[]; };
layout(std430, set = 0, binding = 7) buffer ScratchReliquary { uint scratch[]; };

uint rb(uint p) { return (in_words[p >> 2] >> ((p & 3u) * 8u)) & 0xFFu; }
uint tb(uint p) { return (tmpl_words[p >> 2] >> ((p & 3u) * 8u)) & 0xFFu; }
