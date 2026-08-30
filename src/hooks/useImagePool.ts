import { useEffect, useState } from "react";
import { fetchLocalImages } from "../services/api";
import { buildPool } from "../services/imagePool";
import type { ImageItem, MediaEntry, WallConfig } from "../types";

export function useImagePool(config: WallConfig) {
  const [pool, setPool] = useState<ImageItem[]>([]);
  const [localMedia, setLocalMedia] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const media = await fetchLocalImages();
        if (!alive) return;
        setLocalMedia(media);
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
    setPool(
      buildPool(localMedia, {
        remoteRatio: config.remoteRatio,
        usePicsum: config.usePicsum,
        videoRatio: config.videoRatio,
        showVideo: config.showVideo,
      })
    );
  }, [localMedia, config.remoteRatio, config.usePicsum, config.videoRatio, config.showVideo]);

  const refreshLocal = async () => {
    const media = await fetchLocalImages();
    setLocalMedia(media);
  };

  return { pool, localMedia, loading, refreshLocal };
}
