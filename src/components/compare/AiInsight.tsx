'use client';

import { useState, useCallback } from 'react';
import { Sparkles, X, Loader2, RefreshCw, Trophy, ThumbsUp, ThumbsDown, TrendingUp, Home, Users, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplexInfo } from '@/types/complex';
import type { ApartmentTrade } from '@/types/trade';

interface AiInsightProps {
  complexes: {
    name: string;
    dong: string;
    lawdCd: string;
    info: ComplexInfo | null;
    trades: ApartmentTrade[];
  }[];
}

// ── 구조화 응답 타입 ──

interface StructuredInsight {
  complexes: {
    name: string;
    scores: Record<string, number>;
    pros: string[];
    cons: string[];
    keywords: string[];
  }[];
  categories: {
    id: string;
    title: string;
    analysis: string;
    winner: string;
  }[];
  summary: string;
  recommendation: string;
  recommendationReason: string;
}

const CATEGORY_META: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  profit: { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
  living: { icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
  family: { icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  futureValue: { icon: Rocket, color: 'text-purple-600', bg: 'bg-purple-50' },
  potential: { icon: Rocket, color: 'text-purple-600', bg: 'bg-purple-50' }, // 하위호환
};

const SCORE_LABELS: Record<string, string> = {
  profit: '수익률',
  living: '실거주',
  family: '세대별',
  futureValue: '미래가치',
  potential: '발전성', // 하위호환
};

const COMPLEX_COLORS = ['#7c3aed', '#f59e0b', '#10b981', '#ef4444'];

// ── AI 아이콘 ──

function AiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#aiGrad)" fillOpacity="0.15" />
      <path d="M12 6v2m0 8v2m-6-6h2m8 0h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9V7m0 10v-2m-3-3H7m10 0h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.17 9.17L7.76 7.76m8.48 8.48l-1.41-1.41m0-5.66l1.41-1.41m-8.48 8.48l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <defs>
        <linearGradient id="aiGrad" x1="2" y1="2" x2="22" y2="22">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── FAB 버튼 ──

export function AiInsightFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-6 py-4 text-sm font-bold text-white transition-all hover:scale-110 active:scale-95 animate-ai-fab"
    >
      <Sparkles className="h-5 w-5 animate-pulse-slow" />
      <span>AI 인사이트 요청</span>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">✨</span>
    </button>
  );
}

// ── 점수 바 ──

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[11px] font-medium text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ── 종합 점수 도넛 ──

