import { useMemo } from "react";
import type { ImageItem, WallConfig } from "../types";
import { WallCell } from "./WallCell";

interface Props {
  cells: ImageItem[];
  config: WallConfig;
}

// collage：不规则无缝拼接网格，gap:0 图片占满整个视口、无任何间距
// 通过 colSpan/rowSpan 合并单元格（横图 2x1 / 竖图 1x2 / 大图 2x2 / 方图 1x1）
// grid-auto-flow:dense 错位补位填满空洞；1fr 行高让内容铺满视口
export function Wall({ cells, config }: Props) {
  const cols = Math.max(2, Math.min(config.columns, 8));
  const rows = Math.max(2, Math.min(config.rows ?? 5, 8));

  const gridStyle = useMemo<React.CSSProperties>(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridAutoFlow: "dense",
      gap: 0,
      height: "100%",
    }),
    [cols, rows]
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div style={gridStyle}>
        {cells.map((item, i) => {
          const colSpan = Math.max(1, Math.min(item.colSpan ?? 1, 2));
          const rowSpan = Math.max(1, Math.min(item.rowSpan ?? 1, 2));
          return (
            <div
              key={`cell-${i}`}
              className="relative h-full min-h-0 min-w-0"
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              <WallCell item={item} index={i} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
