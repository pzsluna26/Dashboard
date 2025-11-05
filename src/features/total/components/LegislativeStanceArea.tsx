"use client";

import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// const COLORS = {
//   disagree: "#FFCDB2",
//   repeal: "#ACE1AF",
//   agree: "#C7D9DD",
// };

const COLORS = {
  disagree: "#ffcdb2d7",
  repeal: "#9abef78f",
  agree: "#94a3b8c0",
};

// const COLORS = {
//   disagree: {
//     linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
//     stops: [
//       [0, "#FFD6C0"], // 상단 밝은색
//       [1, "#e07b7ba9"], // 하단 진한색
//     ],
//   },
//   repeal: {
//     linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
//     stops: [
//       [0, "#d7e6fdf5"],
//       [1, "#90b6f1ff"],
//     ],
//   },
//   agree: {
//     linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
//     stops: [
//       [0, "#c5d3e76c"],
//       [1, "#9da0a5ff"],
//     ],
//   },
// };

type RawPoint = {
  date: string;
  개정강화: number;
  폐지완화: number;
  현상유지: number;
};

type SeriesPoint = {
  y: number;
  custom: {
    count: number;
    total: number;
    date: string;
  };
};

/** ✅ KST 기준 날짜 포맷 */
const fmtKstDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

/** ✅ 고정된 기본 날짜(2025-08-13) 기준 최근 14일 구간 계산 */
const getDefaultRange = () => {
  const end = new Date("2025-08-13T23:59:59+09:00");
  const start = new Date(end.getTime() - 13 * 24 * 60 * 60 * 1000);
  return {
    start: fmtKstDate(start), // 예: 2025-07-31
    end: fmtKstDate(end),     // 예: 2025-08-13
  };
};

