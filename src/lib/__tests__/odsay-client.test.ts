import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// NEXT_PUBLIC_ODSAY_API_KEY 환경변수를 모듈 로드 전에 제어하기 위해
// vi.stubEnv와 dynamic import를 활용한다.

describe('fetchTransit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('API_KEY가 없으면 null을 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', '');
    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(126.9, 37.5, 127.0, 37.6);
    expect(result).toBeNull();
  });

  it('fetch가 ok=false를 반환하면 null을 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(126.9, 37.5, 127.0, 37.6);
    expect(result).toBeNull();
  });

  it('ODsay 에러 응답이면 null을 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: { code: -98, message: '경로 없음' } }),
    }));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(126.9, 37.5, 127.0, 37.6);
    expect(result).toBeNull();
  });

  it('path 목록이 비어있으면 null을 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: { path: [] } }),
    }));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(126.9, 37.5, 127.0, 37.6);
    expect(result).toBeNull();
  });

  it('정상 응답에서 TransitResult를 반환한다 (지하철 경로)', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    const mockPath = {
      pathType: 1,
      info: {
        totalTime: 35,
        payment: 1400,
        busTransitCount: 0,
        subwayTransitCount: 1,
        totalStationCount: 8,
        busStationCount: 0,
        subwayStationCount: 8,
        firstStartStation: '강남',
        lastEndStation: '홍대입구',
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: { path: [mockPath] } }),
    }));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(127.027, 37.497, 126.924, 37.557);

    expect(result).not.toBeNull();
    expect(result!.totalTime).toBe(35);
    expect(result!.fare).toBe(1400);
    expect(result!.transferCount).toBe(0); // 1회 탑승 = 환승 0회
    expect(result!.summary).toContain('지하철');
    expect(result!.summary).toContain('강남');
    expect(result!.summary).toContain('홍대입구');
  });

  it('여러 경로 중 소요시간이 가장 짧은 경로를 선택한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    const fastPath = {
      pathType: 1,
      info: {
        totalTime: 20,
        payment: 1400,
        busTransitCount: 0,
        subwayTransitCount: 1,
        totalStationCount: 5,
        busStationCount: 0,
        subwayStationCount: 5,
        firstStartStation: 'A역',
        lastEndStation: 'B역',
      },
    };
    const slowPath = {
      pathType: 2,
      info: {
        totalTime: 45,
        payment: 1200,
        busTransitCount: 1,
        subwayTransitCount: 0,
        totalStationCount: 10,
        busStationCount: 10,
        subwayStationCount: 0,
        firstStartStation: 'C정류장',
        lastEndStation: 'D정류장',
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: { path: [slowPath, fastPath] } }),
    }));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(127.027, 37.497, 126.924, 37.557);

    expect(result).not.toBeNull();
    expect(result!.totalTime).toBe(20);
    expect(result!.summary).toContain('지하철');
  });

  it('fetch 예외 발생 시 null을 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ODSAY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { fetchTransit } = await import('../odsay-client');
    const result = await fetchTransit(126.9, 37.5, 127.0, 37.6);
    expect(result).toBeNull();
  });
});
