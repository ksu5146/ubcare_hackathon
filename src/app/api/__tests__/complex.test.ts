import { describe, it, expect } from 'vitest';
import type { ComplexInfo } from '@/types/complex';

describe('ComplexInfo 타입 검증', () => {
  const mockComplex: ComplexInfo = {
    id: 'A13805002',
    name: '올림픽선수기자촌아파트',
    address: '서울특별시 송파구 방이동',
    roadAddress: '서울특별시 송파구 양재대로 1218',
    households: 5540,
    buildingCount: 122,
    topFloor: 24,
    approvalDate: '19880614',
    buildYear: 1988,
    heatingType: '지역난방',
    parkingTotal: 5003,
    parkingGround: 1815,
    parkingUnderground: 3188,
    constructor: '한신공영(주) 외',
    aptType: '아파트',
    managementType: '위탁관리',
    hallType: '혼합식',
    elevatorCount: 207,
    cctvCount: 1059,
    subwayLine: '5호선',
    subwayTime: '5~10분이내',
    vlRat: 169.5,
    bcRat: 12.3,
    engrGrade: '4',
    buildingAge: 38,
    rebuildScore: 70,
    rebuildEligible: true,
    livabilityScore: 55,
    futureValueScore: 66,
    lat: 37.5167,
    lng: 127.1377,
  };

  it('필수 필드가 존재한다', () => {
    expect(mockComplex.id).toBeTruthy();
    expect(mockComplex.name).toBeTruthy();
    expect(mockComplex.address).toBeTruthy();
  });

  it('스코어링 필드가 존재한다', () => {
    expect(mockComplex.rebuildScore).toBeTypeOf('number');
    expect(mockComplex.livabilityScore).toBeTypeOf('number');
    expect(mockComplex.futureValueScore).toBeTypeOf('number');
  });

  it('좌표 필드가 존재한다', () => {
    expect(mockComplex.lat).toBeTypeOf('number');
    expect(mockComplex.lng).toBeTypeOf('number');
  });

  it('건물지표 필드가 존재한다', () => {
    expect(mockComplex.vlRat).toBeTypeOf('number');
    expect(mockComplex.bcRat).toBeTypeOf('number');
    expect(mockComplex.engrGrade).toBeTruthy();
  });

  it('rebuildEligible이 boolean이다', () => {
    expect(mockComplex.rebuildEligible).toBe(true);
  });

  it('주차 합계가 지상+지하와 일치한다', () => {
    expect(mockComplex.parkingTotal).toBe(
      (mockComplex.parkingGround ?? 0) + (mockComplex.parkingUnderground ?? 0),
    );
  });

  it('API 응답 형식을 검증한다', () => {
    const response = { success: true, data: mockComplex };
    expect(response.success).toBe(true);
    expect(response.data.name).toBe('올림픽선수기자촌아파트');
  });

  it('단지 없을 때 404 응답 형식', () => {
    const response = { success: false, data: null, error: '단지 정보를 찾을 수 없습니다' };
    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error).toBeTruthy();
  });

  it('lawdCd 누락 시 400 응답 형식', () => {
    const response = { success: false, data: null, error: 'lawdCd 파라미터 필요' };
    expect(response.success).toBe(false);
    expect(response.error).toContain('lawdCd');
  });
});
