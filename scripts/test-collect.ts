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
import { collectTrades } from '../src/lib/collector/trade-collector';

async function main() {
  console.log('API key loaded:', process.env.DATA_GO_KR_API_KEY ? 'yes' : 'NO');

  await initSchema();

  console.log('Testing: 강남구(11680), 202601...');
  const result = await collectTrades('11680', '202601');
  console.log('Result:', JSON.stringify(result, null, 2));

  const client = getClient();
  const countResult = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM trades', args: [] });
  const count = (countResult.rows[0] as unknown as { cnt: number }).cnt;
  console.log('Total trades in DB:', count);
}

main().catch((e) => console.error('Fatal:', e));
