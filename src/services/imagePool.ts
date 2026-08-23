import type { ImageItem } from "../types";
import { makePlaceholder } from "./placeholder";

const REMOTE_SEEDS = [
  "aurora", "nebula", "canyon", "frost", "ember", "lagoon",
  "dune", "glacier", "meadow", "metro", "harbor", "ridge",
  "bloom", "coral", "summit", "tide", "verde", "onyx",
  "lumen", "zephyr", "cobalt", "amber", "jade", "quartz",
  "arctic", "bastion", "cipher", "drift", "ember2", "fjord",
  "garnet", "horizon", "indigo", "juno", "kraken", "lazarus",
  "meridian", "nimbus", "obsidian", "pirate", "quasar", "rivet",
  "sapphire", "titan", "utopia", "vesper", "wraith", "xenon",
];

function picsumUrl(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HEIGHT_TIERS = [160, 220, 280, 340, 420, 480];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 为格子分配不规则 span，模拟横竖照片与大小变化：
 * - 竖图 portrait：1 列 x 2 行
 * - 横图 landscape：2 列 x 1 行
 * - 大图 feature：2 列 x 2 行
 * - 方图 square：1 列 x 1 行
 */
function cellSpan(seed: string): { colSpan: number; rowSpan: number } {
  const r = hashStr(seed) % 100;
  if (r < 14) return { colSpan: 2, rowSpan: 2 }; // 大图
  if (r < 34) return { colSpan: 2, rowSpan: 1 }; // 横图
  if (r < 52) return { colSpan: 1, rowSpan: 2 }; // 竖图
  return { colSpan: 1, rowSpan: 1 }; // 方图
}

export function buildRemotePool(count: number, usePicsum: boolean): ImageItem[] {
  const seeds = shuffle(REMOTE_SEEDS).slice(0, count);
  return seeds.map((seed, i) => {
    const h = HEIGHT_TIERS[i % HEIGHT_TIERS.length];
    const w = 320;
    const span = cellSpan(seed);
    return {
      id: `remote-${seed}`,
      url: usePicsum ? picsumUrl(seed, w, h) : makePlaceholder(seed, w, h),
      source: "remote" as const,
      w,
      h,
      ...span,
    };
  });
}

export function buildPool(localUrls: string[], remoteRatio: number, usePicsum: boolean): ImageItem[] {
  const local: ImageItem[] = localUrls.map((url, i) => {
    const span = cellSpan("local-" + i);
    return {
      id: `local-${i}`,
      url,
      source: "local" as const,
      w: 320,
      h: HEIGHT_TIERS[i % HEIGHT_TIERS.length],
      ...span,
    };
  });

  // remoteRatio = 0 且没有本地图时，生成最小占位池兜底，避免白屏
  if (remoteRatio <= 0 && local.length > 0) return shuffle(local);

  const totalDesired = Math.max(local.length, 36);
  const remoteCount = Math.round(totalDesired * remoteRatio);
  const remote = buildRemotePool(remoteCount, usePicsum);

  return shuffle([...local, ...remote]);
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
