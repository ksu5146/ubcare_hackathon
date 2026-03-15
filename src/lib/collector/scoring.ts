import { getClient } from '../db';
import { SCORING } from '../constants';

const CURRENT_YEAR = new Date().getFullYear();

/** 용적률/건폐율 이상치 필터 — 신뢰할 수 없는 값은 null 처리 */
function sanitizeVlRat(v: number | null): number | null {
  if (v == null || v <= 0 || v < 10) return null; // 10% 미만은 데이터 오류
  return v;
}
function sanitizeBcRat(v: number | null): number | null {
  if (v == null || v <= 0 || v > 100) return null; // 100% 초과는 데이터 오류
  return v;
}

/**
 * 건물 연식 계산 (년)
 * complexes.use_date (YYYYMMDD or YYYYMM or YYYY) 또는 building_ledger.use_apr_day 사용
 */
function calcBuildingAge(useDate: string | null, useAprDay: string | null): number | null {
  const raw = useDate?.trim() || useAprDay?.trim();
  if (!raw || raw.length < 4) return null;
  const year = parseInt(raw.substring(0, 4), 10);
  if (isNaN(year) || year < 1950 || year > CURRENT_YEAR) return null;
  return CURRENT_YEAR - year;
}

/**
 * 주차비율 (세대당 주차대수)
 */
function calcParkingRatio(
  parkingGround: number | null,
  parkingUnderground: number | null,
  totalUnit: number | null,
  bldgParkingCnt: number | null,
): number | null {
  const units = totalUnit && totalUnit > 0 ? totalUnit : null;
  if (!units) return null;

  const total = (parkingGround ?? 0) + (parkingUnderground ?? 0);
  if (total > 0) return Math.round((total / units) * 100) / 100;

  // fallback to building_ledger
  if (bldgParkingCnt && bldgParkingCnt > 0) {
    return Math.round((bldgParkingCnt / units) * 100) / 100;
  }
  return null;
}

/**
 * 재건축 점수 (0~100)
 *
 * - 연식 점수 (45%): 20년 미만 0점, 20~45년 선형, 45년+ 100점
 * - 용적률 여유 점수 (40%): (법정상한 - 현재) / 법정상한 * 100
 *   현재 용적률이 낮을수록 재건축 사업성 높음
 * - 건물상태 점수 (15%): 에너지등급 없거나 낮으면 높은 점수 (재건축 필요성)
 */
function calcRebuildScore(
  age: number | null,
  vlRat: number | null,
  engrGrade: string | null,
): number | null {
  if (age == null) return null;

  const { AGE_WEIGHT, VL_GAP_WEIGHT, CONDITION_WEIGHT, SCORE_START_AGE, SCORE_MAX_AGE } = SCORING.REBUILD;
  const legalMax = SCORING.LEGAL_MAX_VL_RAT.DEFAULT;

  // 연식 점수
  let ageScore: number;
  if (age < SCORE_START_AGE) ageScore = 0;
  else if (age >= SCORE_MAX_AGE) ageScore = 100;
  else ageScore = ((age - SCORE_START_AGE) / (SCORE_MAX_AGE - SCORE_START_AGE)) * 100;

  // 용적률 여유 점수 (vlRat이 없으면 연식만으로 계산)
  let vlGapScore: number | null = null;
  if (vlRat != null && vlRat > 0) {
    const gap = legalMax - vlRat;
    if (gap <= 0) {
      vlGapScore = 0; // 이미 법정상한 이상 → 재건축 사업성 없음
    } else {
      vlGapScore = Math.min((gap / legalMax) * 100, 100);
    }
  }

  // 건물상태 점수 (에너지등급 없거나 낮으면 재건축 필요성 높음)
  let conditionScore = 60; // 데이터 없으면 중간값
  if (engrGrade && engrGrade.trim()) {
    const g = engrGrade.trim();
    // 등급이 좋으면 재건축 필요성 낮음 (낮은 점수)
    const gradeMap: Record<string, number> = {
      '1+++': 5, '1++': 10, '1+': 15, '1': 20, '2': 35, '3': 50, '4': 65, '5': 80, '6': 90, '7': 95,
    };
    conditionScore = gradeMap[g] ?? 60;
  }

  if (vlGapScore != null) {
    return Math.round(ageScore * AGE_WEIGHT + vlGapScore * VL_GAP_WEIGHT + conditionScore * CONDITION_WEIGHT);
  }
  // vlRat 없으면 연식 + 상태로만 (가중치 재분배)
  return Math.round(ageScore * (AGE_WEIGHT + VL_GAP_WEIGHT) + conditionScore * CONDITION_WEIGHT);
}

