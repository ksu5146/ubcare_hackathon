import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) process.env[t.substring(0, i)] = t.substring(i + 1);
  }
}

import { initSchema } from '../src/lib/db';
import { collectBuildingLedger, enrichComplexesFromBuildingLedger } from '../src/lib/collector/building-ledger-collector';
import { SEOUL_LAWD_CODES } from '../src/lib/collector/types';

async function main() {
  const targetCodes = process.argv[2]
    ? process.argv[2].split(',')
    : SEOUL_LAWD_CODES.slice(0, 3); // 기본: 서울 3개 구만 테스트

  console.log('=== 건축물대장 총괄표제부 수집 ===');
  console.log('DATA_GO_KR_API_KEY:', process.env.DATA_GO_KR_API_KEY ? 'SET' : 'MISSING');
  console.log('대상 지역:', targetCodes.length, '개');

  initSchema();

  for (const lawdCd of targetCodes) {
    const result = await collectBuildingLedger(lawdCd, { delayMs: 300 });
    console.log(`  ${lawdCd}: ${result.recordCount}건${result.error ? ` (ERROR: ${result.error})` : ''}`);
  }

  console.log('\n=== complexes 보강 ===');
  const enriched = enrichComplexesFromBuildingLedger();
  console.log(`Enriched ${enriched} complexes`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
