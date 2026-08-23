import { BaseEngine } from "./WallEngine";
import { pickRandom } from "../services/imagePool";

export class FullRefreshEngine extends BaseEngine {
  protected initialCells() {
    return pickRandom(this.pool, this.cellCount);
  }

  protected onTick() {
    this.cells = pickRandom(this.pool, this.cellCount);
    this.emit();
  }
}
