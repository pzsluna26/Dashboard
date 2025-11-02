"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";

import type { PeriodKey } from "@/shared/types/common";

import Remote from "@/shared/layout/Remote";
import BackgroundGradient from "@/shared/layout/BackgroundGradient";
import Nav from "@/shared/layout/Nav";
import LegalTop5 from "@/features/total/components/LegalTop5";
import SocialBarChart from "@/features/total/components/SocailBarChart";
import KpiSummary from "@/features/total/components/KpiSummary";

/** 클라이언트 전용 컴포넌트는 동적 임포트 + ssr:false */
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

/** 공통 카드 */
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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const displayPeriod = useMemo(() => {
    if (startDate && endDate) return `${formatKR(startDate)} ~ ${formatKR(endDate)}`;
    return "기간 미선택 (좌측 ‘기간선택’에서 최대 14일 범위를 지정하세요)";
  }, [startDate, endDate]);

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
               1단: 종합 지표 (누적 KPI · 4카드)
            ───────────────────────────────────────────── */}
            <section className="bg-white/35 backdrop-blur-md rounded-3xl p-4 border border-white/50">
              <KpiSummary
                key={`${startDate}-${endDate}-${period}`}
                startDate={startDate}
                endDate={endDate}
                period={period}
              />
            </section>

            {/* ─────────────────────────────────────────────
               2단 */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <LegalTop5
                  startDate={startDate}
                  endDate={endDate}
                  onClickDetail={(law) => {
                    const slug = encodeURIComponent(law);
                    window.location.href = `/legal/${slug}`;
                  }}
                />
              </div>

              <div className="lg:col-span-2">
                <NetworkGraph
                  startDate={startDate}
                  endDate={endDate}
                  period={period}
                  maxArticles={5}
                />
              </div>
            </section>

            {/* ─────────────────────────────────────────────
               3단 */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="법안별 여론 성향 (막대)" bodyClass="min-h-[220px] lg:min-h-[680px]">
                <div className="w-full h-full">
                  <SocialBarChart
                    period={period}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </div>
              </ChartCard>

              <div className="grid grid-rows-2 gap-6 h-full w-full">
                <ChartCard title="여론 성향 추이 (스택)">
                  <div className="w-full h-full">
                    <LegislativeStanceArea
                      startDate={startDate}
                      endDate={endDate}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="분야별 히트맵">
                  <div className="w-full h-full">
                    <Heatmap
                      period={period}
                      startDate={startDate}
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
