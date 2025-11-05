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
  privacy: "개인정보관련법",
  child: "아동복지법",
  safety: "중대재해처벌법",
  finance: "금융관련법",
};

const nf = new Intl.NumberFormat("ko-KR");


const fmtKstDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d); 


const makeDefaultRange = (days = 14) => {
  const end = new Date("2025-08-13T23:59:59+09:00"); 
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    start: fmtKstDate(start),
    end: fmtKstDate(end),
  };
};

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
        <div>
          법안: <b>{catLabel}</b>
        </div>
        <div>
          뉴스량 누적: <b>{nf.format(newsCum)}</b>
        </div>
        <div>
          여론(찬·반) 누적: <b>{nf.format(socialCum)}</b>
        </div>
      </div>
    </div>
  );
}

type Props = {
  startDate?: string; 
  endDate?: string;   
  period?: PeriodKey;
};

export default function KpiSummary({
  startDate = "",
  endDate = "",
  period,
}: Props) {
  const [data, setData] = useState<KpiSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);

 
  const apiUrl = useMemo(() => {
    const base = "http://10.125.121.213:8080/api/dashboard/kpi-summary";
    const defaults = makeDefaultRange(14); 

    const s = (startDate && startDate.trim()) || defaults.start;
    const e = (endDate && endDate.trim()) || defaults.end;

    const qs = new URLSearchParams({ start: s, end: e });
    if (period) qs.set("period", period);

    return `${base}?${qs.toString()}`;
  }, [startDate, endDate, period]);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(apiUrl, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          let bodyText = "";
          try {
            bodyText = await res.text();
          } catch { }
          const hint =
            res.status === 400
              ? "\n힌트: 서버가 start(및 end) 파라미터를 필수로 요구합니다. YYYY-MM-DD 형식인지와 KST 기준 날짜인지 확인하세요."
              : "";
          throw new Error(
            `HTTP ${res.status} ${res.statusText}${bodyText ? " - " + bodyText : ""
            }${hint}`
          );
        }

        const json = (await res.json()) as Record<string, any>;

        const KEY_MAPPING: Record<string, keyof typeof CATEGORY_TITLE> = {
          "개인정보보호법,정보통신망법": "privacy",
          "자본시장법,특정금융정보법,전자금융거래법,전자증권법,금융소비자보호법":
            "finance",
          "아동복지법": "child",
          "중대재해처벌법": "safety",
        };

        const mappedData: KpiSummaryData = {};
        for (const key in json) {
          const cat = KEY_MAPPING[key];
          if (cat) {
            mappedData[cat] = json[key];
          }
        }

        if (!aborted) setData(mappedData);
      } catch (e: any) {
        if (!aborted) {
          setError(e?.message ?? "데이터 로드 실패");
          setData(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [apiUrl]);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileNameParts = [
      "kpi-summary",
      new URL(apiUrl).searchParams.get("start") || "start",
      new URL(apiUrl).searchParams.get("end") || "end",
      new URL(apiUrl).searchParams.get("period") || "period",
    ].filter(Boolean);
    a.href = url;
    a.download = `${fileNameParts.join("_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="w-full h-[150px] grid place-items-center text-neutral-400">
        Loading KPI Summary…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[150px] grid place-items-center text-rose-500 text-sm whitespace-pre-wrap">
        KPI Summary 로드 오류: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-[150px] grid place-items-center text-neutral-400">
        데이터가 없습니다.
      </div>
    );
  }

  const cards = CATEGORIES.map((cat) => {
    const catData = data[cat];
    if (!catData) {
      return {
        key: cat,
        title: CATEGORY_TITLE[cat],
        totalArticles: 0,
        totalComments: 0,
        newsGrowthRate: 0,
        socialGrowthRate: 0,
        chartData: [] as Array<{
          date: string;
          "뉴스 누적": number;
          "여론 누적": number;
        }>,
      };
    }

    const { summary, dailyData } = catData;

    let accNews = 0;
    let accSocial = 0;
    const chartData = (dailyData ?? []).map((d) => {
      accNews += d.news ?? 0;
      accSocial += d.social ?? 0;
      return {
        date: d.date,
        "뉴스 누적": accNews,
        "여론 누적": accSocial,
      };
    });

    return {
      key: cat,
      title: CATEGORY_TITLE[cat],
      totalArticles: summary?.totalArticles ?? 0,
      totalComments: summary?.totalComments ?? 0,
      newsGrowthRate: summary?.newsGrowthRate ?? 0,
      socialGrowthRate: summary?.socialGrowthRate ?? 0,
      chartData,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">종합 KPI 요약</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-600">종합 KPI 요약</span>
            <div className="relative group">
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
              <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[260px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
                최근 기간 동안의 전체 의견 건수를 요약한 지표입니다.
                <br />
                의견 변화 추세, 여론 성향 분포 등을 종합적으로 보여줍니다.
              </div>
            </div>
          </div>

        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white/70 hover:bg-white transition"
            title="API에서 받은 전체 JSON 보기"
          >
            {showRaw ? "Raw JSON 닫기" : "Raw JSON 보기"}
          </button>

          {showRaw && (
            <button
              onClick={handleDownload}
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white/70 hover:bg-white transition"
              title="JSON 파일로 다운로드"
            >
              JSON 다운로드
            </button>
          )}
        </div>

      </div>

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
                <div className="text-sm text-neutral-600 font-semibold">
                  {c.title}
                </div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-neutral-500">뉴스량 합계</div>
                  <div className="font-semibold text-xl text-neutral-900">
                    {nf.format(c.totalArticles)}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 flex items-center gap-1 ${upNews ? "text-emerald-600" : "text-rose-600"
                      }`}
                  >
                    {c.newsGrowthRate > 0 && "▲"}
                    {c.newsGrowthRate < 0 && "▼"}
                    {c.newsGrowthRate === 0 && "-"}
                    {` ${(c.newsGrowthRate * 100).toFixed(1)}%`}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500">
                    여론(찬·반) 합계
                  </div>
                  <div className="font-semibold text-xl text-neutral-900">
                    {nf.format(c.totalComments)}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 flex items-center gap-1 ${upSoc ? "text-emerald-600" : "text-rose-600"
                      }`}
                  >
                    {c.socialGrowthRate > 0 && "▲"}
                    {c.socialGrowthRate < 0 && "▼"}
                    {c.socialGrowthRate === 0 && "-"}
                    {` ${(c.socialGrowthRate * 100).toFixed(1)}%`}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={c.chartData}
                    margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {/* <linearGradient id={`gNews_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`gSoc_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#bae6fd" stopOpacity={0.1} />
                      </linearGradient> */}

                      <linearGradient id={`gNews_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`gSoc_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6666" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#FFEADD" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
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
                      stroke="#FFEADD"
                      fillOpacity={1}
                      fill={`url(#gNews_${c.key})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: "#334155" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="여론 누적"
                      stroke="#FFEADD"
                      fillOpacity={1}
                      fill={`url(#gSoc_${c.key})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: "#FF6666" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {showRaw && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white/80 p-3">
          <div className="text-xs text-neutral-500 mb-2">API Raw JSON</div>
          <pre className="text-[11px] leading-5 text-neutral-800 overflow-auto max-h-[50vh] whitespace-pre">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
