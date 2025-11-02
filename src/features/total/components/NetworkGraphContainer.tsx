// 법+사건 관계망 차트 컴포넌트1

"use client";
import { useEffect, useState } from "react";
import NetworkGraph from "./NetworkGraph";

export default function NetworkGraphContainer({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/legal-network?start=${startDate}&end=${endDate}&period=daily_timeline`
        );
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("❌ 네트워크 데이터 패치 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (loading) return <div className="text-sm text-neutral-500 p-4">네트워크 데이터를 불러오는 중입니다...</div>;
  if (!data) return <div className="text-sm text-neutral-500 p-4">데이터를 불러올 수 없습니다.</div>;

  return (
    <NetworkGraph
      data={data}
      startDate={startDate}
      endDate={endDate}
      maxArticles={5}
    />
  );
}
