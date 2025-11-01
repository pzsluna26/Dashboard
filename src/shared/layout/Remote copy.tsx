"use client";

import Link from "next/link";
import { useMemo, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";

// 📅 DayPicker
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, differenceInCalendarDays, format, isAfter } from "date-fns";

type Props = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onDateRangeChange?: (start: string, end: string) => void;
  captureRef?: RefObject<HTMLElement | null>; // 캡처 대상 (없으면 document.body)
  className?: string;
};

// 색/스타일 토큰
const BTN_TEXT = "#1f2937";
const BTN_GRAD        = "linear-gradient(180deg, #c6d1d6 0%, #b4c4cb 45%, #9fb3be 100%)";
const BTN_GRAD_HOVER  = "linear-gradient(180deg, #94b7c6 0%, #7fa2b2 45%, #6f8f9e 100%)";
const BTN_GRAD_ACTIVE = "linear-gradient(180deg, #8aaebb 0%, #769aa9 45%, #637f8d 100%)";
const BTN_BORDER       = "1px solid rgba(255,255,255,0.55)";
const BTN_BORDER_HOVER = "1px solid rgba(255,255,255,0.65)";
const BTN_SHADOW        = "0 10px 24px rgba(60,85,100,0.28), 0 2px 6px rgba(60,85,100,0.20), inset 0 1px 0 rgba(255,255,255,0.55)";
const BTN_SHADOW_HOVER  = "0 14px 28px rgba(60,85,100,0.32), 0 4px 10px rgba(60,85,100,0.24), inset 0 1px 0 rgba(255,255,255,0.60)";
const BTN_SHADOW_ACTIVE = "0 6px 14px rgba(60,85,100,0.32), 0 2px 6px rgba(60,85,100,0.28), inset 0 2px 4px rgba(0,0,0,0.18)";

const MAX_RANGE_DAYS = 30;

// ✅ 라우트 버튼 5개 추가
const routes = [
  { label: "홈화면", href: "/", icon: HomeIcon },
//   { label: "종합분석", href: "/", icon: DashboardIcon },
//   { label: "뉴스분석", href: "/news", icon: NewsIcon },
//   { label: "여론분석", href: "/social", icon: SentimentIcon },
//   { label: "법안분석", href: "/law", icon: LawIcon },
];

