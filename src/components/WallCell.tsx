import { useEffect, useRef, useState } from "react";
import type { ImageItem } from "../types";
import { acquireVideoSlot } from "../services/videoCoordinator";

interface Props {
  item: ImageItem;
  index: number;
  /** 视频是否静音（跟随控制面板开关） */
  muted: boolean;
  /** 视频播完或加载失败时请求替换该格子 */
  onVideoEnded?: () => void;
  /** 点击视频格子时打开全屏播放器 */
  onOpenVideo?: () => void;
  /** 全屏播放器正播放本格视频时，墙内该格暂停让出解码资源 */
  suppressed?: boolean;
}

// 切换动效类型：换图瞬间的过渡效果
type AnimType =
  | "flip-y"
  | "flip-x"
  | "box-flip"
  | "fade"
  | "crossfade"
  | "slide"
  | "mosaic"
  | "blinds"
  | "circle";
type Face = "front" | "back";

// 视频 URL 判定（本地/外部文件均带真实扩展名，按 URL 判定比按格子 type 更稳）
const VIDEO_URL_RE = /\.(mp4|webm|m4v|mov|ogg|ogv)(\?|$)/i;

function pickAnim(): AnimType {
  const r = Math.random();
  if (r < 0.12) return "flip-y";
  if (r < 0.24) return "flip-x";
  if (r < 0.32) return "box-flip";
  if (r < 0.4) return "fade";
  if (r < 0.5) return "crossfade";
  if (r < 0.6) return "slide";
  if (r < 0.7) return "mosaic";
  if (r < 0.85) return "blinds";
  return "circle";
}

