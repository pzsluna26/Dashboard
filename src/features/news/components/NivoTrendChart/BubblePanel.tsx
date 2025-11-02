// 뉴스분석
// 버블차트(중분류>소분류)

"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import InfoTooltip from "@/shared/layout/InfoTooltip";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Props = {
  title: string;
  option: any | null;
  date: string;
  onResetAll: () => void;
  onBackToMid?: () => void;
  hint: string;
  onNodeClick?: (nameOrId: string) => void;
  isSubCategory?: boolean;
  periodLabel: string;


  titleClass?: string;      // 제목 색
  textClass?: string;       // 기본 본문 색
  mutedTextClass?: string;  // 보조/설명 텍스트 색
};

export default function BubblePanel({
  title,
  option,
  onResetAll,
  onBackToMid,
  hint,
  date,
  onNodeClick,
  isSubCategory = false,
  periodLabel,


  titleClass = "text-neutral-800",
  textClass = "text-neutral-700",
  mutedTextClass = "text-neutral-600",
}: Props) {
  const safeOption = useMemo(() => {
    if (!option) {
      console.warn("option이 null입니다.");
      return null;
    }

    const cloned = JSON.parse(JSON.stringify(option));

    if (Array.isArray(cloned.series)) {
      const scope = `bubble:${title || "untitled"}`;
      cloned.series = cloned.series.map((s: any, seriesIdx: number) => {
        if (s?.type !== "graph" || !Array.isArray(s.data)) {
          console.warn(`series[${seriesIdx}]가 graph 타입이 아니거나 data 배열이 아닙니다.`);
          return s;
        }

        let data = s.data;

        if (isSubCategory) {
          data = [...data]
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
            .slice(0, 10);
        }

        s.data = data.map((d: any, idx: number) => {
          if (!d?.id) {
            const base = typeof d?.name === "string" ? d.name : `node-${idx}`;
            return { ...d, id: `${scope}#${base}#${idx}` };
          }
          return d;
        });

        return s;
      });
    } else {
      console.warn("option.series가 배열이 아닙니다.");
    }

    return cloned;
  }, [option, title, isSubCategory]);

  if (safeOption == null) {
    return (
      <div className={`bg-white backdrop-blur-md rounded-2xl p-5 border border-white/50 ${textClass}`}>
        그래프의<span className={`mx-1 font-semibold`}>정점(피크일)</span>을 클릭하면 버블차트를 확인할 수 있습니다.
      </div>
    );
  }

  return (
    <div className={`${textClass}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h4 style={{ fontFamily: "'Black Han Sans', sans-serif" }}
          className={`text-2xl text-neutral-600`}>{title}</h4>
          {/* <InfoTooltip iconSize={24}>
            <p><strong>{periodLabel}별</strong> 뉴스 언급량 피크일의 세부 정보를 나타낸 버블차트입니다.</p>
            <p className="mt-1">사건 테마를 클릭하면 해당 테마의 사건들을 확인할 수 있습니다.</p>
            <p className="mt-1">사건명을 클릭하면 관련 기사들을 확인할 수 있습니다.</p>
          </InfoTooltip> */}
        </div>

        <div className="flex gap-2">
          {onBackToMid && (
            <button
              className={`text-xs px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-white/60 ${textClass} hover:bg-white transition`}
              onClick={onBackToMid}
            >
              중분류로
            </button>
          )}
          <button
            className={`text-xs px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-white/60 ${textClass} hover:bg-white transition`}
            onClick={onResetAll}
          >
            초기화
          </button>
        </div>
      </div>

      {/* 차트 */}
      <div style={{ height: 300 }} className="bg-white/80 backdrop-blur-md rounded-2xl p-2 border border-white/20 mt-10">
        <ReactECharts
          option={safeOption}
          notMerge
          lazyUpdate
          style={{ height: 280 }}
          onEvents={
            onNodeClick
              ? {
                click: (params: any) => {
                  const key: string = (params?.data?.name as string) || (params?.data?.id as string);
                  if (key) onNodeClick(key);
                },
              }
              : undefined
          }
        />
      </div>

      {/* 보조 문구 */}
      {isSubCategory && (
        <p className={`${mutedTextClass} text-sm mt-3`}>소분류에서는 상위 10개 항목만 표시됩니다.</p>
      )}
      {!isSubCategory && <p className={`${mutedTextClass} text-xs`}>{hint}</p>}
    </div>
  );
}
