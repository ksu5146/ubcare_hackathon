async function test() {
  // 1) API 직접 테스트
  console.log('=== 1. API 직접 호출 ===');
  const apiUrl = 'http://localhost:3000/api/trade/search?lawdCd=11680&priceMin=0&priceMax=300000&areaMin=10&areaMax=200&grouped=true&pageSize=200';
  const apiRes = await fetch(apiUrl);
  const apiData = await apiRes.json();
  console.log('API status:', apiRes.status, '| success:', apiData.success, '| groups:', apiData.data?.length);

  // 2) /search 페이지 접속 (지역 없이)
  console.log('\n=== 2. /search (지역 없이) ===');
  const noRegion = await fetch('http://localhost:3000/search');
  console.log('Status:', noRegion.status);

  // 3) /search 페이지 접속 (지역 있음)
  console.log('\n=== 3. /search?lawdCd=11680 ===');
  const withRegion = await fetch('http://localhost:3000/search?lawdCd=11680');
  const html = await withRegion.text();
  console.log('Status:', withRegion.status);
  console.log('HTML length:', html.length);

  // 서버 에러 로그 확인
  const hasServerError = html.includes('Internal Server Error');
  const hasError = html.includes('에러') || html.includes('오류') || html.includes('Error');
  console.log('Server error:', hasServerError);
  console.log('Any error text:', hasError);

  // 4) 서버 로그 확인
  console.log('\n=== 4. 서버 로그 확인 ===');
  const logRes = await fetch('http://localhost:3000/api/trade/search?lawdCd=11680&grouped=true');
  const logData = await logRes.json();
  console.log('Grouped search:', logData.success, '| count:', logData.data?.length);
  if (logData.error) console.log('ERROR:', logData.error);
}
test().catch(e => console.error('Test failed:', e.message));
