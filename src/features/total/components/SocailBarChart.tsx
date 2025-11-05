"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";

type BackendRow = { category: string; 개정강화: number; 폐지완화: number; 현상유지: number };
type BackendPayload = { data: BackendRow[] };

const fmtKstDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

const getDefaultRange = () => {
  const end = new Date("2025-08-13T23:59:59+09:00");
  const start = new Date(end.getTime() - 13 * 24 * 60 * 60 * 1000); // 14일 포함
  return { start: fmtKstDate(start), end: fmtKstDate(end) };
};

function formatCategory(value: string): string {
  if (value === "자본시장법,특정금융정보법,전자금융거래법,전자증권법,금융소비자보호법") {
    return "금융관련법";
  }
  if (value === "개인정보보호법,정보통신망법") {
    return "개인정보관련법";
  }
  return value;
}

export default function SocialBarChart({
  data,
  period = "daily_timeline",
  startDate,
  endDate,
}: {
  data?: BackendPayload;
  period?: "daily_timeline" | "weekly_timeline" | "monthly_timeline";
  startDate?: string;
  endDate?: string;
}) {
  const [mode, setMode] = useState<"percent" | "count">("percent");
  const [backend, setBackend] = useState<BackendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const { start, end } = useMemo(() => {
    if (startDate && endDate) return { start: startDate, end: endDate };
    return getDefaultRange();
  }, [startDate, endDate]);


  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/social-bar?start=${start}&end=${end}`,
          { cache: "no-store", signal: ac.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const json: BackendPayload = await res.json();
        setBackend(json.data ?? []);
        console.log("여론바차트json", json);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("fetch 실패:", e);
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [start, end, period]);


  type Row = {
    category: string;
    reinforce: number;
    repeal: number;
    oppose: number;
    total: number;
    reinforcePct: number;
    repealPct: number;
    opposePct: number;
  };

  const chartData: Row[] = useMemo(() => {
    const safePct = (n: number, t: number) =>
      t > 0 ? +(Math.round((n / t) * 1000) / 10).toFixed(1) : 0;
    return backend.map((r) => {
      const reinforce = r.개정강화 ?? 0;
      const repeal = r.폐지완화 ?? 0;
      const oppose = r.현상유지 ?? 0;
      const total = reinforce + repeal + oppose;
      return {
        category: r.category,
        reinforce,
        repeal,
        oppose,
        total,
        reinforcePct: safePct(reinforce, total),
        repealPct: safePct(repeal, total),
        opposePct: safePct(oppose, total),
      };
    });
  }, [backend]);

  const insights = useMemo(() => buildInsights(chartData), [chartData]);

  const COLORS = {
    reinforce: "#f59c9cff",
    repeal: "#9abdf7ff",
    oppose: "#9CA3AF",
  } as const;

  if (loading)
    return (
      <div className="w-full h-[200px] grid place-items-center text-neutral-500">
        데이터 불러오는 중...
      </div>
    );
  if (error)
    return (
      <div className="w-full h-[200px] grid place-items-center text-rose-500 text-sm">
         오류 발생: {error}
      </div>
    );
  if (!chartData.length)
    return (
      <div className="w-full h-[200px] grid place-items-center text-neutral-500 text-sm">
        데이터가 없습니다.
      </div>
    );


  return (
    <div className="w-full h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 w-full">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-full bg-white/70 border border-white/60">
            법안별 여론 성향
          </span>
          <span className="text-neutral-500">보기:</span>
          <div className="inline-flex rounded-xl overflow-hidden border border-neutral-200 bg-white/80">
            <button
              className={`px-3 py-1 text-sm ${mode === "percent"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
                }`}
              onClick={() => setMode("percent")}
              aria-pressed={mode === "percent"}
            >
              % 비율
            </button>
            <button
              className={`px-3 py-1 text-sm ${mode === "count"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
                }`}
              onClick={() => setMode("count")}
              aria-pressed={mode === "count"}
            >
              건수
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <LegendSwatch color={COLORS.reinforce} label="개정강화" />
          <LegendSwatch color={COLORS.repeal} label="폐지완화" />
          <LegendSwatch color={COLORS.oppose} label="현상유지" />
        </div>
      </div>


      <div className="relative flex-1 w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            barSize={22}
            margin={{ top: 8, right: 12, left: 0, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: "#4b5563" }}
              tickFormatter={formatCategory}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#4b5563" }}
              width={40}
              domain={
                mode === "percent"
                  ? [0, 100]
                  : [0, (maxCount(chartData) * 1.1) || 10]
              }
              tickFormatter={(v) =>
                mode === "percent" ? `${v}%` : `${Math.round(v)}`
              }
            />
            <Tooltip content={<CustomTooltip mode={mode} />} />
            <Legend wrapperStyle={{ display: "none" }} />

            <Bar dataKey={mode === "percent" ? "reinforcePct" : "reinforce"} name="개정강화" fill={COLORS.reinforce} radius={[6, 6, 0, 0]}>
              <LabelList dataKey={mode === "percent" ? "reinforcePct" : "reinforce"} position="top" formatter={(v: any) => (mode === "percent" ? `${v}%` : Number(v).toLocaleString())} className="text-[10px] fill-[#374151]" />
            </Bar>
            <Bar dataKey={mode === "percent" ? "repealPct" : "repeal"} name="폐지완화" fill={COLORS.repeal} radius={[6, 6, 0, 0]}>
              <LabelList dataKey={mode === "percent" ? "repealPct" : "repeal"} position="top" formatter={(v: any) => (mode === "percent" ? `${v}%` : Number(v).toLocaleString())} className="text-[10px] fill-[#374151]" />
            </Bar>
            <Bar dataKey={mode === "percent" ? "opposePct" : "oppose"} name="현상유지" fill={COLORS.oppose} radius={[6, 6, 0, 0]}>
              <LabelList dataKey={mode === "percent" ? "opposePct" : "oppose"} position="top" formatter={(v: any) => (mode === "percent" ? `${v}%` : Number(v).toLocaleString())} className="text-[10px] fill-[#374151]" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

 
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="py-2 pr-4">분류</th>
              <th className="py-2 pr-3">개정강화</th>
              <th className="py-2 pr-3">폐지완화</th>
              <th className="py-2 pr-3">현상유지</th>
              <th className="py-2 pr-3">합계</th>
              <th className="py-2 pr-3">비율(개/폐/현)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.category} className="border-t border-neutral-200/70">
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  {formatCategory(row.category)}
                </td>
                <td className="py-2 pr-3 text-red-600">{row.reinforce.toLocaleString()}</td>
                <td className="py-2 pr-3 text-blue-600">{row.repeal.toLocaleString()}</td>
                <td className="py-2 pr-3 text-neutral-600">{row.oppose.toLocaleString()}</td>
                <td className="py-2 pr-3">{row.total.toLocaleString()}</td>
                <td className="py-2 pr-3 text-neutral-700">
                  {`${row.reinforcePct}% / ${row.repealPct}% / ${row.opposePct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white/70 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-neutral-700">종합 인사이트</span>
          <Badge>자동 요약</Badge>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge tone="red">전체 개정강화 {insights.total.reinforce.toLocaleString()}건 ({insights.total.reinforcePct}%)</Badge>
          <Badge tone="blue">전체 폐지완화 {insights.total.repeal.toLocaleString()}건 ({insights.total.repealPct}%)</Badge>
          <Badge tone="gray">전체 현상유지 {insights.total.oppose.toLocaleString()}건 ({insights.total.opposePct}%)</Badge>
          <Badge tone="neutral">총 {insights.total.total.toLocaleString()}건</Badge>
        </div>

        <ul className="list-disc pl-5 space-y-1 text-[13px] text-neutral-700">
          <li><strong>주도 입장</strong>: <b>{insights.leadingStance.label}</b> (전체의 {insights.leadingStance.pct}%)</li>
          <li><strong>카테고리별 특징</strong> — <em>{insights.topReinforce.category}</em>는 개정강화 비중이 가장 높고 ({insights.topReinforce.pct}%), <em>{insights.topOppose.category}</em>는 현상유지 비중이 두드러집니다 ({insights.topOppose.pct}%).</li>
          <li><strong>양극화 지수</strong> — 가장 쏠림이 큰 곳은 <em>{insights.mostSkewed.category}</em> (차이 {insights.mostSkewed.gap}%p), 가장 균형적인 곳은 <em>{insights.mostBalanced.category}</em> ({insights.mostBalanced.gap}%p).</li>
        </ul>
      </div>
    </div>
  );
}


