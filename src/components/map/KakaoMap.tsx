'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatPriceShort } from '@/lib/format';
import { getRegionName } from '@/lib/region';
import type { ComplexTradeGroup } from '@/types/trade';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  results: ComplexTradeGroup[];
  highlightedApt: string | null;
  onHover: (aptName: string | null) => void;
  onSelect: (aptName: string) => void;
  isFavorite?: (aptName: string, dong: string) => boolean;
  onToggleFavorite?: (complex: ComplexTradeGroup) => void;
  selectedApts?: Set<string>;
  onCtrlSelect?: (aptName: string) => void;
  className?: string;
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 7;

const COLOR_DEFAULT = '#1e3a5f';
const COLOR_FAVORITE = '#c62828';
const COLOR_HIGHLIGHT = '#e65100';
const COLOR_SELECTED = '#2e7d32';

// 클라이언트 메모리 캐시 (페이지 내 재사용)
const coordsCache = new Map<string, { lat: number; lng: number }>();

function createMarkerEl(name: string, price: number, totalUnit: number | null, favorite: boolean): HTMLDivElement {
  const bg = favorite ? COLOR_FAVORITE : COLOR_DEFAULT;
  // 외부 래퍼: overflow visible로 하트 버튼이 잘리지 않도록 함
  const el = document.createElement('div');
  el.style.cssText = `
    position:relative;
    user-select:none;
    will-change:transform;
  `;
  el.dataset.favorite = favorite ? '1' : '0';
  const truncName = name.length > 12 ? name.slice(0, 12) + '…' : name;
  const unitStr = totalUnit != null ? ` · ${totalUnit.toLocaleString()}세대` : '';
  const heartFill = favorite ? '#fff' : 'none';
  const heartStroke = '#fff';
  el.innerHTML = `
    <div data-marker-body style="
      cursor:pointer;
      padding:5px 10px;
      background:${bg};
      color:#fff;
      border-radius:20px;
      font-size:11px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      border:2px solid rgba(255,255,255,0.9);
      text-align:center;
      line-height:1.4;
    ">
      <span style="font-size:12px">${formatPriceShort(price)}</span><br/>
      <span style="font-size:10px;opacity:0.85">${truncName}${unitStr}</span>
    </div>
    <button data-fav-btn="1" style="
      position:absolute; top:-10px; right:-10px;
      width:28px; height:28px;
      border-radius:50%; border:2px solid #fff;
      background:${favorite ? '#e53935' : 'rgba(30,58,95,0.7)'};
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; padding:0;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      transition:transform 0.15s ease, background 0.15s ease;
      z-index:2;
    " title="${favorite ? '관심단지 해제' : '관심단지 추가'}">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  `;
  return el;
}

function updateMarkerFavorite(el: HTMLDivElement, favorite: boolean) {
  el.dataset.favorite = favorite ? '1' : '0';
  const body = el.querySelector('[data-marker-body]') as HTMLElement | null;
  if (body) {
    body.style.background = favorite ? COLOR_FAVORITE : COLOR_DEFAULT;
  }
  const btn = el.querySelector('[data-fav-btn]') as HTMLElement | null;
  if (btn) {
    btn.style.background = favorite ? '#e53935' : 'rgba(30,58,95,0.7)';
    btn.title = favorite ? '관심단지 해제' : '관심단지 추가';
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', favorite ? '#fff' : 'none');
  }
}

function setMarkerStyle(el: HTMLDivElement, state: 'default' | 'highlight' | 'selected') {
  const isFav = el.dataset.favorite === '1';
  const body = el.querySelector('[data-marker-body]') as HTMLElement | null;
  if (!body) return;
  switch (state) {
    case 'highlight':
      body.style.background = COLOR_HIGHLIGHT;
      el.style.transform = 'scale(1.15)';
      el.style.zIndex = '10';
      body.style.border = '2px solid rgba(255,255,255,0.9)';
      break;
    case 'selected':
      body.style.background = COLOR_SELECTED;
      el.style.transform = 'scale(1.1)';
      el.style.zIndex = '9';
      body.style.border = '2px solid #a5d6a7';
      break;
    default:
      body.style.background = isFav ? COLOR_FAVORITE : COLOR_DEFAULT;
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
      body.style.border = '2px solid rgba(255,255,255,0.9)';
      break;
  }
}

function buildAddress(complex: ComplexTradeGroup): string {
  if (complex.roadAddr) return complex.roadAddr;
  const regionName = complex.lawdCd ? getRegionName(complex.lawdCd) : '';
  const prefix = regionName ? `${regionName} ` : '';
  return `${prefix}${complex.dong} ${complex.aptName}`;
}

