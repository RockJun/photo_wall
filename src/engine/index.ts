import type { WallConfig } from "../types";
import type { WallEngine } from "./WallEngine";
import { FullRefreshEngine } from "./FullRefresh";
import { CellFadeEngine } from "./CellFade";
import { PopReplaceEngine } from "./PopReplace";

/** 用完整配置创建引擎，避免默认值覆盖用户自定义的 intervalMs/columns/rows */
export function createEngine(config: WallConfig): WallEngine {
  switch (config.mode) {
    case "full-refresh":
      return new FullRefreshEngine(config);
    case "cell-fade":
      return new CellFadeEngine(config);
    case "pop-replace":
      return new PopReplaceEngine(config);
  }
}
