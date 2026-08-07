// Minimal static server for the Playwright e2e fixture.
// Serves tests/fixtures/* at http://127.0.0.1:8787.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const DIR = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:" + PORT);
  let p = url.pathname;
  if (p === "/") p = "/security-page.html";
  // Reject path traversal.
  const file = path.normalize(path.join(DIR, p));
  if (!file.startsWith(DIR + path.sep)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log("fixture server listening on http://127.0.0.1:" + PORT);
});
