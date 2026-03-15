'use client';

import { memo, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { waitForKakaoSdk } from '@/lib/kakao-geocode';

interface NearbyMapItem {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

interface NearbyMapProps {
  items: NearbyMapItem[];
  center: { lat: number; lng: number };
  className?: string;
}

/** 타입별 마커 색상 */
const TYPE_COLORS: Record<string, string> = {
  '재개발': '#3b82f6',
  '재건축': '#10b981',
  '초': '#0ea5e9',
  '중': '#8b5cf6',
  '고': '#f43f5e',
  '국립': '#ef4444',
  '공립': '#3b82f6',
  '사립': '#a855f7',
};

function getMarkerColor(type: string): string {
  return TYPE_COLORS[type] ?? '#1e3a5f';
}

/** center가 유효한 좌표인지 (0,0 = 무효) */
function isValidCenter(center: { lat: number; lng: number }): boolean {
  return center.lat !== 0 && center.lng !== 0;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울 시청

export const NearbyMap = memo(function NearbyMap({ items, center, className }: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);

  // 유효한 중심 좌표 결정: center 유효 → center, 아이템 있으면 → 첫 번째 아이템, 없으면 서울
  const effectiveCenter = isValidCenter(center)
    ? center
    : items.length > 0
      ? { lat: items[0].lat, lng: items[0].lng }
      : DEFAULT_CENTER;

  // SDK 로드 + 지도 초기화
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      const ready = await waitForKakaoSdk();
      if (cancelled || !ready || !containerRef.current) return;

      const { kakao } = window;
      if (!mapRef.current) {
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(effectiveCenter.lat, effectiveCenter.lng),
          level: 5,
        });
        mapRef.current = map;
      } else {
        mapRef.current.setCenter(
          new kakao.maps.LatLng(effectiveCenter.lat, effectiveCenter.lng),
        );
      }
    }

    init();
    return () => { cancelled = true; };
  }, [effectiveCenter.lat, effectiveCenter.lng]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    const { kakao } = window;
    const map = mapRef.current;

    // 기존 마커/오버레이 제거
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    if (items.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    // 유효한 center가 있으면 bounds에 포함
    if (isValidCenter(center)) {
      bounds.extend(new kakao.maps.LatLng(center.lat, center.lng));
    }

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const pos = new kakao.maps.LatLng(item.lat, item.lng);
      bounds.extend(pos);

      const color = getMarkerColor(item.type);

      const markerOverlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: `<div style="
          width: 12px; height: 12px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        yAnchor: 0.5,
      });

      const nameOverlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: `<div style="
          padding: 3px 8px;
          background: ${color};
          color: white;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          transform: translateY(-20px);
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        ">${item.name}</div>`,
        yAnchor: 1,
      });

      markersRef.current.push(markerOverlay);
      overlaysRef.current.push(nameOverlay);
    });

    // bounds 맞춤
    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      if (sw && ne && sw.getLat() !== ne.getLat()) {
        map.setBounds(bounds);
      }
    } catch {
      // bounds empty
    }
  }, [items, center.lat, center.lng]);

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div
        className={cn(
          'flex h-[300px] items-center justify-center rounded-lg bg-gray-100',
          className,
        )}
      >
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">카카오맵</p>
          <p className="mt-1 text-xs">
            NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수를 설정해 주세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('h-[300px] w-full rounded-lg', className)}
    />
  );
});
