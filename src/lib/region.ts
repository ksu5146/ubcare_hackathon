import regionData from '@/data/region-codes.json';

interface RegionNode {
  code: string;
  name: string;
  children?: RegionNode[];
}

const regions = regionData as RegionNode[];

// lawdCd 5자리 → "서울특별시 강남구" 매핑 캐시
const cache = new Map<string, string>();

/** lawdCd 5자리 → "서울특별시 강남구" 형태의 시군구명 반환 */
export function getRegionName(lawdCd: string): string {
  if (cache.has(lawdCd)) return cache.get(lawdCd)!;

  for (const sido of regions) {
    for (const sigungu of sido.children ?? []) {
      if (sigungu.code.startsWith(lawdCd)) {
        const name = `${sido.name} ${sigungu.name}`;
        cache.set(lawdCd, name);
        return name;
      }
    }
  }

  cache.set(lawdCd, '');
  return '';
}
