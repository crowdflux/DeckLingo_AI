// server.js
import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ------- __dirname support for ES modules -------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------- App setup -------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------- Serve static files from public -------
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// ------- HARD OVERRIDE: user_guide must serve actual guide -------
app.get("/user_guide/*", (req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.path);
  console.log("Serving guide:", filePath);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // fallback always goes to guide index
  return res.sendFile(path.join(PUBLIC_DIR, "user_guide", "index.html"));
});

// ------- uploads -------
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
const upload = multer({ dest: UPLOAD_DIR });

// ------- ENV validation -------
const BASE = process.env.PAPAGO_BASE;
const ID = process.env.NCP_KEY_ID;
const KEY = process.env.NCP_KEY;

for (const [val, name] of [
  [BASE, "PAPAGO_BASE"],
  [ID, "NCP_KEY_ID"],
  [KEY, "NCP_KEY"]
]) {
  if (!val) throw new Error(`Missing required env: ${name}`);
}

// ------- Translate route (unchanged) -------
app.post("/api/translate", upload.single("file"), async (req, res) => {
  try {
    const { source, target } = req.body;
    if (!source || !target) return res.status(400).json({ error: "source/target required" });

    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ error: "File required" });

    const fd = new FormData();
    fd.append("source", source);
    fd.append("target", target);
    fd.append("file", fs.createReadStream(filePath), { filename: req.file.originalname });

    const tResp = await axios.post(`${BASE}/translate`, fd, {
      headers: { ...fd.getHeaders(), "X-NCP-APIGW-API-KEY-ID": ID, "X-NCP-APIGW-API-KEY": KEY },
      timeout: 180000
    });

    const requestId = tResp.data?.data?.requestId;
    if (!requestId) throw new Error("Invalid requestId");

    const headers = { "X-NCP-APIGW-API-KEY-ID": ID, "X-NCP-APIGW-API-KEY": KEY };

    let status;
    const end = Date.now() + 12 * 60 * 1000;
    while (Date.now() < end) {
      const s = await axios.get(`${BASE}/status`, { params: { requestId }, headers });
      status = s.data?.data?.status;
      if (status === "COMPLETE") break;
      if (status === "FAILED") throw new Error("Translation failed");
      await new Promise(r => setTimeout(r, 1500));
    }

    if (status !== "COMPLETE") throw new Error("Timeout");

    const dResp = await axios.get(`${BASE}/download`, {
      params: { requestId },
      headers,
      responseType: "stream"
    });

    res.setHeader("Content-Disposition", `attachment; filename="translated.pptx"`);
    dResp.data.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
});

// ------- SPA fallback (ONLY for non-user_guide paths) -------
app.get("*", (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ------- Start server -------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Running at http://localhost:${PORT}`);
});
