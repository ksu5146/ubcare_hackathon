import { describe, it, expect } from 'vitest';
import { getRegionName } from '../region';

describe('getRegionName', () => {
  it('유효한 lawdCd 5자리로 시도+시군구명을 반환한다', () => {
    // region-codes.json 기준: 11110 = 서울특별시 종로구
    expect(getRegionName('11110')).toBe('서울특별시 종로구');
  });

  it('강남구 코드(11680)를 올바르게 반환한다', () => {
    expect(getRegionName('11680')).toBe('서울특별시 강남구');
  });

  it('존재하지 않는 코드는 빈 문자열을 반환한다', () => {
    expect(getRegionName('99999')).toBe('');
  });

  it('빈 문자열 코드는 첫 번째 지역을 반환한다 (startsWith 매칭)', () => {
    expect(getRegionName('')).toBeTruthy();
  });

  it('동일 코드를 반복 호출해도 동일한 결과를 반환한다 (캐시)', () => {
    const first = getRegionName('11110');
    const second = getRegionName('11110');
    expect(first).toBe(second);
  });
});
