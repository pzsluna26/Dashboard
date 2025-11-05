// 종합분석(누적그래프,핵심인사이트)
// 법안별 날짜, 뉴스합계, 소셜합계, 디테일(메타정보)
// trend

import type { PeriodKey, CategoryKey } from "@/shared/types/common";
import type { Detail } from "@/shared/types/common";
import { getSocialValue } from "@/shared/utils/computeKpis"; 

type LawTrendChartData = {
  name: CategoryKey;
  data: {
    date: string;
    news: number;
    social: number;
    detail?: Detail;
    rawSocial?: any;
  }[];
};

export function transformRawData(
  raw: any, 
  period: PeriodKey
): LawTrendChartData[] {
  if (!raw?.all) {
    console.warn("⚠️ transformRawData: Invalid data structure", raw);
    return [];
  }

  const newsTimeline = raw.all.news?.[period] || {};
  const socialTimeline = raw.all.social?.[period] || {};


  const firstKey = Object.keys(newsTimeline)[0];
  const categories =
    firstKey && newsTimeline[firstKey]?.["대분류목록"]
      ? Object.keys(newsTimeline[firstKey]["대분류목록"])
      : [];

  return categories.map((category) => {
 
    const dates = Object.keys(newsTimeline).sort();

    const entries = dates.map((date) => {
      const newsEntry = newsTimeline[date];
      const socialEntry = socialTimeline[date];

     
      const categoryNews =
        newsEntry?.["대분류목록"]?.[category]?.["중분류목록"] || {};
      const categorySocial =
        socialEntry?.["대분류목록"]?.[category]?.["중분류목록"] || {};


      let detail: Detail | undefined;
      let bestMid: string | null = null;
      let bestMidCount = -1;

      for (const [mid, midData] of Object.entries<any>(categoryNews)) {
        const c = midData.count || 0;
        if (c > bestMidCount) {
          bestMidCount = c;
          bestMid = mid;
        }
      }

   
      let bestSub: { name: string; count: number; article?: any } | null = null;
      if (bestMid) {
        const subList = (categoryNews[bestMid] as any)?.["소분류목록"] || {};
        for (const [subName, subData] of Object.entries<any>(subList)) {
          const c = subData.count || 0;
          if (!bestSub || c > bestSub.count) {
            bestSub = {
              name: subName,
              count: c,
              article: subData.articles?.[0],
            };
          }
        }

        if (!bestSub) {
          bestSub = {
            name: "(소분류 없음)",
            count: (categoryNews[bestMid] as any)?.count || 0,
            article: undefined,
          };
        }

        detail = {
          mid: bestMid,
          sub: { title: bestSub.name },
          count: bestSub.count,
          article: bestSub.article,
        };
      }

 
      const rawSocial = socialEntry?.counts ?? {};
      const socialTotal = getSocialValue(rawSocial);

      const newsTotal = Object.values(categoryNews).reduce(
        (sum: number, mid: any) => sum + (mid.count || 0),
        0
      );

      return {
        date,
        news: newsTotal,
        social: socialTotal,
        detail,
        rawSocial,
      };
    });

    return { name: category as CategoryKey, data: entries };
  });
}
