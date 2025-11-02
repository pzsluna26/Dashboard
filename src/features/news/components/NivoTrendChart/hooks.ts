"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { NewsTimeline, SocialTimeline, Sentiment } from "./types";

// 뉴스 초기 선택
export const useInitNewsSelection = (news?: NewsTimeline, sortedDates: string[] = []) => {
  const didInitRef = useRef(false);
  const [bubbleDate, setBubbleDate] = useState<string | null>(null);
  const [selectedMid, setSelectedMid] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<
    { title: string; url: string; content: string }[] | null
  >(null);

  useEffect(() => {
    if (didInitRef.current || !news || sortedDates.length === 0) return;

    let bestDate: string | null = null;
    let bestSum = -Infinity;
    for (const date of sortedDates) {
      const mids = news?.[date]?.중분류목록;
      if (!mids) continue;
      const sum = Object.values(mids).reduce((acc: number, v: any) => acc + (v?.count ?? 0), 0);
      if (sum > bestSum) {
        bestSum = sum;
        bestDate = date;
      }
    }

    if (!bestDate) return;

    const mids = news?.[bestDate]?.중분류목록;
    let bestMid: string | null = null;
    let bestMidVal = -Infinity;
    for (const [mid, v] of Object.entries(mids ?? {})) {
      const c = (v as any)?.count ?? 0;
      if (c > bestMidVal) {
        bestMidVal = c;
        bestMid = mid;
      }
    }

    let bestSub: string | null = null;
    let bestSubArticles: any[] | null = null;
    if (bestDate && bestMid) {
      const subMap = news?.[bestDate]?.중분류목록?.[bestMid]?.소분류목록 ?? {};
      let top = -Infinity;
      for (const obj of Object.values(subMap)) {
        const name = obj.소분류 ?? "-";
        const c = obj.count ?? 0;
        if (c > top) {
          top = c;
          bestSub = name;
          bestSubArticles = obj.articles ?? null;
        }
      }
    }

    setBubbleDate(bestDate);
    if (bestMid) setSelectedMid(bestMid);
    if (bestSub) {
      setSelectedSub(bestSub);
      setSelectedArticles(bestSubArticles ?? []);
    }

    didInitRef.current = true;
  }, [news, sortedDates]);

  // 뉴스 탭 클릭 시 초기화
  const resetToInitialNewsState = () => {
    setBubbleDate(null);
    setSelectedMid(null);
    setSelectedSub(null);
    setSelectedArticles(null);
  };

  return {
    bubbleDate, setBubbleDate,
    selectedMid, setSelectedMid,
    selectedSub, setSelectedSub,
    selectedArticles, setSelectedArticles,
    resetToInitialNewsState,
  };
};

// 소셜 초기 선택
export const useInitSocialSelection = (
  view: "news" | "social",
  social?: SocialTimeline,
  sortedDates: string[] = [],
  onSliceClick?: (date: string, sentiment: Sentiment) => void
) => {
  const [socialDate, setSocialDate] = useState<string | null>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (view !== "social" || !social || sortedDates.length === 0 || didInitRef.current) return;

    let maxDate: string | null = null;
    let maxCount = -Infinity;

    for (const date of sortedDates) {
      const count = social[date]?.counts?.찬성 ?? 0;
      if (count > maxCount) {
        maxCount = count;
        maxDate = date;
      }
    }

    if (maxDate) {
      setSocialDate(maxDate);
      onSliceClick?.(maxDate, "찬성");
      didInitRef.current = true;
    }
  }, [view, social, sortedDates, onSliceClick]);

  return { socialDate, setSocialDate };
};

// 소셜 완전 초기화 함수
export const useSocialReset = (setSocialDate: (v: string | null) => void) => {
  const resetToInitialSocialState = () => {
    setSocialDate(null);
  };
  return { resetToInitialSocialState };
};

// 날짜 정렬
export const useSortedDates = (news?: NewsTimeline, social?: SocialTimeline) => {
  return useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(news ?? {}),
      ...Object.keys(social ?? {}),
    ]);
    return Array.from(keys).sort();
  }, [news, social]);
};

// 뉴스 라인차트 데이터
export const useNewsSeries = (news: NewsTimeline | undefined, sortedDates: string[]) => {
  return useMemo(() => {
    if (!news || sortedDates.length === 0) return [];
    const points = sortedDates.map((date) => {
      const entry = news[date];
      const sum = entry?.중분류목록
        ? Object.values(entry.중분류목록).reduce((acc: number, v: any) => acc + (v?.count ?? 0), 0)
        : 0;
      return { x: date, y: sum };
    });
    return [{ id: "전체 합계", color: "#BBAB8C", data: points }];
  }, [news, sortedDates]);
};

