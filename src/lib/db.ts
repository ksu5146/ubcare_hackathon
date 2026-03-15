import { createClient, type Client } from '@libsql/client';
import path from 'path';

const DB_URL = process.env.TURSO_DATABASE_URL
  || `file:${process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'real-estate.db')}`;

const isRemote = !!process.env.TURSO_DATABASE_URL;

let _client: Client | null = null;

/** libSQL 클라이언트 (싱글턴) */
export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: DB_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

/** @deprecated getDb() 대신 getClient()를 사용하세요 */
export const getDb = getClient;

/** DB 연결 종료 */
export function closeDb(): void {
  if (_client) {
    _client.close();
    _client = null;
  }
}

/** 스키마 초기화 */
export async function initSchema(): Promise<void> {
  const client = getClient();

  // PRAGMA는 로컬 파일 DB에서만 실행 (Turso 원격 DB는 미지원)
  if (!isRemote) {
    await client.executeMultiple(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
    `);
  }

  await client.executeMultiple(`
    -- 실거래가 테이블
    CREATE TABLE IF NOT EXISTS trades (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      apt_seq      TEXT NOT NULL,
      apt_nm       TEXT NOT NULL,
      lawd_cd      TEXT NOT NULL,
      umd_nm       TEXT,
      jibun        TEXT,
      bonbun       TEXT,
      road_nm      TEXT,
      deal_amount  INTEGER NOT NULL,
      exclu_use_ar REAL NOT NULL,
      floor        INTEGER,
      build_year   INTEGER,
      deal_year    INTEGER NOT NULL,
      deal_month   INTEGER NOT NULL,
      deal_day     INTEGER,
      deal_type    TEXT,
      buyer_gbn    TEXT,
      seller_gbn   TEXT,
      cancel_yn    TEXT DEFAULT 'N',
      reg_date     TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(apt_seq, deal_year, deal_month, deal_day, floor, exclu_use_ar)
    );

    -- 단지 메타데이터 테이블
    CREATE TABLE IF NOT EXISTS complexes (
      kapt_code         TEXT PRIMARY KEY,
      apt_nm            TEXT NOT NULL,
      bjd_code          TEXT NOT NULL,
      addr              TEXT,
      road_addr         TEXT,
      as1               TEXT,
      as2               TEXT,
      as3               TEXT,
      lat               REAL,
      lng               REAL,
      total_unit        INTEGER,
      ho_cnt            INTEGER,
      dong_cnt          INTEGER,
      top_floor         INTEGER,
      base_floor        INTEGER,
      heat_type         TEXT,
      hall_type         TEXT,
      sale_type         TEXT,
      apt_type          TEXT,
      mgr_type          TEXT,
      builder           TEXT,
      developer         TEXT,
      use_date          TEXT,
      total_area        REAL,
      area_under60      INTEGER,
      area_60_85        INTEGER,
      area_85_135       INTEGER,
      area_over135      INTEGER,
      parking_ground    INTEGER,
      parking_underground INTEGER,
      elevator_cnt      INTEGER,
      cctv_cnt          INTEGER,
      structure         TEXT,
      subway_line       TEXT,
      subway_time       TEXT,
      welfare_facility  TEXT,
      education_facility TEXT,
      convenient_facility TEXT,
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 수집 상태 테이블
    CREATE TABLE IF NOT EXISTS collection_state (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      collector_type  TEXT NOT NULL,
      lawd_cd         TEXT NOT NULL,
      deal_ym         TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      record_count    INTEGER DEFAULT 0,
      error_message   TEXT,
      started_at      TEXT,
      completed_at    TEXT,
      UNIQUE(collector_type, lawd_cd, deal_ym)
    );

    -- 인덱스
    CREATE INDEX IF NOT EXISTS idx_trades_lawd_cd    ON trades(lawd_cd);
    CREATE INDEX IF NOT EXISTS idx_trades_apt_seq    ON trades(apt_seq);
    CREATE INDEX IF NOT EXISTS idx_trades_deal_ym    ON trades(deal_year, deal_month);
    CREATE INDEX IF NOT EXISTS idx_trades_amount     ON trades(deal_amount);
    CREATE INDEX IF NOT EXISTS idx_trades_area       ON trades(exclu_use_ar);
    CREATE INDEX IF NOT EXISTS idx_trades_build_year ON trades(build_year);
    CREATE INDEX IF NOT EXISTS idx_trades_apt_nm     ON trades(apt_nm);
    CREATE INDEX IF NOT EXISTS idx_complexes_bjd     ON complexes(bjd_code);
    CREATE INDEX IF NOT EXISTS idx_complexes_apt_nm  ON complexes(apt_nm);
    CREATE INDEX IF NOT EXISTS idx_complexes_lawd    ON complexes(substr(bjd_code, 1, 5));
    CREATE INDEX IF NOT EXISTS idx_collection_state  ON collection_state(collector_type, lawd_cd, status);
    CREATE INDEX IF NOT EXISTS idx_trades_search     ON trades(lawd_cd, cancel_yn, deal_year DESC, deal_month DESC);

    -- 지오코딩 캐시 테이블
    CREATE TABLE IF NOT EXISTS geocode_cache (
      address TEXT PRIMARY KEY,
      lat     REAL NOT NULL,
      lng     REAL NOT NULL,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 서울시 공동주택 정보 (OpenAptInfo)
    CREATE TABLE IF NOT EXISTS seoul_apt_info (
      apt_cd           TEXT PRIMARY KEY,
      apt_nm           TEXT NOT NULL,
      cmpx_clsf        TEXT,
      apt_stdg_addr    TEXT,
      apt_rdn_addr     TEXT,
      ctpv_addr        TEXT,
      sgg_addr         TEXT,
      emd_addr         TEXT,
      hh_type          TEXT,
      mng_mthd         TEXT,
      road_type        TEXT,
      mn_mthd          TEXT,
      whol_dong_cnt    INTEGER,
      tnohsh           INTEGER,
      bldr             TEXT,
      dvlr             TEXT,
      use_aprv_ymd     TEXT,
      gfa              REAL,
      rsdt_xuar        REAL,
      mnco_levy_area   REAL,
      xuar_hh_stts60   INTEGER,
      xuar_hh_stts85   INTEGER,
      xuar_hh_stts135  INTEGER,
      xuar_hh_stts136  INTEGER,
      bdar             REAL,
      prk_cntom        INTEGER,
      se_cd            TEXT,
      xcrd             REAL,
      ycrd             REAL,
      use_yn           TEXT DEFAULT 'Y',
      collected_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_seoul_apt_nm  ON seoul_apt_info(apt_nm);
    CREATE INDEX IF NOT EXISTS idx_seoul_apt_sgg ON seoul_apt_info(sgg_addr);
    CREATE INDEX IF NOT EXISTS idx_seoul_apt_emd ON seoul_apt_info(emd_addr);

    -- 건축물대장 총괄표제부
    CREATE TABLE IF NOT EXISTS building_ledger (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      sigungu_cd       TEXT NOT NULL,
      bjdong_cd        TEXT NOT NULL,
      plat_gb_cd       TEXT,
      bun              TEXT,
      ji               TEXT,
      bld_nm           TEXT,
      plat_plc         TEXT,
      new_plat_plc     TEXT,
      main_purps_cd_nm TEXT,
      etc_purps        TEXT,
      plat_area        REAL,
      arch_area        REAL,
      bc_rat           REAL,
      tot_area         REAL,
      vl_rat_estm_tot_area REAL,
      vl_rat           REAL,
      hhld_cnt         INTEGER,
      fmly_cnt         INTEGER,
      main_bld_cnt     INTEGER,
      tot_pkng_cnt     INTEGER,
      pms_day          TEXT,
      stcns_day        TEXT,
      use_apr_day      TEXT,
      engr_grade       TEXT,
      engr_rat         REAL,
      gn_bld_grade     TEXT,
      itg_bld_grade    TEXT,
      crtn_day         TEXT,
      collected_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(sigungu_cd, bjdong_cd, plat_gb_cd, bun, ji)
    );

    CREATE INDEX IF NOT EXISTS idx_bldg_sigungu ON building_ledger(sigungu_cd, bjdong_cd);
    CREATE INDEX IF NOT EXISTS idx_bldg_name    ON building_ledger(bld_nm);
    CREATE INDEX IF NOT EXISTS idx_bldg_purps   ON building_ledger(main_purps_cd_nm);

    -- 토지이용규제 정보
    CREATE TABLE IF NOT EXISTS land_use_regulation (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      pnu              TEXT NOT NULL,
      ld_code          TEXT,
      ld_code_nm       TEXT,
      lndcgr_code_nm   TEXT,
      lndpcl_ar        REAL,
      prpos_area1_nm   TEXT,
      prpos_area2_nm   TEXT,
      prpos_district1_nm TEXT,
      prpos_district2_nm TEXT,
      prpos_zone1_nm   TEXT,
      prpos_zone2_nm   TEXT,
      cnflc_at         TEXT,
      collected_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_land_pnu ON land_use_regulation(pnu);
    CREATE INDEX IF NOT EXISTS idx_land_area1 ON land_use_regulation(prpos_area1_nm);

    -- 거래-단지 매칭 테이블
    CREATE TABLE IF NOT EXISTS trade_complex_map (
      lawd_cd TEXT NOT NULL,
      trade_apt_nm TEXT NOT NULL,
      kapt_code TEXT NOT NULL,
      complex_apt_nm TEXT NOT NULL,
      match_type TEXT NOT NULL,
      PRIMARY KEY (lawd_cd, trade_apt_nm)
    );
  `);
}