/**
 * 쾌적성 점수 (0~100)
 *
 * - 주차비율 (30%): 세대당 1.5대 이상이면 100점
 * - 건폐율 (25%): 15% 이하 100점, 높을수록 감점
 * - 용적률 (20%): 200% 이하 100점, 높을수록 감점
 * - 신축도 (15%): 새로울수록 높은 점수
 * - 부대시설 (10%): 엘리베이터, CCTV 등
 */
function calcLivabilityScore(
  parkingRatio: number | null,
  bcRat: number | null,
  vlRat: number | null,
  age: number | null,
  elevatorCnt: number | null,
  cctvCnt: number | null,
  totalUnit: number | null,
): number | null {
  const { PARKING_WEIGHT, DENSITY_WEIGHT, VL_RAT_WEIGHT, AGE_WEIGHT, FACILITY_WEIGHT,
    GOOD_PARKING_RATIO, OPTIMAL_BC_RAT, OPTIMAL_VL_RAT } = SCORING.LIVABILITY;

  let filledCount = 0;
  let weightedSum = 0;
  let totalWeight = 0;

  // 주차비율
  if (parkingRatio != null) {
    const score = Math.min((parkingRatio / GOOD_PARKING_RATIO) * 100, 100);
    weightedSum += score * PARKING_WEIGHT;
    totalWeight += PARKING_WEIGHT;
    filledCount++;
  }

  // 건폐율
  if (bcRat != null && bcRat > 0) {
    const score = Math.min(100, Math.max(0, 100 - (bcRat - OPTIMAL_BC_RAT) * 2.5));
    weightedSum += score * DENSITY_WEIGHT;
    totalWeight += DENSITY_WEIGHT;
    filledCount++;
  }

  // 용적률
  if (vlRat != null && vlRat > 0) {
    const score = Math.min(100, Math.max(0, 100 - (vlRat - OPTIMAL_VL_RAT) * 0.5));
    weightedSum += score * VL_RAT_WEIGHT;
    totalWeight += VL_RAT_WEIGHT;
    filledCount++;
  }

  // 신축도
  if (age != null) {
    let score: number;
    if (age <= 5) score = 100;
    else if (age >= 40) score = 10;
    else score = 100 - (age - 5) * (90 / 35);
    weightedSum += score * AGE_WEIGHT;
    totalWeight += AGE_WEIGHT;
    filledCount++;
  }

  // 부대시설
  const units = totalUnit && totalUnit > 0 ? totalUnit : 500;
  if (elevatorCnt != null || cctvCnt != null) {
    let score = 50; // 기본
    if (elevatorCnt && elevatorCnt > 0) score += 25;
    if (cctvCnt && cctvCnt > 0) {
      score += Math.min((cctvCnt / units) * 2500, 25); // CCTV 비율
    }
    score = Math.min(score, 100);
    weightedSum += score * FACILITY_WEIGHT;
    totalWeight += FACILITY_WEIGHT;
    filledCount++;
  }

  // 최소 2개 지표 이상 있어야 점수 산출
  if (filledCount < 2 || totalWeight === 0) return null;

  return Math.round(weightedSum / totalWeight);
}

