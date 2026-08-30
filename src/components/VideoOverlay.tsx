import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { ImageItem } from "../types";

interface Props {
  item: ImageItem;
  /** 初始是否静音（打开浮层属于用户手势，可安全开声） */
  initialMuted: boolean;
  onClose: () => void;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * 全屏视频播放器：
 * 纯黑渐变遮罩 + 居中视频 + 玻璃风控制条（播放/暂停、进度、时间、静音、关闭）。
 * 播放中 2s 无操作自动隐藏控制条；ESC / 点击遮罩关闭。
 */
export function VideoOverlay({ item, initialMuted, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  // 打开即自动播放（用户手势上下文，允许出声）
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    el.play().catch((e) => console.error("全屏视频播放失败", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.url]);

  // 声音受控同步
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && videoRef.current) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // 控制条 2s 无操作自动隐藏（暂停时常显）
  const pokeControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2000);
  };

  useEffect(() => {
    pokeControls();
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch((e) => console.error("视频恢复播放失败", e));
    else el.pause();
  };

  const toggleMute = () => setMuted((m) => !m);

  const seek = (v: number) => {
    const el = videoRef.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = v;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onMouseMove={pokeControls}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-[92vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={item.url}
          loop={false}
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
          onDoubleClick={() => {
            const el = videoRef.current;
            if (!el) return;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void el.requestFullscreen?.().catch((e) => console.error(e));
          }}
          className="max-h-[80vh] w-full cursor-pointer rounded-2xl bg-black object-contain shadow-[0_0_80px_rgba(99,102,241,0.25)]"
        />

        {/* 控制条：玻璃风悬浮，底部渐变过渡 */}
        <div
          className={`absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-4 pt-10 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* 进度条 */}
          <div className="mb-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-primary-violet"
              style={{
                background: `linear-gradient(to right, #8B5CF6 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
              }}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
              title={playing ? "暂停" : "播放"}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={toggleMute}
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
              title={muted ? "开启声音" : "静音"}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <span className="ml-auto font-mono text-xs tabular-nums text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-red-500/30"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <p
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        空格 播放/暂停 · 双击视频 全屏 · ESC 关闭
      </p>
    </div>
  );
}
