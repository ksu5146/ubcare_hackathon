'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import {
  ArrowLeft, Train, GraduationCap, ShoppingBag, Shield, X, Plus, Star,
  Bookmark, History, Clock, Search, GitCompareArrows, Sparkles, MousePointerClick,
} from 'lucide-react';
import Link from 'next/link';
import type { ApartmentTrade } from '@/types/trade';
import type { ComplexInfo } from '@/types/complex';
import type { ApiResponse } from '@/types/api';
import CompareChart from '@/components/chart/CompareChart';
import CommuteCompare from '@/components/compare/CommuteCompare';
import { AiInsightFab, AiInsightPanel } from '@/components/compare/AiInsight';
import { useFavorites } from '@/hooks/use-favorites';
import { useComparisons } from '@/hooks/use-comparisons';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CompareItem {
  name: string;
  dong: string;
  lawdCd: string;
}

interface CompareComplexData {
  item: CompareItem;
  trades: ApartmentTrade[];
  info: ComplexInfo | null;
}

// ── 지하철 노선 색상 (ComplexInfoCard와 동일) ──
const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4', '2호선': '#00A84D', '3호선': '#EF7C1C', '4호선': '#00A5DE',
  '5호선': '#996CAC', '6호선': '#CD7C2F', '7호선': '#747F00', '8호선': '#E6186C',
  '9호선': '#BDB092', '분당선': '#F5A200', '신분당선': '#D4003B', '경의중앙선': '#77C4A3',
  '경춘선': '#0C8E72', '공항철도': '#0090D2', '수인선': '#F5A200', '경강선': '#0054A6',
  '우이신설선': '#B7C452', '서해선': '#8BC53F', '김포골드라인': '#AD8605',
  '용인에버라인': '#509F22', '의정부경전철': '#FDA600', '인천1호선': '#7CA8D5',
  '인천2호선': '#ED8B00', '동해선': '#0054A6',
};

const WALKABLE_TIMES = ['5분이내', '5~10분이내'];

function getStationTagLabel(subwayLine?: string, subwayTime?: string): string | null {
  if (!subwayLine || !subwayTime || !WALKABLE_TIMES.includes(subwayTime)) return null;
  const count = subwayLine.split(',').map((s) => s.trim()).filter(Boolean).length;
  if (count === 0) return null;
  if (count === 1) return '역세권';
  if (count === 2) return '더블역세권';
  if (count === 3) return '트리플역세권';
  if (count === 4) return '쿼드러플역세권';
  return '펜타역세권';
}

function parseEducation(raw?: string): { type: string; name: string }[] {
  if (!raw) return [];
  const results: { type: string; name: string }[] = [];
  const pattern = /(초등학교|중학교|고등학교)\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    if (match[2]) results.push({ type: match[1], name: match[2] });
  }
  return results;
}

function parseConvenient(raw?: string): string[] {
  if (!raw) return [];
  const results: string[] = [];
  const pattern = /([^\s(]+)\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    results.push(match[2] ? `${match[1]}: ${match[2]}` : match[1]);
  }
  return results;
}

async function fetchComplexTrades(item: CompareItem): Promise<ApartmentTrade[]> {
  const params = new URLSearchParams({ lawdCd: item.lawdCd, aptName: item.name });
  if (item.dong) params.set('dong', item.dong);
  const res = await fetch(`/api/trade/complex?${params.toString()}`);
  const data: ApiResponse<ApartmentTrade[]> = await res.json();
  return data.success && data.data ? data.data : [];
}

