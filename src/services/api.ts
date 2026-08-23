export interface LocalListResponse {
  images: string[];
}

export async function fetchLocalImages(): Promise<string[]> {
  const res = await fetch("/api/images");
  if (!res.ok) throw new Error("获取本地图片失败");
  const data = (await res.json()) as LocalListResponse;
  return data.images;
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("images", f));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("上传失败");
  const data = (await res.json()) as LocalListResponse;
  return data.images;
}

export async function deleteImage(name: string): Promise<void> {
  const res = await fetch("/api/images", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("删除失败");
}
