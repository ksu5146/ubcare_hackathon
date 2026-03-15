'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Calendar, Car, Flame, Home, Layers, Train, Shield,
  GraduationCap, ShoppingBag, Users, ArrowUpDown, Cctv, DoorOpen,
  BarChart3, Percent, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataBadge } from '@/components/ui/DataBadge';
import { BusinessDistrictCommute } from '@/components/transit/BusinessDistrictCommute';
import type { ComplexInfo } from '@/types/complex';
import type { ApiResponse } from '@/types/api';

interface ComplexInfoCardProps {
  kaptCode: string;
  aptName?: string;
  dong?: string;
  lawdCd?: string;
  className?: string;
  /** 단지 정보 로드 완료 시 좌표 전달 */
  onLocationLoaded?: (coords: { lat: number; lng: number }) => void;
}

interface InfoRow {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  tooltip?: string;
}

// ── 용어 설명 / 점수 산정 기준 ──
const TOOLTIPS: Record<string, string> = {
  용적률: '대지면적 대비 건물 전체 연면적의 비율. 낮을수록 여유 공간이 많고, 재건축 시 사업성이 높아집니다.',
  건폐율: '대지면적 대비 건축면적(건물이 차지하는 땅)의 비율. 낮을수록 동 간 간격이 넓어 쾌적합니다.',
  에너지등급: '건물의 에너지 효율 등급(1+++~7등급). 높은 등급일수록 냉난방비가 적게 듭니다.',
  재건축가능성: '산정 기준: 건물 연식(45%) + 용적률 여유(40%) + 건물 상태(15%). 30년 이상 노후 단지에서 용적률이 낮을수록 높은 점수를 받습니다.',
  주거쾌적성: '산정 기준: 주차비율(25%) + 지하주차 여부(15%) + 승강기(15%) + 에너지등급(15%) + CCTV(10%) + 역세권(20%). 생활 편의성과 안전을 종합 평가합니다.',
  미래가치: '산정 기준: 재건축 점수(40%) + 입지·교통(30%) + 학군(15%) + 세대 규모(15%). 장기 투자 관점의 가치 상승 잠재력을 평가합니다.',
  역세권: '도보 10분 이내 지하철역 접근 가능 여부. 노선 수에 따라 더블/트리플 역세권으로 분류됩니다.',
  복도유형: '계단식은 각 세대가 독립 출입구를 가져 프라이버시가 좋고, 복도식은 한쪽 복도로 연결된 구조입니다.',
};

function InfoTooltip({ term }: { term: string }) {
  const text = TOOLTIPS[term];
  if (!text) return null;

  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`${term} 설명`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="ml-1 rounded-full p-0.5 text-gray-400 hover:text-estate-600 hover:bg-gray-100 transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-56 rounded-lg border border-gray-200 bg-white p-2.5 text-xs leading-relaxed text-gray-600 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

// ── 지하철 노선 색상 매핑 ──
const LINE_COLORS: Record<string, string> = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '분당선': '#F5A200',
  '신분당선': '#D4003B',
  '경의중앙선': '#77C4A3',
  '경춘선': '#0C8E72',
  '공항철도': '#0090D2',
  '수인선': '#F5A200',
  '경강선': '#0054A6',
  '우이신설선': '#B7C452',
  '서해선': '#8BC53F',
  '김포골드라인': '#AD8605',
  '용인에버라인': '#509F22',
  '의정부경전철': '#FDA600',
  '인천1호선': '#7CA8D5',
  '인천2호선': '#ED8B00',
  '동해선': '#0054A6',
};

const WALKABLE_TIMES = ['5분이내', '5~10분이내'];

function getLineColor(line: string): string {
  return LINE_COLORS[line.trim()] ?? '#888888';
}

