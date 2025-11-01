"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

import KpiSummary from "@/features/total/components/KpiSummary";
import { transformRawData } from "@/features/news/components/transformRawData";
import { computeKpis } from "@/shared/utils/computeKpis";
import type { PeriodKey } from "@/shared/types/common";

import Remote from "@/shared/layout/Remote";
import BackgroundGradient from "@/shared/layout/BackgroundGradient";
import Nav from "@/shared/layout/Nav";
import LegalTop5 from "@/features/total/components/LegalTop5";
import SocialBarChart from "@/features/total/components/SocailBarChart";

/** 클라이언트 전용(차트/캔버스/현재시간 의존) 컴포넌트는 동적 임포트 + ssr:false */
const NetworkGraph = dynamic(
  () => import("@/features/total/components/NetworkGraph"),
  { ssr: false, loading: () => <div className="h-[310px] grid place-items-center text-neutral-400">Loading…</div> }
);

const LegislativeStanceArea = dynamic(
  () => import("@/features/total/components/LegislativeStanceArea"),
  { ssr: false, loading: () => <div className="h-[310px] grid place-items-center text-neutral-400">Loading…</div> }
);

const Heatmap = dynamic(
  () => import("@/features/total/components/Heatmap"),
  { ssr: false, loading: () => <div className="h-[310px] grid place-items-center text-neutral-400">Loading…</div> }
);

/** 카드 래퍼 */
function LegislativeRanking({ periodLabel }: { periodLabel: string }) {
  return (
    <div className="h-full rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 p-4">
      <div className="text-sm text-neutral-500 font-medium">입법수요 랭킹</div>
      <div className="mt-2 text-sm text-neutral-700">기간: {periodLabel}</div>
    </div>
  );
}

/** 공통 카드: 기본 높이 유지, 개별 카드에서 bodyClass로 오버라이드 가능 */
function ChartCard({
  title,
  children,
  bodyClass = "h-[310px] lg:h-[300px]",
}: {
  title: string;
  children?: React.ReactNode;
  bodyClass?: string;
}) {
  return (
    <div className="h-full rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 p-4">
      <div className="text-sm text-neutral-500 font-medium">{title}</div>
      <div className={`mt-3 grid place-items-center text-neutral-400 w-full ${bodyClass}`}>
        {children ?? <span>Chart placeholder</span>}
      </div>
    </div>
  );
}

function formatKR(d: string) {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return `${y}.${m}.${dd}`;
}

export default function Dashboard() {
  const [period] = useState<PeriodKey>("weekly_timeline");

  const [data, setData] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);

  // ✅ Remote(좌측 리모컨)에서 제어되는 조회기간
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const displayPeriod = useMemo(() => {
    if (startDate && endDate) return `${formatKR(startDate)} ~ ${formatKR(endDate)}`;
    return "기간 미선택 (좌측 ‘기간선택’에서 최대 14일 범위를 지정하세요)";
  }, [startDate, endDate]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/data/data.json", { cache: "no-store" });
      const all = await res.json();
      setData(all);

      // ✅ 기간 필터를 transform/compute에 전달
      const transformed = transformRawData(all, period, { startDate, endDate });
      setTrend(transformed);

      const nextKpis = computeKpis(all, period, { startDate, endDate });
      setKpis(nextKpis);
    }
    fetchData();
      console.log("사용자 지정 날짜로 업데이트", { startDate, endDate });

  }, [period, startDate, endDate]);

  if (!data || !trend || !kpis) {
    return (
      <div className="w-full h-screen grid place-items-center bg-[#C8D4E5] text-neutral-700">
        Loading...
      </div>
    );
  }

  const currentTitle = "종합분석";

  return (
    <div className="relative min-h-screen w-full text-neutral-900 overflow-hidden">
      <Nav title={currentTitle} period={period} showSearch={true} />
      <BackgroundGradient
        stops={["#ced7dc", "#eaebed", "#f6efec", "#f8e7e0"]}
        highlights
        glass
      />

      <Remote
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          console.log("사용자 지정기간", { s, e });
          setStartDate(s);
          setEndDate(e);
        }}
      />


      <div className="flex w-full mx-auto mt-5">
        <aside className="w-[140px] flex flex-col items-center py-6" />
        <main
          className="flex flex-col p-10 bg-white/25 backdrop-blur-md
                     shadow-[0_12px_40px_rgba(20,30,60,0.05)] flex-1"
        >
          <div className="flex items-center justify-between px-7 py-2">
            <h2 className="font-jua mt-2 text-4xl md:text-3xl font-semibold text-[#2D2928] drop-shadow-sm">
              {currentTitle}
            </h2>
          </div>

          <div className="px-7 mb-5 text-[#2D2928]/70">
            현재 <strong className="font-jua text-[#2D2928]">{displayPeriod}</strong> 기준으로{" "}
            <strong className="font-jua text-[#2D2928]">{currentTitle}</strong>을(를) 분석합니다.
          </div>

          <div className="flex flex-col space-y-8">
            {/* ─────────────────────────────────────────────
               1단: KPI (전체 폭)
            ───────────────────────────────────────────── */}
            <section className="bg-white/35 backdrop-blur-md rounded-3xl p-4 border border-white/50">
              <KpiSummary
                kpis={kpis}
                periodLabel={displayPeriod}
                startDate={startDate}
                endDate={endDate}
              />
            </section>

            {/* ─────────────────────────────────────────────
               2단: 좌 1/3 입법수요 랭킹 · 우 2/3 네트워크 그래프
            ───────────────────────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <LegalTop5
                  data={data}
                  startDate={startDate}
                  endDate={endDate}
                  // domains={["privacy","child","safety","finance"]}
                  onClickDetail={(law) => {
                    const slug = encodeURIComponent(law);
                    window.location.href = `/legal/${slug}`;
                  }}
                />
              </div>

              <div className="lg:col-span-2">
                <NetworkGraph
                  data={data}
                  startDate={startDate}
                  endDate={endDate}
                  period={period}
                  maxArticles={5}
                />
              </div>
            </section>

            {/* ─────────────────────────────────────────────
               3단: 좌 1/2 막대(SocialBarChart-확장 높이) · 우 1/2 (상) 스택/파이 · (하) 히트맵
            ───────────────────────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 좌측: 법안별 여론 성향 (막대) - 이 카드만 넓은 높이 적용 */}
              <ChartCard title="법안별 여론 성향 (막대)" bodyClass="min-h-[420px] lg:min-h-[680px]">
                <div className="w-full h-full">
                  <SocialBarChart
                    data={data}
                    period={period}          // 'daily_timeline' | 'weekly_timeline' | 'monthly_timeline'
                    startDate={startDate}    // Remote에서 선택된 범위 그대로 전달
                    endDate={endDate}
                  />
                </div>
              </ChartCard>

              {/* 우측: 상/하 1:1 그리드 → (상) 여론 성향 분포, (하) 분야별 히트맵 (기본 높이 유지) */}
              <div className="grid grid-rows-2 gap-6 h-full w-full">
                <ChartCard title="여론 성향 추이 (스택)">
                  <div className="w-full h-full">
                    <LegislativeStanceArea
                      data={data}
                      startDate={startDate}
                      endDate={endDate}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="분야별 히트맵">
                  <div className="w-full h-full">
                    <Heatmap
                      data={data}
                      period={period}          // 'daily_timeline' | 'weekly_timeline' | 'monthly_timeline'
                      startDate={startDate}    // Remote에서 선택된 날짜 범위(일 단위일 때 필터)
                      endDate={endDate}
                    />
                  </div>
                </ChartCard>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
