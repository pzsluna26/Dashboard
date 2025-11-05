"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

interface HalfPieChartProps {
  data: {
    label: string;
    value: number;
    key: "agree" | "repeal" | "disagree";
  }[];
  onSelect: (key: "agree" | "repeal" | "disagree") => void;
  activeKey?: "agree" | "repeal" | "disagree";
}

const COLORS = {
  agree: "#f59c9cff", 
  repeal: "#9abdf7ff", 
  disagree: "#94a3b8", 
};

export default function HalfPieChart({ data, onSelect, activeKey }: HalfPieChartProps) {

  const visibleData = data.filter((d) => d.value > 0);
  const activeLabel = data.find((d) => d.key === activeKey)?.label ?? "";

  return (
    <div className="w-full flex flex-col items-center relative">
      <PieChart width={260} height={160}>
        <Pie
          data={visibleData}
          cx={130}
          cy={120}
          startAngle={180}
          endAngle={0}
          innerRadius={40}
          outerRadius={80}
          paddingAngle={0}
          dataKey="value"
          isAnimationActive={true}
          onClick={(entry) => onSelect(entry.key)} 
        >
          {visibleData.map((entry) => (
            <Cell
              key={entry.key}
              fill={COLORS[entry.key]}
              stroke="#fff"
              strokeWidth={2}
              opacity={activeKey === entry.key ? 1 : 0.6}
              cursor="pointer"
            />
          ))}
        </Pie>
        <Tooltip formatter={(val: number, name) => [`${val}건`, name]} labelFormatter={() => ""} />
      </PieChart>

  
      {activeLabel && (
        <div
          className="absolute text-sm font-semibold text-neutral-700 select-none pointer-events-none"
          style={{
            top: "100px", 
            left: "52%",
            transform: "translateX(-50%)",
          }}
        >
          {activeLabel}
        </div>
      )}

      <div className="flex justify-center gap-4 text-xs mt-1">
        {data.map((d) => (
          <div
            key={d.key}
            onClick={() => onSelect(d.key)}
            className={`flex items-center gap-1 cursor-pointer transition-colors ${
              activeKey === d.key
                ? "text-gray-900 font-semibold"
                : "text-neutral-600"
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[d.key] }}
            />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
