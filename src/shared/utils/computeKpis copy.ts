import { KpiItem, PeriodKey } from "@/shared/types/common";

const LAWS = ["privacy", "child", "safety", "finance"] as const;

// ✅ 소셜 언급 수 계산: 숫자 | { counts: {찬성, 반대} } | {찬성, 반대}
export function getSocialValue(entry: any): number {
  if (entry == null) return 0;
  if (typeof entry === "number") return entry;
  if (typeof entry === "object") {
    const counts = entry.counts || entry;
    const agree = typeof counts["찬성"] === "number" ? counts["찬성"] : 0;
    const disagree = typeof counts["반대"] === "number" ? counts["반대"] : 0;
    return agree + disagree;
  }
  return 0;
}

// ⏱️ 유틸: YYYY-MM-DD 문자열 <-> Date
function toDate(s: string) {
  // s 가 "YYYY-MM-DD"가 아닐 수도 있으나(weekly/monthly 키), 일단 daily 에서만 사용
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function fmt(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ✅ KPI 계산 함수 (새 JSON 구조 + 기간 필터 대응)
export function computeKpis(
  allData: any,
  period: PeriodKey,
  opt?: { startDate?: string; endDate?: string }
): KpiItem[] {
  // 최상위가 각 카테고리(law)인 구조를 가정
  const useRange = !!(opt?.startDate && opt?.endDate);

  // 기간이 지정되면 daily_timeline을 사용(정확한 날짜 범위 필터링)
  const baseTimelineKey: PeriodKey = useRange ? "daily_timeline" : period;

  return (LAWS as unknown as string[]).map((law) => {
    const lawData = allData?.[law];
    if (!lawData) {
      return { name: law, value: 0, growthRate: 0, socialTotal: 0, trend: [] };
    }

    const newsTimeline = lawData.news?.[baseTimelineKey] || {};
    const socialTimeline = lawData.social?.[baseTimelineKey] || {};

    // ---- 날짜 키 선정 ----
    let keys = Object.keys(newsTimeline);
    // daily_timeline만 YYYY-MM-DD 형태이므로 범위 필터는 daily에서만 수행
    if (useRange) {
      const s = toDate(opt!.startDate!);
      const e = toDate(opt!.endDate!);
      keys = keys
        .filter((k) => {
          // 방어: 키가 날짜 형태가 아닐 수 있음 → try/catch
          try {
            const d = toDate(k);
            return d >= s && d <= e;
          } catch {
            return false;
          }
        })
        .sort();
    } else {
      keys = keys.sort();
    }

    if (keys.length === 0) {
      return { name: law, value: 0, growthRate: 0, socialTotal: 0, trend: [] };
    }

    // ✅ 소셜(찬+반) 일별 합
    const dailySocialTotals = keys.map(k => {
      const sEntry = socialTimeline[k];               // 구조: { counts: {찬성, 반대} }
      return getSocialValue(sEntry);                   // = 찬성 + 반대
    });
    // ---- 날짜별 뉴스 합(중분류 count 합) ----
    const dailyNewsTotals: number[] = keys.map((k) => {
      const entry = newsTimeline[k];
      // 구조: news[date].중분류목록[mid].count
      const mids = entry?.["중분류목록"] || {};
      const sum = Object.values<any>(mids).reduce(
        (acc, mid) => acc + (typeof mid?.count === "number" ? mid.count : 0),
        0
      );
      return sum;
    });

    // ---- 값(value): 선택 기간 합계 ----
    const periodNewsTotal = dailyNewsTotals.reduce((a, b) => a + b, 0);

    // ---- 소셜 합계: 선택 기간 합계 ----
    const periodSocialTotal = keys.reduce((acc, k) => {
      const sEntry = socialTimeline[k];
      // 구조: social[...] = { counts: {찬성,반대} }
      const v = getSocialValue(sEntry?.counts ?? sEntry);
      return acc + v;
    }, 0);

    // ---- 성장률(growthRate)
    let growthRate = 0;

    if (useRange) {
      // 동일 길이의 직전 기간과 비교
      const s = toDate(keys[0]);
      const e = toDate(keys[keys.length - 1]);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);

      const prevEnd = new Date(s);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - (days - 1));

      const prevKeys = Object.keys(newsTimeline)
        .filter((k) => {
          try {
            const d = toDate(k);
            return d >= prevStart && d <= prevEnd;
          } catch {
            return false;
          }
        })
        .sort();

      const prevTotal = prevKeys.reduce((acc, k) => {
        const entry = newsTimeline[k];
        const mids = entry?.["중분류목록"] || {};
        const sum = Object.values<any>(mids).reduce(
          (a, mid) => a + (typeof mid?.count === "number" ? mid.count : 0),
          0
        );
        return acc + sum;
      }, 0);

      if (prevTotal >= 5) {
        const raw = ((periodNewsTotal - prevTotal) / prevTotal) * 100;
        growthRate = Math.max(Math.min(raw, 500), -500);
      } else {
        growthRate = 0;
      }
    } else {
      // 기간 미지정: 마지막 두 구간(요일/주/월) 비교
      if (dailyNewsTotals.length >= 2) {
        const a = dailyNewsTotals[dailyNewsTotals.length - 1];
        const b = dailyNewsTotals[dailyNewsTotals.length - 2];
        if (b >= 5) {
          const raw = ((a - b) / b) * 100;
          growthRate = Math.max(Math.min(raw, 500), -500);
        }
      }
    }

    return {
      name: law,
      value: periodNewsTotal,   // ✅ 선택 기간 뉴스 총합
      growthRate,               // ✅ 직전 동일 길이 대비(기간 있을 때)
      socialTotal: periodSocialTotal, // ✅ 선택 기간 소셜 총합
      trend: dailyNewsTotals,   // ✅ 스파크라인용
      socialTrend: dailySocialTotals,   // ✅ 추가!

    };


  });
}
