/**
 * ODsay 대중교통 API 클라이언트 (브라우저에서 직접 호출)
 *
 * Vercel Serverless의 동적 IP가 ODsay IP 제한에 걸리므로,
 * 브라우저에서 직접 호출하여 도메인 기반 인증을 사용한다.
 */

import { ODSAY_API_URL } from './constants';
import type { TransitResult } from '@/types/location';

const API_KEY = process.env.NEXT_PUBLIC_ODSAY_API_KEY ?? '';

interface OdsayPathInfo {
  totalTime: number;
  payment: number;
  busTransitCount: number;
  subwayTransitCount: number;
  totalStationCount: number;
  busStationCount: number;
  subwayStationCount: number;
  firstStartStation: string;
  lastEndStation: string;
}

interface OdsayPath {
  pathType: number;
  info: OdsayPathInfo;
}

export async function fetchTransit(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): Promise<TransitResult | null> {
  if (!API_KEY) return null;

  const url = `${ODSAY_API_URL}/searchPubTransPathT?SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${encodeURIComponent(API_KEY)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const body = await res.json();

    if (body.error) {
      const code = Number(body.error.code);
      if (code === -98 || code === 500) return null; // 경로 없음
      return null;
    }

    if (!body.result?.path?.length) return null;

    const best: OdsayPath = body.result.path.reduce((a: OdsayPath, b: OdsayPath) =>
      a.info.totalTime <= b.info.totalTime ? a : b,
    );
    const { info } = best;

    const pathTypeLabel =
      best.pathType === 1 ? '지하철' : best.pathType === 2 ? '버스' : '지하철+버스';

    const transferCount = Math.max(0, info.busTransitCount + info.subwayTransitCount - 1);

    const summary = `${pathTypeLabel} | ${info.firstStartStation} → ${info.lastEndStation} (${info.totalStationCount}개 정류장)`;

    return {
      totalTime: info.totalTime,
      transferCount,
      fare: info.payment,
      summary,
    };
  } catch {
    return null;
  }
}
