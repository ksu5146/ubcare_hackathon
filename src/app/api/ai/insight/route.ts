import { NextRequest, NextResponse } from 'next/server';
import type { ComplexInfo } from '@/types/complex';
import type { ApartmentTrade } from '@/types/trade';
import { getComplexScoring, type ComplexScoringData } from '@/lib/db-queries';

interface InsightRequestItem {
  name: string;
  dong: string;
  lawdCd: string;
  info: ComplexInfo | null;
  trades: ApartmentTrade[];
}

interface InsightRequest {
  complexes: InsightRequestItem[];
}

const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const API_KEY = process.env.AZURE_OPENAI_API_KEY;
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

function buildTradesSummary(trades: ApartmentTrade[]): string {
  if (trades.length === 0) return '거래 이력 없음';

  const sorted = [...trades].sort((a, b) => b.dealDate.localeCompare(a.dealDate));
  const latest = sorted[0];
  const amounts = trades.map((t) => t.dealAmount);
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  const avg = Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length);

  // 최근 5건
  const recentTrades = sorted.slice(0, 5).map(
    (t) => `  ${t.dealDate} | ${t.area}㎡ ${t.floor}층 | ${(t.dealAmount / 10000).toFixed(1)}억원`,
  ).join('\n');

  // 연도별 평균
  const byYear = new Map<number, number[]>();
  for (const t of trades) {
    const y = parseInt(t.dealDate.slice(0, 4), 10);
    const arr = byYear.get(y) ?? [];
    arr.push(t.dealAmount);
    byYear.set(y, arr);
  }
  const yearlyAvg = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, arr]) => `  ${y}년: 평균 ${(Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) / 10000).toFixed(1)}억원 (${arr.length}건)`)
    .join('\n');

  return [
    `총 ${trades.length}건, 최근거래: ${latest.dealDate} ${(latest.dealAmount / 10000).toFixed(1)}억원`,
    `가격범위: ${(min / 10000).toFixed(1)}억 ~ ${(max / 10000).toFixed(1)}억 (평균 ${(avg / 10000).toFixed(1)}억)`,
    `[최근 5건]`,
    recentTrades,
    `[연도별 평균]`,
    yearlyAvg,
  ].join('\n');
}

function buildScoringContext(scoring: ComplexScoringData): string {
  const lines: string[] = ['### 단지 평가 지표'];

  if (scoring.buildingAge != null) lines.push(`건물연식: ${scoring.buildingAge}년`);
  if (scoring.vlRat != null) lines.push(`용적률: ${scoring.vlRat.toFixed(1)}% (법정상한 대비 여유분이 클수록 재건축 사업성 높음)`);
  if (scoring.bcRat != null) lines.push(`건폐율: ${scoring.bcRat.toFixed(1)}%`);
  if (scoring.parkingRatio != null) lines.push(`주차비율: 세대당 ${scoring.parkingRatio.toFixed(2)}대`);
  if (scoring.engrGrade) lines.push(`에너지등급: ${scoring.engrGrade}`);
  lines.push(`재건축요건충족(30년+): ${scoring.rebuildEligible ? '예' : '아니오'}`);
  if (scoring.rebuildScore != null) lines.push(`재건축가능성 점수: ${scoring.rebuildScore}/100 (연식 45% + 용적률여유 40% + 건물상태 15%)`);
  if (scoring.livabilityScore != null) lines.push(`주거쾌적성 점수: ${scoring.livabilityScore}/100 (주차 30% + 건폐율 25% + 용적률 20% + 신축도 15% + 시설 10%)`);
  if (scoring.futureValueScore != null) lines.push(`미래가치 점수: ${scoring.futureValueScore}/100 (구축: 재건축 비중↑, 신축: 쾌적성 비중↑)`);

  return lines.join('\n');
}

