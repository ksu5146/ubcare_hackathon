import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';
import type { SchoolItem } from '@/types/nearby';

/** 법정동코드별 목(mock) 학교 데이터 */
const MOCK_SCHOOLS: Record<string, SchoolItem[]> = {
  // 강남구 (11680)
  '11680': [
    { name: '대치초등학교', level: '초', address: '서울 강남구 대치동 994', lat: 37.4945, lng: 127.0575, type: '공립', distance: 320 },
    { name: '대곡초등학교', level: '초', address: '서울 강남구 대치동 316', lat: 37.4985, lng: 127.0545, type: '공립', distance: 480 },
    { name: '대청중학교', level: '중', address: '서울 강남구 대치동 992', lat: 37.4935, lng: 127.0605, type: '공립', distance: 550 },
    { name: '휘문중학교', level: '중', address: '서울 강남구 대치동 955-1', lat: 37.4975, lng: 127.0625, type: '사립', distance: 620 },
    { name: '단대부속고등학교', level: '고', address: '서울 강남구 대치동 산 58', lat: 37.4920, lng: 127.0630, type: '사립', distance: 780 },
    { name: '중산고등학교', level: '고', address: '서울 강남구 일원동 642', lat: 37.4880, lng: 127.0720, type: '공립', distance: 1200 },
  ],
  // 서초구 (11650)
  '11650': [
    { name: '서초초등학교', level: '초', address: '서울 서초구 서초동 1567', lat: 37.4925, lng: 127.0155, type: '공립', distance: 250 },
    { name: '반포초등학교', level: '초', address: '서울 서초구 반포동 18-2', lat: 37.5055, lng: 126.9925, type: '공립', distance: 380 },
    { name: '서문여자중학교', level: '중', address: '서울 서초구 서초동 1586', lat: 37.4935, lng: 127.0175, type: '사립', distance: 500 },
    { name: '반포중학교', level: '중', address: '서울 서초구 반포동 60-1', lat: 37.5035, lng: 126.9905, type: '공립', distance: 650 },
    { name: '서초고등학교', level: '고', address: '서울 서초구 서초동 1642', lat: 37.4895, lng: 127.0195, type: '공립', distance: 720 },
  ],
  // 송파구 (11710)
  '11710': [
    { name: '잠실초등학교', level: '초', address: '서울 송파구 잠실동 184', lat: 37.5085, lng: 127.0825, type: '공립', distance: 300 },
    { name: '잠실중학교', level: '중', address: '서울 송파구 잠실동 179', lat: 37.5070, lng: 127.0815, type: '공립', distance: 450 },
    { name: '잠실고등학교', level: '고', address: '서울 송파구 잠실동 175', lat: 37.5060, lng: 127.0835, type: '공립', distance: 600 },
    { name: '보인고등학교', level: '고', address: '서울 송파구 잠실동 24', lat: 37.5115, lng: 127.0905, type: '사립', distance: 850 },
  ],
};

/** 기본 mock 데이터 (법정동코드가 매칭되지 않을 때) */
const DEFAULT_SCHOOLS: SchoolItem[] = [
  { name: '서울초등학교', level: '초', address: '서울특별시', lat: 37.5665, lng: 126.978, type: '공립', distance: 400 },
  { name: '서울중학교', level: '중', address: '서울특별시', lat: 37.5675, lng: 126.980, type: '공립', distance: 600 },
  { name: '서울고등학교', level: '고', address: '서울특별시', lat: 37.5685, lng: 126.982, type: '공립', distance: 900 },
];

/**
 * GET /api/nearby/school?lawdCd=11680
 *
 * 법정동코드 기준 인근 학교 목록 조회.
 * 현재는 mock 데이터를 반환한다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lawdCd = searchParams.get('lawdCd');

    if (!lawdCd) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lawdCd 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    // 법정동코드 앞 5자리로 매칭
    const key = lawdCd.substring(0, 5);
    const schools = MOCK_SCHOOLS[key] ?? DEFAULT_SCHOOLS;

    return NextResponse.json<ApiResponse<SchoolItem[]>>({
      success: true,
      data: schools,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '학교 정보 조회 실패';
    console.error('[/api/nearby/school]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
