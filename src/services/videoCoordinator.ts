/**
 * 视频并发播放协调器（单例）
 *
 * 屏保场景下可能同时渲染多条视频格子，多路解码会占用大量资源导致卡顿。
 * 这里用令牌槽机制限制真实播放的视频数量（默认 2 条）：
 * - acquire：申请播放槽，未拿到则进入 FIFO 等待队列
 * - release：释放槽位并按顺序唤醒队列中最早的等待者
 * - 所有回调都做了防重复释放保护，格子卸载/换源时安全释放
 */

const DEFAULT_MAX_CONCURRENT = 2;

let maxConcurrent = DEFAULT_MAX_CONCURRENT;
let activeCount = 0;
let releasedAll = false;

type GrantFn = (release: () => void) => void;
const waitQueue: GrantFn[] = [];

function makeRelease(releaseFn: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    releaseFn();
  };
}

function pump(): void {
  while (activeCount < maxConcurrent && waitQueue.length > 0) {
    const grant = waitQueue.shift()!;
    activeCount++;
    grant(
      makeRelease(() => {
        activeCount = Math.max(0, activeCount - 1);
        pump();
      })
    );
  }
}

/** 申请一个播放槽；返回的 Promise 在获得槽位时 resolve 出释放函数 */
export function acquireVideoSlot(): Promise<() => void> {
  if (releasedAll) return Promise.resolve(() => {});
  return new Promise((resolve) => {
    waitQueue.push((release) => resolve(release));
    pump();
  });
}

/** 调整并发上限（例如低配设备可调 1） */
export function setMaxConcurrentVideos(n: number): void {
  maxConcurrent = Math.max(1, n);
  pump();
}

/** 当前正在播放的视频数量（调试/观测用） */
export function activeVideoCount(): number {
  return activeCount;
}
