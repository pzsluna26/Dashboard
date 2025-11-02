"use client";
import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

/**
 * LegislativeFieldHeatmap (Highcharts version, Turbopack-safe UMD init)
 * 방법 A 적용: 사용자가 기간(startDate/endDate)을 지정하면
 * 언제나 daily_timeline을 해당 구간으로 슬라이스해 집계합니다.
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
        (window as any).Highcharts = Highcharts;
        await import("highcharts/modules/heatmap.js").catch(async () => {
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

    const rows = Object.keys(data); // 분야 (y축)
    const cols = ["개정강화", "폐지약화", "현상유지"] as const;

    // ✅ 방법 A: 기간이 지정되면 항상 daily 슬라이스 사용
    const useDailySlice = Boolean(startDate && endDate);

    type BucketKey = (typeof cols)[number];
    const agg: Record<string, Record<BucketKey, number>> = {};

    for (const row of rows) {
      agg[row] = { "개정강화": 0, "폐지약화": 0, "현상유지": 0 };

      // 타임라인 선택
      const timeline =
        useDailySlice
          ? (data[row]?.addsocial?.["daily_timeline"] ?? {})
          : (data[row]?.addsocial?.[
              period === "daily_timeline" ? "daily_timeline" : period
            ] ?? {});

      for (const k of Object.keys(timeline)) {
        // 키 필터: daily 슬라이스인 경우에만 날짜 범위 적용
        if (useDailySlice) {
          // YYYY-MM-DD 문자열 비교 전제
          if (!(k >= (startDate as string) && k <= (endDate as string))) continue;
        }

        const entry = timeline[k];
        const mids = entry?.["중분류목록"] ?? {};

        for (const mid of Object.keys(mids)) {
          const subMap = mids[mid]?.["소분류목록"] ?? {};

          for (const subKey of Object.keys(subMap)) {
            const sub = subMap[subKey] ?? {};

            const gaejeong = Number(sub?.["찬성"]?.["개정강화"]?.count ?? 0);

            // "폐지약화" vs "폐지완화" 호환
            const paejiYakhwa = Number(sub?.["찬성"]?.["폐지약화"]?.count ?? 0);
            const paejiWanhwa = Number(sub?.["찬성"]?.["폐지완화"]?.count ?? 0);
            const paeji = paejiYakhwa || paejiWanhwa;

            // 현상유지: counts["현상유지"] 우선, 없으면 소셜목록 길이
            const bandae =
              Number(sub?.counts?.["현상유지"]) ||
              (Array.isArray(sub?.["현상유지"]?.["소셜목록"])
                ? sub["현상유지"]["소셜목록"].length
                : 0);

            agg[row]["개정강화"] += gaejeong;
            agg[row]["폐지약화"] += paeji;
            agg[row]["현상유지"] += bandae;
          }
        }
      }
    }

    // 포인트 구성
    type Pt = { x: number; y: number; value: number; total: number };
    const points: Pt[] = [];

    for (let y = 0; y < rows.length; y++) {
      const rowKey = rows[y];
      const rowTotal =
        agg[rowKey]["개정강화"] + agg[rowKey]["폐지약화"] + agg[rowKey]["현상유지"];

      for (let x = 0; x < cols.length; x++) {
        const colKey = cols[x];
        const bucket = agg[rowKey][colKey];
        const ratio = rowTotal > 0 ? bucket / rowTotal : 0;
        points.push({ x, y, value: ratio, total: bucket });
      }
    }

    // 인사이트
    type Cell = { rowKey: string; colKey: BucketKey; ratio: number; total: number };
    const cells: Cell[] = [];
    for (let y = 0; y < rows.length; y++) {
      const rowKey = rows[y];
      const rowTotal =
        agg[rowKey]["개정강화"] + agg[rowKey]["폐지약화"] + agg[rowKey]["현상유지"];
      for (let x = 0; x < cols.length; x++) {
        const colKey = cols[x];
        const bucket = agg[rowKey][colKey];
        const ratio = rowTotal > 0 ? bucket / rowTotal : 0;
        cells.push({ rowKey, colKey, ratio, total: bucket });
      }
    }

    const byRatioDesc = [...cells].sort((a, b) => b.ratio - a.ratio);
    const byRatioAsc = [...cells].sort((a, b) => a.ratio - b.ratio);
    const byTotalDesc = [...cells].sort((a, b) => b.total - a.total);
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    const insights: string[] = [];
    if (byRatioDesc[0])
      insights.push(
        `최고 비율: ${byRatioDesc[0].rowKey} · ${byRatioDesc[0].colKey} (${pct(
          byRatioDesc[0].ratio
        )}, 댓글 ${byRatioDesc[0].total.toLocaleString()}건)`
      );
    if (byRatioAsc[0])
      insights.push(
        `최저 비율: ${byRatioAsc[0].rowKey} · ${byRatioAsc[0].colKey} (${pct(
          byRatioAsc[0].ratio
        )}, 댓글 ${byRatioAsc[0].total.toLocaleString()}건)`
      );
    if (byTotalDesc[0])
      insights.push(
        `댓글 최다: ${byTotalDesc[0].rowKey} · ${byTotalDesc[0].colKey} (${byTotalDesc[0].total.toLocaleString()}건)`
      );

    return { rows, cols: Array.from(cols), points, insights };
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
        categories: cols as any,
        title: { text: "의견 유형" },
        labels: { style: { color: "#525252" } },
      },
      yAxis: {
        categories: rows as any,
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