function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

function maxCount(rows: any[]) {
  let m = 0;
  for (const r of rows) m = Math.max(m, r.reinforce, r.repeal, r.oppose);
  return Math.ceil(m);
}

function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload?.[0]?.payload || {};
  const lines = [
    { key: "reinforce", name: "개정강화", color: "#dfa0a0ff", v: mode === "percent" ? row.reinforcePct : row.reinforce },
    { key: "repeal", name: "폐지완화", color: "#bcd1f3ff", v: mode === "percent" ? row.repealPct : row.repeal },
    { key: "oppose", name: "현상유지", color: "#9CA3AF", v: mode === "percent" ? row.opposePct : row.oppose },
  ];
  return (
    <div className="rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm">
      <div className="text-xs font-medium text-neutral-700 mb-1">{label}</div>
      {lines.map((l) => (
        <div key={l.key} className="flex items-center gap-2 text-xs">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
          <span className="w-16 text-neutral-600">{l.name}</span>
          <span className="font-medium text-neutral-800">
            {mode === "percent" ? `${l.v}%` : Number(l.v).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "blue" | "gray";
}) {
  const map = {
    neutral: "bg-neutral-100 text-neutral-700 border border-neutral-200",
    red: "bg-red-100 text-red-700 border border-red-200",
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    gray: "bg-gray-100 text-gray-700 border border-gray-200",
  } as const;

  return (
    <span className={`px-2 py-1 rounded-md text-[11px] ${map[tone]}`}>
      {children}
    </span>
  );
}



function buildInsights(rows: any[]) {
  const totalReinforce = rows.reduce((a, r) => a + r.reinforce, 0);
  const totalRepeal = rows.reduce((a, r) => a + r.repeal, 0);
  const totalOppose = rows.reduce((a, r) => a + r.oppose, 0);
  const grandTotal = totalReinforce + totalRepeal + totalOppose;

  const pct = (n: number, t: number) =>
    t > 0 ? +(Math.round((n / t) * 1000) / 10).toFixed(1) : 0;

  const total = {
    reinforce: totalReinforce,
    repeal: totalRepeal,
    oppose: totalOppose,
    total: grandTotal,
    reinforcePct: pct(totalReinforce, grandTotal),
    repealPct: pct(totalRepeal, grandTotal),
    opposePct: pct(totalOppose, grandTotal),
  };

  const leadingTriples = [
    { key: "개정강화", value: total.reinforcePct },
    { key: "폐지완화", value: total.repealPct },
    { key: "현상유지", value: total.opposePct },
  ].sort((a, b) => b.value - a.value);

  const leadingStance = {
    label: leadingTriples[0]?.key ?? "-",
    pct: leadingTriples[0]?.value ?? 0,
  };

  const topReinforce = rows.map((r) => ({ category: r.category, pct: r.reinforcePct }))
    .sort((a, b) => b.pct - a.pct)[0] || { category: "-", pct: 0 };

  const topOppose = rows.map((r) => ({ category: r.category, pct: r.opposePct }))
    .sort((a, b) => b.pct - a.pct)[0] || { category: "-", pct: 0 };

 
  const skewCalc = rows.map((r) => {
    const sorted = [r.reinforcePct, r.repealPct, r.opposePct].sort((a, b) => b - a);
    return {
      category: r.category,
      gap: +(sorted[0] - sorted[1]).toFixed(1),
    };
  });

  const mostSkewed = skewCalc.sort((a, b) => b.gap - a.gap)[0] || { category: "-", gap: 0 };
  const mostBalanced = skewCalc.sort((a, b) => a.gap - b.gap)[0] || { category: "-", gap: 0 };

  return {
    total,
    leadingStance,
    topReinforce,
    topOppose,
    mostSkewed,
    mostBalanced,
  };
}