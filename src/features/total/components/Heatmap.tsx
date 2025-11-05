"use client";

import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

/* =========================
   타입 정의
========================= */
type LawDatum = {
  name: string;
  개정강화: number;
  폐지완화: number;
  현상유지: number;
};
type ApiResp = { laws: LawDatum[] };

const COLS = ["개정강화", "폐지완화", "현상유지"] as const;
type BucketKey = (typeof COLS)[number];

/* =========================
   날짜 계산 유틸
========================= */
const fmtKstDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

const getDefaultRange = () => {
  const end = new Date("2025-08-13T23:59:59+09:00");
  const start = new Date(end.getTime() - 13 * 24 * 60 * 60 * 1000); // 14일 포함
  return { start: fmtKstDate(start), end: fmtKstDate(end) };
};


const Y_AXIS_LABEL_MAP: Record<string, string> = {
  "자본시장법,특정금융정보법,전자금융거래법,전자증권법,금융소비자보호법": "금융관련법",
  "개인정보보호법,정보통신망법": "개인정보관련법",
  "중대재해처벌법": "중대재해처벌법",
  "아동복지법": "아동복지법",
};

/* =========================
   메인 컴포넌트
========================= */
export default function Heatmap({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const [hcReady, setHcReady] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [laws, setLaws] = useState<LawDatum[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ start, end를 외부 props 기반으로 결정
  const { start, end } = useMemo(() => {
    if (startDate && endDate) return { start: startDate, end: endDate };
    return getDefaultRange();
  }, [startDate, endDate]);

  /* =========================
     Highcharts heatmap 모듈 로드
  ========================== */
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

  /* =========================
     서버 데이터 패치
  ========================== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setFetchErr(null);

        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/heatmap?start=${start}&end=${end}`,
          { method: "GET", cache: "no-store" }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const data: ApiResp = await res.json();
        if (!data || !Array.isArray(data.laws)) throw new Error("Unexpected API shape");

        if (!cancelled) setLaws(data.laws);
        console.log("data", data)
      } catch (err: any) {
        if (!cancelled) {
          console.error("❌ Heatmap fetch 실패:", err);
          setFetchErr(err?.message || "Failed to fetch");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [start, end]);

  /* =========================
     데이터 정규화 + 인사이트 계산
  ========================== */
  const { rows, points, insightText } = useMemo(() => {
    if (!laws.length)
      return { rows: [], points: [], insightText: "데이터가 없습니다." };

    const toRatioPct = (v: number) =>
      v > 1 ? { ratio: v / 100, pct: v } : { ratio: v, pct: v * 100 };

    const rows = laws.map((d) => Y_AXIS_LABEL_MAP[d.name] || d.name);
    const points = laws.flatMap((row, y) => {
      const reinforce = row.개정강화 ?? 0;
      const repeal = row.폐지완화 ?? 0;
      const oppose = row.현상유지 ?? 0;
      const total = reinforce + repeal + oppose;

      return COLS.map((key, x) => {
        const count = row[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return { x, y, value: pct / 100, pct }; // value는 0~1, pct는 0~100
      });
    });


    type Cell = { rowKey: string; colKey: BucketKey; ratio: number; pct: number };
    const cells: Cell[] = points.map((p) => ({
      rowKey: rows[p.y],
      colKey: COLS[p.x] as BucketKey,
      ratio: p.value,
      pct: p.pct,
    }));

    const byRatioDesc = [...cells].sort((a, b) => b.ratio - a.ratio);
    const byRatioAsc = [...cells].sort((a, b) => a.ratio - b.ratio);
    const byPctDesc = [...cells].sort((a, b) => b.pct - a.pct);
    const pctFmt = (x: number) => `${x.toFixed(1)}%`;

    const parts: string[] = [];
    if (byRatioDesc[0])
      parts.push(
        `최고 비율: ${byRatioDesc[0].rowKey}·${byRatioDesc[0].colKey} ${pctFmt(
          byRatioDesc[0].pct
        )}`
      );
    if (byRatioAsc[0])
      parts.push(
        `최저 비율: ${byRatioAsc[0].rowKey}·${byRatioAsc[0].colKey} ${pctFmt(
          byRatioAsc[0].pct
        )}`
      );
    if (byPctDesc[0])
      parts.push(
        `절대값 최다: ${byPctDesc[0].rowKey}·${byPctDesc[0].colKey} ${pctFmt(
          byPctDesc[0].pct
        )}`
      );

    const insightText = parts.join("  •  ");
    return { rows, points, insightText };
  }, [laws]);

  /* =========================
     Highcharts 옵션
  ========================== */
  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: "heatmap",
        height: 290,
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
        categories: COLS as any,
        title: { text: "의견 유형" },
        labels: { style: { color: "#525252" } },
      },
      yAxis: {
        categories: rows as any,
        title: { text: "법령(분야)" },
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
          const self = this as any;
          const xCat = self.series.xAxis.categories[self.point.x];
          const yCatRaw = self.series.yAxis.categories[self.point.y];
          const yCat = Y_AXIS_LABEL_MAP[yCatRaw] || yCatRaw;
          const pct = self.point.pct as number;
          // const xCat = (this.series.xAxis as any).categories[this.point.x];
          // const yCat = (this.series.yAxis as any).categories[this.point.y];
          // const pct = (this as any).pct as number;
          return `<div style="padding:4px 6px;">
            <div style="font-weight:600;margin-bottom:2px;">${yCat} · ${xCat}</div>
            <div>${pct.toFixed(1)}%</div>
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
              const pct = (this as any).pct as number;
              return `${pct.toFixed(0)}%`;
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
            condition: { maxWidth: 800 },
            chartOptions: {
              chart: { height: 280 },
              legend: { enabled: false },
              xAxis: { labels: { style: { fontSize: "10px" } } },
              yAxis: { labels: { style: { fontSize: "10px" } } },
              series: [
                { dataLabels: { style: { fontSize: "9px" } } },
              ] as any,
            },
          },
        ],
      },
    }),
    [rows, points]
  );

  /* =========================
     렌더링
  ========================== */
  if (!hcReady)
    return (
      <div className="w-full h-full grid place-items-center text-neutral-400">
        차트 모듈 로딩 중…
      </div>
    );

  if (loading)
    return (
      <div className="w-full h-full grid place-items-center text-neutral-400">
        데이터 불러오는 중…
      </div>
    );

  if (fetchErr)
    return (
      <div className="w-full h-full grid place-items-center text-rose-500">
        ❌ 데이터 로드 실패: {fetchErr}
      </div>
    );

  if (!laws.length)
    return (
      <div className="w-full h-full grid place-items-center text-neutral-400">
        데이터가 없습니다.
      </div>
    );

  return (
    <div className="w-full h-[340px] flex flex-col">
      <div className="rounded-2xl bg-white/55 backdrop-blur-md border border-white/60 ">
        <HighchartsReact highcharts={Highcharts} options={options} immutable />
      </div>

      <div className="text-xs mt-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm text-neutral-800">
          {insightText && insightText.length > 0
            ? insightText
            : "표시할 인사이트가 없습니다."}
        </div>
      </div>
    </div>
  );
}
