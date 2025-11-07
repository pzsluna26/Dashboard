import { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '@/shared/api/dashboard';
import { useDateRange } from '@/shared/hooks/useDateRange';
import type { LegalTop5Wire } from '@/shared/types/dashboard';

export type LegalTop5Item = {
  law: string;
  개정강화: number;
  폐지완화: number;
  현상유지: number;
  commentCount: number;
  hot: 'y'|'n';
};

export function useLegalTop5(startDate?: string, endDate?: string) {

  const { start, end } = useDateRange(startDate, endDate);
  const [items, setItems] = useState<LegalTop5Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dashboardAPI.getLegalTop5({ start, end });
        const list: LegalTop5Item[] = Array.isArray(res)
          ? res as any
          : Object.values(res as LegalTop5Wire) as any;
        if (!cancelled) setItems(list);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || '로드 실패');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [start, end]);

  return { items, loading, error, start, end };
}
