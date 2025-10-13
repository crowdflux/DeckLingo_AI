import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static("public"));

// ensure uploads directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: `${UPLOAD_DIR}/` });

const BASE = process.env.PAPAGO_BASE || "https://naveropenapi.apigw.ntruss.com/doc-trans/v1";
const ID = process.env.NCP_KEY_ID;
const KEY = process.env.NCP_KEY;

// validate required envs early
function must(value, name) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    throw new Error(`Missing required env: ${name}`);
  }
}
must(ID, "NCP_KEY_ID");
must(KEY, "NCP_KEY");

app.post("/api/translate", upload.single("file"), async (req, res) => {
  const { source, target } = req.body || {};
  const filePath = req.file?.path;
  if (!source || !target) return res.status(400).json({ error: "source and target are required" });
  if (!filePath) return res.status(400).json({ error: "file is required (.pptx, .docx, .pdf)" });

  try {
    const fd = new FormData();
    fd.append("source", source);
    fd.append("target", target);
    fd.append("file", fs.createReadStream(filePath), { filename: req.file.originalname });

    // 1) translate
    const tResp = await axios.post(`${BASE}/translate`, fd, {
      headers: { ...fd.getHeaders(), "X-NCP-APIGW-API-KEY-ID": ID, "X-NCP-APIGW-API-KEY": KEY },
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const requestId = tResp.data?.data?.requestId;
    if (!requestId) throw new Error("No requestId from translate");

    // 2) poll for status
    const headers = { "X-NCP-APIGW-API-KEY-ID": ID, "X-NCP-APIGW-API-KEY": KEY };
    const deadline = Date.now() + 12 * 60 * 1000;
    let status = "QUEUED";
    while (Date.now() < deadline) {
      const s = await axios.get(`${BASE}/status`, { params: { requestId }, headers, timeout: 30000 });
      status = s.data?.data?.status;
      if (status === "COMPLETE") break;
      if (status === "FAILED") throw new Error("Translation failed");
      await new Promise(r => setTimeout(r, 1500));
    }
    if (status !== "COMPLETE") throw new Error("Timed out waiting for translation");

    // 3) download
    const dResp = await axios.get(`${BASE}/download`, {
      params: { requestId },
      headers,
      responseType: "stream",
      timeout: 180000,
    });

    // New code: dynamically set Content-Type & output filename
    const origName = req.file.originalname;
    const ext = path.extname(origName).toLowerCase(); // e.g. ".pptx", ".docx", ".pdf"
    const nameBase = path.basename(origName, ext);
    const safeTarget = target.replace(/[^A-Za-z0-9]/g, "_");

    let contentType;
    switch (ext) {
      case ".pptx":
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      case ".docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      default:
        contentType = "application/octet-stream";
    }

    const outFilename = `${nameBase}_${safeTarget}${ext}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${outFilename}"`);

    dResp.data.pipe(res);
  } catch (e) {
    console.error("Error:", e?.response?.data || e);
    res.status(500).json({ error: e?.message || "translate failed", upstream: e?.response?.data || null });
  } finally {
    // remove uploaded file
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Failed to delete upload:", req.file.path, err);
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running. Local: http://localhost:${PORT}`);
});
