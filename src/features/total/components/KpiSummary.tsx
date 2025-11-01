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
  data: any;                // /data/data.json
  startDate?: string;       // "YYYY-MM-DD"
  endDate?: string;         // "YYYY-MM-DD"
  period?: PeriodKey;       // app/page.tsx에서 쓰는 값 (현재 일별 계산)
};

/** 카테고리(법안) 라벨 */
const CATEGORIES: Array<keyof typeof CATEGORY_TITLE> = [
  "privacy",
  "child",
  "safety",
  "finance",
];

const CATEGORY_TITLE: Record<string, string> = {
  privacy: "privacy",
  child: "child",
  safety: "safety",
  finance: "finance",
};

/** 숫자 포매터 */
const nf = new Intl.NumberFormat("ko-KR");

/** YYYY-MM-DD (로컬) */
function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 날짜 문자열 증가 (inclusive) */
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

/** 기간 길이만큼 직전 기간의 [시작,끝] 구하기 */
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

/** 증감률 계산 */
function pctChange(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return Infinity;
  return ((curr - prev) / prev) * 100;
}

/** 하루 뉴스 합계 (중분류 count의 합) */
function newsTotalForDay(catObj: any, date: string) {
  const node = catObj?.news?.daily_timeline?.[date];
  if (!node) return 0;
  const mids = node["중분류목록"] || {};
  return Object.values<any>(mids).reduce((sum, m) => sum + (m?.count || 0), 0);
}

/** 하루 소셜 합계 (찬성+반대) */
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

/** Recharts용 툴팁 */
function TooltipContent({ active, payload, label, catLabel, changePct }: any) {
  if (!active || !payload?.length) return null;
  const p = payload.reduce((acc: any, cur: any) => {
    acc[cur.name] = cur.value;
    return acc;
  }, {});
  const newsCum = p["뉴스 누적"] ?? 0;
  const socialCum = p["여론 누적"] ?? 0;

  return (
    <div className="rounded-xl border border-white/70 bg-white/90 shadow p-3 text-xs text-neutral-700">
      <div className="font-semibold text-neutral-900 mb-1">{label}</div>
      <div className="space-y-0.5">
        <div>법안: <b>{catLabel}</b></div>
        <div>뉴스량 누적: <b>{nf.format(newsCum)}</b></div>
        <div>여론(찬·반) 누적: <b>{nf.format(socialCum)}</b></div>
        <div>이전동일기간 대비: <b>{changePct === Infinity ? "∞" : `${changePct.toFixed(1)}%`}</b></div>
      </div>
      <div className="mt-2 text-[11px] leading-4 text-neutral-500">
        핵심 인사이트: {label} 기준으로 <b>{catLabel}</b>의 관심도는
        뉴스와 여론 모두 누적으로 상승 추세입니다.
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
  // 입력 유효성 로그
  console.groupCollapsed("[KPI] props");
  console.log("startDate/endDate/period =", { startDate, endDate, period });
  console.log("data 존재여부 =", { hasData: !!data, keys: data ? Object.keys(data) : [] });
  // 보유 범위 로그
  const daily = data?.privacy?.news?.daily_timeline || {};
  const keys = Object.keys(daily).sort();
  console.log("보유범위(daily):", { first: keys[0], last: keys.at(-1), totalDays: keys.length });
  console.groupEnd();

  /** 안전장치: 날짜 미선택 시 일별 타임라인의 마지막 14일로 자동 설정 */
  const [sDate, eDate] = useMemo(() => {
    if (startDate && endDate) return [startDate, endDate] as const;
    const anyCat = data?.privacy?.news?.daily_timeline || {};
    const ks = Object.keys(anyCat).sort();
    const last = ks.at(-1);
    const first = ks.slice(-14)[0] || ks[0];
    return [first, last] as const;
  }, [data, startDate, endDate]);

  const prevWindow = useMemo(() => previousRange(sDate, eDate), [sDate, eDate]);

  // 핵심 기간 로그
  console.groupCollapsed("[KPI] 기간 디버그");
  console.log("입력기간:", { startDate, endDate });
  console.log("적용기간(sDate,eDate):", { sDate, eDate });
  console.log("직전기간(prevWindow):", prevWindow);
  console.groupEnd();

  const cards = useMemo(() => {
    const result = CATEGORIES.map((cat) => {
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

      // 카테고리별 합계/길이 로그
      console.groupCollapsed(`[KPI] ${cat} 합계/길이`);
      console.log("차트 일수:", curr.days.length, " (", sDate, "~", eDate, ")");
      console.log("현재기간 합계:", { news: curr.totalNews, social: curr.totalSocial });
      console.log("이전기간 합계:", { news: prev.totalNews, social: prev.totalSocial });
      console.log("증감률(%):", { news: changeNews, social: changeSocial });
      console.groupEnd();

      return {
        key: cat,
        title: CATEGORY_TITLE[cat],
        chartData,
        totals: { news: curr.totalNews, social: curr.totalSocial },
        changes: { news: changeNews, social: changeSocial },
      };
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sDate, eDate, prevWindow[0], prevWindow[1]]);

  // 선택 기간 내 데이터 유무 안내 (디버그 + UI)
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
    console.warn("[KPI] 선택 기간에 데이터 없음", { sDate, eDate, dataFirst: first, dataLast: last });
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
            className="rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-500 font-medium">{c.title}</div>
            </div>

            {/* 헤드 숫자 */}
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-neutral-500">뉴스량 합계</div>
                <div className="font-semibold text-xl text-neutral-900">
                  {nf.format(c.totals.news)}
                </div>
                <div className={`text-[11px] mt-0.5 ${upNews ? "text-emerald-600" : "text-rose-600"}`}>
                  {c.changes.news === Infinity ? "∞" : `${c.changes.news.toFixed(1)}%`}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-neutral-500">여론(찬·반) 합계</div>
                <div className="font-semibold text-xl text-neutral-900">
                  {nf.format(c.totals.social)}
                </div>
                <div className={`text-[11px] mt-0.5 ${upSoc ? "text-emerald-600" : "text-rose-600"}`}>
                  {c.changes.social === Infinity ? "∞" : `${c.changes.social.toFixed(1)}%`}
                </div>
              </div>
            </div>

            {/* 누적 AreaChart */}
            <div className="mt-3 h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gNews_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`gSoc_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#85b5d3" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#85b5d3" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>

                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <Tooltip
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
                    stroke="#CBD5E1"
                    fillOpacity={1}
                    fill={`url(#gNews_${c.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="여론 누적"
                    stroke="#85b5d3"
                    fillOpacity={1}
                    fill={`url(#gSoc_${c.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
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
