import { Router } from "express";
import multer from "multer";
import { ensureUploadDir, sanitizeFilename, listUploadedFiles, deleteFile, listExternalFiles, UPLOAD_DIR, MAX_VIDEO_SIZE } from "../storage.js";

await ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    try {
      cb(null, sanitizeFilename(file.originalname));
    } catch (e) {
      cb(e as Error, "");
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("仅支持图片或视频文件"));
  },
});

const router = Router();

router.get("/images", async (_req, res) => {
  const [uploads, external] = await Promise.all([listUploadedFiles(), listExternalFiles()]);
  const media = [...uploads, ...external];
  res.json({ media });
});

router.post("/upload", upload.array("images", 20), (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  res.json({ media: files.map((f) => ({ url: `/uploads/${f.filename}`, type: f.mimetype.startsWith("video/") ? "video" as const : "image" as const })) });
});

router.delete("/images", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "缺少 name" });
    return;
  }
  await deleteFile(name);
  res.json({ ok: true });
});

export default router;
