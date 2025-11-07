'use client';

import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useKpiSummary } from '../hooks/useKpiSummary';
import { CATEGORY_TITLE } from '@/shared/constants/mapping';
import type { PeriodKey } from '@/shared/types/common';
import { nfKR } from '@/shared/utils/format';

type Props = {
  startDate?: string;
  endDate?: string;
  period?: PeriodKey;
};

function TooltipContent({ active, payload, label, catLabel }: any) {
  if (!active || !payload?.length) return null;
  const p = payload.reduce((acc: any, cur: any) => {
    acc[cur.name] = cur.value;
    return acc;
  }, {});
  const newsCum = p['뉴스 누적'] ?? 0;
  const socialCum = p['여론 누적'] ?? 0;

  return (
    <div className="rounded-xl border border-white/70 bg-white/95 shadow-md backdrop-blur-sm p-3 text-xs text-neutral-700">
      <div className="font-semibold text-neutral-900 mb-1">{label}</div>
      <div className="space-y-0.5">
        <div>법안: <b>{catLabel}</b></div>
        <div>뉴스량 누적: <b>{nfKR.format(newsCum)}</b></div>
        <div>여론(찬·반) 누적: <b>{nfKR.format(socialCum)}</b></div>
      </div>
    </div>
  );
}

export default function KpiSummary({ startDate, endDate, period = 'weekly_timeline' }: Props) {
  const { data, loading, error, start, end } = useKpiSummary(startDate, endDate, period);
  const [showRaw, setShowRaw] = useState(false);

  if (loading && !data) {
    return <div className="w-full h-[150px] grid place-items-center text-neutral-400">Loading KPI Summary…</div>;
  }
  if (error) {
    return <div className="w-full h-[150px] grid place-items-center text-rose-500 text-sm whitespace-pre-wrap">KPI Summary 로드 오류: {error}</div>;
  }
  if (!data) {
    return <div className="w-full h-[150px] grid place-items-center text-neutral-400">데이터가 없습니다.</div>;
  }

  const cards = Object.entries(CATEGORY_TITLE).map(([cat, title]) => {
    const catData = (data as any)[cat];
    if (!catData) {
      return {
        key: cat, title,
        totalArticles: 0, totalComments: 0, newsGrowthRate: 0, socialGrowthRate: 0,
        chartData: [] as Array<{ date: string; '뉴스 누적': number; '여론 누적': number }>,
      };
    }
    const { summary, dailyData } = catData;
    let accNews = 0, accSocial = 0;
    const chartData = (dailyData ?? []).map((d: any) => {
      accNews += d.news ?? 0;
      accSocial += d.social ?? 0;
      return { date: d.date, '뉴스 누적': accNews, '여론 누적': accSocial };
    });
    return {
      key: cat,
      title,
      totalArticles: summary?.totalArticles ?? 0,
      totalComments: summary?.totalComments ?? 0,
      newsGrowthRate: summary?.newsGrowthRate ?? 0,
      socialGrowthRate: summary?.socialGrowthRate ?? 0,
      chartData,
    };
  });

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kpi-summary_${start}_${end}_${period}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">종합 KPI 요약</span>
          <div className="relative group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 cursor-pointer group-hover:text-neutral-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
            <div className="absolute top-6 left-0 z-10 hidden group-hover:block w-[260px] text-[11px] text-neutral-800 bg-white border border-neutral-200 shadow-md rounded-md p-3">
              최근 기간 동안의 전체 의견 건수를 요약한 지표입니다.
              <br/> 첫째날~마지막날 증가량의 1일 평균 증가율을 표시합니다.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowRaw(v => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white/70 hover:bg-white transition">
            {showRaw ? 'Raw JSON 닫기' : 'Raw JSON 보기'}
          </button>
          {showRaw && (
            <button onClick={handleDownload} className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white/70 hover:bg-white transition">
              JSON 다운로드
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => {
          const upNews = c.newsGrowthRate >= 0;
          const upSoc = c.socialGrowthRate >= 0;
          return (
            <div key={c.key} className="rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-lg border border-white/60 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-transform duration-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600 font-semibold">{c.title}</div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-neutral-500">뉴스량 합계</div>
                  <div className="font-semibold text-xl text-neutral-900">{nfKR.format(c.totalArticles)}</div>
                  <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${upNews ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {c.newsGrowthRate > 0 && '▲'}{c.newsGrowthRate < 0 && '▼'}{c.newsGrowthRate === 0 && '-'}
                    {` ${(c.newsGrowthRate * 100).toFixed(1)}%`}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500">여론(찬·반) 합계</div>
                  <div className="font-semibold text-xl text-neutral-900">{nfKR.format(c.totalComments)}</div>
                  <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${upSoc ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {c.socialGrowthRate > 0 && '▲'}{c.socialGrowthRate < 0 && '▼'}{c.socialGrowthRate === 0 && '-'}
                    {` ${(c.socialGrowthRate * 100).toFixed(1)}%`}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={c.chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gNews_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`gSoc_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6666" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#FFEADD" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <Tooltip position={{ y: -30 }} wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                      content={(props) => <TooltipContent {...props} catLabel={c.title} />} />
                    <Area type="monotone" dataKey="뉴스 누적" stroke="#FFEADD" fillOpacity={1} fill={`url(#gNews_${c.key})`} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#334155' }} />
                    <Area type="monotone" dataKey="여론 누적" stroke="#FFEADD" fillOpacity={1} fill={`url(#gSoc_${c.key})`} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#FF6666' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {showRaw && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white/80 p-3">
          <div className="text-xs text-neutral-500 mb-2">API Raw JSON</div>
          <pre className="text-[11px] leading-5 text-neutral-800 overflow-auto max-h-[50vh] whitespace-pre">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
