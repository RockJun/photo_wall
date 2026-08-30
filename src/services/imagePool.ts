import type { ImageItem, MediaEntry } from "../types";
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

/** 视频格子倾向大跨度（横屏 2x1 / 大屏 2x2），小格子里播放效果差 */
function videoSpan(seed: string): { colSpan: number; rowSpan: number } {
  return hashStr("v-" + seed) % 3 === 0
    ? { colSpan: 2, rowSpan: 2 }
    : { colSpan: 2, rowSpan: 1 };
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
      type: "image" as const,
      w,
      h,
      ...span,
    };
  });
}

export interface BuildPoolOptions {
  remoteRatio: number;
  usePicsum: boolean;
  /** 0~1，视频在池中的目标占比；0 表示纯图片 */
  videoRatio: number;
  /** 视频显示总开关 */
  showVideo: boolean;
}

export function buildPool(localMedia: MediaEntry[], opts: BuildPoolOptions): ImageItem[] {
  const { remoteRatio, usePicsum, videoRatio, showVideo } = opts;

  const localImages = localMedia.filter((m) => m.type === "image");
  const localVideos = localMedia.filter((m) => m.type === "video");

  const local: ImageItem[] = localImages.map((m, i) => {
    const span = cellSpan("local-" + i);
    return {
      id: `local-${i}`,
      url: m.url,
      source: "local" as const,
      type: "image" as const,
      w: 320,
      h: HEIGHT_TIERS[i % HEIGHT_TIERS.length],
      ...span,
    };
  });

  // 按 videoRatio 决定混入多少条视频；总开关关闭或本地（上传/外部目录）没有任何视频时，不混入视频块
  let videos: ImageItem[] = [];
  if (showVideo && videoRatio > 0 && localVideos.length > 0) {
    const poolTarget = Math.max(local.length, 36);
    const videoCount = Math.min(
      localVideos.length,
      Math.max(1, Math.round((poolTarget * videoRatio) / Math.max(0.01, 1 - videoRatio)))
    );
    videos = shuffle(localVideos)
      .slice(0, videoCount)
      .map((m, i) => {
        const span = videoSpan(m.url);
        return {
          id: `video-${i}`,
          url: m.url,
          source: "local" as const,
          type: "video" as const,
          w: 640,
          h: 360,
          ...span,
        };
      });
  }

  const mixed = [...local, ...videos];

  // remoteRatio = 0 且没有本地图时，生成最小占位池兜底，避免白屏
  if (remoteRatio <= 0 && mixed.length > 0) return shuffle(mixed);

  const totalDesired = Math.max(mixed.length, 36);
  const remoteCount = Math.round(totalDesired * remoteRatio);
  const remote = buildRemotePool(remoteCount, usePicsum);

  return shuffle([...mixed, ...remote]);
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
