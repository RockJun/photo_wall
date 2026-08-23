import { useRef, useState } from "react";
import { X, Upload, Trash2, ImageOff, RotateCcw } from "lucide-react";
import type { ImageItem, SwitchMode, WallConfig } from "../types";
import { MODE_LABELS } from "../types";
import { uploadImages, deleteImage } from "../services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  config: WallConfig;
  onUpdate: <K extends keyof WallConfig>(k: K, v: WallConfig[K]) => void;
  onReset: () => void;
  localUrls: string[];
  onLocalChanged: () => void;
  poolSize: number;
}

const MODES: SwitchMode[] = ["full-refresh", "cell-fade", "pop-replace"];
const GRID_SIZES: [number, number][] = [
  [2, 2],
  [3, 3],
  [4, 3],
  [3, 4],
  [4, 4],
  [5, 5],
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-primary-cyan">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary-violet"
      />
    </div>
  );
}

export function ControlPanel({
  open,
  onClose,
  config,
  onUpdate,
  onReset,
  localUrls,
  onLocalChanged,
  poolSize,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await uploadImages(files);
      setUploadMsg(`已上传 ${files.length} 张`);
      await onLocalChanged();
    } catch (e) {
      console.error(e);
      setUploadMsg("上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (url: string) => {
    const name = url.split("/").pop()!;
    try {
      await deleteImage(name);
      setUploadMsg(`已删除 ${name}`);
      await onLocalChanged();
    } catch (e) {
      console.error(e);
      setUploadMsg("删除失败");
    }
  };

  // 仅展示可管理的上传图（/uploads）；外部图库为只读，单独统计
  const uploadUrls = localUrls.filter((u) => u.startsWith("/uploads/"));
  const externalCount = localUrls.filter((u) => u.startsWith("/ext/")).length;

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose} />}
      <aside
        className={`fixed right-0 top-0 z-30 h-full w-[340px] glass shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold text-white">照片墙控制台</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="thin-scroll h-[calc(100%-64px)] overflow-y-auto px-5 py-4">
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              切换模式
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdate("mode", m)}
                  className={`rounded-xl px-2 py-2.5 text-xs font-medium transition ${
                    config.mode === m
                      ? "bg-gradient-to-br from-primary-indigo to-primary-violet text-white shadow-lg shadow-primary-violet/30"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              布局与节奏
            </h3>
            <Slider
              label="切换间隔"
              value={config.intervalMs / 1000}
              min={1}
              max={15}
              step={0.5}
              suffix="s"
              onChange={(v) => onUpdate("intervalMs", v * 1000)}
            />
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-300">网格尺寸</span>
                <span className="font-mono text-primary-cyan">
                  {config.columns}×{config.rows}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {GRID_SIZES.map(([c, r]) => {
                  const active = config.columns === c && config.rows === r;
                  return (
                    <button
                      key={`${c}x${r}`}
                      onClick={() => {
                        onUpdate("columns", c);
                        onUpdate("rows", r);
                      }}
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-medium transition ${
                        active
                          ? "bg-gradient-to-br from-primary-indigo to-primary-violet text-white shadow-md shadow-primary-violet/30"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {c}×{r}
                    </button>
                  );
                })}
              </div>
            </div>
            <Slider
              label="网络图占比"
              value={Math.round(config.remoteRatio * 100)}
              min={0}
              max={100}
              step={10}
              suffix="%"
              onChange={(v) => onUpdate("remoteRatio", v / 100)}
            />
            <div className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-gray-200">使用真实网络图</p>
                <p className="text-[10px] text-gray-500">关闭则显示本地渐变占位（离线可用）</p>
              </div>
              <button
                onClick={() => onUpdate("usePicsum", !config.usePicsum)}
                className={`relative h-6 w-11 rounded-full transition ${
                  config.usePicsum ? "bg-primary-violet" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    config.usePicsum ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-gray-200">叠加时钟</p>
                <p className="text-[10px] text-gray-500">右上角显示时间与日期</p>
              </div>
              <button
                onClick={() => onUpdate("showClock", !config.showClock)}
                className={`relative h-6 w-11 rounded-full transition ${
                  config.showClock ? "bg-primary-violet" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    config.showClock ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-gray-200">叠加天气</p>
                <p className="text-[10px] text-gray-500">联网成功才显示</p>
              </div>
              <button
                onClick={() => onUpdate("showWeather", !config.showWeather)}
                className={`relative h-6 w-11 rounded-full transition ${
                  config.showWeather ? "bg-primary-violet" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    config.showWeather ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="mb-2">
              <label className="mb-1 block text-[10px] text-gray-400">天气城市</label>
              <input
                type="text"
                value={config.city}
                placeholder="例如：上海、深圳、东京"
                onChange={(e) => onUpdate("city", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none transition placeholder:text-gray-500 focus:border-primary-cyan/50"
              />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-400">
              <span>上传图库 ({uploadUrls.length})</span>
              <button
                onClick={onReset}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                title="重置配置"
              >
                <RotateCcw size={12} /> 重置
              </button>
            </h3>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleUpload(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/8 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              <Upload size={16} /> {uploading ? "上传中…" : "上传图片"}
            </button>
            {uploadMsg && <p className="mb-2 text-xs text-primary-cyan">{uploadMsg}</p>}

            {externalCount > 0 && (
              <p className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">
                外部图库（用户「图片」目录）：{externalCount} 张，只读展示
              </p>
            )}
            <div className="space-y-2">
              {uploadUrls.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 py-6 text-gray-500">
                  <ImageOff size={22} />
                  <span className="text-xs">暂无上传图片</span>
                </div>
              )}
              {uploadUrls.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-lg bg-white/5 p-1.5 pr-2"
                >
                  <img src={url} alt="" className="h-9 w-9 rounded-md object-cover" />
                  <span className="flex-1 truncate text-xs text-gray-300">{url.split("/").pop()}</span>
                  <button
                    onClick={() => handleDelete(url)}
                    className="rounded-md p-1 text-gray-400 transition hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <p className="text-center text-[11px] text-gray-500">当前图池：{poolSize} 张</p>
        </div>
      </aside>
    </>
  );
}
