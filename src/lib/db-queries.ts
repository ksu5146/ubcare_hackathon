/**
 * @module db-queries
 * @description Turso(libSQL) DB 쿼리 헬퍼 함수 모음 (v2.3 신규).
 *
 * 실거래가 검색(searchTrades / searchTradeGrouped), 단지 목록/상세 조회,
 * 사용자 즐겨찾기·비교분석 CRUD 등 Route Handler에서 공통으로 사용하는
 * DB 접근 로직을 중앙화한다. 직접 SQL을 사용하며 ORM 레이어 없음.
 *
 * 주요 export:
 *   - searchTrades(params)        — 확장 필터 기반 실거래가 목록 조회 (페이징)
 *   - searchTradeGrouped(params)  — 동일 파라미터로 단지별 그룹핑 결과 반환
 *   - getComplexList(lawdCd)      — 법정동코드 기준 단지 목록
 *   - getComplexById(aptSeq)      — 단지 상세 정보 (complexes 테이블)
 *   - getTradeHistory(aptSeq)     — 단지별 실거래가 이력 (최대 60개월)
 */
import { getClient, initSchema } from './db';
import type { ApartmentTrade, ComplexTradeGroup } from '@/types/trade';
import type { ComplexListItem, ComplexInfo } from '@/types/complex';

// ─── 존재 여부 캐시 (60초 TTL) ───

let _hasComplexes: boolean | null = null;
let _hasComplexesTTL = 0;
async function hasComplexesData(): Promise<boolean> {
  if (_hasComplexes !== null && Date.now() < _hasComplexesTTL) return _hasComplexes;
  const client = getClient();
  const result = await client.execute({ sql: 'SELECT 1 FROM complexes LIMIT 1', args: [] });
  _hasComplexes = result.rows.length > 0;
  _hasComplexesTTL = Date.now() + 60000;
  return _hasComplexes;
}

let _hasComplexMap: boolean | null = null;
let _hasComplexMapTTL = 0;
async function hasComplexMapData(): Promise<boolean> {
  if (_hasComplexMap !== null && Date.now() < _hasComplexMapTTL) return _hasComplexMap;
  const client = getClient();
  const result = await client.execute({ sql: 'SELECT 1 FROM trade_complex_map LIMIT 1', args: [] });
  _hasComplexMap = result.rows.length > 0;
  _hasComplexMapTTL = Date.now() + 60000;
  return _hasComplexMap;
}

// ─── 실거래가 검색 ───

export interface TradeSearchParams {
  // ─── 기본 필터 ───

  /** 법정동코드 5자리 (최대 3개) */
  lawdCds?: string[];
  /** 검색 시작 년월 (YYYYMM) */
  fromYm?: string;
  /** 검색 종료 년월 (YYYYMM) */
  toYm?: string;
  /** 최소 거래금액 (만원) */
  priceMin?: number;
  /** 최대 거래금액 (만원) */
  priceMax?: number;
  /** 최소 전용면적 (m²) */
  areaMin?: number;
  /** 최대 전용면적 (m²) */
  areaMax?: number;
  /** 최소 층수 */
  floorMin?: number;
  /** 최대 층수 */
  floorMax?: number;
  /** 최소 건축년도 */
  buildYearMin?: number;
  /** 최대 건축년도 */
  buildYearMax?: number;
  /** 아파트명 검색어 */
  aptName?: string;
  /** 읍면동명 */
  umdNm?: string;
  /** 직거래 포함 여부 (false=직거래 제외) */
  includeDirectDeal?: boolean;
  /** 취소 거래 제외 여부 (기본 true) */
  excludeCanceled?: boolean;
  /** 최소 세대수 (complexes JOIN) */
  householdsMin?: number;
  /** 최대 세대수 (complexes JOIN) */
  householdsMax?: number;

  // ─── 고급 필터 (complexes JOIN) ───

  /** 세대당 최소 주차대수 비율 */
  parkingRatioMin?: number;
  /** 지하주차장 여부 */
  hasUndergroundParking?: boolean;
  /** 지하철 도보시간 최대 (분) */
  subwayTimeMax?: number;
  /** 난방방식 */
  heatType?: string;
  /** 복도유형 */
  hallType?: string;
  /** 시공사 (LIKE 검색) */
  builder?: string;
  /** 분양형태 */
  saleType?: string;
  /** 승강기 유무 */
  hasElevator?: boolean;
  /** 추정 방수 (면적 기반: 1=~40, 2=40~60, 3=60~100, 4=100+) */
  roomEstimate?: number;
  /** 용적률 최대 (%) */
  vlRatMax?: number;

  // ─── 정렬/페이징 ───

  /** 정렬 기준 */
  sortBy?: 'deal_date' | 'deal_amount' | 'exclu_use_ar' | 'apt_nm';
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
  /** 페이지 (1-based) */
  page?: number;
  /** 페이지당 건수 */
  pageSize?: number;
}

