import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// DB 모듈 모킹 — 실제 SQLite 없이 단위 테스트
vi.mock('@/lib/db-queries', () => ({
  searchTrades: vi.fn().mockResolvedValue({
    trades: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  }),
  searchTradeGrouped: vi.fn().mockResolvedValue({
    groups: [],
    total: 0,
  }),
}));

import { GET } from '../trade/search/route';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/trade/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

describe('GET /api/trade/search', () => {
  describe('lawdCd 파라미터 검증', () => {
    it('lawdCd 없으면 400 반환', async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/lawdCd/);
    });

    it('lawdCd 있으면 200 반환', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('lawdCd 빈 문자열이면 400 반환', async () => {
      const res = await GET(makeRequest({ lawdCd: '' }));
      expect(res.status).toBe(400);
    });

    it('lawdCd 콤마 구분 다수 허용', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680,11215,11350' }));
      expect(res.status).toBe(200);
    });

    it('lawdCd 최대 3개까지만 허용 (4개 입력해도 오류 없이 처리)', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680,11215,11350,11440' }));
      expect(res.status).toBe(200);
    });
  });

  describe('grouped 옵션', () => {
    it('grouped=true 이면 groups 배열 포함', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680', grouped: 'true' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty('total');
    });

    it('grouped 없으면 pagination 포함', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('pageSize');
      expect(body.pagination).toHaveProperty('totalPages');
    });
  });

  describe('응답 형식 검증', () => {
    it('성공 응답은 { success: true, data } 포함', async () => {
      const res = await GET(makeRequest({ lawdCd: '11680' }));
      const body = await res.json();
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
    });

    it('실패 응답은 { success: false, error } 포함', async () => {
      const res = await GET(makeRequest());
      const body = await res.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
    });
  });
});
