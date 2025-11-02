// 뉴스분석
// 시계열 라인 차트

"use client";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useMemo } from "react";

type Props = {
  view: "news" | "social";
  data: Array<{
    id: string;
    color?: string;
    data: Array<{ x: string; y: number }>;
  }>;
  yLegend: string;
  periodLabel?: string;
  onMaxPointClick: (date: string) => void;
  height?: number;
};

export default function LineChartHighcharts({
  view,
  data,
  yLegend,
  periodLabel,
  onMaxPointClick,
  height = 300,
}: Props) {
  // 공통 X축 범주
  const categories = useMemo(() => {
    const s = new Set<string>();
    data.forEach((d) => d.data.forEach((p) => s.add(p.x)));
    return Array.from(s).sort();
  }, [data]);

  // 🎨 Gradiation 색상 스탑 정의
 const gradientStops = [
  // [0, "rgba(165, 157, 132, 0.3)"],   // #A59D84
    [0, "rgba(108, 141, 101, 0.3)"],   // #A59D84
  [0.33, "rgba(193, 186, 161, 0.2)"], // #C1BAA1
  [0.66, "rgba(215, 211, 191, 0.1)"], // #D7D3BF
  [1, "rgba(236, 235, 222, 0.05)"],   // #ECEBDE
];

  // 시리즈 데이터 변환
  const series = useMemo(() => {
    return data.map((line) => {
      // max point 찾기
      const maxPoint = line.data.reduce((max, cur) => (cur.y > max.y ? cur : max), line.data[0]);

      return {
        type: "areaspline",
        name: line.id,
        color: line.color ?? "#A59D84", // fallback
        data: line.data.map((point) => ({
          name: point.x,
          y: point.y,
          marker: {
            enabled: point.x === maxPoint.x,
            radius: 6,
            fillColor: "#3396D3", // Max point 표시용 색상
            lineWidth: 2,
            lineColor: "#fff",
          },
        })),
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: gradientStops,
        },
        fillOpacity: 1,
        marker: {
          enabled: false,
        },
        point: {
          events: {
            click: function () {
              onMaxPointClick(this.category as string);
            },
          },
        },
      };
    });
  }, [data, onMaxPointClick]);

  // 차트 옵션 정의
  const chartOptions: Highcharts.Options = {
    chart: {
      type: "spline", // 곡선
      height,
      backgroundColor: "rgba(255,255,255,0.7)",
      style: {
        fontFamily: "Noto Sans KR",
      },
    },
    title: { text: undefined },
    xAxis: {
      categories,
      title: {
        text: periodLabel ? `${periodLabel} 단위` : undefined,
      },
      labels: {
        rotation: -35,
      },
    },
    yAxis: {
      title: {
        text: yLegend,
      },
    },
    tooltip: {
      shared: true,
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 1,
      },
      series: {
        marker: {
          enabled: false,
        },
      },
    },
    legend: {
      enabled: view === "social",
      align: "right",
      verticalAlign: "top",
      layout: "vertical",
    },
    series: series as Highcharts.SeriesOptionsType[],
  };

  return <HighchartsReact highcharts={Highcharts} options={chartOptions} />;
}
