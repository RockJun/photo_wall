import { useEffect, useState } from "react";
import { DEFAULT_CONFIG, type WallConfig } from "../types";

const KEY = "photo-wall-config-v1";

const VALID_KEYS = Object.keys(DEFAULT_CONFIG) as (keyof WallConfig)[];

export function useWallConfig() {
  const [config, setConfig] = useState<WallConfig>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<keyof WallConfig, unknown>>;
        const clean: Partial<WallConfig> = {};
        for (const k of VALID_KEYS) {
          if (parsed[k] !== undefined) (clean as Record<keyof WallConfig, unknown>)[k] = parsed[k];
        }
        return { ...DEFAULT_CONFIG, ...clean };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(config));
  }, [config]);

  const update = <K extends keyof WallConfig>(key: K, value: WallConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const reset = () => setConfig(DEFAULT_CONFIG);

  return { config, update, reset };
}
