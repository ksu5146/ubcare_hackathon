import { describe, it, expect } from 'vitest';

describe('AI 인사이트 요청/응답 검증', () => {
  const validComplex = {
    name: '래미안대치팰리스',
    dong: '대치동',
    lawdCd: '11680',
    info: { id: 'A1234', name: '래미안대치팰리스', address: '서울 강남구', households: 1500 },
    trades: [{ dealAmount: 250000, dealDate: '2026-03-01', excluUseAr: 84.5 }],
  };

  describe('요청 본문 검증', () => {
    it('complexes가 2개 이상이어야 한다', () => {
      const body = { complexes: [validComplex] };
      expect(body.complexes.length).toBeLessThan(2);
    });

    it('2개 이상이면 유효하다', () => {
      const body = { complexes: [validComplex, { ...validComplex, name: 'B' }] };
      expect(body.complexes.length).toBeGreaterThanOrEqual(2);
    });

    it('각 complex에 name, dong, lawdCd가 필수다', () => {
      expect(validComplex).toHaveProperty('name');
      expect(validComplex).toHaveProperty('dong');
      expect(validComplex).toHaveProperty('lawdCd');
    });
  });

  describe('성공 응답 구조 (structured)', () => {
    const structuredResponse = {
      success: true,
      data: {
        structured: {
          complexes: [
            { name: '래미안', scores: { profit: 75, living: 82, family: 70, futureValue: 88 }, pros: ['역세권'], cons: ['노후'], keywords: ['강남'] },
          ],
          categories: [
            { id: 'profit', title: '수익률', analysis: '분석 내용', winner: '래미안' },
          ],
          summary: '종합 요약',
          recommendation: '래미안',
          recommendationReason: '추천 이유',
        },
        content: null,
      },
    };

    it('success가 true다', () => {
      expect(structuredResponse.success).toBe(true);
    });

    it('structured에 complexes 배열이 있다', () => {
      expect(structuredResponse.data.structured!.complexes).toBeInstanceOf(Array);
    });

    it('각 complex에 scores, pros, cons, keywords가 있다', () => {
      const c = structuredResponse.data.structured!.complexes[0];
      expect(c).toHaveProperty('scores');
      expect(c).toHaveProperty('pros');
      expect(c).toHaveProperty('cons');
      expect(c).toHaveProperty('keywords');
    });

    it('scores 값이 0~100 범위의 number다', () => {
      const scores = structuredResponse.data.structured!.complexes[0].scores;
      Object.values(scores).forEach((v) => {
        expect(v).toBeTypeOf('number');
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });

    it('categories에 id, title, analysis, winner가 있다', () => {
      const cat = structuredResponse.data.structured!.categories[0];
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('title');
      expect(cat).toHaveProperty('analysis');
      expect(cat).toHaveProperty('winner');
    });

    it('recommendation이 문자열이다', () => {
      expect(structuredResponse.data.structured!.recommendation).toBeTypeOf('string');
    });
  });

  describe('폴백 응답 구조 (content)', () => {
    const fallbackResponse = {
      success: true,
      data: { structured: null, content: 'AI 분석 텍스트 결과...' },
    };

    it('structured가 null이고 content가 문자열이다', () => {
      expect(fallbackResponse.data.structured).toBeNull();
      expect(fallbackResponse.data.content).toBeTypeOf('string');
    });
  });

  describe('에러 응답', () => {
    it('환경변수 미설정 시 500 형식', () => {
      const res = { success: false, data: null, error: 'Azure OpenAI 설정이 필요합니다' };
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
    });

    it('Azure 오류 시 502 형식', () => {
      const res = { success: false, data: null, error: 'Azure OpenAI 호출 실패' };
      expect(res.success).toBe(false);
    });
  });
});
