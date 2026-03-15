// 홈에서 강남구 선택 후 검색 버튼 클릭 시 /search 에서 호출하는 API 시뮬레이션
// 기본 필터: lawdCd=11680, priceMin=0, priceMax=300000, areaMin=10, areaMax=200

// 1) useSearchResults가 호출하는 URL
const url = 'http://localhost:3000/api/trade/search?lawdCd=11680&priceMin=0&priceMax=300000&areaMin=10&areaMax=200&grouped=true&pageSize=200';
console.log('Fetching:', url);

fetch(url)
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('success:', data.success);
    console.log('error:', data.error);
    console.log('data type:', typeof data.data, Array.isArray(data.data) ? 'array' : '');
    console.log('data length:', data.data?.length);
    if (data.data?.length > 0) {
      const first = data.data[0];
      console.log('first keys:', Object.keys(first));
      console.log('first.aptName:', first.aptName);
      console.log('first.tradeCount:', first.tradeCount);
    }
  })
  .catch(e => console.error('Error:', e.message));
