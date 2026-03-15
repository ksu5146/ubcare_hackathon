import { getClient } from '../db';
import { fetchTrades } from './api-client';
import { upsertPending, markInProgress, markCompleted, markFailed } from './state';
import type { TradeRawItem, CollectionResult } from './types';

/**
 * 특정 법정동 + 년월의 실거래가를 수집하여 DB에 저장한다.
 * INSERT OR IGNORE로 중복 방지 — 이미 있는 레코드는 건너뛴다.
 */
export async function collectTrades(
  lawdCd: string,
  dealYm: string,
): Promise<CollectionResult> {
  const state = await upsertPending('trade', lawdCd, dealYm);
  await markInProgress(state.id);

  try {
    const items = await fetchTrades(lawdCd, dealYm) as TradeRawItem[];

    const insertCount = await insertTrades(lawdCd, items);

    await markCompleted(state.id, items.length);

    return {
      lawdCd,
      dealYm,
      recordCount: items.length,
      isNew: insertCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    return {
      lawdCd,
      dealYm,
      recordCount: 0,
      isNew: 0,
      error: message,
    };
  }
}

/**
 * 수집 대상 년월 목록 생성 (최근 N개월)
 * 예: months=36 → 최근 3년치 YYYYMM 목록
 */
export function buildDealYmList(months: number): string[] {
  const result: string[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}${m}`);
  }

  return result;
}

// ─── 내부 함수 ───

async function insertTrades(lawdCd: string, items: TradeRawItem[]): Promise<number> {
  if (items.length === 0) return 0;

  const client = getClient();

  const sql = `
    INSERT OR IGNORE INTO trades (
      apt_seq, apt_nm, lawd_cd, umd_nm, jibun, bonbun,
      road_nm, deal_amount, exclu_use_ar, floor, build_year,
      deal_year, deal_month, deal_day, deal_type, buyer_gbn,
      seller_gbn, cancel_yn, reg_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `;

  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  for (const item of items) {
    const amount = parseDealAmount(item.dealAmount);
    if (amount === null) continue;

    statements.push({
      sql,
      args: [
        str(item.aptSeq),
        str(item.aptNm) ?? '',
        lawdCd,
        str(item.umdNm) ?? null,
        str(item.jibun) ?? null,
        str(item.bonbun) ?? null,
        str(item.roadNm) ?? null,
        amount,
        item.excluUseAr,
        item.floor ?? null,
        item.buildYear ?? null,
        item.dealYear,
        item.dealMonth,
        item.dealDay ?? null,
        str(item.dealingGbn) ?? null,
        str(item.buyerGbn) ?? null,
        str(item.slerGbn) ?? null,
        item.cdealType === 'D' ? 'Y' : 'N',
        str(item.rgstDate) ?? null,
      ],
    });
  }

  if (statements.length === 0) return 0;

  const results = await client.batch(statements, 'write');
  return results.reduce((sum, r) => sum + (r.rowsAffected ?? 0), 0);
}

/** 안전하게 문자열로 변환 (숫자/null 대응) */
function str(val: unknown): string | null {
  if (val == null || val === '') return null;
  return String(val).trim() || null;
}

/** "12,000" → 12000 (만원 단위) */
function parseDealAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
