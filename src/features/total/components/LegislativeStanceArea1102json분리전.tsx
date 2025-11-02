"use client";

import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

export interface Props {
  data: any;             // /data/data.json 전체 원본
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  period?: string;       // (미사용) 주간 기본
}

// 지정 색상
const COLORS = {
  disagree: "#FFCDB2", // 반대(현상유지)
  repeal: "#ACE1AF",   // 폐지완화(=폐지약화)
  agree: "#C7D9DD",    // 개정강화
};

// 안전한 숫자 변환
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;

// "2025-W30" → 실제 시작일(월요일)
function weekKeyToDate(key: string): Date | null {
  const m = key.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return null;
  const [, y, w] = m;
  const jan4 = new Date(Number(y), 0, 4);
  const start = new Date(jan4);
  const day = jan4.getDay() || 7;
  start.setDate(jan4.getDate() - day + 1 + (Number(w) - 1) * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

function fmtDateLabel(ymd: string) {
  // "YYYY-MM-DD" → "MM-DD"
  return ymd.slice(5).replace("-", "-");
}

function fmtWeekLabel(weekKey: string) {
  const [year, wk] = weekKey.split("-W");
  return `${year.slice(2)}년 W${Number(wk)}`;
}

type SeriesPoint = Highcharts.PointOptionsObject & {
  custom?: { count: number; total: number; key: string };
};

function buildSeries(data: any, startDate?: string, endDate?: string) {
  const domains = Object.keys(data || {});
  const useDailySlice = Boolean(startDate && endDate);

  // 공통 집계 구조
  type Agg = { agree: number; repeal: number; disagree: number; total: number };
  const agg: Record<string, Agg> = {}; // key: 날짜(YYYY-MM-DD) 또는 주차(YYYY-Wxx)

  for (const dom of domains) {
    const root = data[dom]?.addsocial ?? {};
    if (useDailySlice) {
      // ✅ 기간이 지정되면 항상 daily_timeline만 사용
      const tl = root["daily_timeline"] || {};
      for (const k of Object.keys(tl)) {
        if (!(k >= (startDate as string) && k <= (endDate as string))) continue; // 문자열 비교(YYYY-MM-DD)
        const mids = tl[k]?.["중분류목록"] ?? {};
        let agree = 0, repeal = 0, disagree = 0;
        for (const mid of Object.keys(mids)) {
          const subs = mids[mid]?.["소분류목록"] ?? {};
          for (const subKey of Object.keys(subs)) {
            const sub = subs[subKey] ?? {};
            const gaejeong = num(sub?.["찬성"]?.["개정강화"]?.count);
            const paejiYakhwa = num(sub?.["찬성"]?.["폐지약화"]?.count);
            const paejiWanhwa = num(sub?.["찬성"]?.["폐지완화"]?.count);
            const paeji = paejiYakhwa || paejiWanhwa;

            const bandae =
              num(sub?.counts?.["반대"]) ||
              (Array.isArray(sub?.["반대"]?.["소셜목록"]) ? sub["반대"]["소셜목록"].length : 0);

            agree += gaejeong;
            repeal += paeji;
            disagree += bandae;
          }
        }
        if (!agg[k]) agg[k] = { agree: 0, repeal: 0, disagree: 0, total: 0 };
        agg[k].agree += agree;
        agg[k].repeal += repeal;
        agg[k].disagree += disagree;
        agg[k].total += agree + repeal + disagree;
      }
    } else {
      // ⛳ 기간이 없으면 기존처럼 주간 집계
      const tl = root["weekly_timeline"] || {};
      for (const k of Object.keys(tl)) {
        const mids = tl[k]?.["중분류목록"] ?? {};
        let agree = 0, repeal = 0, disagree = 0;
        for (const mid of Object.keys(mids)) {
          const subs = mids[mid]?.["소분류목록"] ?? {};
          for (const subKey of Object.keys(subs)) {
            const sub = subs[subKey] ?? {};
            const gaejeong = num(sub?.["찬성"]?.["개정강화"]?.count);
            const paejiYakhwa = num(sub?.["찬성"]?.["폐지약화"]?.count);
            const paejiWanhwa = num(sub?.["찬성"]?.["폐지완화"]?.count);
            const paeji = paejiYakhwa || paejiWanhwa;

            const bandae =
              num(sub?.counts?.["반대"]) ||
              (Array.isArray(sub?.["반대"]?.["소셜목록"]) ? sub["반대"]["소셜목록"].length : 0);

            agree += gaejeong;
            repeal += paeji;
            disagree += bandae;
          }
        }
        if (!agg[k]) agg[k] = { agree: 0, repeal: 0, disagree: 0, total: 0 };
        agg[k].agree += agree;
        agg[k].repeal += repeal;
        agg[k].disagree += disagree;
        agg[k].total += agree + repeal + disagree;
      }
    }
  }

  // 정렬 및 카테고리/시리즈 만들기
  const keys = Object.keys(agg).sort((a, b) => {
    if (useDailySlice) {
      return new Date(a).getTime() - new Date(b).getTime();
    } else {
      const ad = weekKeyToDate(a) ?? new Date(0);
      const bd = weekKeyToDate(b) ?? new Date(0);
      return ad.getTime() - bd.getTime();
    }
  });

  const categories = keys.map(k => useDailySlice ? fmtDateLabel(k) : fmtWeekLabel(k));

  const make = (sel: (x: Agg) => number): SeriesPoint[] =>
    keys.map(k => {
      const item = agg[k];
      const tot = Math.max(item.total, 1);
      return {
        y: (sel(item) / tot) * 100,
        custom: { count: sel(item), total: item.total, key: k },
      };
    });

  return {
    categories,
    agreeSeries: make(x => x.agree),
    repealSeries: make(x => x.repeal),
    disagreeSeries: make(x => x.disagree),
  };
}

export default function LegislativeStanceAreaHC({
  data,
  startDate,
  endDate,
}: Props) {
  const { categories, agreeSeries, repealSeries, disagreeSeries } = useMemo(
    () => buildSeries(data, startDate, endDate),
    [data, startDate, endDate]
  );

  const summary = useMemo(() => {
    if (!agreeSeries.length) return null;
    const delta = (series: SeriesPoint[]) =>
      (series[series.length - 1].y as number) - (series[0].y as number);
    return {
      agree: delta(agreeSeries),
      repeal: delta(repealSeries),
      disagree: delta(disagreeSeries),
    };
  }, [agreeSeries, repealSeries, disagreeSeries]);

  if (!categories.length) {
    return (
      <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
        선택된 기간에 해당하는 데이터가 없습니다.
      </div>
    );
  }

  const options: Highcharts.Options = {
    chart: {
      type: "area",
      height: 260,
      backgroundColor: "transparent",
      spacing: [10, 12, 8, 0],
      style: { fontFamily: "inherit" },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories,
      tickLength: 0,
      lineColor: "#e5e7eb",
      labels: { style: { color: "#475569", fontSize: "11px" } },
    },
    yAxis: {
      min: 0,
      max: 100,
      tickInterval: 20,
      gridLineColor: "#e5e7eb",
      labels: {
        formatter: function () {
          return `${Math.round(this.value as number)}%`;
        },
        style: { color: "#475569", fontSize: "11px" },
      },
    },
    legend: {
      align: "right",
      verticalAlign: "top",
      itemStyle: { color: "#334155", fontSize: "11px" },
      symbolRadius: 2,
    },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#e5e7eb",
      borderRadius: 10,
      padding: 10,
      formatter: function () {
        const pts = (this as any).points as Highcharts.TooltipFormatterContextObject[];
        const label = (this as any).x as string;
        const rows = pts.map((p) => {
          const name = p.series.name;
          const color = p.color as string;
          const pct = (p.point.y as number) ?? 0;
          const cnt = (p.point as any).custom?.count ?? 0;
          return `<div style="display:flex;align-items:center;gap:6px;">
              <span style="width:8px;height:8px;background:${color};border-radius:2px;"></span>
              <span>${name}:</span><b>${pct.toFixed(1)}%</b>
              <span style="opacity:.7;">(${cnt.toLocaleString()}건)</span>
            </div>`;
        }).join("");
        const total = (pts[0].point as any).custom?.total ?? 0;
        return `<div style="font-size:12px;">
          <div style="font-weight:600;margin-bottom:6px;">${label}</div>
          ${rows}
          <div style="margin-top:6px;font-size:11px;color:#64748b;">총 ${total.toLocaleString()}건</div>
        </div>`;
      },
    },
    plotOptions: {
      area: {
        stacking: "percent",
        marker: { enabled: false, radius: 2 },
        lineWidth: 1.5,
        fillOpacity: 0.6,
      },
      series: { animation: { duration: 350 } },
    },
    series: [
      { type: "area", name: "반대", color: COLORS.disagree, data: disagreeSeries },
      { type: "area", name: "폐지완화", color: COLORS.repeal, data: repealSeries },
      { type: "area", name: "개정강화", color: COLORS.agree, data: agreeSeries },
    ],
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          containerProps={{ style: { height: "100%", width: "100%" } }}
        />
      </div>

      {summary && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
          {([
            { key: "agree", label: "개정강화", color: COLORS.agree },
            { key: "repeal", label: "폐지완화", color: COLORS.repeal },
            { key: "disagree", label: "반대", color: COLORS.disagree },
          ] as const).map(({ key, label, color }) => {
            const delta = (summary as any)[key] as number;
            const up = delta >= 0;
            return (
              <div key={key} className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-2 py-1">
                <span className="inline-flex w-2 h-2 rounded-sm" style={{ background: color }} />
                <span className="text-neutral-700">{label}</span>
                <span className={up ? "text-emerald-600" : "text-rose-600"}>
                  {up ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
