import { BaseEngine } from "./WallEngine";

export class CellFadeEngine extends BaseEngine {
  protected initialCells() {
    const cells = [];
    for (let i = 0; i < this.cellCount; i++) cells.push(this.takeNext());
    return cells;
  }

  protected onTick() {
    // 逐个渐变：每拍替换一小批，营造错落淡入淡出
    const batch = Math.max(1, Math.round(this.cellCount / 6));
    for (let k = 0; k < batch; k++) {
      const idx = Math.floor(Math.random() * this.cells.length);
      this.cells[idx] = this.takeNext();
    }
    this.emit();
  }
}