// 소셜 라인차트 데이터
export const useSocialSeries = (social: SocialTimeline | undefined, sortedDates: string[]) => {
  return useMemo(() => {
    if (!social || sortedDates.length === 0) return [];
    const keys = ["찬성", "반대"] as const;
    const palette: Record<(typeof keys)[number], string> = {
      찬성: "#C1BAA1",
      반대: "#A59D84",
    };
    return keys.map((k) => ({
      id: k,
      color: palette[k],
      data: sortedDates.map((date) => ({
        x: date,
        y: (social[date]?.counts as Record<"찬성" | "반대", number>)?.[k] ?? 0,
      })),
    }));
  }, [social, sortedDates]);
};

// 버블 차트 노드
export const useBubbleNodes = (
  news?: NewsTimeline,
  bubbleDate?: string | null,
  selectedMid?: string | null
) => {
  const midNodes = useMemo(() => {
    if (!bubbleDate) return [];
    const mids = news?.[bubbleDate]?.중분류목록;
    if (!mids) return [];
    return Object.entries(mids).map(([mid, val]: any) => ({
      name: mid,
      value: val?.count ?? 0,
    }));
  }, [bubbleDate, news]);

  const subNodes = useMemo(() => {
    if (!bubbleDate || !selectedMid) return [];
    const subs = news?.[bubbleDate]?.중분류목록?.[selectedMid]?.소분류목록 ?? {};
    return Object.entries(subs).map(([subName, s]: [string, any]) => ({
      name: subName,
      value: s?.count ?? 0,
      articles: s?.articles ?? [],
    }));
  }, [bubbleDate, selectedMid, news]);

  const subByName = useMemo(() => {
    const map = new Map<string, { value: number; articles: any[] }>();
    subNodes.forEach((s) => map.set(s.name, { value: s.value, articles: s.articles }));
    return map;
  }, [subNodes]);

  return { midNodes, subNodes, subByName };
};

// ✅ 버블 차트 옵션 - 수정된 색상 적용
export const useBubbleOption = (nodes: any[], selectedMid: string | null) => {
  return useMemo(() => {
    if (!nodes.length) return null;
    const values = nodes.map((n) => n.value || 0);
    const vMin = Math.min(...values);
    const vMax = Math.max(...values);
    const sizeScale = (v: number) =>
      vMax === vMin ? 40 : 30 + ((v - vMin) / (vMax - vMin)) * 60;

    return {
      backgroundColor: "transparent",
      series: [
        {
          type: "graph",
          layout: "force",
          data: nodes.map((n) => ({
            ...n,
            symbolSize: sizeScale(n.value),
            draggable: true,
            label: {
              show: true,
              formatter: (p: any) => p.data.name,
              color: "#374151",
              fontSize: 12,
            },
            itemStyle: {
              color: {
                type: "radial",
                x: 0.5,
                y: 0.5,
                r: 0.9,
                colorStops: selectedMid
                  ? [
                      { offset: 0.0, color: "#BBAB8C" },
                      { offset: 0.33, color: "#DED0B6" },
                      { offset: 0.66, color: "#FAEED1" },
                      { offset: 1.0, color: "#FDF7E4" },
                    ]
                  : [
                     { offset: 0.0, color: "#BBAB8C" },
                      { offset: 0.33, color: "#DED0B6" },
                      { offset: 0.66, color: "#FAEED1" },
                      { offset: 1.0, color: "#FDF7E4" },
                    ],
              },
              shadowBlur: 12,
              shadowColor: "rgba(0, 0, 0, 0.12)",
              shadowOffsetX: 1,
              shadowOffsetY: 1,
            },
          })),
          force: { repulsion: 180, edgeLength: 10, gravity: 0.08 },
        },
      ],
    };
  }, [nodes, selectedMid]);
};

// 소셜 도넛 차트 옵션
export const useSocialOption = (social?: SocialTimeline, socialDate?: string | null) => {
  return useMemo(() => {
    if (!socialDate || !social) return null;
    const entry = social[socialDate];
    if (!entry) return null;
    const counts = entry.counts ?? { 찬성: 0, 반대: 0 };
    const total = counts.찬성 + counts.반대;

    return {
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (p: any) => `${p.name}: ${p.value}건 (${p.percent}%)`,
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#374151", fontSize: 12 },
      },
      series: [
        {
          name: "소셜 언급",
          type: "pie",
          radius: ["45%", "70%"],
          minAngle: 50,
          avoidLabelOverlap: true,
          label: {
            show: true,
            color: "#374151",
            fontSize: 13,
            formatter: (params: any) => `${params.name}\n${params.value}건`,
          },
          labelLine: { show: true, lineStyle: { color: "#6b7280" } },
          data: [
            { value: counts.찬성, name: "찬성", itemStyle: { color: "#DED0B6" } },
            { value: counts.반대, name: "반대", itemStyle: { color: "#BBAB8C" } },
          ],
        },
      ],
      graphic: total
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: `${total}\n총 언급`,
                fill: "#374151",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
              },
            },
          ]
        : undefined,
    };
  }, [social, socialDate]);
};
