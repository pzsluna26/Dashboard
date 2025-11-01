"use client";
import React, { useMemo, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

export type DomainKey = "privacy" | "child" | "safety" | "finance";
export type PeriodKey = "daily_timeline" | "weekly_timeline" | "monthly_timeline";

export interface LegalArticleTop5Props {
  data: any;                 // /data/data.json 전체
  startDate?: string;        // "YYYY-MM-DD"
  endDate?: string;          // "YYYY-MM-DD"
  domains?: DomainKey[];     // 지정 없으면 모든 도메인 합산
  onClickDetail?: (legal: string) => void; // 상세보기 라우팅 핸들러
}

/* -------------------- 유틸 -------------------- */
function parseDate(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, dd || 1);
}
function inRange(key: string, start?: string, end?: string) {
  if (!start && !end) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return true; // 일 키만 필터
  const d = parseDate(key).getTime();
  const s = start ? parseDate(start).getTime() : -Infinity;
  const e = end ? parseDate(end).getTime() : Infinity;
  return d >= s && d <= e;
}
function compact(n: number) {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

/* -------------------- 본 컴포넌트 -------------------- */
export default function LegalArticleTop5({
  data,
  startDate,
  endDate,
  domains,
  onClickDetail,
}: LegalArticleTop5Props) {
  const items = useMemo(() => {
    
    if (!data) return [] as any[];
    const pickDomains: DomainKey[] =
      domains && domains.length ? (domains as DomainKey[]) : ["privacy", "child", "safety", "finance"];

    type Stance = { 강화: number; 완화: number; 반대: number };
    type Agg = {
      law: string;
      total: number; // 소셜 총합(찬성+반대)
      stance: Stance;
      newsCount: number;
      incidents: Record<string, { count: number; 대표뉴스?: string }>;
    };
    const agg = new Map<string, Agg>();

    // 1) addsocial.daily_timeline → 댓글/입장/사건 집계
    for (const dom of pickDomains) {
      const dl = data?.[dom]?.addsocial?.["daily_timeline"] || {};
      for (const [dateKey, entry] of Object.entries<any>(dl)) {
        if (!inRange(dateKey, startDate, endDate)) continue;
        const mids = entry?.중분류목록 || {};
        for (const [mid, midBucket] of Object.entries<any>(mids)) {
          const subs = (midBucket as any)?.소분류목록 || {};
          for (const [subKey, sub] of Object.entries<any>(subs)) {
            const law = sub?.관련법 || "(관련법 미상)";
            const counts = sub?.counts || { 찬성: 0, 반대: 0 };
            const agreeBlock = sub?.찬성 || { "개정강화": { count: 0 }, "폐지약화": { count: 0 } };
            const 강화 = agreeBlock?.["개정강화"]?.count || 0;
            const 완화 = agreeBlock?.["폐지약화"]?.count || 0;
            const 반대 = sub?.반대?.소셜목록 ? sub.반대.소셜목록.length : (counts?.반대 || 0);
            const total = (counts?.찬성 || 0) + (counts?.반대 || 0);

            if (!agg.has(law)) {
              agg.set(law, { law, total: 0, stance: { 강화: 0, 완화: 0, 반대: 0 }, newsCount: 0, incidents: {} });
            }
            const a = agg.get(law)!;
            a.total += total;
            a.stance.강화 += 강화;
            a.stance.완화 += 완화;
            a.stance.반대 += 반대;

            const id = `${mid}::${subKey}`;
            if (!a.incidents[id]) a.incidents[id] = { count: 0, 대표뉴스: sub?.대표뉴스 };
            a.incidents[id].count += total;
          }
        }
      }
    }

    // 2) news.daily_timeline → 관련 뉴스 수 집계
    for (const dom of pickDomains) {
      const dl = data?.[dom]?.news?.["daily_timeline"] || {};
      for (const [dateKey, entry] of Object.entries<any>(dl)) {
        if (!inRange(dateKey, startDate, endDate)) continue;
        const mids = entry?.중분류목록 || {};
        for (const [, midBucket] of Object.entries<any>(mids)) {
          const subs = (midBucket as any)?.소분류목록 || {};
          for (const [, sub] of Object.entries<any>(subs)) {
            const law = sub?.관련법 || "(관련법 미상)";
            const n = Array.isArray(sub?.articles) ? sub.articles.length : 0;
            if (!agg.has(law)) {
              agg.set(law, { law, total: 0, stance: { 강화: 0, 완화: 0, 반대: 0 }, newsCount: 0, incidents: {} });
            }
            agg.get(law)!.newsCount += n;
          }
        }
      }
    }

    // 3) total desc → TOP5
    return Array.from(agg.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((a, i) => ({
        rank: i + 1,
        law: a.law,
        total: a.total,
        stance: a.stance,
        newsCount: a.newsCount,
        incidentCount: Object.keys(a.incidents).length,
      }));
  }, [data, startDate, endDate, domains]);

  const totalAll = items.reduce((s, x) => s + x.total, 0);

  /* ---------- 스포트라이트(순차 강조) ---------- */
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!items.length) return;
    setActive(0); // 처음엔 1위
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, 3000); // 3초 간격
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) {
    return (
      <div className="h-full rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 p-4">
        <div className="text-sm font-semibold text-neutral-800">입법수요 TOP 5</div>
        <div className="mt-1 text-xs text-neutral-500">선택한 기간에 해당하는 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between">
        <div className="text-lg font-semibold text-neutral-900">입법수요 TOP 3</div>
        <div className="text-xs text-neutral-500">총 {totalAll.toLocaleString()}개 댓글</div>
      </div>

      {/* 리스트 */}
      <ol className="mt-3 space-y-3">
        {items.map((it, idx) => {
          const sum = Math.max(1, it.stance.강화 + it.stance.완화 + it.stance.반대);
          const p1 = Math.round((it.stance.강화 / sum) * 100);
          const p2 = Math.round((it.stance.완화 / sum) * 100);
          const p3 = 100 - p1 - p2;

          const isActive = idx === active;

          return (
            <li
              key={it.law}
              className={[
                "relative rounded-2xl border/60 p-3 transition-all",
                "bg-white/80",
                isActive
                  ? "shadow-lg ring-1 ring-black/5 scale-[1.01]"
                  : "opacity-50 grayscale blur-[1px]",
              ].join(" ")}
              style={{
                filter: isActive ? undefined : "grayscale(1) blur(1px)",
                transitionDuration: "400ms",
              }}
              onClick={() => onClickDetail?.(it.law)}
            >
              {/* 상단 라인: 랭킹·라벨·HOT/상세 버튼·값 */}
              <div className="flex items-center gap-3">
                {/* 랭킹 원형 */}
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full bg-[#B4D2E4] text-white font-bold text-xs shrink-0",
                    !isActive && "bg-neutral-400",
                  ].join(" ")}
                >
                  {it.rank}
                </div>

                {/* 라벨 */}
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{it.law}</div>

                {/* HOT 배지 (상위 2개에 표시) */}
                {idx < 2 && (
                  <span
                    className="select-none rounded-full px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                    style={{
                      background:
                        "linear-gradient(180deg, #ff7a3d 0%, #ff4d4f 100%)",
                      boxShadow: "0 4px 12px rgba(255,80,60,.25)",
                    }}
                  >
                    HOT
                  </span>
                )}

                {/* 수치 + 상세 */}
                <div className="ml-2 flex items-center gap-2">
                  <span className="tabular-nums text-[15px] font-semibold text-blue-600">
                    {it.total.toLocaleString()}
                  </span>
                  <button
                    className="rounded-full bg-blue-500/50 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickDetail?.(it.law);
                    }}
                  >
                    상세
                  </button>
                </div>
              </div>

              {/* 바: 지정 색 (#f8e7e0, #ced7dc, #eaebed) & 애니메이션 */}
              <div className="mt-3">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-300/30">
                  {/* 강화 */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${p1}%`,
                      background: "#FFB4A2",
                      transition: "width 800ms cubic-bezier(.22,.61,.36,1)",
                    }}
                  />
                  {/* 완화 */}
                  <div
                    className="absolute top-0 h-full -translate-y-full"
                    style={{
                      left: `${p1}%`,
                      width: `${p2}%`,
                      background: "#C0C9EE",
                      height: "100%",
                      transform: "none",
                      transition: "left 800ms cubic-bezier(.22,.61,.36,1), width 800ms cubic-bezier(.22,.61,.36,1)",
                    }}
                  />
                  {/* 반대 */}
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: `${p1 + p2}%`,
                      width: `${p3}%`,
                      background: "#eaebed",
                      transition: "left 800ms cubic-bezier(.22,.61,.36,1), width 800ms cubic-bezier(.22,.61,.36,1)",
                    }}
                  />
                </div>

                {/* 범례/숫자 (선택) */}
                <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="tabular-nums">
                    강화 {p1}% · 완화 {p2}% · 반대 {p3}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
