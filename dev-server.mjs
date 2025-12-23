import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5173);

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safeResolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = decoded.replace(/\0/g, "");
  const fsPath = path.normalize(path.join(__dirname, cleaned));

  if (!fsPath.startsWith(__dirname)) {
    return null;
  }
  return fsPath;
}

function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const urlPath = req.url || "/";
  const resolved = safeResolvePath(urlPath);
  if (!resolved) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  let filePath = resolved;
  const st = statSafe(filePath);

  if (st && st.isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  const stFile = statSafe(filePath);
  if (!stFile || !stFile.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeByExt[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });

  if (method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving ${__dirname} at http://localhost:${PORT}`);
});
