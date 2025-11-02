"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import NivoTrendChart from "@/features/news/components/NivoTrendChart/index";

import Nav from "@/shared/layout/Nav";

import { CATEGORIES } from "@/shared/constants/navigation";
import { PERIOD_LABEL_MAP } from "@/shared/constants/labels";

import type { PeriodKey, Sentiment } from "@/shared/types/common";
import PeriodSelect from "@/features/news/components/NivoTrendChart/PeriodSelect";

const PERIOD_API_MAP = {
  daily_timeline: "daily",
  weekly_timeline: "weekly",
  monthly_timeline: "monthly",
} as const;

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();

  const slugRaw = params?.slug as string | string[];
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;

  const [period, setPeriod] = useState<PeriodKey>("weekly_timeline");
  const [data, setData] = useState<any>(null);
  const [socialDetail, setSocialDetail] = useState<null | { date: string; sentiment: Sentiment }>(null);
  const [view, setView] = useState<"news" | "social">("news");

  const periodLabel = PERIOD_LABEL_MAP[period];
  const filteredCategories = useMemo(() => CATEGORIES.filter((c) => c.name !== "종합분석"), []);
  const currentCat = useMemo(
    () => filteredCategories.find((c) => c.key === slug) ?? filteredCategories[0],
    [slug, filteredCategories]
  );

  const newsResetRef = useRef<() => void>(() => {});
  const socialResetRef = useRef<() => void>(() => {});

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({
    first: null,
    second: null,
    third: null,
    fourth: null,
    fifth: null,
  });

  useEffect(() => {
  async function fetchData() {
    if (!slug || !period) return;

    const apiPeriod = PERIOD_API_MAP[period];

    try {
      // const res = await fetch(`http://10.125.121.213:8080/api/news/category/${slug}/${apiPeriod}`, {
      const res = await fetch("/data/data.json",{
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("❌ API fetch failed:", res.status);
        return;
      }

      const json = await res.json();

      // ✅ "아동복지법" 같은 최상위 키를 한 단계 풀기
      const firstKey = Object.keys(json)[0];
      const coreData = json[firstKey];

      // ✅ 기존 구조 맞춰 래핑
      const normalizedData = {
        news: {
          [period]: coreData.news?.[apiPeriod + "_timeline"] || coreData.news || {}
        },
        social: {
          [period]: coreData.social?.[apiPeriod + "_timeline"] || coreData.social || {}
        }
      };

      console.log("🟢 [Normalized Data]", normalizedData);
      setData(normalizedData);
      setSocialDetail(null);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
  }

  fetchData();
}, [slug, period]);



  useEffect(() => {
    if (view === "news") {
      setSocialDetail(null);
    }
  }, [view]);

  const newsByPeriod = data?.news?.[period] ?? {};
  const socialByPeriod = data?.social?.[period] ?? {};

  if (!data) {
    return (
      <div className="w-full h-screen grid place-items-center bg-white text-neutral-700">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full text-neutral-700 overflow-auto">
      {/* Sticky Nav */}
      <div className="z-10 sticky top-0">
        <Nav title={`${currentCat.name} 뉴스분석`} period={period} setPeriod={setPeriod} showSearch={true} />
      </div>

      {/* Section Navigation Buttons */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-6 z-50">
        {["first", "second", "third", "fourth", "fifth"].map((id) => (
          <button
            key={id}
            className="w-4 h-4 rounded-full bg-gray-400 hover:bg-gray-800 transition-all duration-300"
            onClick={() => {
              sectionRefs.current[id]?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex w-full h-full">
        <main className="flex-1 flex flex-col bg-white backdrop-blur-md shadow-[0_12px_40px_rgba(20,30,60,0.12)] overflow-y-auto scroll-smooth">
          {/* 1️⃣ 첫번째 섹션 - Hero 스타일 */}
          <div
            ref={(el) => (sectionRefs.current.first = el)}
            className="relative min-h-[40vh] flex items-center justify-center bg-white text-white"
          >
            <div className="absolute inset-0 z-0 overflow-hidden rounded-br-[250px]">
              <img
                src="/main/main1.jpg"
                alt="Dashboard Intro"
                className="w-full h-full object-cover brightness-90"
              />
              <div className="absolute inset-0 backdrop-blur-sm bg-black/40" />
            </div>

            <div className="relative z-10 w-[90%] mx-auto px-3 py-2 scroll-mt-[100px]">
              <h2 style={{ fontFamily: "'Black Han Sans', sans-serif" }} className="text-3xl md:text-5xl mt-20">
                '{currentCat.name}' 뉴스분석
              </h2>
              <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <p className="text-lg">
                  현재 <strong>{periodLabel}</strong> 단위로{" "}
                  <strong>{currentCat.name}</strong>이(가) 분석됩니다.
                </p>
                <PeriodSelect value={period} onChange={setPeriod} />
              </div>
            </div>
          </div>

          {/* 2️⃣ Nivo Chart 섹션 */}
          <div
            ref={(el) => (sectionRefs.current.second = el)}
            className="w-full bg-white flex items-center"
          >
            <div className="w-[80%] mx-auto">
              <div className="w-full mx-auto mt-10 mb-10">
                <NivoTrendChart
                  newsTimeline={newsByPeriod}
                  socialTimeline={socialByPeriod}
                  periodLabel={periodLabel}
                  view={view}
                  slug={slug}
                  setView={setView}
                  onSocialSliceClick={(date, sentiment) => {
                    setSocialDetail({ date, sentiment });
                  }}
                  onInitResetRef={(fn) => {
                    newsResetRef.current = fn;
                  }}
                  onSocialResetRef={(fn) => {
                    socialResetRef.current = fn;
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
