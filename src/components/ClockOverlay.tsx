import { useEffect, useState } from "react";

interface Weather {
  temp: number;
  condition: string;
  cityName: string;
  icon: string;
  aqi: number;
  quality: string;
}

interface Props {
  showClock: boolean;
  showWeather: boolean;
  city: string;
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDate(d: Date): string {
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week}`;
}

export function ClockOverlay({ showClock, showWeather, city }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // 天气：60s API（腾讯天气数据源），query 直接传城市名；失败则隐藏
  useEffect(() => {
    if (!showWeather) {
      setWeather(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `https://60s.viki.moe/v2/weather?query=${encodeURIComponent(city)}`
        );
        if (!res.ok) throw new Error(`天气请求失败: ${res.status}`);
        const json: { code?: number; data?: any } = await res.json();
        if (!json.data || !json.data.weather) {
          throw new Error("天气数据为空");
        }
        const w = json.data.weather;
        const loc = json.data.location;
        const aq = json.data.air_quality;
        if (alive && typeof w.temperature === "number") {
          setWeather({
            temp: Math.round(w.temperature),
            condition: w.condition || "未知",
            cityName: loc?.name || city,
            icon: w.weather_icon || "",
            aqi: aq?.aqi ?? 0,
            quality: aq?.quality || "",
          });
        } else {
          throw new Error("天气字段缺失");
        }
      } catch (e) {
        console.error(e);
        if (alive) setWeather(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [showWeather, city]);

  if (!showClock) return null;

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-10 flex flex-col items-end gap-1">
      <div className="glass rounded-2xl px-4 py-3 text-right shadow-lg">
        <div className="text-3xl font-semibold tabular-nums leading-none text-white">
          {formatTime(now)}
        </div>
        <div className="mt-1 text-xs text-gray-300">{formatDate(now)}</div>
        {showWeather && weather && (
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
            {weather.icon && (
              <img src={weather.icon} alt="" className="h-7 w-7" />
            )}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-sm">
                <span className="text-gray-300">{weather.cityName}</span>
                <span className="text-primary-cyan">{weather.condition}</span>
                <span className="font-medium tabular-nums text-white">
                  {weather.temp}°C
                </span>
              </div>
              {weather.aqi > 0 && (
                <div className="text-[10px] text-gray-400">
                  空气 {weather.quality} AQI {weather.aqi}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
