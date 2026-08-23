import { useEffect, useRef, useState } from "react";
import type { ImageItem } from "../types";

interface Props {
  item: ImageItem;
  index: number;
}

// 切换动效类型：换图瞬间的过渡效果
type AnimType = "flip-y" | "flip-x" | "fade" | "crossfade" | "slide" | "mosaic";
type Face = "front" | "back";

function pickAnim(): AnimType {
  const r = Math.random();
  if (r < 0.2) return "flip-y";
  if (r < 0.4) return "flip-x";
  if (r < 0.55) return "fade";
  if (r < 0.7) return "crossfade";
  if (r < 0.85) return "slide";
  return "mosaic";
}

export function WallCell({ item, index }: Props) {
  const [frontUrl, setFrontUrl] = useState(item.url);
  const [backUrl, setBackUrl] = useState(item.url);
  const [activeFace, setActiveFace] = useState<Face>("front");
  const [rotation, setRotation] = useState<string | null>(null);
  const [flipAxis, setFlipAxis] = useState<"y" | "x" | null>(null);
  const [anim, setAnim] = useState<AnimType | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [noTransition, setNoTransition] = useState(false);
  const prevUrl = useRef(item.url);

  // 切换时预加载下一张图，避免白屏/闪烁；失败则标记兜底
  useEffect(() => {
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

    // flip：更新「隐藏面」为新图，翻转露出；动画结束后固化结果（无回弹）
    const axis = a === "flip-y" ? "y" : "x";
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
  const faceStyle = (face: Face): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
    };
    if (face === "back" && flipAxis === "x") {
      base.transform = "rotateX(180deg)";
    } else if (face === "back" && flipAxis === "y") {
      base.transform = "rotateY(180deg)";
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
  const isFlip = flipAxis !== null || anim === "flip-y" || anim === "flip-x";

  return (
    <div
      className="group relative h-full w-full cursor-pointer overflow-hidden bg-ink-800"
      style={{ perspective: 1000 }}
    >
      {/* 悬停微光边缘 */}
      <div className="pointer-events-none absolute inset-0 z-20 rounded-none ring-0 transition-all duration-500 group-hover:z-30 group-hover:ring-2 group-hover:ring-primary-cyan/70 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]" />

      <div
        className={`absolute inset-0 transition-all duration-700 ease-out group-hover:scale-110 ${isFlip ? "" : animClass}`}
        style={isFlip ? cardStyle : undefined}
      >
        <div style={faceStyle("front")}>
          <img
            src={frontUrl}
            alt=""
            loading="lazy"
            onLoad={() => setImgError(false)}
            onError={() => setImgError(true)}
            className="ken-burns h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 group-hover:saturate-125"
          />
        </div>
        <div style={faceStyle("back")}>
          <img
            src={backUrl}
            alt=""
            loading="lazy"
            onLoad={() => setImgError(false)}
            onError={() => setImgError(true)}
            className="ken-burns h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 group-hover:saturate-125"
          />
        </div>
      </div>

      {/* 加载失败 / 未加载的占位 */}
      {imgError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 text-gray-500">
          加载失败
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="pointer-events-none absolute left-2 top-2 z-30 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        {item.source === "local" ? "本地" : "网络"}
      </span>
    </div>
  );
}
