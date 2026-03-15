import { FILTER_DEFAULTS } from './constants';

/**
 * 만원 단위 금액을 한국식 표기로 변환
 * @param priceInManWon 만원 단위 금액 (예: 50000 = 5억)
 * @returns 포맷된 문자열 (예: "5억", "5억 2,000만")
 */
export function formatPrice(priceInManWon: number): string {
  if (priceInManWon <= 0) return '0';

  const eok = Math.floor(priceInManWon / 10000);
  const man = priceInManWon % 10000;

  if (eok === 0) return `${man.toLocaleString('ko-KR')}만`;
  if (man === 0) return `${eok}억`;
  return `${eok}억 ${man.toLocaleString('ko-KR')}만`;
}

/**
 * 만원 단위 금액을 축약 표기로 변환
 * @param priceInManWon 만원 단위 금액
 * @returns 축약 표기 (예: "6.2억")
 */
export function formatPriceShort(priceInManWon: number): string {
  if (priceInManWon <= 0) return '0';
  const eok = priceInManWon / 10000;
  if (eok < 1) return `${priceInManWon.toLocaleString('ko-KR')}만`;
  return `${Math.round(eok * 10) / 10}억`;
}

/**
 * 면적 포맷팅
 * @param sqm 제곱미터
 * @param unit 표시 단위
 * @returns 포맷된 문자열
 */
export function formatArea(sqm: number, unit: 'sqm' | 'pyeong' = 'sqm'): string {
  if (unit === 'pyeong') {
    const pyeong = sqm / FILTER_DEFAULTS.SQM_PER_PYEONG;
    return `${Math.round(pyeong * 10) / 10}평`;
  }
  return `${Math.round(sqm * 100) / 100}m²`;
}

/**
 * 제곱미터 → 평 변환
 */
export function sqmToPyeong(sqm: number): number {
  return Math.round((sqm / FILTER_DEFAULTS.SQM_PER_PYEONG) * 10) / 10;
}

/**
 * 평 → 제곱미터 변환
 */
export function pyeongToSqm(pyeong: number): number {
  return Math.round(pyeong * FILTER_DEFAULTS.SQM_PER_PYEONG * 100) / 100;
}
