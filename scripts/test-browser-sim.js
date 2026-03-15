// 브라우저에서 /search?lawdCd=11680 접속 시 서버 렌더링 확인
fetch('http://localhost:3000/search?lawdCd=11680')
  .then(r => {
    console.log('Status:', r.status);
    return r.text();
  })
  .then(html => {
    // 에러 메시지가 있는지 확인
    if (html.includes('Internal Server Error') || html.includes('500')) {
      console.log('SERVER ERROR detected');
    }
    if (html.includes('error')) {
      const match = html.match(/error[^<]{0,200}/i);
      if (match) console.log('error context:', match[0]);
    }
    // React hydration 에러 확인
    if (html.includes('Hydration') || html.includes('hydration')) {
      console.log('Hydration error detected');
    }
    console.log('HTML length:', html.length);
    console.log('Contains search form:', html.includes('검색 조건'));
    console.log('Contains region select:', html.includes('RegionSelect') || html.includes('지역'));
  })
  .catch(e => console.error('Error:', e.message));
