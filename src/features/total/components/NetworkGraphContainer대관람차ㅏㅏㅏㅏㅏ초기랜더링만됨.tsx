"use client";
import { useEffect, useState } from "react";
import NetworkGraph from "./NetworkGraph";
import dayjs from "dayjs";

interface Incident {
  name: string;
  개정강화: { count: number; opinions: string[] };
  폐지완화: { count: number; opinions: string[] };
  현상유지: { count: number; opinions: string[] };
}

interface CategoryNode {
  label: string;
  description: string;
  incidents: Incident[];
}

interface GraphData {
  nodes: CategoryNode[];
}

export default function NetworkGraphContainer() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // 기준일 설정
    const end = dayjs("2025-08-13T23:59:59+09:00");
    const start = end.subtract(13, "day"); // 총 14일 포함

    const formattedStart = start.format("YYYY-MM-DD");
    const formattedEnd = end.format("YYYY-MM-DD");

    setStartDate(formattedStart);
    setEndDate(formattedEnd);
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/network-graph?start=${startDate}&end=${endDate}`
        );

        if (!res.ok) throw new Error("Failed to fetch data");

        const json: GraphData = await res.json();
        console.log("연결망 섹션 데이터:", {
          요청날짜: { startDate, endDate },
          받은데이터: json,
        });

        setGraphData(json);
      } catch (e) {
        console.error("❌ 네트워크 데이터 패치 실패:", e);
        setGraphData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (loading)
    return (
      <div className="text-sm text-neutral-500 p-4">
        네트워크 데이터를 불러오는 중입니다...
      </div>
    );

  if (!graphData)
    return (
      <div className="text-sm text-neutral-500 p-4">
        데이터를 불러올 수 없습니다.
      </div>
    );

  return (
    <NetworkGraph
      data={graphData}
      startDate={startDate}
      endDate={endDate}
      maxArticles={5}
    />
  );
}
