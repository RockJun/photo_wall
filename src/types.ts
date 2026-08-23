export type SwitchMode = "full-refresh" | "cell-fade" | "pop-replace";

export type ImageSource = "local" | "remote";

export interface ImageItem {
  id: string;
  url: string;
  source: ImageSource;
  w: number;
  h: number;
  /** 不规则网格中横向跨越的列数（1~2） */
  colSpan: number;
  /** 不规则网格中纵向跨越的行数（1~2） */
  rowSpan: number;
}

export interface WallConfig {
  mode: SwitchMode;
  intervalMs: number;
  columns: number;
  /** 网格行数（用于 grid 预设，如 4x3 / 3x4） */
  rows: number;
  /** 不同格子高度档位的权重，例如 [3,2,1] 表示矮/中/高三档 */
  sizeWeights: number[];
  remoteRatio: number; // 0~1，网络图在混合池中的占比
  usePicsum: boolean; // 是否使用 Picsum 真实网络图（默认 false 用本地渐变占位，离线可用）
  showClock: boolean; // 是否叠加时钟+日期
  showWeather: boolean; // 是否叠加天气（联网成功才显示）
  city: string; // 天气城市名（通过地理编码接口转经纬度）
}

export const DEFAULT_CONFIG: WallConfig = {
  mode: "cell-fade",
  intervalMs: 3500,
  columns: 5,
  rows: 5,
  sizeWeights: [3, 2, 1],
  remoteRatio: 0,
  usePicsum: false,
  showClock: true,
  showWeather: true,
  city: "北京",
};

export const SIZE_TIERS = [
  { label: "矮", h: 180 },
  { label: "中", h: 260 },
  { label: "高", h: 340 },
];

export const MODE_LABELS: Record<SwitchMode, string> = {
  "full-refresh": "整墙刷新",
  "cell-fade": "逐个渐变",
  "pop-replace": "随机弹出",
};
