console.log("PrimordiaOS Kernel: Executive Branch Online");

const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("PrimordiaOS Kernel Running");
});

server.listen(7000, () => {
  console.log("Kernel listening on port 7000");
});