function buildComplexContext(item: InsightRequestItem, scoring: ComplexScoringData | null): string {
  const info = item.info;
  const lines: string[] = [`## ${item.name} (${item.dong})`];

  if (info) {
    const details: string[] = [];
    if (info.address) details.push(`주소: ${info.roadAddress ?? info.address}`);
    if (info.buildYear) details.push(`건축년도: ${info.buildYear}년 (${new Date().getFullYear() - info.buildYear}년차)`);
    if (info.households) details.push(`세대수: ${info.households.toLocaleString()}세대`);
    if (info.buildingCount) details.push(`동수: ${info.buildingCount}동`);
    if (info.topFloor) details.push(`최고층: ${info.topFloor}층`);
    if (info.heatingType) details.push(`난방: ${info.heatingType}`);
    if (info.hallType) details.push(`복도유형: ${info.hallType}`);
    if (info.constructor) details.push(`시공사: ${info.constructor}`);
    if (info.parkingTotal) {
      const ratio = info.households ? (info.parkingTotal / info.households).toFixed(2) : '-';
      details.push(`주차: 총 ${info.parkingTotal.toLocaleString()}대 (세대당 ${ratio}대)`);
    }
    if (info.elevatorCount) details.push(`승강기: ${info.elevatorCount}대`);
    if (info.subwayLine) details.push(`지하철: ${info.subwayLine} (도보 ${info.subwayTime ?? '?'})`);
    if (info.educationFacility) details.push(`교육시설: ${info.educationFacility}`);
    if (info.convenientFacility) details.push(`편의시설: ${info.convenientFacility}`);
    if (info.welfareFacility) details.push(`복리시설: ${info.welfareFacility}`);
    if (info.managementType) details.push(`관리방식: ${info.managementType}`);
    lines.push(details.join('\n'));
  } else {
    lines.push('(단지 상세정보 없음)');
  }

  // 스코어링 데이터 추가
  if (scoring) {
    lines.push('');
    lines.push(buildScoringContext(scoring));
  }

  lines.push('');
  lines.push('### 거래 이력');
  lines.push(buildTradesSummary(item.trades));

  return lines.join('\n');
}

