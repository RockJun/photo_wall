import { Router } from "express";
import multer from "multer";
import { ensureUploadDir, sanitizeFilename, listUploadedFiles, deleteFile, listExternalFiles, UPLOAD_DIR, MAX_FILE_SIZE } from "../storage.js";

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
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("仅支持图片文件"));
  },
});

const router = Router();

router.get("/images", async (_req, res) => {
  const [files, external] = await Promise.all([listUploadedFiles(), listExternalFiles()]);
  const images = [
    ...files.map((f) => `/uploads/${f}`),
    ...external,
  ];
  res.json({ images });
});

router.post("/upload", upload.array("images", 20), (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  res.json({ images: files.map((f) => `/uploads/${f.filename}`) });
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
