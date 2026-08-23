import { useEffect, useState } from "react";
import { fetchLocalImages } from "../services/api";
import { buildPool } from "../services/imagePool";
import type { ImageItem, WallConfig } from "../types";

export function useImagePool(config: WallConfig) {
  const [pool, setPool] = useState<ImageItem[]>([]);
  const [localUrls, setLocalUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const urls = await fetchLocalImages();
        if (!alive) return;
        setLocalUrls(urls);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setPool(buildPool(localUrls, config.remoteRatio, config.usePicsum));
  }, [localUrls, config.remoteRatio, config.usePicsum]);

  const refreshLocal = async () => {
    const urls = await fetchLocalImages();
    setLocalUrls(urls);
  };

  return { pool, localUrls, loading, refreshLocal };
}
