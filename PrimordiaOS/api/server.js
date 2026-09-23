// api/server.js

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs"
  }
});

require("./server.ts");
