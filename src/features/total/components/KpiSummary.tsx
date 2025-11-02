"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type PeriodKey = "daily_timeline" | "weekly_timeline" | "monthly_timeline";

type KpiDataItem = {
  date: string;
  news: number;
  social: number;
};

type KpiSummaryData = {
  [category: string]: {
    summary: {
      totalArticles: number;
      totalComments: number;
      newsGrowthRate: number;
      socialGrowthRate: number;
    };
    dailyData: KpiDataItem[];
  };
};

const CATEGORIES = ["privacy", "child", "safety", "finance"] as const;
const CATEGORY_TITLE: Record<string, string> = {
  privacy: "privacy",
  child: "child",
  safety: "safety",
  finance: "finance",
};

const nf = new Intl.NumberFormat("ko-KR");

function TooltipContent({ active, payload, label, catLabel }: any) {
  if (!active || !payload?.length) return null;
  const p = payload.reduce((acc: any, cur: any) => {
    acc[cur.name] = cur.value;
    return acc;
  }, {});
  const newsCum = p["뉴스 누적"] ?? 0;
  const socialCum = p["여론 누적"] ?? 0;

  return (
    <div className="rounded-xl border border-white/70 bg-white/95 shadow-md backdrop-blur-sm p-3 text-xs text-neutral-700">
      <div className="font-semibold text-neutral-900 mb-1">{label}</div>
      <div className="space-y-0.5">
        <div>법안: <b>{catLabel}</b></div>
        <div>뉴스량 누적: <b>{nf.format(newsCum)}</b></div>
        <div>여론(찬·반) 누적: <b>{nf.format(socialCum)}</b></div>
      </div>
    </div>
  );
}

export default function KpiSummary() {
  const [data, setData] = useState<KpiSummaryData | null>(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/data/kpi-summary.json", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    }
    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="w-full h-[150px] grid place-items-center text-neutral-400">
        Loading KPI Summary…
      </div>
    );
  }

  const cards = CATEGORIES.map((cat) => {
    const catData = data[cat];
    const { summary, dailyData } = catData;

    let accNews = 0;
    let accSocial = 0;
    const chartData = dailyData.map((d) => {
      accNews += d.news;
      accSocial += d.social;
      return {
        date: d.date,
        "뉴스 누적": accNews,
        "여론 누적": accSocial,
      };
    });

    return {
      key: cat,
      title: CATEGORY_TITLE[cat],
      totalArticles: summary.totalArticles,
      totalComments: summary.totalComments,
      newsGrowthRate: summary.newsGrowthRate,
      socialGrowthRate: summary.socialGrowthRate,
      chartData,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => {
        const upNews = c.newsGrowthRate >= 0;
        const upSoc = c.socialGrowthRate >= 0;

        return (
          <div
            key={c.key}
            className="rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-lg border border-white/60 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-transform duration-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600 font-semibold">{c.title}</div>
            </div>

            {/* 헤드 숫자 */}
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-neutral-500">뉴스량 합계</div>
                <div className="font-semibold text-xl text-neutral-900">
                  {nf.format(c.totalArticles)}
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                  upNews ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {c.newsGrowthRate > 0 && "▲"}
                  {c.newsGrowthRate < 0 && "▼"}
                  {c.newsGrowthRate === 0 && "-"}
                  {` ${(c.newsGrowthRate * 100).toFixed(1)}%`}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-neutral-500">여론(찬·반) 합계</div>
                <div className="font-semibold text-xl text-neutral-900">
                  {nf.format(c.totalComments)}
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                  upSoc ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {c.socialGrowthRate > 0 && "▲"}
                  {c.socialGrowthRate < 0 && "▼"}
                  {c.socialGrowthRate === 0 && "-"}
                  {` ${(c.socialGrowthRate * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>

            {/* 누적 AreaChart */}
            <div className="mt-3 h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gNews_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748b" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`gSoc_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#bae6fd" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>

                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    position={{ y: -30 }}
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={(props) => (
                      <TooltipContent {...props} catLabel={c.title} />
                    )}
                  />

                  <Area
                    type="monotone"
                    dataKey="뉴스 누적"
                    stroke="#64748b"
                    fillOpacity={1}
                    fill={`url(#gNews_${c.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#334155" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="여론 누적"
                    stroke="#60a5fa"
                    fillOpacity={1}
                    fill={`url(#gSoc_${c.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#2563eb" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