export interface TradeSearchResult {
  trades: ApartmentTrade[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchTrades(params: TradeSearchParams): Promise<TradeSearchResult> {
  await ensureSchema();
  const client = getClient();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];
  let needsJoin = false;

  // complexes 테이블에 데이터가 있는지 확인 — 없으면 JOIN 필터 무시
  const hasComplexes = await hasComplexesData();

  // ─── 기본 필터 (trades) ───

  if (params.lawdCds && params.lawdCds.length > 0) {
    const placeholders = params.lawdCds.map(() => '?').join(',');
    conditions.push(`t.lawd_cd IN (${placeholders})`);
    bindings.push(...params.lawdCds);
  }
  if (params.fromYm) {
    const y = parseInt(params.fromYm.substring(0, 4), 10);
    const m = parseInt(params.fromYm.substring(4, 6), 10);
    conditions.push('(t.deal_year > ? OR (t.deal_year = ? AND t.deal_month >= ?))');
    bindings.push(y, y, m);
  }
  if (params.toYm) {
    const y = parseInt(params.toYm.substring(0, 4), 10);
    const m = parseInt(params.toYm.substring(4, 6), 10);
    conditions.push('(t.deal_year < ? OR (t.deal_year = ? AND t.deal_month <= ?))');
    bindings.push(y, y, m);
  }
  if (params.priceMin != null) {
    conditions.push('t.deal_amount >= ?');
    bindings.push(params.priceMin);
  }
  if (params.priceMax != null) {
    conditions.push('t.deal_amount <= ?');
    bindings.push(params.priceMax);
  }
  if (params.areaMin != null) {
    conditions.push('t.exclu_use_ar >= ?');
    bindings.push(params.areaMin);
  }
  if (params.areaMax != null) {
    conditions.push('t.exclu_use_ar <= ?');
    bindings.push(params.areaMax);
  }
  if (params.floorMin != null) {
    conditions.push('t.floor >= ?');
    bindings.push(params.floorMin);
  }
  if (params.floorMax != null) {
    conditions.push('t.floor <= ?');
    bindings.push(params.floorMax);
  }
  if (params.buildYearMin != null) {
    conditions.push('t.build_year >= ?');
    bindings.push(params.buildYearMin);
  }
  if (params.buildYearMax != null) {
    conditions.push('t.build_year <= ?');
    bindings.push(params.buildYearMax);
  }
  if (params.aptName) {
    conditions.push('t.apt_nm LIKE ?');
    bindings.push(`%${params.aptName}%`);
  }
  if (params.umdNm) {
    conditions.push('t.umd_nm LIKE ?');
    bindings.push(`%${params.umdNm}%`);
  }
  if (params.includeDirectDeal === false) {
    conditions.push("t.deal_type != '직거래'");
  }
  if (params.excludeCanceled !== false) {
    conditions.push("t.cancel_yn = 'N'");
  }

  // ─── 고급 필터 (complexes JOIN) — complexes 데이터 없으면 무시 ───

  if (hasComplexes) {
    if (params.householdsMin != null) {
      needsJoin = true;
      conditions.push('c.total_unit >= ?');
      bindings.push(params.householdsMin);
    }
    if (params.householdsMax != null) {
      needsJoin = true;
      conditions.push('c.total_unit <= ?');
      bindings.push(params.householdsMax);
    }
    if (params.parkingRatioMin != null) {
      needsJoin = true;
      conditions.push(
        'CAST((COALESCE(c.parking_ground, 0) + COALESCE(c.parking_underground, 0)) AS REAL) / NULLIF(c.total_unit, 0) >= ?',
      );
      bindings.push(params.parkingRatioMin);
    }
    if (params.hasUndergroundParking) {
      needsJoin = true;
      conditions.push('c.parking_underground > 0');
    }
    if (params.subwayTimeMax != null) {
      needsJoin = true;
      conditions.push('CAST(c.subway_time AS INTEGER) <= ?');
      bindings.push(params.subwayTimeMax);
    }
    if (params.heatType) {
      needsJoin = true;
      conditions.push('c.heat_type = ?');
      bindings.push(params.heatType);
    }
    if (params.hallType) {
      needsJoin = true;
      conditions.push('c.hall_type = ?');
      bindings.push(params.hallType);
    }
    if (params.builder) {
      needsJoin = true;
      conditions.push('c.builder LIKE ?');
      bindings.push(`%${params.builder}%`);
    }
    if (params.saleType) {
      needsJoin = true;
      conditions.push('c.sale_type = ?');
      bindings.push(params.saleType);
    }
    if (params.hasElevator === true) {
      needsJoin = true;
      conditions.push('COALESCE(c.elevator_cnt, 0) > 0');
    }
  }

  // 추정 방수 (면적 기반, complexes JOIN 불필요)
  if (params.roomEstimate != null) {
    switch (params.roomEstimate) {
      case 1: conditions.push('t.exclu_use_ar < 40'); break;
      case 2: conditions.push('t.exclu_use_ar >= 40 AND t.exclu_use_ar < 60'); break;
      case 3: conditions.push('t.exclu_use_ar >= 60 AND t.exclu_use_ar < 100'); break;
      case 4: conditions.push('t.exclu_use_ar >= 100'); break;
    }
  }

  // 용적률 필터 (complexes JOIN 필요)
  if (params.vlRatMax != null) {
    needsJoin = true;
    conditions.push(`c.vl_rat IS NOT NULL AND c.vl_rat <= ${Number(params.vlRatMax)}`);
  }

  // ─── 쿼리 조립 ───

  const hasMap = needsJoin ? await hasComplexMapData() : false;
  const joinClause = needsJoin
    ? hasMap
      ? 'LEFT JOIN trade_complex_map m ON t.lawd_cd = m.lawd_cd AND t.apt_nm = m.trade_apt_nm LEFT JOIN complexes c ON m.kapt_code = c.kapt_code'
      : 'LEFT JOIN complexes c ON t.lawd_cd = substr(c.bjd_code, 1, 5) AND t.apt_nm = c.apt_nm'
    : '';
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 카운트 쿼리
  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM trades t ${joinClause} ${where}`,
    args: bindings,
  });
  const countRow = countResult.rows[0] as unknown as { cnt: number };
  const total = countRow.cnt;

  // 정렬
  const sortMap: Record<string, string> = {
    deal_date: 't.deal_year DESC, t.deal_month DESC, t.deal_day DESC',
    deal_amount: `t.deal_amount ${params.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    exclu_use_ar: `t.exclu_use_ar ${params.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    apt_nm: `t.apt_nm ${params.sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
  };
  const orderBy = sortMap[params.sortBy ?? 'deal_date'] ?? sortMap.deal_date;

  // 페이징
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const rowsResult = await client.execute({
    sql: `
      SELECT t.apt_nm, t.deal_amount, t.exclu_use_ar, t.floor, t.build_year,
             t.deal_year, t.deal_month, t.deal_day, t.umd_nm, t.jibun,
             t.road_nm, t.cancel_yn, t.deal_type, t.buyer_gbn, t.seller_gbn
      FROM trades t
      ${joinClause}
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    args: [...bindings, pageSize, offset],
  });
  const rows = rowsResult.rows as unknown as TradeRow[];

  return {
    trades: rows.map(mapTradeRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** 특정 법정동 + 년월의 거래 조회 (기존 API 호환) */
export async function getTradesByLawdYm(lawdCd: string, dealYm: string): Promise<ApartmentTrade[]> {
  return (await searchTrades({
    lawdCds: [lawdCd],
    fromYm: dealYm,
    toYm: dealYm,
    excludeCanceled: true,
    pageSize: 200,
  })).trades;
}

/** 특정 단지의 거래 내역 조회 (비교 페이지용) */
export async function getTradesByComplex(lawdCd: string, aptName: string, dong?: string): Promise<ApartmentTrade[]> {
  await ensureSchema();
  const client = getClient();

  const conditions = ["lawd_cd = ?", "apt_nm = ?", "cancel_yn = 'N'"];
  const bindings: (string | number)[] = [lawdCd, aptName];

  if (dong) {
    conditions.push('umd_nm = ?');
    bindings.push(dong);
  }

  const result = await client.execute({
    sql: `
      SELECT apt_nm, deal_amount, exclu_use_ar, floor, build_year,
             deal_year, deal_month, deal_day, umd_nm, jibun, road_nm,
             cancel_yn, deal_type, buyer_gbn, seller_gbn
      FROM trades
      WHERE ${conditions.join(' AND ')}
      ORDER BY deal_year DESC, deal_month DESC, deal_day DESC
    `,
    args: bindings,
  });
  const rows = result.rows as unknown as TradeRow[];

  return rows.map(mapTradeRow);
}

/** 단지별 거래 집계 */
export async function getTradeGroupsByLawd(lawdCd: string): Promise<ComplexTradeGroup[]> {
  await ensureSchema();
  const client = getClient();

  const result = await client.execute({
    sql: `
      SELECT apt_nm, deal_amount, exclu_use_ar, floor, build_year,
             deal_year, deal_month, deal_day, umd_nm, jibun, road_nm, cancel_yn
      FROM trades
      WHERE lawd_cd = ? AND cancel_yn = 'N'
      ORDER BY apt_nm, deal_year DESC, deal_month DESC, deal_day DESC
    `,
    args: [lawdCd],
  });
  const rows = result.rows as unknown as TradeRow[];

  const groups = new Map<string, ComplexTradeGroup>();

  for (const row of rows) {
    const trade = mapTradeRow(row);
    let group = groups.get(trade.aptName);

    if (!group) {
      group = {
        aptName: trade.aptName,
        dong: trade.dong,
        lawdCd,
        latestPrice: trade.dealAmount,
        latestDate: trade.dealDate,
        tradeCount: 0,
        areas: [],
        buildYear: trade.buildYear,
        totalUnit: null,
        roadAddr: null,
        lat: null,
        lng: null,
        recentAvg: null,
        yearAgoAvg: null,
        priceChangeRate: null,
        heatType: null,
        hallType: null,
        subwayLine: null,
        subwayTime: null,
        trades: [],
      };
      groups.set(trade.aptName, group);
    }

    group!.tradeCount++;
    group!.trades.push(trade);
    if (!group!.areas.includes(trade.area)) {
      group!.areas.push(trade.area);
    }
  }

  return Array.from(groups.values());
}

/** 검색 조건에 맞는 거래를 단지별로 그룹핑하여 반환 */
export async function searchTradeGrouped(params: TradeSearchParams): Promise<{
  groups: ComplexTradeGroup[];
  total: number;
}> {
  await ensureSchema();
  const client = getClient();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];
  let needsJoin = false;

  // complexes 테이블에 데이터가 있는지 확인
  const hasComplexes = await hasComplexesData();

  // ─── 기본 필터 (trades) ───
  if (params.lawdCds && params.lawdCds.length > 0) {
    const placeholders = params.lawdCds.map(() => '?').join(',');
    conditions.push(`t.lawd_cd IN (${placeholders})`);
    bindings.push(...params.lawdCds);
  }
  if (params.fromYm) {
    const y = parseInt(params.fromYm.substring(0, 4), 10);
    const m = parseInt(params.fromYm.substring(4, 6), 10);
    conditions.push('(t.deal_year > ? OR (t.deal_year = ? AND t.deal_month >= ?))');
    bindings.push(y, y, m);
  }
  if (params.toYm) {
    const y = parseInt(params.toYm.substring(0, 4), 10);
    const m = parseInt(params.toYm.substring(4, 6), 10);
    conditions.push('(t.deal_year < ? OR (t.deal_year = ? AND t.deal_month <= ?))');
    bindings.push(y, y, m);
  }
  if (params.priceMin != null) { conditions.push('t.deal_amount >= ?'); bindings.push(params.priceMin); }
  if (params.priceMax != null) { conditions.push('t.deal_amount <= ?'); bindings.push(params.priceMax); }
  if (params.areaMin != null) { conditions.push('t.exclu_use_ar >= ?'); bindings.push(params.areaMin); }
  if (params.areaMax != null) { conditions.push('t.exclu_use_ar <= ?'); bindings.push(params.areaMax); }
  if (params.floorMin != null) { conditions.push('t.floor >= ?'); bindings.push(params.floorMin); }
  if (params.floorMax != null) { conditions.push('t.floor <= ?'); bindings.push(params.floorMax); }
  if (params.buildYearMin != null) { conditions.push('t.build_year >= ?'); bindings.push(params.buildYearMin); }
  if (params.buildYearMax != null) { conditions.push('t.build_year <= ?'); bindings.push(params.buildYearMax); }
  if (params.aptName) { conditions.push('t.apt_nm LIKE ?'); bindings.push(`%${params.aptName}%`); }
  if (params.umdNm) { conditions.push('t.umd_nm LIKE ?'); bindings.push(`%${params.umdNm}%`); }
  if (params.includeDirectDeal === false) { conditions.push("t.deal_type != '직거래'"); }
  if (params.excludeCanceled !== false) { conditions.push("t.cancel_yn = 'N'"); }

  // ─── 고급 필터 (complexes JOIN) — complexes 데이터 없으면 무시 ───
  if (hasComplexes) {
    if (params.householdsMin != null) { needsJoin = true; conditions.push('c.total_unit >= ?'); bindings.push(params.householdsMin); }
    if (params.householdsMax != null) { needsJoin = true; conditions.push('c.total_unit <= ?'); bindings.push(params.householdsMax); }
    if (params.parkingRatioMin != null) {
      needsJoin = true;
      conditions.push('CAST((COALESCE(c.parking_ground, 0) + COALESCE(c.parking_underground, 0)) AS REAL) / NULLIF(c.total_unit, 0) >= ?');
      bindings.push(params.parkingRatioMin);
    }
    if (params.hasUndergroundParking) { needsJoin = true; conditions.push('c.parking_underground > 0'); }
    if (params.subwayTimeMax != null) { needsJoin = true; conditions.push('CAST(c.subway_time AS INTEGER) <= ?'); bindings.push(params.subwayTimeMax); }
    if (params.heatType) { needsJoin = true; conditions.push('c.heat_type = ?'); bindings.push(params.heatType); }
    if (params.hallType) { needsJoin = true; conditions.push('c.hall_type = ?'); bindings.push(params.hallType); }
    if (params.builder) { needsJoin = true; conditions.push('c.builder LIKE ?'); bindings.push(`%${params.builder}%`); }
    if (params.saleType) { needsJoin = true; conditions.push('c.sale_type = ?'); bindings.push(params.saleType); }
    if (params.hasElevator === true) { needsJoin = true; conditions.push('COALESCE(c.elevator_cnt, 0) > 0'); }
  }

  // 추정 방수 (면적 기반, complexes JOIN 불필요)
  if (params.roomEstimate != null) {
    switch (params.roomEstimate) {
      case 1: conditions.push('t.exclu_use_ar < 40'); break;
      case 2: conditions.push('t.exclu_use_ar >= 40 AND t.exclu_use_ar < 60'); break;
      case 3: conditions.push('t.exclu_use_ar >= 60 AND t.exclu_use_ar < 100'); break;
      case 4: conditions.push('t.exclu_use_ar >= 100'); break;
    }
  }

  // 용적률 필터 (complexes JOIN 필요)
  if (params.vlRatMax != null) {
    needsJoin = true;
    conditions.push(`c.vl_rat IS NOT NULL AND c.vl_rat <= ${Number(params.vlRatMax)}`);
  }

  // complexes 데이터가 있으면 세대수 표시를 위해 항상 JOIN
  // trade_complex_map 경유: 이름이 다른 단지도 매칭
  const hasMap = await hasComplexMapData();
  const doJoin = needsJoin || hasComplexes;
  const joinClause = doJoin
    ? hasMap
      ? 'LEFT JOIN trade_complex_map m ON t.lawd_cd = m.lawd_cd AND t.apt_nm = m.trade_apt_nm LEFT JOIN complexes c ON m.kapt_code = c.kapt_code'
      : 'LEFT JOIN complexes c ON t.lawd_cd = substr(c.bjd_code, 1, 5) AND t.apt_nm = c.apt_nm'
    : '';
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 가격변동률 계산을 위한 기간 산출 (넓은 윈도우로 커버리지 확대)
  const now = new Date();
  const recentYm = now.getFullYear() * 100 + (now.getMonth() + 1);
  // 최근 6개월
  const sixMonthsAgoYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();
  // 약 1년 전 기준 (9~18개월 전)
  const yearAgoEndYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 8, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();
  const yearAgoStartYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 17, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();

  // 단지별 집계 쿼리
  const rowsResult = await client.execute({
    sql: `
      SELECT t.apt_nm, t.umd_nm, t.build_year, t.lawd_cd,
             MAX(t.deal_year * 10000 + t.deal_month * 100 + COALESCE(t.deal_day, 1)) as latest_key,
             MAX(t.deal_amount) as latest_amount,
             COUNT(*) as trade_count,
             GROUP_CONCAT(DISTINCT CAST(t.exclu_use_ar AS TEXT)) as areas_str,
             AVG(CASE WHEN (t.deal_year * 100 + t.deal_month) BETWEEN ${sixMonthsAgoYm} AND ${recentYm} THEN t.deal_amount END) as recent_avg,
             AVG(CASE WHEN (t.deal_year * 100 + t.deal_month) BETWEEN ${yearAgoStartYm} AND ${yearAgoEndYm} THEN t.deal_amount END) as year_ago_avg
             ${doJoin ? ', MAX(c.total_unit) as total_unit, MAX(c.road_addr) as road_addr, MAX(c.heat_type) as heat_type, MAX(c.hall_type) as hall_type, MAX(c.subway_line) as subway_line, MAX(c.subway_time) as subway_time' : ''}
             , COALESCE(MAX(${doJoin ? 'c.lat' : 'NULL'}), MAX(gc.lat)) as lat
             , COALESCE(MAX(${doJoin ? 'c.lng' : 'NULL'}), MAX(gc.lng)) as lng
      FROM trades t
      ${joinClause}
      LEFT JOIN geocode_cache gc ON gc.address = COALESCE(${doJoin ? 'c.road_addr' : 'NULL'}, t.umd_nm)
      ${where}
      GROUP BY t.apt_nm, t.umd_nm
      ORDER BY latest_key DESC
      LIMIT 200
    `,
    args: bindings,
  });
  const rows = rowsResult.rows as unknown as GroupedRow[];

  const groups: ComplexTradeGroup[] = rows.map((row) => {
    const latestKey = row.latest_key;
    const y = String(Math.floor(latestKey / 10000));
    const m = String(Math.floor((latestKey % 10000) / 100)).padStart(2, '0');
    const d = String(latestKey % 100).padStart(2, '0');
    const areas = row.areas_str
      ? [...new Set(row.areas_str.split(',').map(Number).filter((n) => !isNaN(n)))]
      : [];

    const recentAvg = row.recent_avg != null ? Math.round(row.recent_avg) : null;
    const yearAgoAvg = row.year_ago_avg != null ? Math.round(row.year_ago_avg) : null;
    const priceChangeRate = recentAvg != null && yearAgoAvg != null && yearAgoAvg > 0
      ? Math.round(((recentAvg - yearAgoAvg) / yearAgoAvg) * 1000) / 10
      : null;

    return {
      aptName: row.apt_nm,
      dong: row.umd_nm ?? '',
      lawdCd: row.lawd_cd,
      latestPrice: row.latest_amount,
      latestDate: `${y}-${m}-${d}`,
      tradeCount: row.trade_count,
      areas,
      buildYear: row.build_year ?? 0,
      totalUnit: row.total_unit ?? null,
      roadAddr: row.road_addr ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      recentAvg,
      yearAgoAvg,
      priceChangeRate,
      heatType: row.heat_type ?? null,
      hallType: row.hall_type ?? null,
      subwayLine: row.subway_line ?? null,
      subwayTime: row.subway_time != null ? parseInt(row.subway_time, 10) || null : null,
      trades: [],
    };
  });

  return { groups, total: groups.length };
}

// ─── 즐겨찾기 단지 집계 ───

/** 즐겨찾기 단지 목록의 거래 집계 — 검색 필터 없이 각 단지를 독립적으로 조회 */
export interface FavoriteQueryItem {
  aptName: string;
  dong: string;
  lawdCd: string;
}

export async function getFavoritesGrouped(items: FavoriteQueryItem[]): Promise<ComplexTradeGroup[]> {
  if (items.length === 0) return [];
  await ensureSchema();
  const client = getClient();

  const hasComplexes = await hasComplexesData();
  const hasMap = await hasComplexMapData();

  const doJoin = hasComplexes;
  const joinClause = doJoin
    ? hasMap
      ? 'LEFT JOIN trade_complex_map m ON t.lawd_cd = m.lawd_cd AND t.apt_nm = m.trade_apt_nm LEFT JOIN complexes c ON m.kapt_code = c.kapt_code'
      : 'LEFT JOIN complexes c ON t.lawd_cd = substr(c.bjd_code, 1, 5) AND t.apt_nm = c.apt_nm'
    : '';

  const now = new Date();
  const recentYm = now.getFullYear() * 100 + (now.getMonth() + 1);
  const sixMonthsAgoYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();
  const yearAgoEndYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 8, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();
  const yearAgoStartYm = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 17, 1);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  })();

  const groups: ComplexTradeGroup[] = [];

  for (const item of items) {
    const conditions: string[] = [
      't.lawd_cd = ?',
      't.apt_nm = ?',
      "t.cancel_yn = 'N'",
    ];
    const bindings: (string | number)[] = [item.lawdCd, item.aptName];

    if (item.dong) {
      conditions.push('t.umd_nm = ?');
      bindings.push(item.dong);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const rowResult = await client.execute({
      sql: `
        SELECT t.apt_nm, t.umd_nm, t.build_year, t.lawd_cd,
               MAX(t.deal_year * 10000 + t.deal_month * 100 + COALESCE(t.deal_day, 1)) as latest_key,
               MAX(t.deal_amount) as latest_amount,
               COUNT(*) as trade_count,
               GROUP_CONCAT(DISTINCT CAST(t.exclu_use_ar AS TEXT)) as areas_str,
               AVG(CASE WHEN (t.deal_year * 100 + t.deal_month) BETWEEN ${sixMonthsAgoYm} AND ${recentYm} THEN t.deal_amount END) as recent_avg,
               AVG(CASE WHEN (t.deal_year * 100 + t.deal_month) BETWEEN ${yearAgoStartYm} AND ${yearAgoEndYm} THEN t.deal_amount END) as year_ago_avg
               ${doJoin ? ', MAX(c.total_unit) as total_unit, MAX(c.road_addr) as road_addr, MAX(c.heat_type) as heat_type, MAX(c.hall_type) as hall_type, MAX(c.subway_line) as subway_line, MAX(c.subway_time) as subway_time' : ''}
               , COALESCE(MAX(${doJoin ? 'c.lat' : 'NULL'}), MAX(gc.lat)) as lat
               , COALESCE(MAX(${doJoin ? 'c.lng' : 'NULL'}), MAX(gc.lng)) as lng
        FROM trades t
        ${joinClause}
        LEFT JOIN geocode_cache gc ON gc.address = COALESCE(${doJoin ? 'c.road_addr' : 'NULL'}, t.umd_nm)
        ${where}
        GROUP BY t.apt_nm, t.umd_nm
        LIMIT 1
      `,
      args: bindings,
    });

    if (rowResult.rows.length === 0) continue;

    const row = rowResult.rows[0] as unknown as GroupedRow;

    const latestKey = row.latest_key;
    const y = String(Math.floor(latestKey / 10000));
    const mo = String(Math.floor((latestKey % 10000) / 100)).padStart(2, '0');
    const dy = String(latestKey % 100).padStart(2, '0');
    const areas = row.areas_str
      ? [...new Set(row.areas_str.split(',').map(Number).filter((n) => !isNaN(n)))]
      : [];

    const recentAvg = row.recent_avg != null ? Math.round(row.recent_avg) : null;
    const yearAgoAvg = row.year_ago_avg != null ? Math.round(row.year_ago_avg) : null;
    const priceChangeRate =
      recentAvg != null && yearAgoAvg != null && yearAgoAvg > 0
        ? Math.round(((recentAvg - yearAgoAvg) / yearAgoAvg) * 1000) / 10
        : null;

    groups.push({
      aptName: row.apt_nm,
      dong: row.umd_nm ?? '',
      lawdCd: row.lawd_cd,
      latestPrice: row.latest_amount,
      latestDate: `${y}-${mo}-${dy}`,
      tradeCount: row.trade_count,
      areas,
      buildYear: row.build_year ?? 0,
      totalUnit: row.total_unit ?? null,
      roadAddr: row.road_addr ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      recentAvg,
      yearAgoAvg,
      priceChangeRate,
      heatType: row.heat_type ?? null,
      hallType: row.hall_type ?? null,
      subwayLine: row.subway_line ?? null,
      subwayTime: row.subway_time != null ? parseInt(row.subway_time, 10) || null : null,
      trades: [],
    });
  }

  return groups;
}

// ─── 단지 목록/상세 조회 ───

export async function getComplexList(lawdCd: string): Promise<ComplexListItem[]> {
  await ensureSchema();
  const client = getClient();

  const result = await client.execute({
    sql: `
      SELECT kapt_code, apt_nm, addr, road_addr
      FROM complexes
      WHERE substr(bjd_code, 1, 5) = ?
      ORDER BY apt_nm
    `,
    args: [lawdCd],
  });
  const rows = result.rows as unknown as { kapt_code: string; apt_nm: string; addr: string | null; road_addr: string | null }[];

  return rows.map((r) => ({
    id: r.kapt_code,
    name: r.apt_nm,
    address: r.addr ?? '',
    roadAddress: r.road_addr ?? undefined,
  }));
}

export async function getComplexDetail(kaptCode: string): Promise<ComplexInfo | null> {
  await ensureSchema();
  const client = getClient();

  const result = await client.execute({
    sql: `
      SELECT kapt_code, apt_nm, bjd_code, addr, road_addr,
             as1, as2, as3, total_unit, ho_cnt, dong_cnt,
             top_floor, base_floor, heat_type, hall_type, sale_type,
             apt_type, mgr_type, builder, developer, use_date,
             total_area, area_under60, area_60_85, area_85_135, area_over135,
             parking_ground, parking_underground, elevator_cnt, cctv_cnt,
             structure, subway_line, subway_time,
             welfare_facility, education_facility, convenient_facility,
             vl_rat, bc_rat, engr_grade, building_age, parking_ratio,
             rebuild_score, rebuild_eligible, livability_score, future_value_score,
             lat, lng
      FROM complexes
      WHERE kapt_code = ?
    `,
    args: [kaptCode],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as ComplexDetailRow;
  return mapComplexDetailRow(row);
}

function mapComplexDetailRow(row: ComplexDetailRow): ComplexInfo {
  const parkingTotal =
    (row.parking_ground ?? 0) + (row.parking_underground ?? 0) || undefined;

  return {
    id: row.kapt_code,
    name: row.apt_nm,
    address: row.addr ?? '',
    roadAddress: row.road_addr ?? undefined,
    households: row.total_unit ?? undefined,
    buildingCount: row.dong_cnt ?? undefined,
    topFloor: row.top_floor ?? undefined,
    approvalDate: row.use_date ?? undefined,
    buildYear: row.use_date ? parseInt(row.use_date.substring(0, 4), 10) : undefined,
    heatingType: row.heat_type ?? undefined,
    parkingTotal,
    parkingGround: row.parking_ground ?? undefined,
    parkingUnderground: row.parking_underground ?? undefined,
    constructor: row.builder ?? undefined,
    aptType: row.apt_type ?? undefined,
    managementType: row.mgr_type ?? undefined,
    hallType: row.hall_type ?? undefined,
    elevatorCount: row.elevator_cnt ?? undefined,
    cctvCount: row.cctv_cnt ?? undefined,
    subwayLine: row.subway_line ?? undefined,
    subwayTime: row.subway_time ?? undefined,
    educationFacility: row.education_facility ?? undefined,
    convenientFacility: row.convenient_facility ?? undefined,
    welfareFacility: row.welfare_facility ?? undefined,
    vlRat: row.vl_rat ?? undefined,
    bcRat: row.bc_rat ?? undefined,
    engrGrade: row.engr_grade ?? undefined,
    buildingAge: row.building_age ?? undefined,
    parkingRatio: row.parking_ratio ?? undefined,
    rebuildScore: row.rebuild_score ?? undefined,
    rebuildEligible: row.rebuild_eligible === 1 ? true : undefined,
    livabilityScore: row.livability_score ?? undefined,
    futureValueScore: row.future_value_score ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}

/** aptName + lawdCd로 단지 상세정보 조회 (매칭 테이블 → 정확 → LIKE) */
export async function getComplexByName(aptName: string, lawdCd: string): Promise<ComplexInfo | null> {
  await ensureSchema();
  const client = getClient();

  const complexColumns = `c.kapt_code, c.apt_nm, c.bjd_code, c.addr, c.road_addr,
    c.as1, c.as2, c.as3, c.total_unit, c.ho_cnt, c.dong_cnt,
    c.top_floor, c.base_floor, c.heat_type, c.hall_type, c.sale_type,
    c.apt_type, c.mgr_type, c.builder, c.developer, c.use_date,
    c.total_area, c.area_under60, c.area_60_85, c.area_85_135, c.area_over135,
    c.parking_ground, c.parking_underground, c.elevator_cnt, c.cctv_cnt,
    c.structure, c.subway_line, c.subway_time,
    c.welfare_facility, c.education_facility, c.convenient_facility,
    c.vl_rat, c.bc_rat, c.engr_grade, c.building_age, c.parking_ratio,
    c.rebuild_score, c.rebuild_eligible, c.livability_score, c.future_value_score,
    c.lat, c.lng`;

  // 1. trade_complex_map으로 매칭
  let result = await client.execute({
    sql: `
      SELECT ${complexColumns}
      FROM trade_complex_map m
      INNER JOIN complexes c ON m.kapt_code = c.kapt_code
      WHERE m.lawd_cd = ? AND m.trade_apt_nm = ?
      LIMIT 1
    `,
    args: [lawdCd, aptName],
  });
  let row = result.rows.length > 0 ? result.rows[0] as unknown as ComplexDetailRow : undefined;

  // 2. 정확 이름 매칭
  if (!row) {
    result = await client.execute({
      sql: `
        SELECT ${complexColumns} FROM complexes c
        WHERE c.apt_nm = ? AND substr(c.bjd_code, 1, 5) = ?
        LIMIT 1
      `,
      args: [aptName, lawdCd],
    });
    row = result.rows.length > 0 ? result.rows[0] as unknown as ComplexDetailRow : undefined;
  }

  // 3. LIKE 매칭
  if (!row) {
    result = await client.execute({
      sql: `
        SELECT ${complexColumns} FROM complexes c
        WHERE c.apt_nm LIKE ? AND substr(c.bjd_code, 1, 5) = ?
        LIMIT 1
      `,
      args: [`%${aptName}%`, lawdCd],
    });
    row = result.rows.length > 0 ? result.rows[0] as unknown as ComplexDetailRow : undefined;
  }

  if (!row) return null;

  return mapComplexDetailRow(row);
}

/** 단지 스코어링 데이터 조회 (AI 분석용) */
export interface ComplexScoringData {
  buildingAge: number | null;
  parkingRatio: number | null;
  rebuildScore: number | null;
  rebuildEligible: boolean;
  livabilityScore: number | null;
  futureValueScore: number | null;
  vlRat: number | null;
  bcRat: number | null;
  engrGrade: string | null;
  totalUnit: number | null;
}

export async function getComplexScoring(aptName: string, lawdCd: string): Promise<ComplexScoringData | null> {
  await ensureSchema();
  const client = getClient();

  const scoringColumns = `c.building_age, c.parking_ratio, c.rebuild_score,
    c.rebuild_eligible, c.livability_score, c.future_value_score,
    c.vl_rat, c.bc_rat, c.engr_grade, c.total_unit`;

  // 1. trade_complex_map으로 매칭
  let result = await client.execute({
    sql: `
      SELECT ${scoringColumns}
      FROM trade_complex_map m
      INNER JOIN complexes c ON m.kapt_code = c.kapt_code
      WHERE m.lawd_cd = ? AND m.trade_apt_nm = ?
      LIMIT 1
    `,
    args: [lawdCd, aptName],
  });
  let row = result.rows.length > 0 ? result.rows[0] as unknown as Record<string, unknown> : undefined;

  // 2. 정확 이름 매칭
  if (!row) {
    result = await client.execute({
      sql: `
        SELECT ${scoringColumns} FROM complexes c
        WHERE c.apt_nm = ? AND substr(c.bjd_code, 1, 5) = ?
        LIMIT 1
      `,
      args: [aptName, lawdCd],
    });
    row = result.rows.length > 0 ? result.rows[0] as unknown as Record<string, unknown> : undefined;
  }

  // 3. LIKE 매칭
  if (!row) {
    result = await client.execute({
      sql: `
        SELECT ${scoringColumns} FROM complexes c
        WHERE c.apt_nm LIKE ? AND substr(c.bjd_code, 1, 5) = ?
        LIMIT 1
      `,
      args: [`%${aptName}%`, lawdCd],
    });
    row = result.rows.length > 0 ? result.rows[0] as unknown as Record<string, unknown> : undefined;
  }

  if (!row) return null;

  return {
    buildingAge: row.building_age as number | null,
    parkingRatio: row.parking_ratio as number | null,
    rebuildScore: row.rebuild_score as number | null,
    rebuildEligible: (row.rebuild_eligible as number) === 1,
    livabilityScore: row.livability_score as number | null,
    futureValueScore: row.future_value_score as number | null,
    vlRat: row.vl_rat as number | null,
    bcRat: row.bc_rat as number | null,
    engrGrade: row.engr_grade as string | null,
    totalUnit: row.total_unit as number | null,
  };
}

/** 단지 검색 (이름 + 확장 필터) */
export interface ComplexSearchParams {
  lawdCd?: string;
  aptName?: string;
  totalUnitMin?: number;
  totalUnitMax?: number;
  buildYearMin?: number;
  buildYearMax?: number;
  heatType?: string;
  hallType?: string;
  hasElevator?: boolean;
  saleType?: string;
  builder?: string;
  page?: number;
  pageSize?: number;
}

export async function searchComplexes(params: ComplexSearchParams) {
  await ensureSchema();
  const client = getClient();

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (params.lawdCd) {
    conditions.push('substr(bjd_code, 1, 5) = ?');
    bindings.push(params.lawdCd);
  }
  if (params.aptName) {
    conditions.push('apt_nm LIKE ?');
    bindings.push(`%${params.aptName}%`);
  }
  if (params.totalUnitMin != null) {
    conditions.push('total_unit >= ?');
    bindings.push(params.totalUnitMin);
  }
  if (params.totalUnitMax != null) {
    conditions.push('total_unit <= ?');
    bindings.push(params.totalUnitMax);
  }
  if (params.buildYearMin != null) {
    conditions.push("CAST(substr(use_date, 1, 4) AS INTEGER) >= ?");
    bindings.push(params.buildYearMin);
  }
  if (params.buildYearMax != null) {
    conditions.push("CAST(substr(use_date, 1, 4) AS INTEGER) <= ?");
    bindings.push(params.buildYearMax);
  }
  if (params.heatType) {
    conditions.push('heat_type = ?');
    bindings.push(params.heatType);
  }
  if (params.hallType) {
    conditions.push('hall_type = ?');
    bindings.push(params.hallType);
  }
  if (params.hasElevator) {
    conditions.push('elevator_cnt > 0');
  }
  if (params.saleType) {
    conditions.push('sale_type = ?');
    bindings.push(params.saleType);
  }
  if (params.builder) {
    conditions.push('builder LIKE ?');
    bindings.push(`%${params.builder}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM complexes ${where}`,
    args: bindings,
  });
  const countRow = countResult.rows[0] as unknown as { cnt: number };

  const rowsResult = await client.execute({
    sql: `
      SELECT kapt_code, apt_nm, addr, road_addr, total_unit, dong_cnt,
             top_floor, use_date, heat_type, hall_type, sale_type,
             builder, parking_ground, parking_underground, elevator_cnt
      FROM complexes
      ${where}
      ORDER BY apt_nm
      LIMIT ? OFFSET ?
    `,
    args: [...bindings, pageSize, offset],
  });
  const rows = rowsResult.rows as unknown as ComplexSummaryRow[];

  return {
    complexes: rows.map((r) => ({
      id: r.kapt_code,
      name: r.apt_nm,
      address: r.addr ?? '',
      roadAddress: r.road_addr ?? undefined,
      households: r.total_unit ?? undefined,
      buildingCount: r.dong_cnt ?? undefined,
      topFloor: r.top_floor ?? undefined,
      buildYear: r.use_date ? parseInt(r.use_date.substring(0, 4), 10) : undefined,
      heatingType: r.heat_type ?? undefined,
      hallType: r.hall_type ?? undefined,
      saleType: r.sale_type ?? undefined,
      builder: r.builder ?? undefined,
      parkingTotal: ((r.parking_ground ?? 0) + (r.parking_underground ?? 0)) || undefined,
      elevatorCount: r.elevator_cnt ?? undefined,
    })),
    total: countRow.cnt,
    page,
    pageSize,
    totalPages: Math.ceil(countRow.cnt / pageSize),
  };
}

// ─── DB 통계 ───

export async function getDbStats() {
  await ensureSchema();
  const client = getClient();

  const [tradesResult, complexesResult, regionsResult, dateRangeResult] = await Promise.all([
    client.execute({ sql: 'SELECT COUNT(*) as cnt FROM trades', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as cnt FROM complexes', args: [] }),
    client.execute({ sql: 'SELECT COUNT(DISTINCT lawd_cd) as cnt FROM trades', args: [] }),
    client.execute({
      sql: `
        SELECT MIN(deal_year || printf('%02d', deal_month)) as min_ym,
               MAX(deal_year || printf('%02d', deal_month)) as max_ym
        FROM trades
      `,
      args: [],
    }),
  ]);

  const trades = tradesResult.rows[0] as unknown as { cnt: number };
  const complexes = complexesResult.rows[0] as unknown as { cnt: number };
  const regions = regionsResult.rows[0] as unknown as { cnt: number };
  const dateRange = dateRangeResult.rows[0] as unknown as { min_ym: string | null; max_ym: string | null };

  return {
    tradeCount: trades.cnt,
    complexCount: complexes.cnt,
    regionCount: regions.cnt,
    dateRange: {
      from: dateRange.min_ym,
      to: dateRange.max_ym,
    },
  };
}

// ─── 내부 타입 & 매핑 ───

let _schemaInitialized = false;
async function ensureSchema() {
  if (!_schemaInitialized) {
    await initSchema();
    _schemaInitialized = true;
  }
}

interface TradeRow {
  apt_nm: string;
  deal_amount: number;
  exclu_use_ar: number;
  floor: number | null;
  build_year: number | null;
  deal_year: number;
  deal_month: number;
  deal_day: number | null;
  umd_nm: string | null;
  jibun: string | null;
  road_nm: string | null;
  cancel_yn: string;
  deal_type?: string | null;
  buyer_gbn?: string | null;
  seller_gbn?: string | null;
}

interface ComplexDetailRow {
  kapt_code: string;
  apt_nm: string;
  bjd_code: string;
  addr: string | null;
  road_addr: string | null;
  as1: string | null;
  as2: string | null;
  as3: string | null;
  total_unit: number | null;
  ho_cnt: number | null;
  dong_cnt: number | null;
  top_floor: number | null;
  base_floor: number | null;
  heat_type: string | null;
  hall_type: string | null;
  sale_type: string | null;
  apt_type: string | null;
  mgr_type: string | null;
  builder: string | null;
  developer: string | null;
  use_date: string | null;
  total_area: number | null;
  area_under60: number | null;
  area_60_85: number | null;
  area_85_135: number | null;
  area_over135: number | null;
  parking_ground: number | null;
  parking_underground: number | null;
  elevator_cnt: number | null;
  cctv_cnt: number | null;
  structure: string | null;
  subway_line: string | null;
  subway_time: string | null;
  welfare_facility: string | null;
  education_facility: string | null;
  convenient_facility: string | null;
  vl_rat: number | null;
  bc_rat: number | null;
  engr_grade: string | null;
  building_age: number | null;
  parking_ratio: number | null;
  rebuild_score: number | null;
  rebuild_eligible: number | null;
  livability_score: number | null;
  future_value_score: number | null;
  lat: number | null;
  lng: number | null;
}

interface GroupedRow {
  apt_nm: string;
  umd_nm: string | null;
  build_year: number | null;
  lawd_cd: string;
  latest_key: number;
  latest_amount: number;
  trade_count: number;
  areas_str: string | null;
  recent_avg: number | null;
  year_ago_avg: number | null;
  total_unit: number | null;
  road_addr: string | null;
  lat: number | null;
  lng: number | null;
  heat_type: string | null;
  hall_type: string | null;
  subway_line: string | null;
  subway_time: string | null;
}

interface ComplexSummaryRow {
  kapt_code: string;
  apt_nm: string;
  addr: string | null;
  road_addr: string | null;
  total_unit: number | null;
  dong_cnt: number | null;
  top_floor: number | null;
  use_date: string | null;
  heat_type: string | null;
  hall_type: string | null;
  sale_type: string | null;
  builder: string | null;
  parking_ground: number | null;
  parking_underground: number | null;
  elevator_cnt: number | null;
}

function mapTradeRow(row: TradeRow): ApartmentTrade {
  const y = String(row.deal_year);
  const m = String(row.deal_month).padStart(2, '0');
  const d = String(row.deal_day ?? 1).padStart(2, '0');

  return {
    aptName: row.apt_nm,
    dealAmount: row.deal_amount,
    area: row.exclu_use_ar,
    floor: row.floor ?? 0,
    buildYear: row.build_year ?? 0,
    dealDate: `${y}-${m}-${d}`,
    dealYearMonth: `${y}-${m}`,
    dong: row.umd_nm ?? '',
    jibun: row.jibun ?? '',
    roadName: row.road_nm ?? undefined,
    isCanceled: row.cancel_yn === 'Y',
  };
}
