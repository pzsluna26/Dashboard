import { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '@/shared/api/dashboard';
import { useDateRange } from '@/shared/hooks/useDateRange';
import type { HeatmapWire } from '@/shared/types/dashboard';

export function useHeatmap(startDate?: string, endDate?: string) {
  const { start, end } = useDateRange(startDate, endDate);
  const [laws, setLaws] = useState<HeatmapWire['laws']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dashboardAPI.getHeatmap({ start, end });
        if (!cancelled) setLaws(res.laws || []);
      } catch (e:any) {
        if (!cancelled) {
          setError(e?.message || '로드 실패');
          setLaws([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [start, end]);

  return { laws, loading, error, start, end };
}
