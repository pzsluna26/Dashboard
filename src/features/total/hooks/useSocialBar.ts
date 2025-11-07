import { useEffect, useMemo, useState } from 'react';
import { dashboardAPI } from '@/shared/api/dashboard';
import { useDateRange } from '@/shared/hooks/useDateRange';
import type { SocialBarWire } from '@/shared/types/dashboard';

export function useSocialBar(startDate?: string, endDate?: string) {
  const { start, end } = useDateRange(startDate, endDate);
  const [data, setData] = useState<SocialBarWire['data']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dashboardAPI.getSocialBar({ start, end });
        if (!cancelled) setData(res.data || []);
      } catch (e:any) {
        if (!cancelled) {
          setError(e?.message || '로드 실패');
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [start, end]);

  return { data, loading, error, start, end };
}