async function fetchComplexInfo(item: CompareItem): Promise<ComplexInfo | null> {
  const params = new URLSearchParams();
  if (item.lawdCd) params.set('lawdCd', item.lawdCd);
  const qs = params.toString();
  const url = `/api/complex/${encodeURIComponent(item.name)}${qs ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url);
    const data: ApiResponse<ComplexInfo> = await res.json();
    return data.success && data.data ? data.data : null;
  } catch {
    return null;
  }
}

function parseItems(searchParams: URLSearchParams): CompareItem[] {
  const itemsJson = searchParams.get('items');
  if (itemsJson) {
    try {
      const parsed = JSON.parse(itemsJson) as CompareItem[];
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
    } catch { /* fall through */ }
  }
  const nameA = searchParams.get('a');
  const nameB = searchParams.get('b');
  if (nameA && nameB) {
    return [
      { name: nameA, dong: searchParams.get('aDong') ?? '', lawdCd: searchParams.get('aLawdCd') ?? '' },
      { name: nameB, dong: searchParams.get('bDong') ?? '', lawdCd: searchParams.get('bLawdCd') ?? '' },
    ];
  }
  return [];
}

const COLORS = ['var(--color-estate-700)', 'var(--color-amber-500)', '#10b981', '#8b5cf6'];

// ── 비교 행 컴포넌트 ──

function CompareRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn('border-t border-gray-100', className)}>
      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-gray-500">{label}</td>
      {children}
    </tr>
  );
}

function Cell({ children, highlight, color }: { children: React.ReactNode; highlight?: boolean; color?: string }) {
  return (
    <td
      className={cn('px-4 py-2.5 text-sm', highlight ? 'font-semibold' : 'text-gray-900')}
      style={color ? { color } : undefined}
    >
      {children}
    </td>
  );
}

// ── 비교분석 가이드 (온보딩) ──

interface CompareGuideProps {
  histories: { id: string | number; items: CompareItem[]; createdAt: string }[];
  bookmarks: { id: string | number; name: string; items: CompareItem[]; createdAt: string }[];
  removeComparison: (id: string) => void;
  bookmarkComparison: (id: string) => void;
}

function CompareGuide({ histories, bookmarks, removeComparison, bookmarkComparison }: CompareGuideProps) {
  const router = useRouter();

  const handleOpen = (items: CompareItem[]) => {
    router.push(`/compare?items=${encodeURIComponent(JSON.stringify(items))}`);
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-estate-50">
          <GitCompareArrows className="h-8 w-8 text-estate-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">비교분석 가이드</h1>
        <p className="mt-2 text-sm text-gray-500">두 가지 방법으로 단지 비교분석을 시작할 수 있습니다</p>
      </div>

      {/* 가이드 1: Ctrl+클릭으로 비교 시작 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-estate-50">
            <MousePointerClick className="h-5 w-5 text-estate-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">
              <span className="mr-2 inline-flex items-center rounded-md bg-estate-100 px-2 py-0.5 text-xs font-semibold text-estate-700">GUIDE 1</span>
              Ctrl + 클릭으로 비교 대상 선택
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              검색 페이지에서 지도 마커 또는 목록 카드를 <kbd className="mx-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono font-semibold text-gray-700">Ctrl</kbd> + 클릭하면 비교 대상에 추가됩니다.
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-estate-600 text-[10px] font-bold text-white">1</span>
                  <span className="text-xs text-gray-600">검색 결과에서 첫 번째 단지 <kbd className="rounded border bg-white px-1 text-[10px] font-mono">Ctrl</kbd>+클릭</span>
                </div>
                <span className="hidden text-gray-300 sm:inline">→</span>
                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-estate-600 text-[10px] font-bold text-white">2</span>
                  <span className="text-xs text-gray-600">두 번째 단지도 <kbd className="rounded border bg-white px-1 text-[10px] font-mono">Ctrl</kbd>+클릭</span>
                </div>
                <span className="hidden text-gray-300 sm:inline">→</span>
                {/* Step 3 */}
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">3</span>
                  <span className="text-xs text-gray-600">하단 비교 바에서 <strong className="text-estate-700">비교 시작</strong> 클릭</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-lg bg-estate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-estate-800 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                검색 페이지로 이동
              </Link>
              <span className="text-[10px] text-gray-400">2~4개 단지를 선택할 수 있습니다</span>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 2: AI 인사이트 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">
              <span className="mr-2 inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">GUIDE 2</span>
              AI 인사이트로 종합 분석
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              비교 분석 페이지 우측 하단의 <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700"><Sparkles className="h-3 w-3" /> AI 분석</span> 버튼을 클릭하면
              AI가 수익률·실거주·미래가치 관점에서 종합 분석을 제공합니다.
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">1</span>
                  <span className="text-xs text-gray-600">비교 분석 페이지 진입</span>
                </div>
                <span className="hidden text-gray-300 sm:inline">→</span>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">2</span>
                  <span className="text-xs text-gray-600">우측 하단 <strong className="text-purple-700">AI 분석</strong> 버튼 클릭</span>
                </div>
                <span className="hidden text-gray-300 sm:inline">→</span>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">3</span>
                  <span className="text-xs text-gray-600">AI가 단지별 점수·장단점·추천 제공</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-gray-400">AI 분석은 실거래가, 단지 지표, 스코어링 데이터를 종합하여 수익률·실거주·자녀교육·미래가치 4개 영역으로 평가합니다.</p>
          </div>
        </div>
      </div>

      {/* 이전 비교 이력 (있는 경우) */}
      {(bookmarks.length > 0 || histories.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {bookmarks.length > 0 && (
            <div>
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Bookmark className="h-4 w-4" />
                  저장된 비교 ({bookmarks.length}/10)
                </h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {bookmarks.map((rec) => (
                  <li key={rec.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <button type="button" onClick={() => handleOpen(rec.items)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-gray-900">{rec.name}</p>
                      <p className="truncate text-xs text-gray-400">{rec.items.map((i) => i.name).join(', ')}</p>
                    </button>
                    <button type="button" onClick={() => removeComparison(String(rec.id))} className="shrink-0 rounded-full p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {histories.length > 0 && (
            <div className={bookmarks.length > 0 ? 'border-t border-gray-100' : ''}>
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <Clock className="h-4 w-4" />
                  최근 비교 이력 ({histories.length}/10)
                </h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {histories.map((rec) => (
                  <li key={rec.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <button type="button" onClick={() => handleOpen(rec.items)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm text-gray-900">{rec.items.map((i) => i.name).join(' vs ')}</p>
                      <p className="text-[10px] text-gray-400">{new Date(rec.createdAt).toLocaleDateString('ko-KR')}</p>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button type="button" onClick={() => bookmarkComparison(String(rec.id))} className="rounded-full p-1 text-gray-300 hover:text-amber-500" title="저장">
                        <Bookmark className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => removeComparison(String(rec.id))} className="rounded-full p-1 text-gray-300 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 가이드 단독 뷰 ──

function CompareGuideStandalone() {
  const { histories, bookmarks, removeComparison, bookmarkComparison } = useComparisons();
  return <CompareGuide histories={histories} bookmarks={bookmarks} removeComparison={removeComparison} bookmarkComparison={bookmarkComparison} />;
}

// ── 비교분석 이력 뷰 ──

function CompareHistoryView() {
  const router = useRouter();
  const {
    histories, bookmarks, bookmarkComparison, removeComparison, loading,
  } = useComparisons();

  const handleOpen = (items: CompareItem[]) => {
    router.push(`/compare?items=${encodeURIComponent(JSON.stringify(items))}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/search"
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="돌아가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-estate-900">비교분석 이력</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-estate-700 border-t-transparent" />
        </div>
      )}

      {!loading && (
        <>
          {/* 즐겨찾기 비교 */}
          {bookmarks.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Bookmark className="h-4 w-4" />
                  저장된 비교 ({bookmarks.length}/10)
                </h2>
              </div>
              <ul className="divide-y divide-gray-50">
                {bookmarks.map((rec) => (
                  <li key={rec.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleOpen(rec.items)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{rec.name}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {rec.items.map((i) => i.name).join(', ')}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-300">
                        {new Date(rec.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeComparison(rec.id)}
                      className="shrink-0 rounded-full p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 최근 이력 */}
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Clock className="h-4 w-4" />
                최근 비교 이력 ({histories.length}/10)
              </h2>
            </div>
            {histories.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <History className="mx-auto h-10 w-10 text-gray-200" />
                <p className="mt-3 text-sm text-gray-400">비교 이력이 없습니다</p>
                <p className="mt-1 text-xs text-gray-300">검색 결과에서 단지를 비교하면 이력이 저장됩니다</p>
                <Link
                  href="/search"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-estate-600 hover:underline"
                >
                  검색하러 가기
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {histories.map((rec) => (
                  <li key={rec.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleOpen(rec.items)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm text-gray-900">
                        {rec.items.map((i) => i.name).join(' vs ')}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {new Date(rec.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => bookmarkComparison(rec.id)}
                        className="rounded-full p-1.5 text-gray-300 hover:text-amber-500"
                        title="즐겨찾기로 저장"
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeComparison(rec.id)}
                        className="rounded-full p-1.5 text-gray-300 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── 메인 비교 콘텐츠 ──

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialItems = useMemo(() => parseItems(searchParams), [searchParams]);

  const [items, setItems] = useState<CompareItem[]>(initialItems);
  const [complexes, setComplexes] = useState<CompareComplexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFavPanel, setShowFavPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const [bookmarkMsg, setBookmarkMsg] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const { favorites } = useFavorites();
  const {
    histories, bookmarks, saveHistory, saveBookmark, bookmarkComparison, removeComparison,
  } = useComparisons();
  const historySavedRef = useRef(false);

  // URL 파라미터가 변경되면 items 동기화
  useEffect(() => {
    const parsed = parseItems(searchParams);
    if (parsed.length >= 2) setItems(parsed);
  }, [searchParams]);

  // URL 업데이트 (items 변경 시)
  const updateUrl = useCallback((newItems: CompareItem[]) => {
    const params = new URLSearchParams({ items: JSON.stringify(newItems) });
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }, [router]);

  // 단지 제거
  const handleRemove = useCallback((name: string) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.name !== name);
      if (next.length >= 2) {
        updateUrl(next);
      }
      return next;
    });
    setComplexes((prev) => prev.filter((c) => c.item.name !== name));
  }, [updateUrl]);

  // 즐겨찾기에서 단지 추가
  const handleAddFromFavorite = useCallback((fav: { aptName: string; dong: string; lawdCd: string }) => {
    const newItem: CompareItem = { name: fav.aptName, dong: fav.dong, lawdCd: fav.lawdCd };
    setItems((prev) => {
      if (prev.some((it) => it.name === newItem.name && it.dong === newItem.dong)) return prev;
      const next = [...prev, newItem];
      updateUrl(next);
      return next;
    });
    // 새 단지 데이터 fetch
    Promise.all([fetchComplexTrades(newItem), fetchComplexInfo(newItem)])
      .then(([trades, info]) => {
        setComplexes((prev) => {
          if (prev.some((c) => c.item.name === newItem.name)) return prev;
          return [...prev, { item: newItem, trades, info }];
        });
      });
    setShowFavPanel(false);
  }, [updateUrl]);

  // 비교 목록에 없는 즐겨찾기만 표시
  const availableFavorites = useMemo(() => {
    return favorites.filter((fav) => !items.some((it) => it.name === fav.aptName && it.dong === fav.dong));
  }, [favorites, items]);

  const needsGuide = items.length < 2;

  useEffect(() => {
    if (needsGuide) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all(
      items.map(async (item) => {
        const [trades, info] = await Promise.all([
          fetchComplexTrades(item),
          fetchComplexInfo(item),
        ]);
        return { item, trades, info };
      }),
    )
      .then(setComplexes)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [items]);

  // 데이터 로드 완료 시 히스토리 자동 저장
  useEffect(() => {
    if (complexes.length >= 2 && !loading && !historySavedRef.current) {
      historySavedRef.current = true;
      saveHistory(complexes.map((c) => c.item));
    }
  }, [complexes, loading, saveHistory]);

  // items 변경 시 히스토리 저장 플래그 리셋
  useEffect(() => {
    historySavedRef.current = false;
  }, [items]);

  const handleBookmarkSave = useCallback(async () => {
    const name = bookmarkName.trim() ||
      items.slice(0, 3).map((i) => i.name).join(' vs ') + (items.length > 3 ? ` 외 ${items.length - 3}` : '');
    const result = await saveBookmark(items, name);
    if (result.success) {
      setBookmarkMsg('즐겨찾기에 저장되었습니다');
      setShowBookmarkInput(false);
      setBookmarkName('');
    } else {
      setBookmarkMsg(result.error ?? '저장 실패');
    }
    setTimeout(() => setBookmarkMsg(null), 2000);
  }, [bookmarkName, items, saveBookmark]);

  // Hooks는 조건부 return 전에 선언해야 함 (Rules of Hooks)
  const chartComplexes = useMemo(
    () => complexes.map((c, i) => ({
      name: c.item.name,
      trades: c.trades,
      color: COLORS[i % COLORS.length],
    })),
    [complexes],
  );

  const commuteComplexes = useMemo(
    () => complexes.map((c) => ({
      name: c.item.name,
      dong: c.item.dong,
      lawdCd: c.item.lawdCd,
    })),
    [complexes],
  );

  const aiInsightComplexes = useMemo(
    () => complexes.map((c) => ({
      name: c.item.name,
      dong: c.item.dong,
      lawdCd: c.item.lawdCd,
      info: c.info,
      trades: c.trades,
    })),
    [complexes],
  );

  const allSchoolTypes = useMemo(
    () => Array.from(
      new Set(complexes.flatMap((c) => parseEducation(c.info?.educationFacility).map((s) => s.type))),
    ),
    [complexes],
  );

  if (needsGuide) {
    return <CompareGuide histories={histories} bookmarks={bookmarks} removeComparison={removeComparison} bookmarkComparison={bookmarkComparison} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Link href="/search" className="mt-4 inline-flex items-center gap-1 text-sm text-estate-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (loading || complexes.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-estate-700 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">단지 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-estate-900">단지 비교 ({complexes.length}개)</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* 즐겨찾기 저장 */}
          <div className="relative">
            {showBookmarkInput ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  placeholder={items.slice(0, 2).map((i) => i.name).join(' vs ')}
                  className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-estate-500 focus:outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBookmarkSave(); }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleBookmarkSave}
                  className="rounded-lg bg-estate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-estate-800"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBookmarkInput(false); setBookmarkName(''); }}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowBookmarkInput(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                title="이 비교를 즐겨찾기에 저장"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">저장</span>
              </button>
            )}
            {bookmarkMsg && (
              <div className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-md">
                {bookmarkMsg}
              </div>
            )}
          </div>

          {/* 히스토리 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowHistoryPanel((v) => !v); setShowFavPanel(false); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                showHistoryPanel
                  ? 'border-estate-300 bg-estate-50 text-estate-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">이력</span>
              {(histories.length + bookmarks.length) > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-500">
                  {histories.length + bookmarks.length}
                </span>
              )}
            </button>
            {showHistoryPanel && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowHistoryPanel(false)} />
                <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                  {/* 즐겨찾기 비교 */}
                  {bookmarks.length > 0 && (
                    <div>
                      <div className="border-b border-gray-100 px-4 py-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                          <Bookmark className="h-3.5 w-3.5" /> 저장된 비교 ({bookmarks.length}/10)
                        </p>
                      </div>
                      <ul className="max-h-40 overflow-y-auto py-1">
                        {bookmarks.map((rec) => (
                          <li key={rec.id} className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                            <Link
                              href={`/compare?items=${encodeURIComponent(JSON.stringify(rec.items))}`}
                              className="min-w-0 flex-1"
                              onClick={() => setShowHistoryPanel(false)}
                            >
                              <p className="truncate text-sm font-medium text-gray-900">{rec.name}</p>
                              <p className="text-[10px] text-gray-400">{rec.items.map((i) => i.name).join(', ')}</p>
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeComparison(rec.id)}
                              className="shrink-0 rounded-full p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 히스토리 */}
                  <div>
                    <div className={cn('border-b border-gray-100 px-4 py-2.5', bookmarks.length > 0 && 'border-t')}>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Clock className="h-3.5 w-3.5" /> 최근 비교 이력 ({histories.length}/10)
                      </p>
                    </div>
                    {histories.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-gray-400">비교 이력이 없습니다</p>
                    ) : (
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {histories.map((rec) => (
                          <li key={rec.id} className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                            <Link
                              href={`/compare?items=${encodeURIComponent(JSON.stringify(rec.items))}`}
                              className="min-w-0 flex-1"
                              onClick={() => setShowHistoryPanel(false)}
                            >
                              <p className="truncate text-sm text-gray-900">{rec.items.map((i) => i.name).join(' vs ')}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(rec.createdAt).toLocaleDateString('ko-KR')}
                              </p>
                            </Link>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => bookmarkComparison(rec.id)}
                                className="rounded-full p-1 text-gray-300 hover:text-amber-500"
                                title="즐겨찾기로 저장"
                              >
                                <Bookmark className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeComparison(rec.id)}
                                className="rounded-full p-1 text-gray-300 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 관심단지에서 추가 */}
          <div className="relative">
          <button
            type="button"
            onClick={() => { setShowFavPanel((v) => !v); setShowHistoryPanel(false); }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              showFavPanel
                ? 'border-estate-300 bg-estate-50 text-estate-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">관심단지에서 추가</span>
          </button>
          {showFavPanel && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowFavPanel(false)} />
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-700">나의관심단지</p>
                </div>
                {availableFavorites.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    {favorites.length === 0
                      ? '관심단지가 없습니다'
                      : '추가할 수 있는 단지가 없습니다'}
                  </div>
                ) : (
                  <ul className="max-h-60 overflow-y-auto py-1">
                    {availableFavorites.map((fav) => (
                      <li key={`${fav.aptName}-${fav.dong}`}>
                        <button
                          type="button"
                          onClick={() => handleAddFromFavorite(fav)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{fav.aptName}</p>
                            {fav.dong && <p className="truncate text-xs text-gray-500">{fav.dong}</p>}
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">
                            {fav.latestPrice ? formatPrice(fav.latestPrice) : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* 실거래가 차트 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">실거래가 추이</h2>
        <CompareChart complexes={chartComplexes} />
      </div>

      {/* 3대 업무지구 접근성 비교 */}
      <CommuteCompare complexes={commuteComplexes} colors={COLORS} />

      {/* 종합 비교 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          {/* 단지명 헤더 */}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500">항목</th>
              {complexes.map((c, i) => (
                <th key={c.item.name} className="px-4 py-3 text-left" style={{ minWidth: 180 }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                      {c.item.name}
                    </span>
                    {complexes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemove(c.item.name)}
                        className="ml-auto rounded-full p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label={`${c.item.name} 제거`}
                        title="비교에서 제거"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── 단지특성 ── */}
            <CompareRow label="단지특성">
              {complexes.map((c) => (
                <td key={c.item.name} className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {getStationTagLabel(c.info?.subwayLine, c.info?.subwayTime) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        <Train className="h-2.5 w-2.5" />
                        {getStationTagLabel(c.info?.subwayLine, c.info?.subwayTime)}
                      </span>
                    )}
                    {c.info?.heatingType && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {c.info.heatingType}
                      </span>
                    )}
                    {c.info?.hallType && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {c.info.hallType}
                      </span>
                    )}
                    {c.info?.households && c.info.households >= 1000 && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        대단지
                      </span>
                    )}
                    {c.info?.parkingTotal && c.info?.households && (c.info.parkingTotal / c.info.households) >= 1.5 && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                        주차여유
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </CompareRow>

            {/* ── 기본 정보 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                기본 정보
              </td>
            </tr>
            <CompareRow label="주소">
              {complexes.map((c) => (
                <Cell key={c.item.name}>{c.info?.roadAddress ?? c.info?.address ?? '-'}</Cell>
              ))}
            </CompareRow>
            <CompareRow label="법정동">
              {complexes.map((c) => <Cell key={c.item.name}>{c.item.dong || '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="유형">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.aptType || '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="건축년도">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.buildYear ? `${c.info.buildYear}년` : c.trades[0]?.buildYear ? `${c.trades[0].buildYear}년` : '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="세대수">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.households ? `${c.info.households.toLocaleString()}세대` : '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="동수 / 최고층">
              {complexes.map((c) => {
                const parts: string[] = [];
                if (c.info?.buildingCount) parts.push(`${c.info.buildingCount}동`);
                if (c.info?.topFloor) parts.push(`최고 ${c.info.topFloor}층`);
                return <Cell key={c.item.name}>{parts.length > 0 ? parts.join(' / ') : '-'}</Cell>;
              })}
            </CompareRow>
            <CompareRow label="복도유형">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.hallType || '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="난방">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.heatingType || '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="관리방식">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.managementType || '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="시공사">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.constructor || '-'}</Cell>)}
            </CompareRow>

            {/* ── 건물 지표 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                건물 지표
              </td>
            </tr>
            <CompareRow label="용적률">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.vlRat != null ? `${c.info.vlRat.toFixed(1)}%` : '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="건폐율">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.bcRat != null ? `${c.info.bcRat.toFixed(1)}%` : '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="에너지등급">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.engrGrade || '-'}</Cell>)}
            </CompareRow>

            {/* ── 단지 평가 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                단지 평가
              </td>
            </tr>
            <CompareRow label="재건축 가능성">
              {complexes.map((c) => (
                <Cell key={c.item.name} highlight={c.info?.rebuildScore != null && c.info.rebuildScore >= 70}>
                  {c.info?.rebuildScore != null ? `${c.info.rebuildScore}점` : '-'}
                  {c.info?.rebuildEligible && <span className="ml-1 text-[10px] text-amber-600">재건축요건</span>}
                </Cell>
              ))}
            </CompareRow>
            <CompareRow label="주거 쾌적성">
              {complexes.map((c) => (
                <Cell key={c.item.name} highlight={c.info?.livabilityScore != null && c.info.livabilityScore >= 70}>
                  {c.info?.livabilityScore != null ? `${c.info.livabilityScore}점` : '-'}
                </Cell>
              ))}
            </CompareRow>
            <CompareRow label="미래가치">
              {complexes.map((c) => (
                <Cell key={c.item.name} highlight={c.info?.futureValueScore != null && c.info.futureValueScore >= 70}>
                  {c.info?.futureValueScore != null ? `${c.info.futureValueScore}점` : '-'}
                </Cell>
              ))}
            </CompareRow>

            {/* ── 거래 정보 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                거래 정보
              </td>
            </tr>
            <CompareRow label="최근 거래가">
              {complexes.map((c, i) => {
                const latest = c.trades[0];
                return (
                  <Cell key={c.item.name} highlight color={COLORS[i % COLORS.length]}>
                    {latest ? formatPrice(latest.dealAmount) : '-'}
                  </Cell>
                );
              })}
            </CompareRow>
            <CompareRow label="최근 거래일">
              {complexes.map((c) => <Cell key={c.item.name}>{c.trades[0]?.dealDate ?? '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="거래건수">
              {complexes.map((c) => <Cell key={c.item.name}>{c.trades.length}건</Cell>)}
            </CompareRow>
            <CompareRow label="최고가">
              {complexes.map((c) => {
                if (c.trades.length === 0) return <Cell key={c.item.name}>-</Cell>;
                const max = Math.max(...c.trades.map((t) => t.dealAmount));
                return <Cell key={c.item.name} highlight>{formatPrice(max)}</Cell>;
              })}
            </CompareRow>
            <CompareRow label="최저가">
              {complexes.map((c) => {
                if (c.trades.length === 0) return <Cell key={c.item.name}>-</Cell>;
                const min = Math.min(...c.trades.map((t) => t.dealAmount));
                return <Cell key={c.item.name}>{formatPrice(min)}</Cell>;
              })}
            </CompareRow>

            {/* ── 주차 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                주차
              </td>
            </tr>
            <CompareRow label="총 주차">
              {complexes.map((c) => {
                const total = c.info?.parkingTotal;
                const ratio = total && c.info?.households ? (total / c.info.households).toFixed(2) : null;
                return (
                  <Cell key={c.item.name}>
                    {total ? `${total.toLocaleString()}대${ratio ? ` (세대당 ${ratio}대)` : ''}` : '-'}
                  </Cell>
                );
              })}
            </CompareRow>
            <CompareRow label="지하주차">
              {complexes.map((c) => (
                <Cell key={c.item.name}>
                  {c.info?.parkingUnderground ? `${c.info.parkingUnderground.toLocaleString()}대` : '-'}
                </Cell>
              ))}
            </CompareRow>

            {/* ── 시설 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                시설
              </td>
            </tr>
            <CompareRow label="승강기">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.elevatorCount ? `${c.info.elevatorCount}대` : '-'}</Cell>)}
            </CompareRow>
            <CompareRow label="CCTV">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.cctvCount ? `${c.info.cctvCount}대` : '-'}</Cell>)}
            </CompareRow>

            {/* ── 교통 ── */}
            <tr className="bg-gray-50/50">
              <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                교통
              </td>
            </tr>
            <CompareRow label="지하철">
              {complexes.map((c) => (
                <td key={c.item.name} className="px-4 py-2.5">
                  {c.info?.subwayLine ? (
                    <div className="flex flex-wrap gap-1">
                      {c.info.subwayLine.split(',').map((line) => line.trim()).filter(Boolean).map((line) => (
                        <span
                          key={line}
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: LINE_COLORS[line] ?? '#888' }}
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              ))}
            </CompareRow>
            <CompareRow label="도보시간">
              {complexes.map((c) => <Cell key={c.item.name}>{c.info?.subwayTime || '-'}</Cell>)}
            </CompareRow>

            {/* ── 교육시설 ── */}
            {allSchoolTypes.length > 0 && (
              <>
                <tr className="bg-gray-50/50">
                  <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                    교육시설
                  </td>
                </tr>
                {allSchoolTypes.map((schoolType) => (
                  <CompareRow key={schoolType} label={schoolType}>
                    {complexes.map((c) => {
                      const schools = parseEducation(c.info?.educationFacility);
                      const found = schools.find((s) => s.type === schoolType);
                      return (
                        <td key={c.item.name} className="px-4 py-2.5">
                          {found ? (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-900">
                              <GraduationCap className="h-3.5 w-3.5 text-estate-500" />
                              {found.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </CompareRow>
                ))}
              </>
            )}

            {/* ── 편의시설 ── */}
            {complexes.some((c) => c.info?.convenientFacility) && (
              <>
                <tr className="bg-gray-50/50">
                  <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                    편의시설
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2.5" />
                  {complexes.map((c) => (
                    <td key={c.item.name} className="px-4 py-2.5">
                      {c.info?.convenientFacility ? (
                        <div className="flex flex-wrap gap-1">
                          {parseConvenient(c.info.convenientFacility).map((item) => (
                            <span key={item} className="inline-flex items-center gap-0.5 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                              <ShoppingBag className="h-2.5 w-2.5 text-gray-400" />
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </>
            )}

            {/* ── 복리시설 ── */}
            {complexes.some((c) => c.info?.welfareFacility) && (
              <>
                <tr className="bg-gray-50/50">
                  <td colSpan={complexes.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600">
                    복리시설
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2.5" />
                  {complexes.map((c) => (
                    <td key={c.item.name} className="px-4 py-2.5">
                      {c.info?.welfareFacility ? (
                        <div className="flex flex-wrap gap-1">
                          {c.info.welfareFacility.split(',').map((s) => s.trim()).filter(Boolean).map((item) => (
                            <span key={item} className="inline-flex items-center rounded-full bg-estate-50 px-2 py-0.5 text-[10px] text-estate-700">
                              <Shield className="mr-0.5 h-2.5 w-2.5" />
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* AI Insight 플로팅 버튼 + 패널 */}
      <AiInsightFab onClick={() => setAiPanelOpen(true)} />
      <AiInsightPanel
        complexes={aiInsightComplexes}
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />
    </div>
  );
}

function CompareRouter() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const items = parseItems(searchParams);

  // tab=guide이거나 파라미터 없이 진입 시 가이드 뷰
  if (tab === 'guide' || (!tab && items.length < 2)) {
    return <CompareGuideStandalone />;
  }

  // tab=history이면 이력 뷰
  if (tab === 'history') {
    return <CompareHistoryView />;
  }

  return <CompareContent />;
}

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-estate-700 border-t-transparent" />
          </div>
        }
      >
        <CompareRouter />
      </Suspense>
    </main>
  );
}
