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

interface NetworkGraphContainerProps {
  startDate?: string; // optional
  endDate?: string;
  maxArticles?: number;
}

export default function NetworkGraphContainer({
  startDate: propsStartDate,
  endDate: propsEndDate,
  maxArticles = 5,
}: NetworkGraphContainerProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propsStartDate || !propsEndDate) {
      const end = dayjs("2025-08-13T23:59:59+09:00");
      const start = end.subtract(13, "day");

      setStartDate(start.format("YYYY-MM-DD"));
      setEndDate(end.format("YYYY-MM-DD"));
    }
  }, [propsStartDate, propsEndDate]);

  useEffect(() => {
    if (propsStartDate && propsEndDate) {
      setStartDate(propsStartDate);
      setEndDate(propsEndDate);
    }
  }, [propsStartDate, propsEndDate]);


  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://10.125.121.213:8080/api/dashboard/network-graph?start=${startDate}&end=${endDate}`
        );
        if (!res.ok) throw new Error("Failed to fetch");

        const json: GraphData = await res.json();

        console.log("연결망 섹션 데이터 fetch:", {
          요청날짜: { startDate, endDate },
          받은데이터: json,
        });

        setGraphData(json);
      } catch (err) {
        console.error("네트워크 데이터 패치 실패:", err);
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
      maxArticles={maxArticles}
    />
  );
}
