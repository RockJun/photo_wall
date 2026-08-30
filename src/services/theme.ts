/**
 * 主题氛围联动服务
 *
 * 输入当前时间、天气状况（可选），输出主题预设：
 * - 时段：清晨 / 白天 / 黄昏 / 夜间（夜间背景更深并叠加暗角）
 * - 节日：内置固定日期节日表（元旦/春节除外的公历节日/国庆/圣诞等），优先级最高
 * - 天气：雨雪雷电等坏天气切换冷蓝色调
 *
 * 主题通过 CSS 变量渗透到页面背景与强调色，避免大面积 DOM 重渲染。
 */

export interface ThemePreset {
  id: string;
  label: string;
  /** 背景径向渐变三段色（外→中→内） */
  bg: [string, string, string];
  /** 强调色（悬停光晕 / 氛围染色） */
  accent: string;
  /** 是否叠加暗角（夜间/节日夜晚更深沉） */
  dim: boolean;
}

/** 固定日期节日表（公历 MM-DD） */
const HOLIDAYS: Record<string, { name: string; accent: string }> = {
  "01-01": { name: "元旦", accent: "#D4AF37" },
  "02-14": { name: "情人节", accent: "#F472B6" },
  "05-01": { name: "劳动节", accent: "#F59E0B" },
  "06-01": { name: "儿童节", accent: "#FBBF24" },
  "10-01": { name: "国庆节", accent: "#EF4444" },
  "12-24": { name: "平安夜", accent: "#D4AF37" },
  "12-25": { name: "圣诞节", accent: "#EF4444" },
};

const BAD_WEATHER_WORDS = ["雨", "雪", "雷", "冰雹", "冻"];

function holidayKey(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeOfDayTheme(hour: number): ThemePreset {
  if (hour >= 5 && hour < 8) {
    return {
      id: "dawn",
      label: "清晨",
      bg: ["#2a2140", "#12172b", "#0a0d18"],
      accent: "#8B5CF6",
      dim: false,
    };
  }
  if (hour >= 8 && hour < 17) {
    return {
      id: "day",
      label: "白天",
      bg: ["#1a1f3a", "#0b0f1a", "#060810"],
      accent: "#22D3EE",
      dim: false,
    };
  }
  if (hour >= 17 && hour < 20) {
    return {
      id: "dusk",
      label: "黄昏",
      bg: ["#2b1a3a", "#141024", "#0a0a14"],
      accent: "#8B5CF6",
      dim: false,
    };
  }
  return {
    id: "night",
    label: "夜间",
    bg: ["#141a30", "#090c16", "#04050a"],
    accent: "#6366F1",
    dim: true,
  };
}

/** 解析当前应使用的主题：节日 > 坏天气 > 时段 */
export function resolveTheme(now: Date, condition?: string | null): ThemePreset {
  const holiday = HOLIDAYS[holidayKey(now)];
  if (holiday) {
    const base = timeOfDayTheme(now.getHours());
    return {
      id: `holiday-${holiday.name}`,
      label: `${holiday.name} · ${base.label}`,
      bg: ["#251321", "#120a14", "#08050a"],
      accent: holiday.accent,
      dim: now.getHours() >= 19 || now.getHours() < 6,
    };
  }

  if (condition && BAD_WEATHER_WORDS.some((w) => condition.includes(w))) {
    return {
      id: "rainy",
      label: "坏天气",
      bg: ["#16203a", "#0a1020", "#050810"],
      accent: "#38BDF8",
      dim: false,
    };
  }

  return timeOfDayTheme(now.getHours());
}

/** 将主题写入 CSS 变量；enabled=false 时恢复默认深空底色 */
export function applyTheme(preset: ThemePreset | null): void {
  const root = document.documentElement;
  if (!preset) {
    root.style.removeProperty("--theme-bg-1");
    root.style.removeProperty("--theme-bg-2");
    root.style.removeProperty("--theme-bg-3");
    root.style.removeProperty("--theme-accent");
    root.classList.remove("theme-dim");
    return;
  }
  root.style.setProperty("--theme-bg-1", preset.bg[0]);
  root.style.setProperty("--theme-bg-2", preset.bg[1]);
  root.style.setProperty("--theme-bg-3", preset.bg[2]);
  root.style.setProperty("--theme-accent", preset.accent);
  root.classList.toggle("theme-dim", preset.dim);
}

/** 拉取天气状况文本（与 ClockOverlay 同源，失败返回 null 走时段主题） */
export async function fetchWeatherCondition(city: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://60s.viki.moe/v2/weather?query=${encodeURIComponent(city)}`
    );
    if (!res.ok) throw new Error(`天气请求失败: ${res.status}`);
    const json: { data?: { weather?: { condition?: string } } } = await res.json();
    return json.data?.weather?.condition ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