export default function LegislativeStanceAreaHC({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [rawData, setRawData] = useState<RawPoint[]>([]);

  // ✅ props가 비어 있으면 기본 날짜를 사용
  const { start: defaultStart, end: defaultEnd } = useMemo(() => getDefaultRange(), []);
  const effectiveStart = startDate || defaultStart;
  const effectiveEnd = endDate || defaultEnd;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!effectiveStart || !effectiveEnd) return;

        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/stance-area?start=${effectiveStart}&end=${effectiveEnd}`,
          { cache: "no-store" }
        );
        const json = await res.json();

        const data = Array.isArray(json.data) ? json.data : [];
        setRawData(data);
        console.log("✅ 패치된 데이터", { effectiveStart, effectiveEnd, data });
      } catch (err) {
        console.error("❌ Failed to fetch stance area data:", err);
      }
    };

    fetchData();
  }, [effectiveStart, effectiveEnd]);

  // 안전한 카테고리 처리
  const categories = rawData.map((d) =>
    d.date ? d.date.slice(5) : ""
  );

  const agreeSeries: SeriesPoint[] = rawData.map((d) => ({
    y: d["개정강화"],
    custom: {
      count: d["개정강화"],
      total: d["개정강화"] + d["폐지완화"] + d["현상유지"],
      date: d.date,
    },
  }));

  const repealSeries: SeriesPoint[] = rawData.map((d) => ({
    y: d["폐지완화"],
    custom: {
      count: d["폐지완화"],
      total: d["개정강화"] + d["폐지완화"] + d["현상유지"],
      date: d.date,
    },
  }));

  const disagreeSeries: SeriesPoint[] = rawData.map((d) => ({
    y: d["현상유지"],
    custom: {
      count: d["현상유지"],
      total: d["개정강화"] + d["폐지완화"] + d["현상유지"],
      date: d.date,
    },
  }));

  const summary = useMemo(() => {
    if (!agreeSeries.length) return null;
    const delta = (series: SeriesPoint[]) =>
      series[series.length - 1].y - series[0].y;
    return {
      agree: delta(agreeSeries),
      repeal: delta(repealSeries),
      disagree: delta(disagreeSeries),
    };
  }, [agreeSeries, repealSeries, disagreeSeries]);

  // const options: Highcharts.Options = {
  //   chart: {
  //     type: "area",
  //     height: 260,
  //     backgroundColor: "transparent",
  //   },
  //   title: { text: undefined },
  //   credits: { enabled: false },
  //   xAxis: {
  //     categories,
  //     labels: { style: { color: "#475569", fontSize: "11px" } },
  //   },
  //   yAxis: {
  //     min: 0,
  //     max: 100,
  //     tickInterval: 20,
  //     labels: {
  //       formatter: function () {
  //         return `${Math.round(this.value as number)}%`;
  //       },
  //       style: { color: "#475569", fontSize: "11px" },
  //     },
  //   },
  //   legend: { align: "right", verticalAlign: "top" },
  //   plotOptions: {
  //     area: { stacking: "percent", marker: { enabled: false } },
  //   },
  //   series: [
  //     { type: "area", name: "현상유지", color: COLORS.disagree, data: disagreeSeries },
  //     { type: "area", name: "폐지완화", color: COLORS.repeal, data: repealSeries },
  //     { type: "area", name: "개정강화", color: COLORS.agree, data: agreeSeries },
  //   ],
  // };
  const options: Highcharts.Options = {
  chart: {
    type: "area",
    height: 260,
    backgroundColor: "transparent",
  },
  title: { text: undefined },
  credits: { enabled: false },
  xAxis: {
    categories,
    labels: { style: { color: "#475569", fontSize: "11px" } },
  },
  yAxis: {
    min: 0,
    max: 100,
    tickInterval: 20,
    labels: {
      formatter: function () {
        return `${Math.round(this.value as number)}%`;
      },
      style: { color: "#475569", fontSize: "11px" },
    },
  },
  legend: { align: "right", verticalAlign: "top" },
  plotOptions: {
    area: {
      stacking: "percent",
      marker: { enabled: false },
      lineColor: "rgba(0,0,0,0.05)", // 얇은 라인으로 입체감
      lineWidth: 1,
      shadow: {
        color: "rgba(0,0,0,0.25)",
        width: 6,
        offsetX: 0,
        offsetY: 3,
      },
      states: {
        hover: {
          enabled: true,
          brightness: 0.05,
        },
      },
    },
  },
  // ✅ 3️⃣ series에 gradient 색상 적용
  series: [
    {
      type: "area",
      name: "현상유지",
      color: COLORS.disagree,
      data: disagreeSeries,
      fillOpacity: 0.8,
    },
    {
      type: "area",
      name: "폐지완화",
      color: COLORS.repeal,
      data: repealSeries,
      fillOpacity: 0.8,
    },
    {
      type: "area",
      name: "개정강화",
      color: COLORS.agree,
      data: agreeSeries,
      fillOpacity: 0.8,
    },
  ],
};


  return (
    <div className="w-full h-full flex flex-col">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { height: "100%", width: "100%" } }}
      />

      {summary && (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
            {([
              { key: "agree", label: "개정강화", color: COLORS.agree },
              { key: "repeal", label: "폐지완화", color: COLORS.repeal },
              { key: "disagree", label: "현상유지", color: COLORS.disagree },
            ] as const).map(({ key, label, color }) => {
              const delta = (summary as any)[key] as number;
              const up = delta >= 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-2 py-1"
                >
                  <span
                    className="inline-flex w-2 h-2 rounded-sm"
                    style={{ background: color }}
                  />
                  <span className="text-neutral-700">{label}</span>
                  <span className={up ? "text-emerald-600" : "text-rose-600"}>
                    {up ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* ✅ 핵심 인사이트 요약 */}
          <div className="mt-1 text-center text-[13px] text-neutral-600 font-medium bg-white/60 backdrop-blur rounded-lg px-4 py-2 border border-neutral-200">
            {(() => {
              const entries = [
                { key: "개정강화", value: summary.agree },
                { key: "폐지완화", value: summary.repeal },
                { key: "현상유지", value: summary.disagree },
              ];

              const sorted = [...entries].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
              const top = sorted[0];
              const bottom = sorted[2];

              const topTrend = top.value > 0 ? "증가" : "감소";
              const bottomTrend = bottom.value > 0 ? "증가" : "감소";

              return (
                <>
                  <b>종합 인사이트:</b>{" "}
                  <span className="text-neutral-700">{top.key}</span> 입장이 가장 크게 {topTrend}했고,{" "}
                  <span className="text-neutral-700">{bottom.key}</span> 입장은 상대적으로 {bottomTrend}폭이 작았습니다.
                </>
              );
            })()}
          </div>
        </>
      )}

    </div>
  );
}
