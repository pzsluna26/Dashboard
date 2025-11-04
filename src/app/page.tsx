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
const NetworkGraphContainer = dynamic(
  () => import("@/features/total/components/NetworkGraphContainer"),
  {
    ssr: false,
    loading: () => <div className="h-[600px] grid place-items-center text-neutral-400">Loading…</div>,
  }
);


const LegislativeStanceArea = dynamic(
  () => import("@/features/total/components/LegislativeStanceArea"),
  { ssr: false, loading: () => <div className="h-[310px] grid place-items-center text-neutral-400">Loading…</div> }
);

const Heatmap = dynamic(
  () => import("@/features/total/components/Heatmap"),
  { ssr: false, loading: () => <div className="h-[330px] grid place-items-center text-neutral-400">Loading…</div> }
);

/** 공통 카드 */
function ChartCard({
  title,
  children,
  bodyClass = "h-[400px] lg:h-[330px]",
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
      <Nav title={currentTitle} showSearch={true} />
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
            <section className="bg-white/35 backdrop-blur-md rounded-3xl p-3 border border-white/50">
              {/* ChartCard와 동일한 타이틀 스타일 복제 */}


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
                // onClickDetail={(law) => {
                //   const slug = encodeURIComponent(law);
                //   window.location.href = `/legal/${slug}`;
                // }}
                />
              </div>

              <div className="lg:col-span-2">
                <ChartCard
                  title={
                    <div className="flex items-center gap-1 relative group">
                      <span>연관 법안 네트워크</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-neutral-400 cursor-pointer group-hover:text-neutral-600 transition"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>

                      {/* Tooltip */}
                      <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[260px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
                        이 네트워크는 주요 법안 간 연관성과 언급량 기반으로 시각화됩니다.
                        <br />
                        노드 크기는 언급량, 연결선은 연관도(동시 언급 빈도)를 나타냅니다.
                      </div>
                    </div>
                  }
                  bodyClass="min-h-[200px] lg:min-h-[330px]"
                >
                  <div className="w-full h-full">
                    <NetworkGraphContainer
                      startDate={startDate}
                      endDate={endDate}
                      maxArticles={5}
                    />
                  </div>
                </ChartCard>
              </div>

            </section>

            {/* ─────────────────────────────────────────────
               3단 */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title={
                  <div className="flex items-center gap-1 relative group">
                    <span>법안별 여론 성향</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-neutral-400 cursor-pointer group-hover:text-neutral-600 transition"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>

                    {/* Tooltip */}
                    <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[240px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
                      각 법안에 대한 국민 여론(개정 강화, 폐지 완화, 현상 유지) 분포를 시각화한 차트입니다.
                      <br />
                      보기 모드를 통해 퍼센트와 건수로 전환할 수 있습니다.
                    </div>
                  </div>
                }
                bodyClass="min-h-[200px] lg:min-h-[780px]"
              >
                <div className="w-full h-full">
                  <SocialBarChart startDate={startDate} endDate={endDate} />
                </div>
              </ChartCard>

              <div className="grid grid-rows-2 gap-6 h-full w-full">
                {/* 여론 성향 추이 (스택) */}
                <ChartCard
                  title={
                    <div className="flex items-center gap-1 relative group">
                      <span>여론 성향 추이</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-neutral-400 cursor-pointer group-hover:text-neutral-600 transition"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                        />
                      </svg>
                      <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[240px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
                        기간별로 국민 여론이 어떻게 변화했는지 스택 차트로 보여줍니다.
                        <br />
                        각 구간의 비율은 개정강화/폐지완화/현상유지 응답의 비중입니다.
                      </div>
                    </div>
                  }
                >
                  <div className="w-full h-full">
                    <LegislativeStanceArea startDate={startDate} endDate={endDate} />
                  </div>
                </ChartCard>

                {/* 분야별 히트맵 */}
                <ChartCard
                  title={
                    <div className="flex items-center gap-1 relative group">
                      <span>분야별 히트맵</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-neutral-400 cursor-pointer group-hover:text-neutral-600 transition"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                        />
                      </svg>
                      <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[240px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
                        분야별 법안의 언급량과 여론 분포를 색상으로 시각화한 히트맵입니다.
                        <br />
                        색이 짙을수록 관련된 논의가 활발했음을 의미합니다.
                      </div>
                    </div>
                  }
                >
                  <div className="w-full h-full">
                    <Heatmap startDate={startDate} endDate={endDate} />
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
