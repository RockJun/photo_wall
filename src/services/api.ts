import type { MediaEntry } from "../types";

export interface LocalMediaResponse {
  media: MediaEntry[];
}

export async function fetchLocalImages(): Promise<MediaEntry[]> {
  const res = await fetch("/api/images");
  if (!res.ok) throw new Error("获取本地媒体失败");
  const data = (await res.json()) as LocalMediaResponse;
  return data.media;
}

export async function uploadImages(files: FileList): Promise<MediaEntry[]> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("images", f));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("上传失败");
  const data = (await res.json()) as LocalMediaResponse;
  return data.media;
}

export async function deleteImage(name: string): Promise<void> {
  const res = await fetch("/api/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("删除失败");
}
