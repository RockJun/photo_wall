import type { ImageItem, WallConfig } from "../types";

export type Cells = ImageItem[];

export type UpdateFn = (cells: Cells) => void;

export interface WallEngine {
  start(pool: ImageItem[], config: WallConfig): void;
  stop(): void;
  applyConfig(config: WallConfig): void;
  setOnUpdate(fn: UpdateFn): void;
}

/**
 * 引擎基类：持有图片池、配置，按节奏驱动 onUpdate 回调刷新格子内容。
 * 三种模式在 onTick 中决定如何重排/替换 cells。
 */
export abstract class BaseEngine implements WallEngine {
  protected pool: ImageItem[] = [];
  protected config: WallConfig;
  protected cells: Cells = [];
  private rafId: number | null = null;
  private running = false;
  private lastTickTs: number = 0;
  private visibilityHandler: (() => void) | null = null;
  protected onUpdate: UpdateFn = () => {};
  protected cellCount = 0;

  constructor(config: WallConfig) {
    this.config = config;
  }

  start(pool: ImageItem[], config: WallConfig): void {
    this.pool = pool;
    this.config = config;
    this.cellCount = this.computeCellCount();
    this.cells = this.initialCells();
    this.onUpdate(this.cells);
    this.running = true;
    this.lastTickTs = performance.now();
    this.schedule();
    this.bindVisibility();
  }

  protected computeCellCount(): number {
    const cols = Math.max(2, Math.min(this.config.columns ?? 5, 8));
    const rows = Math.max(2, Math.min(this.config.rows ?? 5, 8));
    return Math.max(12, cols * rows);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  applyConfig(config: WallConfig): void {
    const modeChanged = config.mode !== this.config.mode;
    const intervalChanged = config.intervalMs !== this.config.intervalMs;
    const columnsChanged = config.columns !== this.config.columns;
    const rowsChanged = config.rows !== this.config.rows;
    this.config = config;
    // intervalMs / columns / rows / mode 任一变化都需重启定时器，否则 setInterval 不会更新
    if ((modeChanged || intervalChanged || columnsChanged || rowsChanged) && this.running) {
      this.stop();
      this.start(this.pool, config);
    } else {
      this.cellCount = this.computeCellCount();
    }
  }

  setOnUpdate(fn: UpdateFn): void {
    this.onUpdate = fn;
  }

  /**
   * 通知渲染：始终传入新数组引用。
   * 子类 onTick 常原地修改 this.cells 元素，若传同一引用 React 会因
   * Object.is 相同而跳过重渲染，导致图片不更新。因此这里做一次浅拷贝。
   */
  protected emit(): void {
    this.onUpdate(this.cells.slice());
  }

  /**
   * 用 requestAnimationFrame 作为主时钟：页面可见时（即使鼠标移出页面）也会持续触发，
   * 达到屏保效果。每帧累积已流逝时间，超过 intervalMs 才触发一次 onTick。
   */
  protected schedule(): void {
    if (!this.running) return;
    const loop = (now: number) => {
      if (!this.running) {
        this.rafId = null;
        return;
      }
      const elapsed = now - this.lastTickTs;
      if (elapsed >= this.config.intervalMs) {
        try {
          this.onTick();
        } catch (e) {
          console.error(e);
        }
        this.lastTickTs = now;
      }
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  /** 标签页切回前台时立即补一次换图并重置计时，避免后台积累的延时 */
  private bindVisibility(): void {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (!this.running) return;
      if (!document.hidden) {
        try {
          this.onTick();
        } catch (e) {
          console.error(e);
        }
        this.lastTickTs = performance.now();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  protected takeNext(exclude?: ImageItem): ImageItem {
    if (this.pool.length === 0) return exclude ?? ({} as ImageItem);
    // 若池子有 >1 张，避免取到与当前格相同的图
    if (exclude && this.pool.length > 1) {
      let pick = this.pool[Math.floor(Math.random() * this.pool.length)];
      let guard = 0;
      while (pick.id === exclude.id && guard < 10) {
        pick = this.pool[Math.floor(Math.random() * this.pool.length)];
        guard++;
      }
      return pick;
    }
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }

  protected abstract initialCells(): Cells;
  protected abstract onTick(): void;
}
