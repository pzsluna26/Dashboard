import { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '@/shared/api/dashboard';
import { KPI_KEY_MAPPING } from '@/shared/constants/mapping';
import { useDateRange } from '@/shared/hooks/useDateRange';
import type { PeriodKey } from '@/shared/types/common';
import type { KpiSummaryWire } from '@/shared/types/dashboard';

export function useKpiSummary(startDate?: string, endDate?: string, period: PeriodKey = 'weekly_timeline') {
  
  const { start, end } = useDateRange(startDate, endDate);
  const [data, setData] = useState<{
    [cat: string]: KpiSummaryWire[keyof KpiSummaryWire]
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dashboardAPI.getKpiSummary({ start, end, period });
        const mapped: any = {};
        for (const key in res) {
          const cat = KPI_KEY_MAPPING[key];
          if (cat) mapped[cat] = res[key];
        }
        if (!cancelled) setData(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || '데이터 로드 실패');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [start, end, period]);

  return { data, loading, error, start, end, period };
}