/** 도보 10분이내 노선 수 기반 역세권 등급 */
function getStationTag(subwayLine?: string, subwayTime?: string): { label: string; color: string } | null {
  if (!subwayLine || !subwayTime) return null;
  if (!WALKABLE_TIMES.includes(subwayTime)) return null;

  const lines = parseSubwayLines(subwayLine);
  if (lines.length === 0) return null;
  if (lines.length === 1) return { label: '역세권', color: 'bg-blue-50 text-blue-700' };
  if (lines.length === 2) return { label: '더블역세권', color: 'bg-indigo-50 text-indigo-700' };
  if (lines.length === 3) return { label: '트리플역세권', color: 'bg-purple-50 text-purple-700' };
  if (lines.length === 4) return { label: '쿼드러플역세권', color: 'bg-fuchsia-50 text-fuchsia-700' };
  return { label: '펜타역세권', color: 'bg-rose-50 text-rose-700' };
}

function parseSubwayLines(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function ComplexInfoCard({ kaptCode, aptName, dong, lawdCd, className, onLocationLoaded }: ComplexInfoCardProps) {
  const [info, setInfo] = useState<ComplexInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lookupId = kaptCode || aptName;
    if (!lookupId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (!kaptCode && lawdCd) params.set('lawdCd', lawdCd);
    const qs = params.toString();
    const url = `/api/complex/${encodeURIComponent(lookupId)}${qs ? `?${qs}` : ''}`;

    fetch(url)
      .then((res) => res.json() as Promise<ApiResponse<ComplexInfo>>)
      .then((data) => {
        if (data.success && data.data) {
          setInfo(data.data);
          if (data.data.lat != null && data.data.lng != null && onLocationLoaded) {
            onLocationLoaded({ lat: data.data.lat, lng: data.data.lng });
          }
        } else {
          setError(data.error ?? '단지 정보를 불러올 수 없습니다');
        }
      })
      .catch(() => setError('단지 정보를 불러올 수 없습니다'))
      .finally(() => setIsLoading(false));
  }, [kaptCode, aptName, lawdCd]);

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-white p-6 shadow-card', className)}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-gray-200 animate-skeleton" />
              <div className="h-4 w-16 rounded bg-gray-200 animate-skeleton" />
              <div className="h-4 w-24 rounded bg-gray-200 animate-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className={cn('rounded-xl border border-border bg-white p-6 shadow-card', className)}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>
        <p className="text-sm text-gray-500">{error ?? '정보 없음'}</p>
      </div>
    );
  }

  const iconClass = 'h-4 w-4 text-estate-500 shrink-0';
  const stationTag = getStationTag(info.subwayLine, info.subwayTime);
  const subwayLines = info.subwayLine ? parseSubwayLines(info.subwayLine) : [];

  const basicRows: InfoRow[] = [
    { icon: <Home className={iconClass} />, label: '주소', value: info.roadAddress ?? info.address },
    { icon: <Building2 className={iconClass} />, label: '유형', value: info.aptType || undefined },
    { icon: <Calendar className={iconClass} />, label: '건축년도', value: info.buildYear ? `${info.buildYear}년` : undefined },
    { icon: <Layers className={iconClass} />, label: '세대수', value: info.households ? `${info.households.toLocaleString()}세대` : undefined },
    { icon: <Building2 className={iconClass} />, label: '동수 / 최고층', value: formatBuildingInfo(info) },
    { icon: <DoorOpen className={iconClass} />, label: '복도유형', value: info.hallType || undefined, tooltip: '복도유형' as const },
    { icon: <Flame className={iconClass} />, label: '난방', value: info.heatingType },
    { icon: <Users className={iconClass} />, label: '관리방식', value: info.managementType || undefined },
  ];

  const schools = parseEducationFacility(info.educationFacility);

  const hasParking = !!info.parkingTotal;
  const hasFacilities = !!(info.elevatorCount || info.cctvCount);
  const hasSubway = subwayLines.length > 0;
  const hasConvenient = !!info.convenientFacility;
  const hasWelfare = !!info.welfareFacility;

  return (
    <div className={cn('rounded-xl border border-border bg-white p-6 shadow-card', className)}>
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{info.name}</h2>
          {info.constructor && (
            <p className="mt-0.5 text-xs text-gray-400">시공사: {info.constructor}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stationTag && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', stationTag.color)}>
              <Train className="h-3 w-3" />
              {stationTag.label}
            </span>
          )}
          {info.approvalDate && (
            <DataBadge yearMonth={info.approvalDate.substring(0, 7)} />
          )}
        </div>
      </div>

      {/* 상단: 기본정보 + 주차/시설 + 교통 — 3컬럼 그리드 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 기본 정보 */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">기본 정보</h3>
          <dl className="space-y-2">
            {basicRows.map(
              (row) =>
                row.value && (
                  <div key={row.label} className="flex items-center gap-2">
                    {row.icon}
                    <dt className="w-20 shrink-0 text-xs text-gray-500 flex items-center">{row.label}{row.tooltip && <InfoTooltip term={row.tooltip} />}</dt>
                    <dd className="text-sm font-medium text-gray-900">{row.value}</dd>
                  </div>
                ),
            )}
          </dl>
        </div>

        {/* 중앙: 주차 + 시설 */}
        <div>
          {hasParking && (
            <div className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">주차</h3>
              <dl className="space-y-2">
                <div className="flex items-center gap-2">
                  <Car className={iconClass} />
                  <dt className="w-20 shrink-0 text-xs text-gray-500">총 주차</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {info.parkingTotal!.toLocaleString()}대
                    {info.households ? ` (세대당 ${(info.parkingTotal! / info.households).toFixed(2)}대)` : ''}
                  </dd>
                </div>
                {info.parkingUnderground != null && info.parkingUnderground > 0 && (
                  <div className="flex items-center gap-2">
                    <Car className={iconClass} />
                    <dt className="w-20 shrink-0 text-xs text-gray-500">지하주차</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {info.parkingUnderground.toLocaleString()}대
                      {info.parkingGround != null ? ` (지상 ${info.parkingGround.toLocaleString()}대)` : ''}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {hasFacilities && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">시설</h3>
              <dl className="space-y-2">
                {info.elevatorCount != null && info.elevatorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className={iconClass} />
                    <dt className="w-20 shrink-0 text-xs text-gray-500">승강기</dt>
                    <dd className="text-sm font-medium text-gray-900">{info.elevatorCount}대</dd>
                  </div>
                )}
                {info.cctvCount != null && info.cctvCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Cctv className={iconClass} />
                    <dt className="w-20 shrink-0 text-xs text-gray-500">CCTV</dt>
                    <dd className="text-sm font-medium text-gray-900">{info.cctvCount}대</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* 우측: 교통 + 교육 */}
        <div>
          {hasSubway && (
            <div className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">교통</h3>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {subwayLines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: getLineColor(line) }}
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-white/40" />
                    {line}
                  </span>
                ))}
              </div>
              {info.subwayTime && (
                <p className="text-xs text-gray-500">도보 {info.subwayTime}</p>
              )}
            </div>
          )}
          {schools.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">교육시설</h3>
              <div className="space-y-1.5">
                {schools.map((s) => (
                  <div key={s.type} className="flex items-center gap-2">
                    <GraduationCap className={iconClass} />
                    <span className="w-16 shrink-0 text-xs text-gray-500">{s.type}</span>
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 건물 지표 + 평가 점수 */}
      {(info.vlRat != null || info.bcRat != null || info.rebuildScore != null || info.livabilityScore != null) && (
        <>
          <hr className="my-5 border-gray-100" />
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 건물 지표 */}
            {(info.vlRat != null || info.bcRat != null || info.engrGrade) && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">건물 지표</h3>
                <dl className="space-y-2">
                  {info.vlRat != null && (
                    <div className="flex items-center gap-2">
                      <Percent className={iconClass} />
                      <dt className="w-20 shrink-0 text-xs text-gray-500 flex items-center">용적률<InfoTooltip term="용적률" /></dt>
                      <dd className="text-sm font-medium text-gray-900">{info.vlRat.toFixed(1)}%</dd>
                    </div>
                  )}
                  {info.bcRat != null && (
                    <div className="flex items-center gap-2">
                      <Percent className={iconClass} />
                      <dt className="w-20 shrink-0 text-xs text-gray-500 flex items-center">건폐율<InfoTooltip term="건폐율" /></dt>
                      <dd className="text-sm font-medium text-gray-900">{info.bcRat.toFixed(1)}%</dd>
                    </div>
                  )}
                  {info.engrGrade && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className={iconClass} />
                      <dt className="w-20 shrink-0 text-xs text-gray-500 flex items-center">에너지등급<InfoTooltip term="에너지등급" /></dt>
                      <dd className="text-sm font-medium text-gray-900">{info.engrGrade}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* 평가 점수 */}
            {(info.rebuildScore != null || info.livabilityScore != null || info.futureValueScore != null) && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">단지 평가</h3>
                <div className="space-y-2.5">
                  {info.rebuildScore != null && (
                    <ScoreRow label="재건축 가능성" score={info.rebuildScore} eligible={info.rebuildEligible} tooltipTerm="재건축가능성" />
                  )}
                  {info.livabilityScore != null && (
                    <ScoreRow label="주거 쾌적성" score={info.livabilityScore} tooltipTerm="주거쾌적성" />
                  )}
                  {info.futureValueScore != null && (
                    <ScoreRow label="미래가치" score={info.futureValueScore} tooltipTerm="미래가치" />
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 하단: 편의시설 + 복리시설 — 전체 폭 태그 영역 */}
      {(hasConvenient || hasWelfare) && (
        <>
          <hr className="my-5 border-gray-100" />
          <div className="grid gap-6 lg:grid-cols-2">
            {hasConvenient && (
              <div>
                <h3 className="mb-2.5 text-sm font-semibold text-gray-700">편의시설</h3>
                <div className="flex flex-wrap gap-1.5">
                  {parseConvenientFacility(info.convenientFacility!).map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600"
                    >
                      <ShoppingBag className="h-3 w-3 text-gray-400" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hasWelfare && (
              <div>
                <h3 className="mb-2.5 text-sm font-semibold text-gray-700">복리시설</h3>
                <div className="flex flex-wrap gap-1.5">
                  {info.welfareFacility!.split(',').map((item) => item.trim()).filter(Boolean).map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-full bg-estate-50 px-2.5 py-1 text-xs text-estate-700"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3대 업무지구 접근성 */}
      {aptName && dong && lawdCd && (
        <>
          <hr className="my-5 border-gray-100" />
          <BusinessDistrictCommute aptName={aptName} dong={dong} lawdCd={lawdCd} lat={info.lat} lng={info.lng} />
        </>
      )}
    </div>
  );
}

function formatBuildingInfo(info: ComplexInfo): string | undefined {
  const parts: string[] = [];
  if (info.buildingCount) parts.push(`${info.buildingCount}동`);
  if (info.topFloor) parts.push(`최고 ${info.topFloor}층`);
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

/** "초등학교(역삼초) 중학교(진선여중) 고등학교(진선여고)" → [{type, name}] */
function parseEducationFacility(raw?: string): { type: string; name: string }[] {
  if (!raw) return [];
  const results: { type: string; name: string }[] = [];
  const pattern = /(초등학교|중학교|고등학교)\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    if (match[2]) {
      results.push({ type: match[1], name: match[2] });
    }
  }
  return results;
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#16a34a'; // green
  if (score >= 40) return '#d97706'; // amber
  return '#dc2626'; // red
}

function ScoreRow({ label, score, eligible, tooltipTerm }: { label: string; score: number; eligible?: boolean; tooltipTerm?: string }) {
  const color = getScoreColor(score);
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-24 shrink-0 text-xs text-gray-500 flex items-center">{label}{tooltipTerm && <InfoTooltip term={tooltipTerm} />}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
      {eligible && (
        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">재건축요건</span>
      )}
    </div>
  );
}

/** "관공서(강남세무서) 병원(새롬치과) 공원(역삼까치공원)" → ["관공서: 강남세무서", ...] */
function parseConvenientFacility(raw: string): string[] {
  const results: string[] = [];
  const pattern = /([^\s(]+)\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    if (match[2]) {
      results.push(`${match[1]}: ${match[2]}`);
    } else {
      results.push(match[1]);
    }
  }
  return results;
}
