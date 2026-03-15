import path from 'path';
import fs from 'fs';

// .env.local 수동 로드
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const apiKey = process.env.KAKAO_REST_API_KEY;
console.log('API Key exists:', !!apiKey);
console.log('API Key length:', apiKey?.length);
console.log('API Key prefix:', apiKey?.substring(0, 4) + '...');

async function test() {
  const address = '서울특별시 강남구 역삼동';
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;

  console.log('\nTest URL:', url);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    console.log('Status:', res.status, res.statusText);
    const body = await res.text();
    console.log('Response:', body.substring(0, 300));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
