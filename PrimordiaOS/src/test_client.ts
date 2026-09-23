import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("🔌 Connecting agent worker to PrimordiaOS Memory Server...");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "C:/Users/Shane/documents/dev/primordiaos/src/index.ts"]
  });

  const client = new Client(
    { name: "agent_worker", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connected successfully!");

  // 1. Log a task execution failure into memory
  console.log("📝 Logging execution failure into memory...");
  await client.callTool({
    name: "memory_log_failure",
    arguments: {
      task_id: "task_build_kernel_01",
      realm_id: "cloud_shell",
      error_signature: "ERR_MISSING_TOOLCHAIN_GCC",
      attempted_approach: "gcc -o main main.c",
      root_cause: "GCC toolchain not present on standard runtime image.",
      suggested_bypass: "Install build-essential via apt or target clang."
    }
  });

  // 2. Query memory for warnings before attempting the same task
  console.log("🔍 Checking memory warnings...");
  const warnings = await client.callTool({
    name: "memory_check_warnings",
    arguments: {
      error_signature: "ERR_MISSING_TOOLCHAIN_GCC",
      realm_id: "cloud_shell"
    }
  });

  console.log("⚠️ Warnings received:\n", JSON.stringify(warnings, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal client error:", err);
  process.exit(1);
});