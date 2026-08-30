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
import { VideoOverlay } from "./components/VideoOverlay";
import {
  applyTheme,
  fetchWeatherCondition,
  resolveTheme,
  type ThemePreset,
} from "./services/theme";

export default function App() {
  const { config, update, reset } = useWallConfig();
  const { pool, localMedia, loading, refreshLocal } = useImagePool(config);
  const [cells, setCells] = useState<ImageItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [overlayItem, setOverlayItem] = useState<ImageItem | null>(null);
  const [theme, setTheme] = useState<ThemePreset | null>(null);
  const engineRef = useRef<WallEngine | null>(null);
  const weatherRef = useRef<string | null>(null);

  // 氛围主题联动：每分钟重算时段主题；天气状况 30 分钟刷新一次
  useEffect(() => {
    if (!config.ambientTheme) {
      setTheme(null);
      return;
    }
    let alive = true;
    const tick = () => {
      if (alive) setTheme((prev) => resolveTheme(new Date(), weatherRef.current));
    };
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [config.ambientTheme]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const condition = await fetchWeatherCondition(config.city);
      if (alive) weatherRef.current = condition;
    };
    void load();
    const t = window.setInterval(load, 30 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [config.city]);

  // 主题落到 CSS 变量（含关闭时还原默认）
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 展厅模式：鼠标静止 5s 后隐藏光标与控制入口；面板/播放器打开时不隐藏
  const [idleHidden, setIdleHidden] = useState(false);
  useEffect(() => {
    if (!config.exhibitMode) {
      setIdleHidden(false);
      return;
    }
    let timer = 0;
    const reset = () => {
      setIdleHidden(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!panelOpen && overlayItem === null) setIdleHidden(true);
      }, 5000);
    };
    reset();
    window.addEventListener("mousemove", reset);
    return () => {
      window.removeEventListener("mousemove", reset);
      window.clearTimeout(timer);
    };
  }, [config.exhibitMode, panelOpen, overlayItem]);

  // 展厅模式双击切换浏览器全屏
  const toggleFullscreen = () => {
    if (!config.exhibitMode) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((e) => console.error(e));
    } else {
      void document.documentElement.requestFullscreen?.().catch((e) => console.error(e));
    }
  };

  // 看门狗（7×24 屏保场景）：rAF 心跳停跳 30s 且页面可见时判定渲染假死，自动刷新恢复
  useEffect(() => {
    let lastBeat = performance.now();
    let raf = 0;
    let stopped = false;
    const beat = (now: number) => {
      lastBeat = now;
      if (!stopped) raf = window.requestAnimationFrame(beat);
    };
    raf = window.requestAnimationFrame(beat);
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (performance.now() - lastBeat > 30_000) {
        console.error("[watchdog] 渲染心跳超时，自动刷新恢复");
        window.location.reload();
      }
    }, 5000);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, []);

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
    <div
      className={`relative h-full w-full ${idleHidden ? "cursor-none" : ""}`}
      onDoubleClick={toggleFullscreen}
    >
      <Wall
        cells={cells}
        config={config}
        overlayUrl={overlayItem?.url ?? null}
        onOpenVideo={(item) => setOverlayItem(item)}
        onVideoEnded={(i) => engineRef.current?.replaceCell(i)}
      />

      {/* 全屏视频播放器 */}
      {overlayItem && (
        <VideoOverlay
          item={overlayItem}
          initialMuted={config.muted}
          onClose={() => setOverlayItem(null)}
        />
      )}

      {/* 氛围主题：夜间暗角 + 强调色顶部氛围光 */}
      {theme && (
        <>
          <div
            className="theme-vignette pointer-events-none fixed inset-0 z-[5] transition-opacity duration-1000"
            style={{ opacity: theme.dim ? 1 : 0 }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-24 transition-all duration-1000"
            style={{
              background: `radial-gradient(600px 140px at 70% 0%, ${theme.accent}26, transparent)`,
            }}
          />
        </>
      )}

      {/* 时钟 + 天气叠加 */}
      <ClockOverlay showClock={config.showClock} showWeather={config.showWeather} city={config.city} />

      {/* 设置齿轮：左侧吸附隐藏，鼠标移到左缘滑出；展厅模式闲置时整体隐藏 */}
      <div
        className={`fixed left-0 top-1/2 z-30 flex -translate-y-1/2 items-center transition-opacity duration-500 ${
          config.exhibitMode && idleHidden ? "pointer-events-none opacity-0" : ""
        }`}
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
        localMedia={localMedia}
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
