import { runCollector } from './index';
import type { CollectorConfig } from './types';
import { ALL_TARGET_LAWD_CODES } from './types';

export interface SchedulerOptions {
  /** 실행 주기 (밀리초). 기본값: 24시간 */
  intervalMs: number;
  /** 수집 설정 */
  config: Partial<CollectorConfig>;
  /** 실행 전 콜백 */
  onStart?: () => void;
  /** 실행 완료 콜백 */
  onComplete?: (result: { elapsed: number; tradeCount: number; complexCount: number }) => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: SchedulerOptions = {
  intervalMs: 24 * 60 * 60 * 1000, // 24시간
  config: {
    lawdCodes: ALL_TARGET_LAWD_CODES,
    months: 1, // 스케줄러는 최근 1개월만 증분 수집
    concurrency: 2,
    delayMs: 300,
  },
};

let _timer: ReturnType<typeof setInterval> | null = null;
let _running = false;

/** 스케줄러 시작 */
export function startScheduler(options?: Partial<SchedulerOptions>): void {
  if (_timer) {
    console.warn('[scheduler] Already running. Stop first before restarting.');
    return;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log(
    `[scheduler] Starting with interval=${opts.intervalMs}ms, ` +
    `regions=${opts.config.lawdCodes?.length ?? 'all'}, months=${opts.config.months ?? 1}`,
  );

  // 즉시 1회 실행
  executeOnce(opts);

  // 이후 주기적 실행
  _timer = setInterval(() => executeOnce(opts), opts.intervalMs);
}

/** 스케줄러 중지 */
export function stopScheduler(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[scheduler] Stopped.');
  }
}

/** 스케줄러 실행 중 여부 */
export function isSchedulerRunning(): boolean {
  return _timer !== null;
}

/** 수집 작업 실행 중 여부 */
export function isCollecting(): boolean {
  return _running;
}

// ─── 내부 함수 ───

async function executeOnce(opts: SchedulerOptions): Promise<void> {
  if (_running) {
    console.warn('[scheduler] Previous collection still running, skipping this cycle.');
    return;
  }

  _running = true;
  opts.onStart?.();

  try {
    const result = await runCollector(opts.config);

    const tradeCount = result.trades.reduce((sum, r) => sum + r.recordCount, 0);
    const complexCount = result.complexes.reduce((sum, r) => sum + r.recordCount, 0);

    console.log(
      `[scheduler] Collection completed in ${result.elapsed}ms — ` +
      `trades: ${tradeCount}, complexes: ${complexCount}`,
    );

    opts.onComplete?.({ elapsed: result.elapsed, tradeCount, complexCount });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[scheduler] Collection failed:', error.message);
    opts.onError?.(error);
  } finally {
    _running = false;
  }
}