function toYMD(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function Remote({
  startDate,
  endDate,
  onDateRangeChange,
  captureRef,
  className = "",
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // DayPicker range 상태
  const [range, setRange] = useState<{ from?: Date; to?: Date }>(() => ({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  }));

  const daySpan = useMemo(() => {
    if (!range.from || !range.to) return 0;
    return differenceInCalendarDays(range.to, range.from) + 1;
  }, [range]);

  const isInvalid = !!range.from && !!range.to && daySpan > MAX_RANGE_DAYS;

  // 시작일 선택 후 30일 초과 날짜 클릭 불가
  const disabledMatchers = useMemo(() => {
    if (!range.from || range.to) return [];
    const maxEnd = addDays(range.from, MAX_RANGE_DAYS - 1);
    return [(d: Date) => isAfter(d, maxEnd)];
  }, [range.from, range.to]);

  // DayPicker 선택
  const handleSelect = (selected: { from?: Date; to?: Date } | undefined) => {
    if (!selected) return setRange({});
    const { from, to } = selected;
    if (!from) return setRange({});
    if (!to) return setRange({ from });
    const span = differenceInCalendarDays(to, from) + 1;
    if (span > MAX_RANGE_DAYS) return;
    setRange({ from, to });
  };

  const handleApply = () => {
    if (!range.from || !range.to || isInvalid) return;
    onDateRangeChange?.(toYMD(range.from), toYMD(range.to));
    setOpen(false);
  };

  const handleReset = () => setRange({});

  // -------- 캡처/다운로드 유틸 --------
  async function captureNodeToCanvas(target: HTMLElement) {
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(target, {
      useCORS: true,
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      backgroundColor: null,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });
  }

  async function handleDownloadPNG() {
    const target = captureRef?.current ?? document.body;
    const canvas = await captureNodeToCanvas(target as HTMLElement);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `dashboard_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.png`;
    a.click();
  }

  async function handleDownloadPDF() {
    const target = captureRef?.current ?? document.body;
    const canvas = await captureNodeToCanvas(target as HTMLElement);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const pxToMm = (px: number) => px * 0.264583;
    const imgW = pxToMm(canvas.width);
    const imgH = pxToMm(canvas.height);
    const scale = pageW / imgW;
    const finalW = pageW;
    const finalH = imgH * scale;

    if (finalH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, finalW, finalH);
    } else {
      let y = 0;
      const pagePx = pageH / 0.264583 / scale;
      while (y < canvas.height) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(pagePx, canvas.height - y);
        const sctx = slice.getContext("2d")!;
        sctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        const sliceData = slice.toDataURL("image/jpeg", 0.95);
        if (y > 0) pdf.addPage();
        const sliceHmm = pxToMm(slice.height) * scale;
        pdf.addImage(sliceData, "JPEG", 0, 0, finalW, sliceHmm);
        y += pagePx;
      }
    }
    pdf.save(`dashboard_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.pdf`);
  }

  return (
    <div
      className={[
        "fixed left-6 top-1/2 -translate-y-1/2 z-[1000] pointer-events-auto", // 🔝 보이도록 z-Index/포인터 보장
        "rounded-3xl shadow-[0_12px_40px_rgba(20,30,60,0.15)]",
        "backdrop-blur-md border border-white/50",
        "bg-[rgba(255,255,255,0.60)]",
        "px-3 py-4",
        "flex flex-col items-center gap-3",
        className,
      ].join(" ")}
      aria-label="빠른 탐색 리모컨"
    >
      {/* 네비게이션 버튼들 */}
      {routes.map((r) => {
        const Active = pathname === r.href;
        const Icon = r.icon;
        return (
          <Link
            href={r.href}
            key={r.label}
            className="w-16 h-16 rounded-2xl grid place-items-center transition-transform duration-150 focus:outline-none"
            style={{
              backgroundImage: Active ? BTN_GRAD_HOVER : BTN_GRAD,
              boxShadow: Active ? BTN_SHADOW_HOVER : BTN_SHADOW,
              border: BTN_BORDER,
              color: BTN_TEXT,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = BTN_GRAD_HOVER;
              el.style.boxShadow = BTN_SHADOW_HOVER;
              el.style.border = BTN_BORDER_HOVER;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = Active ? BTN_GRAD_HOVER : BTN_GRAD;
              el.style.boxShadow = Active ? BTN_SHADOW_HOVER : BTN_SHADOW;
              el.style.border = BTN_BORDER;
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = BTN_GRAD_ACTIVE;
              el.style.boxShadow = BTN_SHADOW_ACTIVE;
              el.style.transform = "translateY(1px)";
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = BTN_GRAD_HOVER;
              el.style.boxShadow = BTN_SHADOW_HOVER;
              el.style.transform = "translateY(0)";
            }}
            title={r.label}
            aria-label={r.label}
          >
            <div className="relative flex flex-col items-center -mt-0.5">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
                style={{
                  width: 36, height: 14, borderRadius: 999,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))",
                  filter: "blur(0.3px)",
                }}
              />
              <Icon />
              <span className="mt-1 text-[10px] leading-none">{r.label}</span>
            </div>
          </Link>
        );
      })}

      {/* 구분선 */}
      <div className="w-8 h-px bg-[rgba(255,255,255,0.70)] my-1" />

      {/* 기간선택 토글 */}
      <button
        type="button"
        className="w-16 h-16 rounded-2xl grid place-items-center transition-transform duration-150 focus:outline-none"
        style={{
          backgroundImage: open ? BTN_GRAD_HOVER : BTN_GRAD,
          boxShadow: open ? BTN_SHADOW_HOVER : BTN_SHADOW,
          border: open ? BTN_BORDER_HOVER : BTN_BORDER,
          color: BTN_TEXT,
        }}
        onClick={() => setOpen((v) => !v)}
        title="기간선택"
        aria-expanded={open}
        aria-controls="remote-date-panel"
        aria-label="기간선택"
      >
        <div className="relative flex flex-col items-center -mt-0.5">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
            style={{
              width: 36, height: 14, borderRadius: 999,
              background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))",
              filter: "blur(0.3px)",
            }}
          />
          <CalendarIcon />
          <span className="mt-1 text-[10px] leading-none">기간선택</span>
        </div>
      </button>

      {/* PDF 저장 */}
      <button
        type="button"
        className="w-16 h-16 rounded-2xl grid place-items-center transition-transform duration-150 focus:outline-none"
        style={{ backgroundImage: BTN_GRAD, boxShadow: BTN_SHADOW, border: BTN_BORDER, color: BTN_TEXT }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_HOVER;
          el.style.boxShadow = BTN_SHADOW_HOVER;
          el.style.border = BTN_BORDER_HOVER;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD;
          el.style.boxShadow = BTN_SHADOW;
          el.style.border = BTN_BORDER;
        }}
        onMouseDown={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_ACTIVE;
          el.style.boxShadow = BTN_SHADOW_ACTIVE;
          el.style.transform = "translateY(1px)";
        }}
        onMouseUp={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_HOVER;
          el.style.boxShadow = BTN_SHADOW_HOVER;
          el.style.transform = "translateY(0)";
        }}
        onClick={handleDownloadPDF}
        title="PDF 저장"
        aria-label="PDF 저장"
      >
        <div className="relative flex flex-col items-center -mt-0.5">
          <span aria-hidden className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
            style={{ width: 36, height: 14, borderRadius: 999, background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))", filter: "blur(0.3px)" }} />
          <PdfIcon />
          <span className="mt-1 text-[10px] leading-none">PDF</span>
        </div>
      </button>

      {/* 전체 캡처(PNG) */}
      <button
        type="button"
        className="w-16 h-16 rounded-2xl grid place-items-center transition-transform duration-150 focus:outline-none"
        style={{ backgroundImage: BTN_GRAD, boxShadow: BTN_SHADOW, border: BTN_BORDER, color: BTN_TEXT }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_HOVER;
          el.style.boxShadow = BTN_SHADOW_HOVER;
          el.style.border = BTN_BORDER_HOVER;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD;
          el.style.boxShadow = BTN_SHADOW;
          el.style.border = BTN_BORDER;
        }}
        onMouseDown={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_ACTIVE;
          el.style.boxShadow = BTN_SHADOW_ACTIVE;
          el.style.transform = "translateY(1px)";
        }}
        onMouseUp={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.backgroundImage = BTN_GRAD_HOVER;
          el.style.boxShadow = BTN_SHADOW_HOVER;
          el.style.transform = "translateY(0)";
        }}
        onClick={handleDownloadPNG}
        title="전체 캡처"
        aria-label="전체 캡처"
      >
        <div className="relative flex flex-col items-center -mt-0.5">
          <span aria-hidden className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
            style={{ width: 36, height: 14, borderRadius: 999, background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))", filter: "blur(0.3px)" }} />
          <CameraIcon />
          <span className="mt-1 text-[10px] leading-none">캡처</span>
        </div>
      </button>

      {/* 조회기간 패널 */}
      {open && (
        <div
          id="remote-date-panel"
          className="absolute left-[76px] top-1/2 -translate-y-1/2 w-[320px] p-4 rounded-2xl
                     bg-[rgba(255,255,255,0.90)] backdrop-blur-md shadow-[0_12px_40px_rgba(20,30,60,0.2)]
                     border border-[rgba(255,255,255,0.60)]"
        >
          <p className="text-sm font-medium text-neutral-700 mb-3">조회기간 (최대 {MAX_RANGE_DAYS}일)</p>

          <div className="rounded-xl border border-neutral-200 bg-white p-2">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              showOutsideDays
              numberOfMonths={1}
              disabled={disabledMatchers}
              modifiersClassNames={{
                selected: "bg-[#7fa2b2] text-white",
                range_start: "bg-[#7fa2b2] text-white",
                range_end: "bg-[#7fa2b2] text-white",
                range_middle: "bg-[#b4c4cb] text-white",
                today: "border border-[#7fa2b2]",
              }}
              styles={{
                caption: { color: "#1f2937" },
                head_cell: { color: "#6b7280", fontWeight: 600 },
                day: { color: "#1f2937" },
              }}
            />
          </div>

          <div className="mt-2 min-h-[20px]">
            {range.from && range.to ? (
              isInvalid ? (
                <p className="text-xs text-red-600">
                  선택 범위는 {MAX_RANGE_DAYS}일 이하여야 하고, 시작 ≤ 끝이어야 합니다.
                </p>
              ) : (
                <p className="text-xs text-neutral-600">
                  선택한 기간: {daySpan}일 ({toYMD(range.from)} ~ {toYMD(range.to)})
                </p>
              )
            ) : (
              <p className="text-xs text-neutral-500">
                달력에서 시작일과 종료일을 클릭해 범위를 지정하세요. (최대 {MAX_RANGE_DAYS}일)
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              onClick={handleReset}
            >
              초기화
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-sm text-white disabled:opacity-50"
              style={{
                backgroundImage: !range.from || !range.to || isInvalid ? "linear-gradient(180deg, #c7c7c7, #a9a9a9)" : BTN_GRAD_HOVER,
                boxShadow: !range.from || !range.to || isInvalid ? "none" : BTN_SHADOW_HOVER,
                border: !range.from || !range.to || isInvalid ? "1px solid rgba(255,255,255,0.4)" : BTN_BORDER_HOVER,
              }}
              onClick={handleApply}
              disabled={!range.from || !range.to || isInvalid}
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== 아이콘 (SVG) ================== */
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
    </svg>
  );
}
function NewsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z" />
    </svg>
  );
}
function SentimentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zM8 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM7.5 15h9a4.5 4.5 0 0 1-9 0z" />
    </svg>
  );
}
function LawIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 4h14v2H5zM6 7h12l2 4H4zM6 12h12v8H6z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v3H2V6a2 2 0 0 1 2-2h3V2zM2 10h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function PdfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5" />
      <path d="M8 14h3a2 2 0 0 0 0-4H8v4zm0-3h3a1 1 0 0 1 0 2H8v-2zm6 3h2v-1h-2v-1h3v-1h-3v-1h2a1 1 0 1 0 0-2h-2v6z" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 4l2-2h2l2 2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}
