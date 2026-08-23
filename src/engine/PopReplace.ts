import { BaseEngine } from "./WallEngine";

export class PopReplaceEngine extends BaseEngine {
  protected initialCells() {
    const cells = [];
    for (let i = 0; i < this.cellCount; i++) cells.push(this.takeNext());
    return cells;
  }

  protected onTick() {
    // 随机位置弹出替换：随机挑 1~3 个格子直接换图
    const n = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const idx = Math.floor(Math.random() * this.cells.length);
      this.cells[idx] = this.takeNext();
    }
    this.emit();
  }
}
