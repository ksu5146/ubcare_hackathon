import * as fs from 'fs';
import * as path from 'path';

// .env.local 수동 로드
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) process.env[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
  }
}

import { initSchema } from '../src/lib/db';
import { collectSeoulAptInfo } from '../src/lib/collector/seoul-apt-collector';

async function main() {
  console.log('=== 서울시 공동주택 정보 수집 ===');
  console.log('SEOUL_OPEN_DATA_KEY:', process.env.SEOUL_OPEN_DATA_KEY ? 'SET' : 'MISSING');

  if (!process.env.SEOUL_OPEN_DATA_KEY) {
    console.error('.env.local에 SEOUL_OPEN_DATA_KEY를 설정해주세요.');
    process.exit(1);
  }

  initSchema();
  console.log('DB schema initialized.');

  const result = await collectSeoulAptInfo({ delayMs: 300 });
  console.log('\n=== 수집 완료 ===');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
