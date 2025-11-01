"use client";
import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

/**
 * LegislativeFieldHeatmap (Highcharts version, Turbopack-safe UMD init)
 * - heatmap 모듈: 전역 Highcharts 설정 → UMD 사이드이펙트 import
 * - 툴팁: 정확한 비율(%) + 댓글 수
 * - 팔레트: #FFCDB2 → #FFB4A2 → #E5989B → #B5828C (colorAxis.stops)
 */

export default function Heatmap({
  data,
  period = "weekly_timeline",
  startDate,
  endDate,
}: {
  data: any;
  period?: "daily_timeline" | "weekly_timeline" | "monthly_timeline";
  startDate?: string;
  endDate?: string;
}) {
  const [hcReady, setHcReady] = useState(false);

  // Highcharts heatmap 모듈 초기화 (UMD 사이드이펙트)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        // UMD가 window.Highcharts를 찾도록 설정
        (window as any).Highcharts = Highcharts;

        // Turbopack에서 ESM/CJS 꼬임 회피: 호출 없이 사이드이펙트 import
        await import("highcharts/modules/heatmap.js")
          .catch(async () => {
            // 일부 배포본에서 .js 확장자가 없을 수 있어 fallback
            await import("highcharts/modules/heatmap");
          });

        if (!cancelled) setHcReady(true);
      } catch (e) {
        console.error("Highcharts heatmap init failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { rows, cols, points, insights } = useMemo(() => {
    if (!data) {
      return {
        rows: [] as string[],
        cols: [] as string[],
        points: [] as { x: number; y: number; value: number; total: number }[],
        insights: [] as string[],
      };
    }

    const categories = Object.keys(data); // rows

    // 열(중분류) 추출
    let sampleEntry: any = null;
    if (period === "daily_timeline") {
      const anyCat = categories[0];
      const firstDate = Object.keys(data[anyCat]?.addsocial?.daily_timeline ?? {})[0];
      sampleEntry = data[anyCat]?.addsocial?.daily_timeline?.[firstDate];
    } else if (period === "weekly_timeline") {
      const anyCat = categories[0];
      const firstKey = Object.keys(data[anyCat]?.addsocial?.weekly_timeline ?? {})[0];
      sampleEntry = data[anyCat]?.addsocial?.weekly_timeline?.[firstKey];
    } else {
      const anyCat = categories[0];
      const firstKey = Object.keys(data[anyCat]?.addsocial?.monthly_timeline ?? {})[0];
      sampleEntry = data[anyCat]?.addsocial?.monthly_timeline?.[firstKey];
    }
    const cols = sampleEntry ? Object.keys(sampleEntry["중분류목록"] ?? {}) : [];

    const inRange = (key: string) => {
      if (period !== "daily_timeline" || !startDate || !endDate) return true;
      return key >= startDate && key <= endDate; // YYYY-MM-DD 문자열 비교
    };

    // 집계
    type Agg = { agree: number; disagree: number };
    const agg: Record<string, Record<string, Agg>> = {};
    for (const cat of categories) {
      agg[cat] = agg[cat] || {};
      for (const col of cols) agg[cat][col] = { agree: 0, disagree: 0 };

      const timeline = data[cat]?.addsocial?.[
        period === "daily_timeline" ? "daily_timeline" : period
      ] ?? {};

      for (const k of Object.keys(timeline)) {
        if (period === "daily_timeline" && !inRange(k)) continue;
        const entry = timeline[k];
        const mids = entry?.["중분류목록"] ?? {};
        for (const mid of Object.keys(mids)) {
          const subMap = mids[mid]?.["소분류목록"] ?? {};
          let agree = 0,
            disagree = 0;
          for (const subKey of Object.keys(subMap)) {
            const sc = subMap[subKey]?.counts ?? { 찬성: 0, 반대: 0 };
            agree += Number(sc["찬성"]) || 0;
            disagree += Number(sc["반대"]) || 0;
          }
          agg[cat][mid].agree += agree;
          agg[cat][mid].disagree += disagree;
        }
      }
    }

    // Highcharts heatmap 포인트
    type Pt = { x: number; y: number; value: number; total: number };
    const points: Pt[] = [];
    for (let y = 0; y < categories.length; y++) {
      const row = categories[y];
      for (let x = 0; x < cols.length; x++) {
        const col = cols[x];
        const a = agg[row][col];
        const total = (a?.agree ?? 0) + (a?.disagree ?? 0);
        const ratio = total > 0 ? a.agree / total : 0;
        points.push({ x, y, value: ratio, total });
      }
    }

    // 인사이트
    type Cell = { rowKey: string; colKey: string; ratio: number; total: number };
    const cells: Cell[] = [];
    for (let y = 0; y < categories.length; y++) {
      for (let x = 0; x < cols.length; x++) {
        const a = agg[categories[y]][cols[x]];
        const total = (a?.agree ?? 0) + (a?.disagree ?? 0);
        const ratio = total > 0 ? a.agree / total : 0;
        cells.push({ rowKey: categories[y], colKey: cols[x], ratio, total });
      }
    }
    const byRatioDesc = [...cells].sort((a, b) => b.ratio - a.ratio);
    const byRatioAsc = [...cells].sort((a, b) => a.ratio - b.ratio);
    const byTotalDesc = [...cells].sort((a, b) => b.total - a.total);
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    const insights: string[] = [];
    if (byRatioDesc[0])
      insights.push(
        `최고 찬성 비율: ${byRatioDesc[0].rowKey} · ${byRatioDesc[0].colKey} (${pct(
          byRatioDesc[0].ratio
        )}, 댓글 ${byRatioDesc[0].total.toLocaleString()}건)`
      );
    if (byRatioAsc[0])
      insights.push(
        `최저 찬성 비율: ${byRatioAsc[0].rowKey} · ${byRatioAsc[0].colKey} (${pct(
          byRatioAsc[0].ratio
        )}, 댓글 ${byRatioAsc[0].total.toLocaleString()}건)`
      );
    if (byTotalDesc[0])
      insights.push(
        `댓글 최다: ${byTotalDesc[0].rowKey} · ${byTotalDesc[0].colKey} (${byTotalDesc[0].total.toLocaleString()}건)`
      );

    return { rows: categories, cols, points, insights };
  }, [data, period, startDate, endDate]);

  // 차트 옵션
  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: "heatmap",
        height: 220,
        backgroundColor: "transparent",
        spacing: [10, 10, 10, 10],
        style: { fontFamily: "ui-sans-serif, system-ui, -apple-system" },
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: "right",
        verticalAlign: "top",
        layout: "vertical",
        symbolHeight: 120,
        margin: 16,
      },
      xAxis: {
        categories: cols,
        title: { text: "중분류" },
        labels: { style: { color: "#525252" } },
      },
      yAxis: {
        categories: rows,
        title: { text: "분야" },
        reversed: true,
        labels: { style: { color: "#525252" } },
      },
      colorAxis: {
        min: 0,
        max: 1,
        stops: [
          [0, "#FFCDB2"],
          [1 / 3, "#FFB4A2"],
          [2 / 3, "#e5989bb2"],
          [1, "#b5828caf"],
        ],
      },
      tooltip: {
        useHTML: true,
        formatter: function () {
          const xCat = (this.series.xAxis as any).categories[this.point.x];
          const yCat = (this.series.yAxis as any).categories[this.point.y];
          const ratio = (this.point as any).value as number;
          const total = (this.point as any).total as number;
          return `<div style="padding:4px 6px;">
            <div style="font-weight:600;margin-bottom:2px;">${yCat} · ${xCat}</div>
            <div>${(ratio * 100).toFixed(1)}% · 댓글 ${total.toLocaleString()}건</div>
          </div>`;
        },
      },
      series: [
        {
          type: "heatmap",
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            formatter: function () {
              return `${(((this.point as any).value as number) * 100).toFixed(0)}%`;
            },
            style: { color: "#222", textOutline: "none", fontSize: "10px" },
          },
          states: { hover: { enabled: true } },
          data: points as any,
        },
      ],
      responsive: {
        rules: [
          {
            condition: { maxWidth: 768 },
            chartOptions: {
              chart: { height: 300 },
              legend: { enabled: false },
              xAxis: { labels: { style: { fontSize: "10px" } } },
              yAxis: { labels: { style: { fontSize: "10px" } } },
              series: [{ dataLabels: { style: { fontSize: "9px" } } }] as any,
            },
          },
        ],
      },
    }),
    [rows, cols, points]
  );

  if (!hcReady) {
    return (
      <div className="w-full h-full grid place-items-center text-neutral-400">
        차트 모듈 로딩 중…
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 p-2">
        <HighchartsReact highcharts={Highcharts} options={options} immutable />
      </div>

      {/* 인사이트 */}
      <div className="mt-3 text-xs text-neutral-700 space-y-1">
        {insights.map((line, i) => (
          <div key={i}>• {line}</div>
        ))}
        {insights.length === 0 && (
          <div className="text-neutral-500">표시할 인사이트가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