/**
 * 미래가치 점수 (0~100)
 *
 * 구축 아파트의 재건축 사업성을 반영한 종합 가치 평가
 * - 재건축 가능성 높은 구축: 현재 쾌적성은 낮지만 미래가치 높음
 * - 신축 아파트: 현재 쾌적성이 곧 가치
 * - 재건축 불가능한 구축: 쾌적성도 낮고 미래가치도 낮음
 */
function calcFutureValueScore(
  rebuildScore: number | null,
  livabilityScore: number | null,
  age: number | null,
  vlRat: number | null,
): number | null {
  if (rebuildScore == null && livabilityScore == null) return null;

  const rebuild = rebuildScore ?? 0;
  const livability = livabilityScore ?? 50;
  const buildingAge = age ?? 0;

  // 연식에 따라 재건축 가치 vs 현재 가치의 비중 조절
  let rebuildWeight: number;
  let livabilityWeight: number;

  if (buildingAge >= 35) {
    // 35년+: 재건축 가치 중심 (70:30)
    rebuildWeight = 0.70;
    livabilityWeight = 0.30;
  } else if (buildingAge >= 25) {
    // 25~35년: 재건축과 현재 가치 균형 (50:50)
    rebuildWeight = 0.50;
    livabilityWeight = 0.50;
  } else if (buildingAge >= 15) {
    // 15~25년: 현재 가치 중심 (30:70)
    rebuildWeight = 0.30;
    livabilityWeight = 0.70;
  } else {
    // 15년 미만: 현재 가치가 대부분 (10:90)
    rebuildWeight = 0.10;
    livabilityWeight = 0.90;
  }

  // 용적률 여유가 큰 구축은 보너스
  let vlBonus = 0;
  if (buildingAge >= 25 && vlRat != null && vlRat > 0) {
    const legalMax = SCORING.LEGAL_MAX_VL_RAT.DEFAULT;
    const gapRatio = (legalMax - vlRat) / legalMax;
    if (gapRatio > 0.3) {
      vlBonus = Math.min(gapRatio * 20, 15); // 최대 15점 보너스
    }
  }

  const score = rebuild * rebuildWeight + livability * livabilityWeight + vlBonus;
  return Math.round(Math.min(score, 100));
}

interface ComplexForScoring {
  rowid: number;
  use_date: string | null;
  parking_ground: number | null;
  parking_underground: number | null;
  total_unit: number | null;
  elevator_cnt: number | null;
  cctv_cnt: number | null;
  vl_rat: number | null;
  bc_rat: number | null;
  engr_grade: string | null;
  bldg_match_type: string | null;
}

/**
 * complexes 테이블에 점수 컬럼 추가 및 계산
 */
