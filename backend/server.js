// The BACKEND: a small API with no dependencies (nothing to npm install).
//
//   GET    /notes       list all notes
//   POST   /notes       add a note      body: {"text": "hello"}
//   DELETE /notes/:id   delete a note
//   GET    /health      used by Kubernetes to check the container
//
// Notes are kept in memory, so they disappear when the container restarts.
const http = require("http");
const os = require("os");

const PORT = process.env.PORT || 3000;
let notes = [];
let nextId = 1;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const url = req.url.split("?")[0];

    // One log line per request: this is how you SEE the frontend calling the backend
    // (kubectl logs deployment/backend -f)
    if (url !== "/health") console.log(`${req.method} ${url}`);

    if (url === "/health") return send(res, 200, { status: "ok" });

    if (url === "/notes" && req.method === "GET") {
      // pod = name of the container that answered (the hostname inside Docker/Kubernetes)
      return send(res, 200, { pod: os.hostname(), notes });
    }

    if (url === "/notes" && req.method === "POST") {
      const { text } = await readJson(req);
      if (!text || !String(text).trim()) return send(res, 400, { error: "text is required" });
      const note = { id: nextId++, text: String(text).trim().slice(0, 200) };
      notes.push(note);
      return send(res, 201, note);
    }

    const match = url.match(/^\/notes\/(\d+)$/);
    if (match && req.method === "DELETE") {
      notes = notes.filter((n) => n.id !== Number(match[1]));
      return send(res, 200, { deleted: Number(match[1]) });
    }

    send(res, 404, { error: "not found" });
  })
  .listen(PORT, () => console.log(`backend listening on ${PORT}`));
