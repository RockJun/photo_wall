import { useEffect, useRef, useState } from "react";
import type { ImageItem } from "../types";

interface Props {
  item: ImageItem;
  index: number;
}

type AnimType = "flip-y" | "flip-x" | "fade";
type Face = "front" | "back";

function pickAnim(): AnimType {
  const r = Math.random();
  if (r < 0.34) return "flip-y";
  if (r < 0.67) return "flip-x";
  return "fade";
}

export function WallCell({ item, index }: Props) {
  const [frontUrl, setFrontUrl] = useState(item.url);
  const [backUrl, setBackUrl] = useState(item.url);
  const [activeFace, setActiveFace] = useState<Face>("front");
  const [rotation, setRotation] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const prevUrl = useRef(item.url);

  useEffect(() => {
    if (prevUrl.current === item.url) return;
    prevUrl.current = item.url;

    // 无论触发何种动画，先清除上一轮的 fade / rotation 残留状态
    setFading(false);
    setRotation(null);

    const a = pickAnim();
    const isFront = activeFace === "front";

    if (a === "fade") {
      setFading(true);
      const t = window.setTimeout(() => {
        setFrontUrl(item.url);
        setBackUrl(item.url);
        setFading(false);
      }, 700);
      return () => window.clearTimeout(t);
    }

    // flip：更新隐藏面为新图，翻转露出
    const target = isFront ? "front" : "back";
    if (target === "front") setFrontUrl(item.url);
    else setBackUrl(item.url);
    setActiveFace(isFront ? "back" : "front");
    setRotation(a === "flip-y" ? "rotateY(180deg)" : "rotateX(180deg)");
    const t = window.setTimeout(() => setRotation(null), 850);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.url]);

  const cardStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    transformStyle: "preserve-3d",
    transform: rotation ?? undefined,
    transition: "transform 0.8s cubic-bezier(0.4,0.2,0.2,1)",
  };

  const faceStyle = (face: Face): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform: face === "back" ? "rotateY(180deg)" : undefined,
  });

  return (
    <div
      className="group relative h-full w-full cursor-pointer overflow-hidden bg-ink-800"
      style={{ perspective: 1000 }}
    >
      {/* 悬停微光边缘 */}
      <div className="pointer-events-none absolute inset-0 z-20 rounded-none ring-0 transition-all duration-500 group-hover:z-30 group-hover:ring-2 group-hover:ring-primary-cyan/70 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]" />

      <div
        className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110"
        style={fading ? { opacity: 0, transform: "scale(0.85)", transition: "opacity 0.7s ease, transform 0.7s ease" } : cardStyle}
      >
        <div style={faceStyle("front")}>
          <img
            src={frontUrl}
            alt=""
            className="h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 group-hover:saturate-125"
          />
        </div>
        <div style={faceStyle("back")}>
          <img
            src={backUrl}
            alt=""
            className="h-full w-full object-cover transition-[filter] duration-500 group-hover:brightness-110 group-hover:saturate-125"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="pointer-events-none absolute left-2 top-2 z-30 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        {item.source === "local" ? "本地" : "网络"}
      </span>
    </div>
  );
}