export async function calculateComplexScores(): Promise<number> {
  const client = getClient();

  // 새 컬럼 추가
  const tableInfoResult = await client.execute({ sql: 'PRAGMA table_info(complexes)', args: [] });
  const cols = tableInfoResult.rows as unknown as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  const newCols = [
    ['building_age', 'INTEGER'],
    ['parking_ratio', 'REAL'],
    ['rebuild_score', 'INTEGER'],
    ['rebuild_eligible', 'INTEGER'],  // 1: 재건축 요건 충족 (30년+)
    ['livability_score', 'INTEGER'],
    ['future_value_score', 'INTEGER'],
    ['score_updated_at', 'TEXT'],
  ];

  for (const [col, type] of newCols) {
    if (!colNames.has(col)) {
      await client.executeMultiple(`ALTER TABLE complexes ADD COLUMN ${col} ${type}`);
    }
  }

  // building_ledger에서 추가 데이터 조인 (use_apr_day, tot_pkng_cnt)
  const complexesResult = await client.execute({
    sql: `
    SELECT c.rowid, c.use_date, c.parking_ground, c.parking_underground,
           c.total_unit, c.elevator_cnt, c.cctv_cnt,
           c.vl_rat, c.bc_rat, c.engr_grade, c.bldg_match_type,
           b.use_apr_day, b.tot_pkng_cnt as bldg_pkng_cnt
    FROM complexes c
    LEFT JOIN building_ledger b ON
      b.sigungu_cd = substr(c.bjd_code, 1, 5)
      AND b.bjdong_cd = substr(c.bjd_code, 6, 5)
      AND b.main_purps_cd_nm IN ('공동주택', '아파트')
      AND b.bld_nm != ' ' AND b.bld_nm != ''
      AND b.rowid = (
        SELECT b2.rowid FROM building_ledger b2
        WHERE b2.sigungu_cd = substr(c.bjd_code, 1, 5)
          AND b2.bjdong_cd = substr(c.bjd_code, 6, 5)
          AND b2.main_purps_cd_nm IN ('공동주택', '아파트')
        ORDER BY b2.hhld_cnt DESC LIMIT 1
      )
    WHERE c.bldg_match_type IS NOT NULL OR c.use_date IS NOT NULL
  `,
    args: [],
  });

  const complexes = complexesResult.rows as unknown as (ComplexForScoring & { use_apr_day: string | null; bldg_pkng_cnt: number | null })[];

  let scored = 0;
  const updateStatements: { sql: string; args: (string | number | null)[] }[] = [];

  const updateSql = `
    UPDATE complexes SET
      building_age = ?, parking_ratio = ?,
      rebuild_score = ?, rebuild_eligible = ?,
      livability_score = ?, future_value_score = ?,
      score_updated_at = datetime('now')
    WHERE rowid = ?
  `;

  for (const c of complexes) {
    const age = calcBuildingAge(c.use_date, c.use_apr_day);
    const parkingRatio = calcParkingRatio(
      c.parking_ground, c.parking_underground, c.total_unit, c.bldg_pkng_cnt,
    );
    const vlRat = sanitizeVlRat(c.vl_rat);
    const bcRat = sanitizeBcRat(c.bc_rat);
    const rebuildScore = calcRebuildScore(age, vlRat, c.engr_grade);
    const rebuildEligible = age != null && age >= SCORING.REBUILD.MIN_AGE_YEARS ? 1 : 0;
    const livabilityScore = calcLivabilityScore(
      parkingRatio, bcRat, vlRat, age,
      c.elevator_cnt, c.cctv_cnt, c.total_unit,
    );
    const futureValueScore = calcFutureValueScore(rebuildScore, livabilityScore, age, vlRat);

    if (rebuildScore != null || livabilityScore != null) {
      updateStatements.push({
        sql: updateSql,
        args: [
          age, parkingRatio,
          rebuildScore, rebuildEligible,
          livabilityScore, futureValueScore,
          c.rowid,
        ],
      });
      scored++;
    }
  }

  if (updateStatements.length > 0) {
    await client.batch(updateStatements, 'write');
  }

  // 통계 출력
  const statsResult = await client.execute({
    sql: `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rebuild_score IS NOT NULL THEN 1 ELSE 0 END) as has_rebuild,
      SUM(CASE WHEN livability_score IS NOT NULL THEN 1 ELSE 0 END) as has_livability,
      SUM(CASE WHEN future_value_score IS NOT NULL THEN 1 ELSE 0 END) as has_future,
      SUM(CASE WHEN rebuild_eligible = 1 THEN 1 ELSE 0 END) as rebuild_eligible,
      AVG(rebuild_score) as avg_rebuild,
      AVG(livability_score) as avg_livability,
      AVG(future_value_score) as avg_future
    FROM complexes
  `,
    args: [],
  });

  const stats = statsResult.rows[0] as Record<string, number>;

  console.log(`[scoring] ${scored} complexes scored`);
  console.log(`  재건축점수: ${stats.has_rebuild}건 (평균 ${Math.round(stats.avg_rebuild ?? 0)}점)`);
  console.log(`  쾌적성점수: ${stats.has_livability}건 (평균 ${Math.round(stats.avg_livability ?? 0)}점)`);
  console.log(`  미래가치점수: ${stats.has_future}건 (평균 ${Math.round(stats.avg_future ?? 0)}점)`);
  console.log(`  재건축요건충족(30년+): ${stats.rebuild_eligible}건`);

  return scored;
}