export function KakaoMap({
  results,
  highlightedApt,
  onHover,
  onSelect,
  isFavorite,
  onToggleFavorite,
  selectedApts,
  onCtrlSelect,
  className,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<Map<string, { overlay: any; el: HTMLDivElement }>>(new Map());
  const sdkLoaded = useRef(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  const onCtrlSelectRef = useRef(onCtrlSelect);
  const isFavoriteRef = useRef(isFavorite);
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onCtrlSelectRef.current = onCtrlSelect; }, [onCtrlSelect]);
  useEffect(() => { isFavoriteRef.current = isFavorite; }, [isFavorite]);
  useEffect(() => { onToggleFavoriteRef.current = onToggleFavorite; }, [onToggleFavorite]);

  // SDK 로드
  useEffect(() => {
    if (sdkLoaded.current || typeof window === 'undefined') return;

    const doInit = () => {
      sdkLoaded.current = true;
      if (!containerRef.current || !window.kakao?.maps) return;
      const { kakao } = window;
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: DEFAULT_ZOOM,
      });
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      mapRef.current = map;
      setMapReady(true);
    };

    if (window.kakao?.maps?.services) { doInit(); return; }
    if (window.kakao?.maps) { window.kakao.maps.load(doInit); return; }

    if (!KAKAO_APP_KEY) {
      setSdkError('NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다');
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="dapi.kakao.com"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.kakao?.maps) { clearInterval(check); window.kakao.maps.load(doInit); }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) { setSdkError('카카오맵 SDK 로드 실패'); return; }
      window.kakao.maps.load(doInit);
    };
    script.onerror = () => {
      setSdkError('카카오맵 SDK 로드 실패. 앱 키와 도메인을 확인해주세요.');
    };
    document.head.appendChild(script);
  }, []);

  const resultsKeyRef = useRef('');

  // ── 마커 업데이트 ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const { kakao } = window;
    const map = mapRef.current;

    const currentKey = results.map((r) => r.aptName).sort().join('|');
    const prevKey = resultsKeyRef.current;

    if (currentKey === prevKey && overlaysRef.current.size > 0) return;
    resultsKeyRef.current = currentKey;

    // 기존 오버레이 중 새 results에 없는 것만 제거
    const newNames = new Set(results.map((r) => r.aptName));
    overlaysRef.current.forEach(({ overlay }, name) => {
      if (!newNames.has(name)) {
        overlay.setMap(null);
        overlaysRef.current.delete(name);
      }
    });

    if (results.length === 0) return;

    const toAdd = results.filter((r) => !overlaysRef.current.has(r.aptName));
    if (toAdd.length === 0) {
      fitBounds(kakao, map);
      return;
    }

    let cancelled = false;

    async function processNew() {
      // 1단계: DB에서 이미 좌표가 있는 단지 즉시 배치
      const needGeocode: ComplexTradeGroup[] = [];

      for (const complex of toAdd) {
        if (cancelled) return;
        const cacheKey = `${complex.lawdCd}:${complex.aptName}`;

        // API 응답에 포함된 좌표 또는 클라이언트 캐시
        const cached = coordsCache.get(cacheKey);
        const coords = complex.lat && complex.lng
          ? { lat: complex.lat, lng: complex.lng }
          : cached ?? null;

        if (coords) {
          addOverlay(kakao, map, complex, coords);
        } else {
          needGeocode.push(complex);
        }
      }

      if (needGeocode.length === 0) {
        if (!cancelled) fitBounds(kakao, map);
        return;
      }

      // 2단계: 서버 배치 지오코딩 API 호출
      const addresses = needGeocode.map((c) => ({
        key: `${c.lawdCd}:${c.aptName}`,
        address: buildAddress(c),
      }));

      try {
        const res = await fetch('/api/location/geocode-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });

        if (!res.ok) throw new Error('geocode-batch failed');

        const data = await res.json();
        if (data.success && data.data) {
          for (const complex of needGeocode) {
            if (cancelled) return;
            const key = `${complex.lawdCd}:${complex.aptName}`;
            const coords = data.data[key];
            if (coords) {
              coordsCache.set(key, coords);
              addOverlay(kakao, map, complex, coords);
            }
          }
        }
      } catch (err) {
        console.warn('[KakaoMap] 배치 지오코딩 실패:', err);
      }

      if (!cancelled) fitBounds(kakao, map);
    }

    function addOverlay(
      kakao: any,
      map: any,
      complex: ComplexTradeGroup,
      coords: { lat: number; lng: number },
    ) {
      if (overlaysRef.current.has(complex.aptName)) return;
      const latlng = new kakao.maps.LatLng(coords.lat, coords.lng);
      const fav = isFavoriteRef.current?.(complex.aptName, complex.dong) ?? false;
      const el = createMarkerEl(complex.aptName, complex.latestPrice, complex.totalUnit, fav);

      el.addEventListener('mouseenter', () => onHoverRef.current(complex.aptName));
      el.addEventListener('mouseleave', () => onHoverRef.current(null));
      el.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-fav-btn]')) {
          e.stopPropagation();
          onToggleFavoriteRef.current?.(complex);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && onCtrlSelectRef.current) {
          onCtrlSelectRef.current(complex.aptName);
        } else {
          onSelectRef.current(complex.aptName);
        }
      });

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: latlng,
        content: el,
        yAnchor: 1.3,
        clickable: true,
      });

      overlaysRef.current.set(complex.aptName, { overlay, el });
    }

    processNew();
    return () => { cancelled = true; };
  }, [results, mapReady]);

  function fitBounds(kakao: any, map: any) {
    if (overlaysRef.current.size === 0) return;
    try {
      const bounds = new kakao.maps.LatLngBounds();
      overlaysRef.current.forEach(({ overlay }) => {
        bounds.extend(overlay.getPosition());
      });
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      if (sw && ne && sw.getLat() !== ne.getLat()) {
        map.setBounds(bounds);
      }
    } catch {
      // bounds empty
    }
  }

  // ── 뷰포트 기반 오버레이 관리 (성능 최적화) ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const { kakao } = window;

    let moving = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    /** 현재 뷰포트 내 오버레이만 표시, 밖은 setMap(null)로 완전 제거 */
    function cullOverlays() {
      const bounds = map.getBounds();
      if (!bounds) return;
      overlaysRef.current.forEach(({ overlay, el }) => {
        const pos = overlay.getPosition();
        if (bounds.contain(pos)) {
          if (!overlay.getMap()) overlay.setMap(map);
          el.style.visibility = 'visible';
        } else {
          if (overlay.getMap()) overlay.setMap(null);
        }
      });
    }

    const onMoveStart = () => {
      if (moving) return;
      moving = true;
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      // 이동 중에는 모든 오버레이 숨기기 (reflow 방지)
      overlaysRef.current.forEach(({ el }) => {
        el.style.visibility = 'hidden';
      });
    };

    const onIdle = () => {
      if (!moving) {
        // 초기 로드 시에도 cull 실행
        cullOverlays();
        return;
      }
      moving = false;
      // 짧은 디바운스 후 뷰포트 기반 cull
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(cullOverlays, 50);
    };

    kakao.maps.event.addListener(map, 'dragstart', onMoveStart);
    kakao.maps.event.addListener(map, 'zoom_start', onMoveStart);
    kakao.maps.event.addListener(map, 'idle', onIdle);

    // 초기 cull
    cullOverlays();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      kakao.maps.event.removeListener(map, 'dragstart', onMoveStart);
      kakao.maps.event.removeListener(map, 'zoom_start', onMoveStart);
      kakao.maps.event.removeListener(map, 'idle', onIdle);
    };
  }, [mapReady]);

  // ── 즐겨찾기 상태 반영 ──
  useEffect(() => {
    if (!isFavorite) return;
    const resultMap = new Map(results.map((r) => [r.aptName, r]));
    overlaysRef.current.forEach(({ el }, aptName) => {
      const complex = resultMap.get(aptName);
      const fav = complex ? isFavorite(complex.aptName, complex.dong) : false;
      if ((el.dataset.favorite === '1') !== fav) {
        updateMarkerFavorite(el, fav);
      }
    });
  }, [isFavorite, results]);

  // ── 하이라이트 + 선택 상태 반영 ──
  useEffect(() => {
    overlaysRef.current.forEach(({ el }, aptName) => {
      if (aptName === highlightedApt) {
        setMarkerStyle(el, 'highlight');
      } else if (selectedApts?.has(aptName)) {
        setMarkerStyle(el, 'selected');
      } else {
        setMarkerStyle(el, 'default');
      }
    });
  }, [highlightedApt, selectedApts]);

  if (!KAKAO_APP_KEY || sdkError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100', className)}>
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">카카오맵</p>
          <p className="mt-1 text-xs">
            {sdkError ?? 'NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수를 설정해 주세요'}
          </p>
          {sdkError && (
            <p className="mt-2 text-xs text-gray-300">
              카카오 개발자 콘솔에서 앱 키와 도메인(localhost)을 확인해주세요
            </p>
          )}
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={cn('w-full h-full', className)} />;
}
