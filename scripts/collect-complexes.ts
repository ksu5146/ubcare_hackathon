import { readFileSync } from 'fs';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
}

import { initSchema, getClient } from '../src/lib/db';
import {
  fetchAllComplexes,
  collectComplexesFromList,
} from '../src/lib/collector/complex-collector';
import { ALL_TARGET_LAWD_CODES, SEOUL_LAWD_CODES } from '../src/lib/collector/types';
import type { ComplexListItem } from '../src/lib/collector/types';

const DELAY_MS = 500;

async function main() {
  await initSchema();

  // --seoul 플래그: 서울만 수집 (테스트용)
  const seoulOnly = process.argv.includes('--seoul');
  // --region=11680 플래그: 특정 지역만 수집
  const regionArg = process.argv.find((a) => a.startsWith('--region='));
  const specificRegion = regionArg?.split('=')[1];

  let lawdCodes: string[];
  if (specificRegion) {
    lawdCodes = [specificRegion];
  } else if (seoulOnly) {
    lawdCodes = SEOUL_LAWD_CODES;
  } else {
    lawdCodes = ALL_TARGET_LAWD_CODES;
  }

  console.log(`=== 단지 정보 수집 시작 ===`);
  console.log(`대상 지역: ${lawdCodes.length}개`);
  console.log(`옵션: ${specificRegion ? `단일 지역 (${specificRegion})` : seoulOnly ? '서울만' : '전체 (수도권)'}`);

  const start = Date.now();

  // 1) 전체 단지 목록을 getTotalAptList3로 한번에 가져온다
  console.log(`\n[1단계] 전체 단지 목록 조회 중...`);
  const allList: ComplexListItem[] = await fetchAllComplexes({
    pageSize: 1000,
    delayMs: 300,
  });
  console.log(`전체 단지: ${allList.length}개 조회 완료 (${((Date.now() - start) / 1000).toFixed(0)}s)`);

  // 대상 지역 필터링 결과 미리 확인
  const targetSet = new Set(lawdCodes);
  const filtered = allList.filter((item) => targetSet.has(item.bjdCode.substring(0, 5)));
  console.log(`대상 지역 단지: ${filtered.length}개\n`);

  // 2) 지역별로 기본정보 + 상세정보 수집
  console.log(`[2단계] 단지별 기본/상세정보 수집 중...`);
  let totalComplexes = 0;
  let totalErrors = 0;

  for (let i = 0; i < lawdCodes.length; i++) {
    const lawdCd = lawdCodes[i];

    try {
      const result = await collectComplexesFromList(lawdCd, allList, {
        concurrency: 2,
        delayMs: 300,
      });

      if (result.error) {
        totalErrors++;
        console.error(`  ✗ ${lawdCd}: ${result.error}`);
      } else {
        totalComplexes += result.recordCount;
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        console.log(
          `[${i + 1}/${lawdCodes.length}] ${lawdCd}: ${result.recordCount}개 단지 (신규 ${result.isNew}) — ${elapsed}s`,
        );
      }
    } catch (err) {
      totalErrors++;
      console.error(`  ✗ ${lawdCd}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 지역 간 딜레이
    if (i < lawdCodes.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const client = getClient();
  const countResult = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM complexes', args: [] });
  const count = (countResult.rows[0] as unknown as { cnt: number }).cnt;

  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 단지: ${totalComplexes}개, 에러: ${totalErrors}건`);
  console.log(`DB 전체 단지 수: ${count}개`);
  console.log(`소요 시간: ${((Date.now() - start) / 1000 / 60).toFixed(1)}분`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((e) => console.error('Fatal:', e));
