"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type TimelineKey = "daily_timeline" | "weekly_timeline" | "monthly_timeline";
type PeriodKey = TimelineKey;

type Props = {
  data: any;
  startDate?: string;
  endDate?: string;
  period?: PeriodKey;
};

const CATEGORIES = ["privacy", "child", "safety", "finance"] as const;
const CATEGORY_TITLE: Record<string, string> = {
  privacy: "privacy",
  child: "child",
  safety: "safety",
  finance: "finance",
};

const nf = new Intl.NumberFormat("ko-KR");

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateRange(start: string, end: string) {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const d = new Date(s);
  while (d.getTime() <= e.getTime()) {
    out.push(ymdLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function previousRange(start: string, end: string) {
  const days =
    Math.floor(
      (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    ) + 1;
  const prevEnd = new Date(new Date(start).getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  const toStr = (d: Date) => ymdLocal(d);
  return [toStr(prevStart), toStr(prevEnd)] as const;
}

function pctChange(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return Infinity;
  return ((curr - prev) / prev) * 100;
}

function newsTotalForDay(catObj: any, date: string) {
  const node = catObj?.news?.daily_timeline?.[date];
  if (!node) return 0;
  const mids = node["중분류목록"] || {};
  return Object.values<any>(mids).reduce((sum, m) => sum + (m?.count || 0), 0);
}

function socialTotalForDay(catObj: any, date: string) {
  const node = catObj?.addsocial?.daily_timeline?.[date];
  if (!node) return 0;
  const agree = node?.counts?.["찬성"] || 0;
  const disagree = node?.counts?.["반대"] || 0;
  return agree + disagree;
}

function buildSeries(catObj: any, start: string, end: string) {
  const days = dateRange(start, end);
  const daily = days.map((d) => ({
    date: d,
    news: newsTotalForDay(catObj, d),
    social: socialTotalForDay(catObj, d),
  }));

  let accNews = 0;
  let accSocial = 0;
  const cumulative = daily.map((row) => {
    accNews += row.news;
    accSocial += row.social;
    return { ...row, newsCum: accNews, socialCum: accSocial };
  });

  const totalNews = cumulative.at(-1)?.newsCum ?? 0;
  const totalSocial = cumulative.at(-1)?.socialCum ?? 0;

  return { days, daily, cumulative, totalNews, totalSocial };
}

function TooltipContent({ active, payload, label, catLabel, changePct }: any) {
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
        <div>이전동일기간 대비: <b>{changePct === Infinity ? "∞" : `${changePct.toFixed(1)}%`}</b></div>
      </div>
    </div>
  );
}

export default function KpiSummary({
  data,
  startDate,
  endDate,
  period = "daily_timeline",
}: Props) {
  const daily = data?.privacy?.news?.daily_timeline || {};
  const keys = Object.keys(daily).sort();

  const [sDate, eDate] = useMemo(() => {
    if (startDate && endDate) return [startDate, endDate] as const;
    const anyCat = data?.privacy?.news?.daily_timeline || {};
    const ks = Object.keys(anyCat).sort();
    const last = ks.at(-1);
    const first = ks.slice(-14)[0] || ks[0];
    return [first, last] as const;
  }, [data, startDate, endDate]);

  const prevWindow = useMemo(() => previousRange(sDate, eDate), [sDate, eDate]);

  const cards = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const catObj = data?.[cat] ?? {};
      const curr = buildSeries(catObj, sDate!, eDate!);
      const prev = buildSeries(catObj, prevWindow[0], prevWindow[1]);
      const changeNews = pctChange(curr.totalNews, prev.totalNews);
      const changeSocial = pctChange(curr.totalSocial, prev.totalSocial);

      const chartData = curr.cumulative.map((r) => ({
        date: r.date,
        "뉴스 누적": r.newsCum,
        "여론 누적": r.socialCum,
      }));

      return {
        key: cat,
        title: CATEGORY_TITLE[cat],
        chartData,
        totals: { news: curr.totalNews, social: curr.totalSocial },
        changes: { news: changeNews, social: changeSocial },
      };
    });
  }, [data, sDate, eDate, prevWindow]);

  const hasAny = useMemo(() => {
    return CATEGORIES.some((cat) => {
      const days = dateRange(sDate!, eDate!);
      return days.some((d) =>
        newsTotalForDay(data?.[cat], d) > 0 || socialTotalForDay(data?.[cat], d) > 0
      );
    });
  }, [data, sDate, eDate]);

  if (!hasAny) {
    const first = keys[0];
    const last = keys.at(-1);
    return (
      <div className="text-sm text-neutral-600">
        선택한 기간 <b>{sDate} ~ {eDate}</b> 에 데이터가 없습니다.
        데이터 보유 범위는 <b>{first} ~ {last}</b> 입니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => {
        const upNews = c.changes.news >= 0 && c.changes.news !== Infinity;
        const upSoc = c.changes.social >= 0 && c.changes.social !== Infinity;

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
                  {nf.format(c.totals.news)}
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${upNews ? "text-emerald-600" : c.changes.news < 0 ? "text-rose-600" : "text-neutral-400"
                  }`}>
                  {c.changes.news === Infinity ? "∞" : (
                    <>
                      {c.changes.news > 0 && "▲"}
                      {c.changes.news < 0 && "▼"}
                      {c.changes.news === 0 && "-"}
                      {` ${Math.abs(c.changes.news).toFixed(1)}%`}
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-neutral-500">여론(찬·반) 합계</div>
                <div className="font-semibold text-xl text-neutral-900">
                  {nf.format(c.totals.social)}
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${upSoc ? "text-emerald-600" : c.changes.social < 0 ? "text-rose-600" : "text-neutral-400"
                  }`}>
                  {c.changes.social === Infinity ? "∞" : (
                    <>
                      {c.changes.social > 0 && "▲"}
                      {c.changes.social < 0 && "▼"}
                      {c.changes.social === 0 && "-"}
                      {` ${Math.abs(c.changes.social).toFixed(1)}%`}
                    </>
                  )}
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
                    wrapperStyle={{
                      zIndex: 50,
                      pointerEvents: "none",
                    }}
                    content={(props) => (
                      <TooltipContent
                        {...props}
                        catLabel={c.title}
                        changePct={
                          Math.abs(c.changes.news) >= Math.abs(c.changes.social)
                            ? c.changes.news
                            : c.changes.social
                        }
                      />
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
