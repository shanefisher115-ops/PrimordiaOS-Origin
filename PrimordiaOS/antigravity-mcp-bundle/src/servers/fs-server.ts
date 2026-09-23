import fs from "fs/promises";

const readFileTool = {
  name: "fs.readFile",
  description: "Read a file from disk",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  },
  outputSchema: { type: "string" },
  execute: async (input: any) => {
    return await fs.readFile(input.path, "utf8");
  }
};

const writeFileTool = {
  name: "fs.writeFile",
  description: "Write a file to disk",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" }
    },
    required: ["path", "content"]
  },
  outputSchema: { type: "string" },
  execute: async (input: any) => {
    await fs.writeFile(input.path, input.content, "utf8");
    return "ok";
  }
};

export default [readFileTool, writeFileTool];