function buildPrompt(complexes: InsightRequestItem[], scoringMap: Map<string, ComplexScoringData | null>): string {
  const contextBlocks = complexes.map((c) =>
    buildComplexContext(c, scoringMap.get(c.name) ?? null),
  ).join('\n\n---\n\n');
  const names = complexes.map((c) => `"${c.name}"`).join(', ');

  return `당신은 대한민국 부동산 투자 및 실거주 분석 전문가입니다. 아래 제공된 아파트 단지들의 메타데이터, 실거래가 이력, 그리고 **단지 평가 지표(재건축/쾌적성/미래가치 점수)**를 종합 분석하여, 매수 희망자에게 도움이 되는 인사이트를 **반드시 아래 JSON 형식으로만** 응답해주세요.

## 분석 대상 단지 데이터

${contextBlocks}

---

## 응답 JSON 형식 (이 형식을 정확히 지켜주세요)

\`\`\`json
{
  "complexes": [
    {
      "name": "단지명",
      "scores": {
        "profit": 75,
        "living": 82,
        "family": 70,
        "futureValue": 88
      },
      "pros": ["장점1", "장점2", "장점3"],
      "cons": ["단점1", "단점2"],
      "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
    }
  ],
  "categories": [
    {
      "id": "profit",
      "title": "수익률 측면",
      "analysis": "전체 단지 비교 분석 텍스트 (2-3문장)",
      "winner": "가장 유리한 단지명"
    },
    {
      "id": "living",
      "title": "실거주 측면",
      "analysis": "전체 단지 비교 분석 텍스트 (2-3문장)",
      "winner": "가장 유리한 단지명"
    },
    {
      "id": "family",
      "title": "세대별 관점",
      "analysis": "전체 단지 비교 분석 텍스트 (2-3문장)",
      "winner": "가장 유리한 단지명"
    },
    {
      "id": "futureValue",
      "title": "미래가치 및 재건축",
      "analysis": "전체 단지 비교 분석 텍스트 (2-3문장)",
      "winner": "가장 유리한 단지명"
    }
  ],
  "summary": "종합 추천 의견 (3-4문장으로 핵심만 정리)",
  "recommendation": "최종 추천 단지명 (하나)",
  "recommendationReason": "추천 이유 한 줄"
}
\`\`\`

## 분석 기준

### 1. 수익률 (profit) — 0~100점
- 최근 가격 추이, 변동성, 시세 전망, 투자 수익률

### 2. 실거주 (living) — 0~100점
- 교통/교육/편의시설, 주차/복도유형/난방, 커뮤니티/관리 품질, 주거쾌적성 점수 참고

### 3. 세대별 (family) — 0~100점
- 1인/신혼(소형평수, 역세권), 자녀(학군, 놀이시설), 은퇴(관리비, 접근성)

### 4. 미래가치 및 재건축 (futureValue) — 0~100점
**이 항목은 단순한 발전가능성이 아닌, 구체적 데이터 기반의 미래가치 분석입니다.**
- **재건축 사업성**: 재건축요건충족 여부(30년+), 용적률 여유분(법정상한 대비 현재 용적률이 낮을수록 사업성 높음), 재건축가능성 점수
- **입지 프리미엄**: 대단지 여부(세대수), 역세권, 강남/한강 인접 등 입지 가치
- **재건축 시 기대효과**: 현재 용적률이 낮고 대지지분이 넓은 구축 대단지(예: 올림픽선수기자촌, 은마, 잠실주공 등)는 재건축 시 높은 사업성과 가격 상승이 기대됨
- **장기 가치 전망**: 미래가치 점수, 주변 개발 호재, 교통 인프라 개선 가능성
- **중요**: 현재 노후하고 쾌적성이 낮더라도 재건축 사업성이 높은 단지는 미래가치를 높게 평가해야 합니다. 단순히 "오래됐으니 단점"이 아니라 "재건축 요건 충족 + 용적률 여유 = 높은 미래가치"로 해석하세요.

## 중요 규칙
- 반드시 유효한 JSON만 출력하세요. 마크다운 코드블록(\`\`\`json)으로 감싸지 마세요.
- 점수는 0~100 사이 정수로 데이터에 근거하여 차등 부여하세요.
- 각 단지의 pros는 2~4개, cons는 1~3개로 작성하세요.
- keywords는 해당 단지를 가장 잘 설명하는 2~4단어를 선정하세요.
- 구축 대단지의 재건축 가능성을 장점(pros)에 반드시 반영하세요.
- 분석 대상 단지: ${names}
- 한국어로 작성하세요.`;
}

export async function POST(request: NextRequest) {
  if (!ENDPOINT || !API_KEY || !DEPLOYMENT) {
    return NextResponse.json(
      { success: false, error: 'Azure OpenAI 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  let body: InsightRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!body.complexes || body.complexes.length < 2) {
    return NextResponse.json({ success: false, error: '최소 2개 단지가 필요합니다.' }, { status: 400 });
  }

  // DB에서 스코어링 데이터 조회
  const scoringMap = new Map<string, ComplexScoringData | null>();
  for (const c of body.complexes) {
    try {
      scoringMap.set(c.name, await getComplexScoring(c.name, c.lawdCd));
    } catch {
      scoringMap.set(c.name, null);
    }
  }

  const prompt = buildPrompt(body.complexes, scoringMap);

  // Azure OpenAI Chat Completion API
  const url = `${ENDPOINT.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: '당신은 대한민국 부동산 시장 분석 전문가입니다. 데이터 기반의 객관적이고 통찰력 있는 분석을 제공합니다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[AI Insight] Azure OpenAI error:', res.status, errText);
      return NextResponse.json(
        { success: false, error: `AI 분석 요청 실패 (${res.status})` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content ?? '';

    // JSON 파싱 시도
    let structured = null;
    try {
      // 코드블록으로 감싸져 있을 수 있으므로 제거
      const cleaned = rawContent.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      structured = JSON.parse(cleaned);
    } catch {
      // JSON 파싱 실패 시 텍스트로 폴백
    }

    return NextResponse.json({
      success: true,
      data: structured ? { structured, content: null } : { structured: null, content: rawContent },
    });
  } catch (err) {
    console.error('[AI Insight] fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'AI 서비스 연결에 실패했습니다.' },
      { status: 502 },
    );
  }
}
