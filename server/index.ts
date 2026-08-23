import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import imagesRouter from "./routes/images.js";
import { UPLOAD_DIR, EXTERNAL_DIR } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", imagesRouter);
app.use("/uploads", express.static(UPLOAD_DIR));
// 暴露外部图库目录（如 /home/ma/图片）
app.use("/ext", express.static(EXTERNAL_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`[photo-wall] API server on http://localhost:${PORT}`);
});