function ScoreDonut({ score, color, size = 56 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-1000 ease-out"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dy="0.35em" className="text-xs font-bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

// ── 구조화 인사이트 렌더링 ──

function StructuredView({ data }: { data: StructuredInsight }) {
  return (
    <div className="space-y-5">
      {/* 면책 */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-medium text-amber-800">
          본 AI 분석은 제공된 데이터를 기반으로 한 참고 의견이며, 투자 권유가 아닙니다.
          부동산 투자에 따른 손익은 전적으로 본인의 판단과 책임하에 이루어져야 합니다.
        </p>
      </div>

      {/* 추천 배너 */}
      {data.recommendation && (
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-medium text-white/80">AI 종합 추천</span>
          </div>
          <p className="text-lg font-bold">{data.recommendation}</p>
          <p className="mt-1 text-sm text-white/80">{data.recommendationReason}</p>
        </div>
      )}

      {/* 단지별 카드 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(data.complexes.length, 3)}, 1fr)` }}>
        {data.complexes.map((c, i) => {
          const color = COMPLEX_COLORS[i % COMPLEX_COLORS.length];
          const scoreValues = Object.values(c.scores).filter((v) => typeof v === 'number' && !Number.isNaN(v));
          const avg = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;
          const isRecommended = c.name === data.recommendation;
          return (
            <div
              key={c.name}
              className={cn(
                'rounded-xl border p-4 transition-all',
                isRecommended ? 'border-violet-300 bg-violet-50/50 ring-1 ring-violet-200' : 'border-gray-200 bg-white',
              )}
            >
              {/* 헤더 */}
              <div className="flex items-start gap-3">
                <ScoreDonut score={avg} color={color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-sm font-bold" style={{ color }}>{c.name}</h4>
                    {isRecommended && (
                      <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </div>
                  {/* 키워드 */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.keywords.map((kw) => (
                      <span key={kw} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 점수 바 */}
              <div className="mt-3 space-y-1.5">
                {Object.entries(c.scores).map(([key, score]) => (
                  <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} score={score} color={color} />
                ))}
              </div>

              {/* 장단점 */}
              <div className="mt-3 space-y-2">
                <div>
                  {c.pros.map((p, j) => (
                    <div key={j} className="flex items-start gap-1.5 py-0.5">
                      <ThumbsUp className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
                <div>
                  {c.cons.map((con, j) => (
                    <div key={j} className="flex items-start gap-1.5 py-0.5">
                      <ThumbsDown className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                      <span className="text-xs text-gray-500 leading-relaxed">{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 카테고리별 분석 */}
      <div className="grid grid-cols-2 gap-3">
        {data.categories.map((cat) => {
          const meta = CATEGORY_META[cat.id] ?? CATEGORY_META.profit;
          const Icon = meta.icon;
          return (
            <div key={cat.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', meta.bg)}>
                  <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                </div>
                <h5 className="text-sm font-semibold text-gray-900">{cat.title}</h5>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{cat.analysis}</p>
              {cat.winner && (
                <div className="mt-2 flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  <span className="text-[11px] font-semibold text-gray-700">{cat.winner}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 종합 의견 */}
      {data.summary && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <h5 className="text-sm font-semibold text-gray-800 mb-2">종합 의견</h5>
          <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* 면책 하단 */}
      <div className="rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          본 분석 결과는 AI가 생성한 참고자료로서, 실제 시장 상황과 다를 수 있습니다.
          투자 결정 시 공인중개사, 세무사 등 전문가의 조언을 별도로 구하시기 바랍니다.
        </p>
      </div>
    </div>
  );
}

// ── 마크다운 폴백 ──

function MarkdownFallback({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let buffer: string[] = [];
  let key = 0;

  function flush() {
    if (buffer.length === 0) return;
    const joined = buffer.join('\n').trim();
    if (joined) elements.push(<p key={key++} className="mb-3 leading-relaxed text-gray-700">{processBold(joined)}</p>);
    buffer = [];
  }

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) { flush(); elements.push(<h2 key={key++} className="mb-3 mt-6 text-lg font-bold text-gray-900 first:mt-0">{processBold(h1[1])}</h2>); }
    else if (h2) { flush(); elements.push(<h3 key={key++} className="mb-2 mt-5 text-base font-bold text-violet-800 first:mt-0">{processBold(h2[1])}</h3>); }
    else if (h3) { flush(); elements.push(<h4 key={key++} className="mb-2 mt-4 text-sm font-semibold text-gray-800 first:mt-0">{processBold(h3[1])}</h4>); }
    else if (line.match(/^[-*]\s/)) { flush(); elements.push(<div key={key++} className="mb-1.5 flex gap-2 pl-1"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /><span className="text-sm leading-relaxed text-gray-700">{processBold(line.replace(/^[-*]\s+/, ''))}</span></div>); }
    else if (line.match(/^---+$/)) { flush(); elements.push(<hr key={key++} className="my-4 border-gray-200" />); }
    else if (line.trim() === '') flush();
    else buffer.push(line);
  }
  flush();
  return <>{elements}</>;
}

function processBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={i++} className="font-semibold text-gray-900">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── 메인 패널 ──

export function AiInsightPanel({ complexes, open, onClose }: AiInsightProps & { open: boolean; onClose: () => void }) {
  const [structured, setStructured] = useState<StructuredInsight | null>(null);
  const [fallbackContent, setFallbackContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResult = structured !== null || fallbackContent !== null;

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStructured(null);
    setFallbackContent(null);
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexes: complexes.map((c) => ({
            name: c.name, dong: c.dong, lawdCd: c.lawdCd,
            info: c.info, trades: c.trades.slice(0, 50),
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.structured) {
          setStructured(data.data.structured);
        } else {
          setFallbackContent(data.data.content);
        }
      } else {
        setError(data.error ?? 'AI 분석에 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [complexes]);

  // 패널 열릴 때 자동 요청
  const hasRequested = hasResult || loading || error !== null;
  if (open && !hasRequested) {
    fetchInsight();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] animate-slide-up">
        <div className="mx-auto max-w-4xl rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-2xl">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">AI 인사이트</h3>
                <p className="text-[11px] text-gray-500">
                  {complexes.map((c) => c.name).join(' vs ')} 비교 분석
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasResult && !loading && (
                <button type="button" onClick={fetchInsight} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-violet-600 transition-colors" title="다시 분석">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 본문 */}
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 73px)' }}>
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-violet-100" />
                  <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-violet-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-700">AI가 단지를 분석하고 있습니다...</p>
                <p className="mt-1 text-xs text-gray-400">수익률, 실거주, 세대별 관점, 발전가능성을 종합 분석 중</p>
                <div className="mt-6 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-red-50 p-3"><X className="h-6 w-6 text-red-400" /></div>
                <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
                <button type="button" onClick={fetchInsight} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors">다시 시도</button>
              </div>
            )}

            {structured && <StructuredView data={structured} />}

            {fallbackContent && (
              <>
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">
                    본 AI 분석은 제공된 데이터를 기반으로 한 참고 의견이며, 투자 권유가 아닙니다.
                    부동산 투자에 따른 손익은 전적으로 본인의 판단과 책임하에 이루어져야 합니다.
                  </p>
                </div>
                <article className="prose prose-sm prose-gray max-w-none">
                  <MarkdownFallback text={fallbackContent} />
                </article>
                <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    본 분석 결과는 AI가 생성한 참고자료로서, 실제 시장 상황과 다를 수 있습니다.
                    투자 결정 시 공인중개사, 세무사 등 전문가의 조언을 별도로 구하시기 바랍니다.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
