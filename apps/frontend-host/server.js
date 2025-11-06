const fs = require("node:fs");
const path = require("node:path");

const express = require("express");

const LOCAL_DIST = path.join(__dirname, "..", "frontend", "dist");
const BUNDLED_DIST = path.join(__dirname, "dist");
const DIST_DIR = fs.existsSync(LOCAL_DIST) ? LOCAL_DIST : BUNDLED_DIST;

const app = express();

app.use(
  "/assets",
  express.static(path.join(DIST_DIR, "assets"), {
    immutable: true,
    maxAge: "1h"
  })
);

app.use(express.static(DIST_DIR));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`Frontend host listening on http://0.0.0.0:${port}`);
  }
});