export function WallCell({ item, muted, onVideoEnded, onOpenVideo, suppressed }: Props) {
  const [frontUrl, setFrontUrl] = useState(item.url);
  const [backUrl, setBackUrl] = useState(item.url);
  const [activeFace, setActiveFace] = useState<Face>("front");
  const [rotation, setRotation] = useState<string | null>(null);
  const [flipAxis, setFlipAxis] = useState<"y" | "x" | null>(null);
  const [anim, setAnim] = useState<AnimType | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [noTransition, setNoTransition] = useState(false);
  const prevUrl = useRef(item.url);
  const isVideo = item.type === "video";
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const onVideoEndedRef = useRef(onVideoEnded);
  onVideoEndedRef.current = onVideoEnded;
  // 播放槽：未获准的视频暂停并定格首帧，避免多路解码同时抢占资源
  const [slotGranted, setSlotGranted] = useState(false);
  const slotGrantedRef = useRef(false);
  slotGrantedRef.current = slotGranted;
  const stallTimerRef = useRef<number | null>(null);
  // 悬停视差：跟随鼠标轻微 3D 倾斜（最大 ±3°），仅非翻转动画时生效
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);

  // React 不透传 muted 属性（已知问题），用 ref 保证受控静音
  useEffect(() => {
    for (const el of [frontVideoRef.current, backVideoRef.current]) {
      if (el) el.muted = muted;
    }
  }, [muted, frontUrl, backUrl]);

  // 视频申请播放槽：换源/卸载时释放，防句柄泄漏
  useEffect(() => {
    if (!isVideo) {
      setSlotGranted(false);
      return;
    }
    let cancelled = false;
    let release: (() => void) | null = null;
    acquireVideoSlot().then((rel) => {
      if (cancelled) {
        rel();
        return;
      }
      release = rel;
      setSlotGranted(true);
    });
    return () => {
      cancelled = true;
      setSlotGranted(false);
      if (release) release();
    };
  }, [isVideo, item.url]);

  // 播放控制：获准后播放当前正面视频、暂停背面；未获准则全部暂停并定格首帧
  useEffect(() => {
    const els = [frontVideoRef.current, backVideoRef.current].filter(
      (el): el is HTMLVideoElement => el !== null
    );
    if (!isVideo) return;
    // 全屏播放器接管时，墙内该格暂停让出解码资源
    if (suppressed) {
      for (const el of els) el.pause();
      return;
    }
    for (const el of els) {
      if (slotGranted) {
        const isActive = (el === frontVideoRef.current && activeFace === "front") ||
          (el === backVideoRef.current && activeFace === "back");
        if (isActive) {
          el.play().catch(() => {
            /* 自动播放被拦截时保持静帧，等待下一次机会 */
          });
        } else {
          el.pause();
        }
      } else {
        el.pause();
        // 定格首帧：元数据就绪后轻微 seek，促使浏览器渲染第一帧
        const seekFirst = () => {
          try {
            if (el.currentTime === 0) el.currentTime = 0.001;
          } catch {
            /* ignore */
          }
        };
        if (el.readyState >= 1) seekFirst();
        else el.addEventListener("loadedmetadata", seekFirst, { once: true });
      }
    }
  }, [slotGranted, activeFace, isVideo, frontUrl, backUrl, suppressed]);

  // 卡顿降级：获准播放后若持续 6s 仍在缓冲，判定源不可用/过慢，请求换格
  const handleVideoWaiting = () => {
    if (!slotGrantedRef.current) return;
    if (stallTimerRef.current !== null) window.clearTimeout(stallTimerRef.current);
    stallTimerRef.current = window.setTimeout(() => {
      stallTimerRef.current = null;
      onVideoEndedRef.current?.();
    }, 6000);
  };
  const handleVideoPlaying = () => {
    if (stallTimerRef.current !== null) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };
  useEffect(
    () => () => {
      if (stallTimerRef.current !== null) window.clearTimeout(stallTimerRef.current);
    },
    []
  );

  // 切换时预加载下一张图，避免白屏/闪烁；失败则标记兜底（视频用 preload 元数据，不做图片预加载）
  useEffect(() => {
    if (isVideo) return;
    const img = new Image();
    img.src = item.url;
    const onLoad = () => setImgError(false);
    const onError = () => setImgError(true);
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [item.url]);

  useEffect(() => {
    if (prevUrl.current === item.url) return;
    prevUrl.current = item.url;

    // 清除上一轮残留状态
    setRotation(null);
    setFlipAxis(null);
    setImgError(false);

    const a = pickAnim();
    setAnim(a);
    const isFront = activeFace === "front";

    if (a === "fade" || a === "crossfade") {
      // 淡入淡出 / 交叉淡入：旧图淡出，换图后淡入；结束后固化到 front
      const t = window.setTimeout(() => {
        setFrontUrl(item.url);
        setBackUrl(item.url);
        setActiveFace("front");
        setFlipAxis(null);
        setAnim(null);
      }, a === "crossfade" ? 600 : 700);
      return () => window.clearTimeout(t);
    }

    if (a === "slide" || a === "mosaic") {
      // 滑动 / 马赛克：层叠切换，无 3D 翻转；结束后固化到 front
      const t = window.setTimeout(() => {
        setFrontUrl(item.url);
        setBackUrl(item.url);
        setActiveFace("front");
        setAnim(null);
      }, a === "slide" ? 500 : 650);
      return () => window.clearTimeout(t);
    }

    if (a === "blinds" || a === "circle") {
      // 百叶窗 / 圆形展开：旧内容（front）之上揭开新内容（back），结束后固化到 front
      setBackUrl(item.url);
      const t = window.setTimeout(() => {
        setFrontUrl(item.url);
        setBackUrl(item.url);
        setActiveFace("front");
        setAnim(null);
      }, a === "blinds" ? 950 : 850);
      return () => window.clearTimeout(t);
    }

    // flip：更新「隐藏面」为新图，翻转露出；动画结束后固化结果（无回弹）
    const axis = a === "flip-x" ? "x" : "y";
    const hiddenFace: Face = isFront ? "back" : "front";
    if (hiddenFace === "front") setFrontUrl(item.url);
    else setBackUrl(item.url);
    setFlipAxis(axis);
    setActiveFace(hiddenFace);
    setRotation(axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)");
    const t = window.setTimeout(() => {
      // 动画结束瞬间：禁用过渡，瞬时复位并固化新图，避免回弹闪烁
      setNoTransition(true);
      setRotation(null);
      setFlipAxis(null);
      setFrontUrl(item.url);
      setBackUrl(item.url);
      setActiveFace("front");
      // 下一帧恢复过渡
      const t2 = window.setTimeout(() => setNoTransition(false), 30);
      return () => window.clearTimeout(t2);
    }, 850);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.url]);

  // 3D 翻转容器样式
  const cardStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    transformStyle: "preserve-3d",
    transform: rotation ?? undefined,
    transition: noTransition ? "none" : "transform 0.8s cubic-bezier(0.4,0.2,0.2,1)",
  };

  // 面样式：back 面根据翻转轴对齐（flip-y → rotateY，flip-x → rotateX）
  // box-flip 额外增加 translateZ 形成有厚度的 3D 盒子翻转
  const faceStyle = (face: Face): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
    };
    const depth = anim === "box-flip" ? " translateZ(40px)" : "";
    if (face === "front") {
      if (anim === "box-flip") base.transform = `translateZ(40px)`;
    } else if (flipAxis === "x") {
      base.transform = "rotateX(180deg)";
    } else if (flipAxis === "y") {
      base.transform = `rotateY(180deg)${depth}`;
    }
    return base;
  };

  // 过渡动画对应的容器类
  const animClass =
    anim === "fade"
      ? "opacity-0 scale-90"
      : anim === "crossfade"
        ? "opacity-50"
        : anim === "slide"
          ? "translate-x-8 opacity-0"
          : anim === "mosaic"
            ? "opacity-0"
            : "";

  // 是否处于 3D 翻转（用 cardStyle）；否则用普通过渡容器
  const isFlip = flipAxis !== null || anim === "flip-y" || anim === "flip-x" || anim === "box-flip";

  // 单个面渲染：视频用 <video> 静默播放（播放槽获准后才真正 play，播放中叠加呼吸感缩放），图片沿用 <img>
  const renderFace = (url: string, face: Face) => {
    // 按扩展名判定该面的媒体类型，兼容图/视频混排时的交叉切换
    const isFaceVideo =
      VIDEO_URL_RE.test(url) || (url === item.url && item.type === "video");
    const ref = face === "front" ? frontVideoRef : backVideoRef;
    if (isFaceVideo) {
      return (
        <video
          ref={ref}
          src={url}
          muted={muted}
          playsInline
          preload="metadata"
          onWaiting={handleVideoWaiting}
          onStalled={handleVideoWaiting}
          onPlaying={handleVideoPlaying}
          onEnded={() => onVideoEndedRef.current?.()}
          onError={() => onVideoEndedRef.current?.()}
          className={`h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 ${
            slotGranted ? "video-breathe" : ""
          }`}
        />
      );
    }
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onLoad={() => setImgError(false)}
        onError={() => setImgError(true)}
        className="ken-burns h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 group-hover:saturate-125"
      />
    );
  };

  return (
    <div
      className={`group relative h-full w-full cursor-pointer overflow-hidden bg-ink-800 transition-transform duration-200 ease-out ${
        tilt && !isFlip ? "will-change-transform" : ""
      }`}
      style={{
        perspective: 1000,
        transform:
          tilt && !isFlip
            ? `rotateX(${(-tilt.y * 3).toFixed(2)}deg) rotateY(${(tilt.x * 3).toFixed(2)}deg) scale(1.015)`
            : undefined,
      }}
      onClick={() => {
        if (isVideo) onOpenVideo?.();
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTilt({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        });
      }}
      onMouseLeave={() => setTilt(null)}
    >
      {/* 常驻内侧细光晕描边，提升质感 */}
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_28px_rgba(103,232,249,0.045)]" />

      {/* 悬停微光边缘 */}
      <div className="pointer-events-none absolute inset-0 z-20 rounded-none ring-0 transition-all duration-500 group-hover:z-30 group-hover:ring-2 group-hover:ring-primary-cyan/70 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]" />

      <div
        className={`absolute inset-0 transition-all duration-700 ease-out group-hover:scale-110 ${isFlip ? "" : animClass}`}
        style={isFlip ? cardStyle : undefined}
      >
        <div style={faceStyle("front")}>{renderFace(frontUrl, "front")}</div>
        <div style={faceStyle("back")} className={anim === "circle" ? "anim-circle-in" : ""}>
          {renderFace(backUrl, "back")}
        </div>

        {/* 百叶窗：旧内容按横向条纹交错收缩，露出下方新内容 */}
        {anim === "blinds" && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative h-1/6 w-full overflow-hidden">
                <img
                  src={frontUrl}
                  alt=""
                  className="anim-blinds-stripe absolute left-0 w-full object-cover"
                  style={{
                    height: "600%",
                    top: `${-i * 16.6666}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 加载失败 / 未加载的占位 */}
      {imgError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 text-gray-500">
          加载失败
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="pointer-events-none absolute left-2 top-2 z-30 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        {item.source === "local" ? (item.type === "video" ? "本地视频" : "本地") : "网络"}
      </span>
    </div>
  );
}
