// 一组科技感配色，用于本地生成的渐变占位图
const PALETTES: [string, string, string][] = [
  ["#6366F1", "#8B5CF6", "#22D3EE"],
  ["#0EA5E9", "#22D3EE", "#34D399"],
  ["#F472B6", "#8B5CF6", "#6366F1"],
  ["#F59E0B", "#EF4444", "#EC4899"],
  ["#10B981", "#14B8A6", "#06B6D4"],
  ["#8B5CF6", "#6366F1", "#3B82F6"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 生成一张本地渐变 + 几何装饰的 SVG 占位图（data URL，零网络依赖）。
 * 用于网络图不可达或本地图为空时的兜底图源，保证照片墙始终"有图可换"。
 */
export function makePlaceholder(seed: string, w: number, h: number): string {
  const p = PALETTES[hashStr(seed) % PALETTES.length];
  const r1 = hashStr(seed + "a") % 100;
  const r2 = hashStr(seed + "b") % 100;
  const r3 = hashStr(seed + "c") % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p[0]}"/>
      <stop offset="55%" stop-color="${p[1]}"/>
      <stop offset="100%" stop-color="${p[2]}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${(r1 / 100) * w}" cy="${(r2 / 100) * h}" r="${w * 0.35}" fill="#ffffff" opacity="0.08"/>
  <circle cx="${w - (r1 / 100) * w}" cy="${h - (r2 / 100) * h}" r="${w * 0.22}" fill="#000000" opacity="0.12"/>
  <g transform="rotate(${r3} ${w / 2} ${h / 2})">
    <rect x="${w * 0.2}" y="${h * 0.2}" width="${w * 0.6}" height="${h * 0.6}" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
