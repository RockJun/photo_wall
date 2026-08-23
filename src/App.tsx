import { useEffect, useMemo, useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { ImageItem } from "./types";
import { useWallConfig } from "./hooks/useWallConfig";
import { useImagePool } from "./hooks/useImagePool";
import { createEngine } from "./engine";
import type { WallEngine } from "./engine/WallEngine";
import { Wall } from "./components/Wall";
import { ControlPanel } from "./components/ControlPanel";
import { ClockOverlay } from "./components/ClockOverlay";

export default function App() {
  const { config, update, reset } = useWallConfig();
  const { pool, localUrls, loading, refreshLocal } = useImagePool(config);
  const [cells, setCells] = useState<ImageItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const engineRef = useRef<WallEngine | null>(null);

  // 引擎驱动定时换图（mode 或图池变化时重建引擎）
  useEffect(() => {
    if (pool.length === 0) return;
    const engine = createEngine(config);
    engine.setOnUpdate(setCells);
    engine.start(pool, config);
    engineRef.current = engine;
    return () => engine.stop();
  }, [pool, config.mode]);

  useEffect(() => {
    engineRef.current?.applyConfig(config);
  }, [config]);

  const poolSize = useMemo(() => pool.length, [pool]);

  return (
    <div className="relative h-full w-full">
      <Wall cells={cells} config={config} />

      {/* 时钟 + 天气叠加 */}
      <ClockOverlay showClock={config.showClock} showWeather={config.showWeather} city={config.city} />

      {/* 设置齿轮：左侧吸附隐藏，鼠标移到左缘滑出 */}
      <div
        className="fixed left-0 top-1/2 z-30 flex -translate-y-1/2 items-center"
        onMouseEnter={() => setShowFab(true)}
        onMouseLeave={() => setShowFab(false)}
      >
        <div className="h-40 w-1.5 rounded-r-full bg-white/10 backdrop-blur-sm transition-opacity duration-300" />
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className={`glass flex h-14 w-14 -translate-x-1 items-center justify-center rounded-full rounded-l-none text-white shadow-xl transition-all duration-300 hover:scale-105 ${
            panelOpen ? "bg-primary-violet/40" : ""
          } ${showFab || panelOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Settings size={22} className={panelOpen ? "animate-spin-slow" : ""} />
        </button>
      </div>

      <ControlPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        config={config}
        onUpdate={update}
        onReset={reset}
        localUrls={localUrls}
        onLocalChanged={refreshLocal}
        poolSize={poolSize}
      />

      {loading && pool.length === 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center text-gray-400">
          正在加载照片墙…
        </div>
      )}
    </div>
  );
}
