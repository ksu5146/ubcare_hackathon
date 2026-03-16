/**
 * @module collector/state
 * @description 데이터 수집 상태(collection_state 테이블) CRUD 헬퍼.
 *
 * 각 수집 작업은 (collector_type, lawd_cd, deal_ym) 조합으로 고유 식별되며,
 * pending → in_progress → completed | failed 순으로 상태가 전이된다.
 * Vercel Cron이 동시에 여러 번 트리거되는 경우에도 `in_progress` 상태
 * 체크를 통해 중복 수집을 방지한다.
 */
import { getClient } from '../db';
import type { CollectionState, CollectionStatus, CollectorType, CollectionProgress } from './types';

/** 수집 상태 조회 (단건) */
export async function getCollectionState(
  collectorType: CollectorType,
  lawdCd: string,
  dealYm?: string,
): Promise<CollectionState | undefined> {
  const client = getClient();
  const result = await client.execute({
    sql: `
    SELECT id, collector_type, lawd_cd, deal_ym, status, record_count,
           error_message, started_at, completed_at
    FROM collection_state
    WHERE collector_type = ? AND lawd_cd = ? AND (deal_ym = ? OR (? IS NULL AND deal_ym IS NULL))
  `,
    args: [collectorType, lawdCd, dealYm ?? null, dealYm ?? null],
  });

  const row = result.rows[0] as unknown as CollectionStateRow | undefined;
  return row ? mapRow(row) : undefined;
}

/** 수집 상태 upsert — pending 상태로 초기 등록 또는 기존 상태 반환 */
export async function upsertPending(
  collectorType: CollectorType,
  lawdCd: string,
  dealYm?: string,
): Promise<CollectionState> {
  const client = getClient();

  await client.execute({
    sql: `
    INSERT INTO collection_state (collector_type, lawd_cd, deal_ym, status)
    VALUES (?, ?, ?, 'pending')
    ON CONFLICT(collector_type, lawd_cd, deal_ym) DO NOTHING
  `,
    args: [collectorType, lawdCd, dealYm ?? null],
  });

  return (await getCollectionState(collectorType, lawdCd, dealYm))!;
}

/** 상태를 in_progress로 전환 */
export async function markInProgress(id: number): Promise<void> {
  await getClient().execute({
    sql: `
    UPDATE collection_state
    SET status = 'in_progress', started_at = datetime('now'), error_message = NULL
    WHERE id = ?
  `,
    args: [id],
  });
}

/** 상태를 completed로 전환 */
export async function markCompleted(id: number, recordCount: number): Promise<void> {
  await getClient().execute({
    sql: `
    UPDATE collection_state
    SET status = 'completed', record_count = ?, completed_at = datetime('now')
    WHERE id = ?
  `,
    args: [recordCount, id],
  });
}

/** 상태를 failed로 전환 */
export async function markFailed(id: number, errorMessage: string): Promise<void> {
  await getClient().execute({
    sql: `
    UPDATE collection_state
    SET status = 'failed', error_message = ?, completed_at = datetime('now')
    WHERE id = ?
  `,
    args: [errorMessage, id],
  });
}

/** 특정 collector 타입의 전체 진행 상황 */
export async function getProgress(collectorType: CollectorType): Promise<CollectionProgress> {
  const client = getClient();
  const result = await client.execute({
    sql: `
    SELECT status, COUNT(*) as cnt
    FROM collection_state
    WHERE collector_type = ?
    GROUP BY status
  `,
    args: [collectorType],
  });

  const rows = result.rows as unknown as { status: CollectionStatus; cnt: number }[];

  const counts: Record<CollectionStatus, number> = {
    pending: 0, in_progress: 0, completed: 0, failed: 0,
  };
  let total = 0;
  for (const r of rows) {
    counts[r.status] = r.cnt;
    total += r.cnt;
  }

  return {
    total,
    completed: counts.completed,
    failed: counts.failed,
    inProgress: counts.in_progress,
    pending: counts.pending,
    percentage: total === 0 ? 0 : Math.round((counts.completed / total) * 100),
  };
}

/** 마지막 수집 완료된 deal_ym 조회 (trade collector용) */
export async function getLastCompletedYm(lawdCd: string): Promise<string | null> {
  const result = await getClient().execute({
    sql: `
    SELECT deal_ym FROM collection_state
    WHERE collector_type = 'trade' AND lawd_cd = ? AND status = 'completed'
    ORDER BY deal_ym DESC LIMIT 1
  `,
    args: [lawdCd],
  });

  const row = result.rows[0] as unknown as { deal_ym: string } | undefined;
  return row?.deal_ym ?? null;
}

/** 미완료 작업 목록 조회 */
export async function getPendingTasks(collectorType: CollectorType): Promise<CollectionState[]> {
  const result = await getClient().execute({
    sql: `
    SELECT id, collector_type, lawd_cd, deal_ym, status, record_count,
           error_message, started_at, completed_at
    FROM collection_state
    WHERE collector_type = ? AND status IN ('pending', 'failed')
    ORDER BY lawd_cd, deal_ym
  `,
    args: [collectorType],
  });

  return (result.rows as unknown as CollectionStateRow[]).map(mapRow);
}

// ─── 내부 타입 & 매핑 ───

interface CollectionStateRow {
  id: number;
  collector_type: string;
  lawd_cd: string;
  deal_ym: string | null;
  status: string;
  record_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

function mapRow(row: CollectionStateRow): CollectionState {
  return {
    id: row.id,
    collectorType: row.collector_type as CollectorType,
    lawdCd: row.lawd_cd,
    dealYm: row.deal_ym,
    status: row.status as CollectionStatus,
    recordCount: row.record_count,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}
