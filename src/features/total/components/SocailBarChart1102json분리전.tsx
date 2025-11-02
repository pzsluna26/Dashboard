"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

/**
 * SocialBarChart
 *
 * ✔ 요구사항 반영
 * 1) 전체 Social_Comment의 입장별 비율 시각화 (보기 모드: Percent)
 * 2) 개정강화/폐지완화/반대 실제 댓글 수 표시 (보기 모드: Count & 툴팁/레이블)
 * 3) 색상 규칙: 개정강화=빨강, 폐지완화=파랑, 반대=회색
 * 4) 막대 그래프 형태(토글로 Count/Percent 전환)
 * + 종합 인사이트: 현재 그래프가 말하는 핵심 요약 자동 생성
 */
export default function SocialBarChart({
  data,
  period = "weekly_timeline",
  startDate = "",
  endDate = "",
}: {
  data: any;
  period?: "daily_timeline" | "weekly_timeline" | "monthly_timeline";
  startDate?: string;
  endDate?: string;
}) {
  const [mode, setMode] = useState<"percent" | "count">("percent");

  const categories = ["privacy", "child", "finance", "safety"] as const;

  const chartData = useMemo(() => {
    if (!data) return [] as any[];

    // 날짜 → 주/월 키 생성 유틸리티
    const toKey = (d: Date) => {
      if (period === "daily_timeline") {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      if (period === "weekly_timeline") {
        // JS week index (Sun-start). Align with Python %U used in 생성 스크립트
        const firstJan = new Date(d.getFullYear(), 0, 1);
        const diff = (d.getTime() - firstJan.getTime()) / 86400000;
        const week = Math.floor((diff + firstJan.getDay()) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
      }
      // monthly
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    // 선택된 기간의 키 집합 구하기
    const selectedKeys = new Set<string>();

    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;

    const addKeysFromCategory = (cat: string) => {
      const tl = data?.[cat]?.addsocial?.[period] ?? {};
      if (rangeStart && rangeEnd) {
        // 날짜 범위를 일 단위로 순회 → 해당 기간의 주/월 키로 변환
        for (
          let cur = new Date(rangeStart);
          cur <= rangeEnd;
          cur.setDate(cur.getDate() + 1)
        ) {
          selectedKeys.add(toKey(cur));
        }
      } else {
        // 기간 미선택: 모든 키 사용
        Object.keys(tl).forEach((k) => selectedKeys.add(k));
      }
    };

    categories.forEach(addKeysFromCategory);

    const sumForCategory = (cat: string) => {
      const tl = data?.[cat]?.addsocial?.[period] ?? {};
      let reinforce = 0; // 개정강화
      let repeal = 0; // 폐지완화
      let oppose = 0; // 반대

      for (const key of selectedKeys) {
        const entry = tl?.[key];
        if (!entry) continue;
        const mids = entry?.["중분류목록"] ?? {};
        for (const mid of Object.keys(mids)) {
          const subs = mids[mid]?.["소분류목록"] ?? {};
          for (const subKey of Object.keys(subs)) {
            const sub = subs[subKey];
            const agree = sub?.["찬성"] ?? {};
            const opposeBlock = sub?.["반대"] ?? {};

            reinforce += agree?.["개정강화"]?.count ?? 0;
            repeal += agree?.["폐지약화"]?.count ?? 0;

            // 반대 수: counts가 있으면 그 값을, 없으면 목록 길이
            const opposeCount =
              sub?.counts?.["반대"] ??
              (Array.isArray(opposeBlock?.["소셜목록"])
                ? opposeBlock["소셜목록"].length
                : 0);
            oppose += opposeCount;
          }
        }
      }

      const total = reinforce + repeal + oppose;
      const toPct = (n: number) =>
        total > 0
          ? +(Math.round((n / total) * 1000) / 10).toFixed(1)
          : 0;

      return {
        category: cat,
        reinforce,
        repeal,
        oppose,
        total,
        reinforcePct: toPct(reinforce),
        repealPct: toPct(repeal),
        opposePct: toPct(oppose),
      };
    };

    return categories.map((c) => sumForCategory(c));
  }, [data, period, startDate, endDate]);

  // ── 종합 인사이트 계산 ───────────────────────────────────────────
  const insights = useMemo(() => buildInsights(chartData), [chartData]);

  const COLORS = {
    reinforce: "#f59c9cff", // 빨강
    repeal: "#9abdf7ff", // 파랑
    oppose: "#9CA3AF", // 회색
  } as const;

  return (
    <div className="w-full h-full flex flex-col">
      {/* 헤더: 토글 & 범례 */}
      <div className="flex items-center justify-between mb-3 w-full">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-full bg-white/70 border border-white/60">
            법안별 여론 성향
          </span>
          <span className="text-neutral-500">보기:</span>
          <div className="inline-flex rounded-xl overflow-hidden border border-neutral-200 bg-white/80">
            <button
              className={`px-3 py-1 text-sm ${
                mode === "percent"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
              onClick={() => setMode("percent")}
              aria-pressed={mode === "percent"}
            >
              % 비율
            </button>
            <button
              className={`px-3 py-1 text-sm ${
                mode === "count"
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
          <LegendSwatch color={COLORS.oppose} label="반대" />
        </div>
      </div>

      <div className="relative flex-1 w-full h-[300px]">
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
              tickFormatter={(v) => categoryLabel(v as string)}
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

            {/* 개정강화 */}
            <Bar
              dataKey={mode === "percent" ? "reinforcePct" : "reinforce"}
              name="개정강화"
              fill={COLORS.reinforce}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey={mode === "percent" ? "reinforcePct" : "reinforce"}
                position="top"
                formatter={(v: any) => (mode === "percent" ? `${v}%` : v)}
                className="text-[10px] fill-[#374151]"
              />
            </Bar>

            {/* 폐지완화 */}
            <Bar
              dataKey={mode === "percent" ? "repealPct" : "repeal"}
              name="폐지완화"
              fill={COLORS.repeal}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey={mode === "percent" ? "repealPct" : "repeal"}
                position="top"
                formatter={(v: any) => (mode === "percent" ? `${v}%` : v)}
                className="text-[10px] fill-[#374151]"
              />
            </Bar>

            {/* 반대 */}
            <Bar
              dataKey={mode === "percent" ? "opposePct" : "oppose"}
              name="반대"
              fill={COLORS.oppose}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey={mode === "percent" ? "opposePct" : "oppose"}
                position="top"
                formatter={(v: any) => (mode === "percent" ? `${v}%` : v)}
                className="text-[10px] fill-[#374151]"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 하단: 요약 테이블 */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="py-2 pr-4">분류</th>
              <th className="py-2 pr-3">개정강화</th>
              <th className="py-2 pr-3">폐지완화</th>
              <th className="py-2 pr-3">반대</th>
              <th className="py-2 pr-3">합계</th>
              <th className="py-2 pr-3">비율(개/폐/반)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr
                key={row.category}
                className="border-t border-neutral-200/70"
              >
                <td className="py-2 pr-4 font-medium text-neutral-800">
                  {categoryLabel(row.category)}
                </td>
                <td className="py-2 pr-3 text-red-600">
                  {row.reinforce.toLocaleString()}
                </td>
                <td className="py-2 pr-3 text-blue-600">
                  {row.repeal.toLocaleString()}
                </td>
                <td className="py-2 pr-3 text-neutral-600">
                  {row.oppose.toLocaleString()}
                </td>
                <td className="py-2 pr-3">{row.total.toLocaleString()}</td>
                <td className="py-2 pr-3 text-neutral-700">{`${row.reinforcePct}% / ${row.repealPct}% / ${row.opposePct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─────────────────────────────────────────────
          종합 인사이트 (그래프 자동 해석)
      ───────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white/70 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-neutral-700">
            종합 인사이트
          </span>
          <Badge>자동 요약</Badge>
        </div>

        {/* 상단 KPIs 요약 */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge tone="red">
            전체 개정강화 {insights.total.reinforce.toLocaleString()}건 (
            {insights.total.reinforcePct}%)
          </Badge>
          <Badge tone="blue">
            전체 폐지완화 {insights.total.repeal.toLocaleString()}건 (
            {insights.total.repealPct}%)
          </Badge>
          <Badge tone="gray">
            전체 반대 {insights.total.oppose.toLocaleString()}건 (
            {insights.total.opposePct}%)
          </Badge>
          <Badge tone="neutral">총 {insights.total.total.toLocaleString()}건</Badge>
        </div>

        {/* 핵심 포인트 */}
        <ul className="list-disc pl-5 space-y-1 text-[13px] text-neutral-700">
          <li>
            <strong className="font-medium">주도 입장</strong>은{" "}
            <strong className="text-neutral-900">
              {insights.leadingStance.label}
            </strong>{" "}
            (전체의 {insights.leadingStance.pct}%) 입니다.
          </li>
          <li>
            <strong className="font-medium">카테고리별 특징</strong> —{" "}
            <em className="text-neutral-800">
              {categoryLabel(insights.topReinforce.category)}
            </em>
            는 개정강화 비중이 가장 높고 ({insights.topReinforce.pct}%),
            {" "}
            <em className="text-neutral-800">
              {categoryLabel(insights.topOppose.category)}
            </em>
            는 반대 비중이 두드러집니다 ({insights.topOppose.pct}%).
          </li>
          <li>
            <strong className="font-medium">양극화 지수</strong> — 가장 쏠림이 큰 곳은{" "}
            <em className="text-neutral-800">
              {categoryLabel(insights.mostSkewed.category)}
            </em>{" "}
            (최다 입장과 차이 {insights.mostSkewed.gap}%p), 가장 균형적인 곳은{" "}
            <em className="text-neutral-800">
              {categoryLabel(insights.mostBalanced.category)}
            </em>{" "}
            (최대–최소 격차 {insights.mostBalanced.gap}%p) 입니다.
          </li>
        </ul>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: color }}
      />
      <span>{label}</span>
    </span>
  );
}

function categoryLabel(key: string) {
  const map: Record<string, string> = {
    privacy: "개인정보",
    child: "아동/청소년",
    finance: "금융",
    safety: "안전",
  };
  return map[key] || key;
}

function maxCount(rows: any[]) {
  let m = 0;
  for (const r of rows) {
    m = Math.max(m, r.reinforce, r.repeal, r.oppose);
  }
  return Math.ceil(m);
}

function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload || payload.length === 0) return null;
  // payload contains multiple series; aggregate a friendly box
  const row = payload?.[0]?.payload || {};
  const lines = [
    {
      key: "reinforce",
      name: "개정강화",
      color: "#dfa0a0ff",
      v: mode === "percent" ? row.reinforcePct : row.reinforce,
    },
    {
      key: "repeal",
      name: "폐지완화",
      color: "#bcd1f3ff",
      v: mode === "percent" ? row.repealPct : row.repeal,
    },
    {
      key: "oppose",
      name: "반대",
      color: "#9CA3AF",
      v: mode === "percent" ? row.opposePct : row.oppose,
    },
  ];
  return (
    <div className="rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm">
      <div className="text-xs font-medium text-neutral-700 mb-1">
        {categoryLabel(label)}
      </div>
      <div className="space-y-0.5 text-xs">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: l.color }}
            />
            <span className="w-16 text-neutral-600">{l.name}</span>
            <span className="font-medium text-neutral-800">
              {mode === "percent"
                ? `${l.v}%`
                : `${Number(l.v).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">
        합계 {Number(row.total || 0).toLocaleString()}건 기준
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
    인사이트 계산/뷰 헬퍼들
───────────────────────────────────────────── */
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

function pct(n: number, t: number) {
  return t > 0 ? +(Math.round((n / t) * 1000) / 10).toFixed(1) : 0;
}

function buildInsights(rows: Row[]) {
  const totalReinforce = rows.reduce((a, r) => a + r.reinforce, 0);
  const totalRepeal = rows.reduce((a, r) => a + r.repeal, 0);
  const totalOppose = rows.reduce((a, r) => a + r.oppose, 0);
  const grandTotal = totalReinforce + totalRepeal + totalOppose;

  const total = {
    reinforce: totalReinforce,
    repeal: totalRepeal,
    oppose: totalOppose,
    total: grandTotal,
    reinforcePct: pct(totalReinforce, grandTotal),
    repealPct: pct(totalRepeal, grandTotal),
    opposePct: pct(totalOppose, grandTotal),
  };

  // 리딩 스탠스
  const stanceTriples = [
    { key: "개정강화", value: total.reinforcePct },
    { key: "폐지완화", value: total.repealPct },
    { key: "반대", value: total.opposePct },
  ].sort((a, b) => b.value - a.value);
  const leadingStance = {
    label: stanceTriples[0].key,
    pct: stanceTriples[0].value,
  };

  // 카테고리 단위: reinforce/oppose 비중 최상위
  const safePct = (r: Row, key: "reinforcePct" | "opposePct" | "repealPct") =>
    r.total > 0 ? r[key] : 0;

  const topReinforce = rows
    .map((r) => ({
      category: r.category,
      pct: safePct(r, "reinforcePct"),
    }))
    .sort((a, b) => b.pct - a.pct)[0] || { category: "-", pct: 0 };

  const topOppose = rows
    .map((r) => ({
      category: r.category,
      pct: safePct(r, "opposePct"),
    }))
    .sort((a, b) => b.pct - a.pct)[0] || { category: "-", pct: 0 };

  // 양극화(쏠림): 최대 비율 - 두 번째 비율
  const skewCalc = rows.map((r) => {
    const arr = [r.reinforcePct, r.repealPct, r.opposePct].sort(
      (a, b) => b - a
    );
    return { category: r.category, gap: +(arr[0] - arr[1]).toFixed(1) };
  });
  const mostSkewed =
    skewCalc.sort((a, b) => b.gap - a.gap)[0] || { category: "-", gap: 0 };
  const mostBalanced =
    skewCalc.sort((a, b) => a.gap - b.gap)[0] || { category: "-", gap: 0 };

  return {
    total,
    leadingStance,
    topReinforce,
    topOppose,
    mostSkewed,
    mostBalanced,
  };
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "blue" | "gray";
}) {
  const map = {
    neutral:
      "bg-neutral-100 text-neutral-700 border border-neutral-200",
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
