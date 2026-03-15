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
import { collectTrades, buildDealYmList } from '../src/lib/collector/trade-collector';
import { ALL_TARGET_LAWD_CODES } from '../src/lib/collector/types';

const CONCURRENCY = 2;
const DELAY_MS = 300;
const MONTHS = 36;

async function main() {
  await initSchema();

  const lawdCodes = ALL_TARGET_LAWD_CODES;
  const dealYmList = buildDealYmList(MONTHS);

  console.log(`=== 실거래가 수집 시작 ===`);
  console.log(`대상 지역: ${lawdCodes.length}개`);
  console.log(`수집 기간: ${dealYmList[dealYmList.length - 1]} ~ ${dealYmList[0]} (${MONTHS}개월)`);
  console.log(`총 작업: ${lawdCodes.length * dealYmList.length}건\n`);

  let totalRecords = 0;
  let totalNew = 0;
  let totalErrors = 0;
  const start = Date.now();

  for (let ri = 0; ri < lawdCodes.length; ri++) {
    const lawdCd = lawdCodes[ri];
    let regionRecords = 0;
    let regionNew = 0;

    for (let i = 0; i < dealYmList.length; i += CONCURRENCY) {
      const batch = dealYmList.slice(i, i + CONCURRENCY);

      const results = await Promise.all(
        batch.map((ym) => collectTrades(lawdCd, ym)),
      );

      for (const r of results) {
        if (r.error) {
          totalErrors++;
          console.error(`  ✗ ${lawdCd}/${r.dealYm}: ${r.error}`);
        } else {
          regionRecords += r.recordCount;
          regionNew += r.isNew;
        }
      }

      // API 부하 방지
      if (i + CONCURRENCY < dealYmList.length) {
        await sleep(DELAY_MS);
      }
    }

    totalRecords += regionRecords;
    totalNew += regionNew;

    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    console.log(
      `[${ri + 1}/${lawdCodes.length}] ${lawdCd}: ${regionRecords}건 (신규 ${regionNew}) — ${elapsed}s`,
    );
  }

  const client = getClient();
  const countResult = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM trades', args: [] });
  const count = (countResult.rows[0] as unknown as { cnt: number }).cnt;

  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 수집: ${totalRecords}건, 신규 삽입: ${totalNew}건, 에러: ${totalErrors}건`);
  console.log(`DB 전체 거래 수: ${count}건`);
  console.log(`소요 시간: ${((Date.now() - start) / 1000 / 60).toFixed(1)}분`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((e) => console.error('Fatal:', e));
