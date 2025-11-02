// 셀렉트박스

"use client";

import { PERIOD_LABEL_MAP } from "@/shared/constants/labels";
import type { PeriodKey } from "@/shared/types/common";

type Props = {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  className?: string;
};

export default function PeriodSelect({ value, onChange, className = "" }: Props) {
  return (
    <select
      className={`border border-white/20 rounded-2xl px-3 py-2 bg-white/80 text-[#2D2928]
        focus:outline-none focus:ring-2 focus:ring-[#699FFC]/40 backdrop-blur transition ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodKey)}
    >
      <option value="daily_timeline">일별</option>
      <option value="weekly_timeline">주별</option>
      <option value="monthly_timeline">월별</option>
    </select>
  );
}
