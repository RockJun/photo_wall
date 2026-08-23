import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, "../data/uploads");

// 外部图库目录：启动时自动扫描其中的图片并展示（不在项目内，通过静态路径暴露）
// 默认使用当前用户主目录下的「图片」文件夹，避免硬编码具体用户名
export const EXTERNAL_DIR = process.env.EXTERNAL_IMAGE_DIR || path.join(os.homedir(), "图片");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp"]);
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function sanitizeFilename(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("不支持的文件类型");
  }
  const base = path
    .basename(name, ext)
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, "_")
    .slice(0, 40);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || "img"}_${stamp}_${rand}${ext}`;
}

export async function listUploadedFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(UPLOAD_DIR);
    return entries.filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()));
  } catch {
    return [];
  }
}

export async function deleteFile(filename: string): Promise<void> {
  const safe = path.basename(filename);
  const target = path.join(UPLOAD_DIR, safe);
  if (!target.startsWith(UPLOAD_DIR)) throw new Error("非法路径");
  await fs.rm(target, { force: true });
}

/** 扫描外部图库目录（用户主目录下的「图片」文件夹），返回其相对 URL（通过 /ext 静态路径访问） */
export async function listExternalFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(EXTERNAL_DIR);
    return entries
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .map((f) => `/ext/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}
