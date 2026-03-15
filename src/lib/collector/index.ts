import { initSchema } from '../db';
import { collectTrades, buildDealYmList } from './trade-collector';
import { collectComplexes } from './complex-collector';
import { collectSeoulAptInfo } from './seoul-apt-collector';
import { collectBuildingLedger } from './building-ledger-collector';
import { enrichComplexesFromBuildingLedger } from './building-ledger-collector';
import { collectLandUseRegulation, enrichComplexesFromLandUse } from './land-use-collector';
import { getProgress } from './state';
import type { CollectorConfig, CollectionResult, CollectionProgress } from './types';
import { ALL_TARGET_LAWD_CODES } from './types';

export interface CollectorRunResult {
  trades: CollectionResult[];
  complexes: CollectionResult[];
  seoulApt?: CollectionResult;
  buildingLedger: CollectionResult[];
  landUse: CollectionResult[];
  elapsed: number;
}

const DEFAULT_CONFIG: CollectorConfig = {
  lawdCodes: ALL_TARGET_LAWD_CODES,
  months: 36,
  concurrency: 3,
  delayMs: 200,
};

/**
 * 전체 수집 오케스트레이터
 *
 * 1) 실거래가: lawdCd × dealYm 조합별로 순차 수집
 * 2) 단지 메타: lawdCd별로 목록 → 기본 → 상세 수집
 */
export async function runCollector(
  config: Partial<CollectorConfig> = {},
): Promise<CollectorRunResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();

  // 스키마 초기화
  await initSchema();

  const tradeResults: CollectionResult[] = [];
  const complexResults: CollectionResult[] = [];

  // ─── 실거래가 수집 ───
  const dealYmList = buildDealYmList(cfg.months);

  for (const lawdCd of cfg.lawdCodes) {
    for (let i = 0; i < dealYmList.length; i += cfg.concurrency) {
      const batch = dealYmList.slice(i, i + cfg.concurrency);

      const results = await Promise.all(
        batch.map((ym) => collectTrades(lawdCd, ym)),
      );

      tradeResults.push(...results);

      // API 부하 방지
      if (i + cfg.concurrency < dealYmList.length && cfg.delayMs > 0) {
        await sleep(cfg.delayMs);
      }
    }
  }

  // ─── 단지 메타데이터 수집 ───
  for (const lawdCd of cfg.lawdCodes) {
    const result = await collectComplexes(lawdCd, {
      concurrency: cfg.concurrency,
      delayMs: cfg.delayMs,
    });
    complexResults.push(result);

    if (cfg.delayMs > 0) {
      await sleep(cfg.delayMs);
    }
  }

  // ─── 서울시 공동주택 정보 수집 ───
  let seoulAptResult: CollectionResult | undefined;
  if (process.env.SEOUL_OPEN_DATA_KEY) {
    seoulAptResult = await collectSeoulAptInfo({ delayMs: cfg.delayMs });
  }

  // ─── 건축물대장 총괄표제부 수집 ───
  const buildingResults: CollectionResult[] = [];
  for (const lawdCd of cfg.lawdCodes) {
    const result = await collectBuildingLedger(lawdCd, { delayMs: cfg.delayMs });
    buildingResults.push(result);

    if (cfg.delayMs > 0) await sleep(cfg.delayMs);
  }

  // 건축물대장 → complexes 보강
  if (buildingResults.some((r) => r.recordCount > 0)) {
    const enriched = await enrichComplexesFromBuildingLedger();
    console.log(`[collector] Enriched ${enriched} complexes from building ledger`);
  }

  // ─── 토지이용규제 수집 ───
  const landUseResults: CollectionResult[] = [];
  for (const lawdCd of cfg.lawdCodes) {
    const result = await collectLandUseRegulation(lawdCd, { delayMs: cfg.delayMs });
    landUseResults.push(result);

    if (cfg.delayMs > 0) await sleep(cfg.delayMs);
  }

  // 토지이용규제 → complexes 보강
  if (landUseResults.some((r) => r.recordCount > 0)) {
    const enriched = await enrichComplexesFromLandUse();
    console.log(`[collector] Enriched ${enriched} complexes from land use regulation`);
  }

  return {
    trades: tradeResults,
    complexes: complexResults,
    seoulApt: seoulAptResult,
    buildingLedger: buildingResults,
    landUse: landUseResults,
    elapsed: Date.now() - start,
  };
}

/**
 * 특정 지역만 수집 (부분 실행)
 */
export async function runCollectorForRegion(
  lawdCodes: string[],
  months = 36,
): Promise<CollectorRunResult> {
  return runCollector({
    lawdCodes,
    months,
    concurrency: 2,
    delayMs: 300,
  });
}

/** 수집 진행 상황 조회 */
export async function getCollectorProgress(): Promise<{
  trades: CollectionProgress;
  complexes: CollectionProgress;
}> {
  return {
    trades: await getProgress('trade'),
    complexes: await getProgress('complex'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
