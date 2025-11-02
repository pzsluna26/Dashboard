"use client";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export type PeriodKey = "daily_timeline" | "weekly_timeline" | "monthly_timeline";
type NodeType = "legal" | "incident";

interface BaseNode extends NodeObject {
  id: string;
  type: NodeType;
  label: string;
  x?: number;
  y?: number;
}

interface LegalNode extends BaseNode {
  type: "legal";
  totalCount: number;
}

interface IncidentNode extends BaseNode {
  type: "incident";
  count: number;
  mid: string;
  sample?: {
    agree?: string[];
    repeal?: string[];
    disagree?: string[];
  };
}

type LinkDatum = LinkObject & {
  source: string | BaseNode;
  target: string | BaseNode;
  weight: number;
};

export interface NetworkGraphProps {
  data: any;
  startDate?: string;
  endDate?: string;
  period?: PeriodKey;
  maxArticles?: number;
}

function truncateText(input: string, max = 20) {
  if (!input) return "";
  const arr = [...input];
  return arr.length > max ? arr.slice(0, max).join("") + "…" : input;
}

function inDateRange(dateStr: string, start?: string, end?: string) {
  if (!start && !end) return true;
  const n = (s?: string) =>
    s ? new Date(s + "T00:00:00").getTime() : undefined;
  const d = new Date(dateStr + "T00:00:00").getTime();
  const s = n(start);
  const e = n(end);
  if (s !== undefined && d < s) return false;
  if (e !== undefined && d > e) return false;
  return true;
}

function buildGraph(
  raw: any,
  opts: { startDate?: string; endDate?: string; period?: PeriodKey; maxArticles: number }
) {
  const { startDate, endDate, maxArticles } = opts;
  const domains: string[] = Object.keys(raw || {});
  const legalMap: Record<string, { total: number; incidents: Record<string, IncidentNode> }> = {};

  for (const dom of domains) {
    const daily = raw[dom]?.addsocial?.["daily_timeline"] || {};
    for (const dateStr of Object.keys(daily)) {
      if (!inDateRange(dateStr, startDate, endDate)) continue;
      const dayEntry = daily[dateStr];
      const mids = dayEntry?.["중분류목록"] || {};
      for (const mid of Object.keys(mids)) {
        const midObj = mids[mid];
        const subs = midObj?.["소분류목록"] || {};
        for (const subKey of Object.keys(subs)) {
          const s = subs[subKey];
          const agreeList = (s?.["찬성"]?.["개정강화"]?.["소셜목록"] || []) as Array<{ content: string }>;
          const repealList = (s?.["찬성"]?.["폐지약화"]?.["소셜목록"] || []) as Array<{ content: string }>;
          const disagreeList = (s?.["반대"]?.["소셜목록"] || []) as Array<{ content: string }>;
          const count = agreeList.length + repealList.length + disagreeList.length;

          if (!legalMap[mid]) legalMap[mid] = { total: 0, incidents: {} };
          const incId = `${mid}::${subKey}`;
          if (!legalMap[mid].incidents[incId]) {
            legalMap[mid].incidents[incId] = {
              id: incId,
              type: "incident",
              label: subKey.replace(`${mid}_`, ""),
              count: 0,
              mid,
              sample: { agree: [], repeal: [], disagree: [] },
            };
          }

          legalMap[mid].incidents[incId].count += count;
          legalMap[mid].incidents[incId].sample!.agree!.push(...agreeList.slice(0, 2).map((x) => x.content));
          legalMap[mid].incidents[incId].sample!.repeal!.push(...repealList.slice(0, 2).map((x) => x.content));
          legalMap[mid].incidents[incId].sample!.disagree!.push(...disagreeList.slice(0, 2).map((x) => x.content));
          legalMap[mid].total += count;
        }
      }
    }
  }

  const topLegal = Object.keys(legalMap)
    .map((k) => ({ mid: k, total: legalMap[k].total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxArticles)
    .map((x) => x.mid);

  const nodes: (LegalNode | IncidentNode)[] = [];
  const links: LinkDatum[] = [];

  for (const mid of topLegal) {
    nodes.push({
      id: mid,
      type: "legal",
      label: mid,
      totalCount: legalMap[mid].total,
    });

    const incs = Object.values(legalMap[mid].incidents).filter((i) => i.count > 0);
    incs
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach((inc) => {
        nodes.push(inc);
        links.push({
          source: mid,
          target: inc.id,
          weight: inc.count,
        });
      });
  }

  return { nodes, links };
}

function makeSqrtSizeScale(counts: number[], outMin = 8, outMax = 36) {
  const min = counts.length ? Math.min(...counts) : 1;
  const max = counts.length ? Math.max(...counts) : 50;
  const a = Math.sqrt(min);
  const b = Math.sqrt(max);
  const span = b - a || 1;
  return (v: number) => {
    const t = (Math.sqrt(v) - a) / span;
    return outMin + t * (outMax - outMin);
  };
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export default function NetworkGraph({ data, startDate, endDate, period = "daily_timeline", maxArticles = 5 }: NetworkGraphProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const [selected, setSelected] = useState<LegalNode | IncidentNode | null>(null);
  const graph = useMemo(() => buildGraph(data, { startDate, endDate, period, maxArticles }), [data, startDate, endDate, period, maxArticles]);

  const sortedIncidents = useMemo(() => {
    return (graph.nodes as IncidentNode[]).filter((n) => n.type === "incident").sort((a, b) => b.count - a.count);
  }, [graph.nodes]);

  const [incidentIndex, setIncidentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"agree" | "repeal" | "disagree">("agree");

  useEffect(() => {
    if (!sortedIncidents.length) return;
    const idx = selected?.type === "incident" ? sortedIncidents.findIndex((x) => x.id === selected.id) : 0;
    setIncidentIndex(Math.max(0, idx));
    if (!selected) setSelected(sortedIncidents[0]);
  }, [sortedIncidents]);

  useEffect(() => {
    if (selected) return;
    const pool = sortedIncidents.length ? sortedIncidents : graph.nodes;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelected(pick as any);
  }, [graph.nodes]);

  useEffect(() => {
    setActiveTab("agree");
  }, [selected]);

  const sizeScale = useMemo(() => {
    const counts = graph.nodes.filter((n: any) => n.type === "incident").map((n: any) => n.count as number);
    return makeSqrtSizeScale(counts);
  }, [graph.nodes]);

  const goPrev = () => {
    if (!sortedIncidents.length) return;
    const nextIdx = (incidentIndex - 1 + sortedIncidents.length) % sortedIncidents.length;
    setIncidentIndex(nextIdx);
    setSelected(sortedIncidents[nextIdx]);
  };

  const goNext = () => {
    if (!sortedIncidents.length) return;
    const nextIdx = (incidentIndex + 1) % sortedIncidents.length;
    setIncidentIndex(nextIdx);
    setSelected(sortedIncidents[nextIdx]);
  };

  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.touches[0]?.clientX ?? null);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const linkForce: any = fg.d3Force("link");
    linkForce?.distance((l: any) => 80 + Math.sqrt(l.weight || 0) * 2).strength(0.2);
    const charge: any = fg.d3Force("charge");
    charge?.strength(-180);
  }, [graph.links]);

  const width = 920;
  const height = 290;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full h-[300px]">
      {/* LEFT: Graph */}
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/70 \ p-4">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block w-3 h-3 rounded-full bg-[#e6f0ff] border border-[#7aa1ff]" /> Incident
          <span className="inline-block w-4 h-3 rounded bg-[#fff7ed] border border-[#f59e0b]" /> Legal
          <div className="ml-auto">드래그 이동 · 휠 줌 · 클릭 상세</div>
        </div>
        <div className="mt-4 rounded-xl overflow-hidden" style={{ width: "100%", height }}>
          <ForceGraph2D
            ref={fgRef as any}
            width={width}
            height={height}
            graphData={{ nodes: graph.nodes, links: graph.links }}
            nodeRelSize={4}
            enableNodeDrag
            cooldownTicks={60}
            linkWidth={(l: any) => Math.max(1, Math.min(4, Math.sqrt(l.weight || 0) / 3))}
            linkColor={() => "#9aa4b2"}
            linkOpacity={0.6}
            onNodeClick={(n) => setSelected(n as any)}
            nodeCanvasObject={(node, ctx) => {
              const n = node as LegalNode | IncidentNode;
              const label = n.label ?? "";
              ctx.font = `${n.type === "legal" ? 12 : 11}px Inter`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              if (n.type === "incident") {
                const r = sizeScale(n.count);
                ctx.fillStyle = "#e6f0ff";
                ctx.beginPath();
                ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = "#7aa1ff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
              } else {
                const w = 140, h = 44, x = n.x! - w / 2, y = n.y! - h / 2;
                ctx.fillStyle = "#fff7ed";
                roundRectPath(ctx, x, y, w, h, 10);
                ctx.fill();
                ctx.strokeStyle = "#f59e0b";
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
              ctx.fillStyle = "#213547";
              ctx.fillText(label, n.x!, n.y!);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as LegalNode | IncidentNode;
              ctx.fillStyle = color;
              if (n.type === "incident") {
                const r = sizeScale(n.count);
                ctx.beginPath();
                ctx.arc(n.x!, n.y!, r + 2, 0, 2 * Math.PI);
                ctx.fill();
              } else {
                const w = 140, h = 44, x = n.x! - w / 2, y = n.y! - h / 2;
                roundRectPath(ctx, x, y, w, h, 10);
                ctx.fill();
              }
            }}
            minZoom={0.3}
            maxZoom={2}
          />
        </div>
      </div>

      {/* 우측: 보조 카드 */}
      <aside
        className="lg:col-span-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/70 p-4 flex flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >

        <div className="flex items-start justify-between">
          <div className="text-sm font-semibold text-neutral-800">상세 정보</div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="text-xs px-2 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50"
              aria-label="이전"
            >
              ← 이전
            </button>
            <div className="text-[10px] text-neutral-500 tabular-nums">
              {sortedIncidents.length > 0 ? `${incidentIndex + 1} / ${sortedIncidents.length}` : "-/-"}
            </div>
            <button
              onClick={goNext}
              className="text-xs px-2 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50"
              aria-label="다음"
            >
              다음 →
            </button>
            {/* <button
              onClick={() => {
                if (!graph.nodes || graph.nodes.length === 0) return;
                const incs = (graph.nodes as any[]).filter((n) => n.type === "incident");
                const pool = incs.length ? incs : (graph.nodes as any[]);
                const pick = pool[Math.floor(Math.random() * pool.length)] as any;
                setSelected(pick);
                // 해당 노드로 부드럽게 줌-이동
                const fg = fgRef.current;
                if (fg && pick && typeof pick.x === "number" && typeof pick.y === "number") {
                  fg.centerAt(pick.x, pick.y, 500);
                  fg.zoom(1.2, 500);
                }
              }}
              className="text-xs px-2 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50"
            >
              랜덤 선택
            </button> */}
          </div>
        </div>

        {!selected ? (
          <div className="mt-4 text-sm text-neutral-500">항목을 선택하면 상세가 표시됩니다.</div>
        ) : selected.type === "legal" ? (
          <div className="mt-4 text-sm text-neutral-700">
            <div className="text-neutral-500 text-xs mb-1">법조항</div>
            <div className="text-base font-semibold mb-2">{selected.label}</div>
            <div className="mb-2">
              총 소셜 코멘트 수: <b>{(selected as any).totalCount?.toLocaleString()}</b>
            </div>
            <div className="text-xs text-neutral-500">
              상위 Incident 노드 크기는 코멘트 수에 비례합니다. 네트워크는 선택 기간 내 데이터로 산출됩니다.
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-neutral-700 space-y-4">
            <div className="text-neutral-500 text-xs">Incident</div>
            <div className="text-base font-semibold">{(selected as any).label}</div>
            <div>
              코멘트 수: <b>{(selected as any).count?.toLocaleString()}</b>
            </div>
            {(() => {
              const inc: any = selected;
              const lists = {
                agree: inc.sample?.agree ?? [],
                repeal: inc.sample?.repeal ?? [],
                disagree: inc.sample?.disagree ?? [],
              } as const;

              const TabBtn = ({
                keyName,
                label,
                count,
              }: {
                keyName: "agree" | "repeal" | "disagree";
                label: string;
                count: number;
              }) => (
                <button
                  onClick={() => setActiveTab(keyName)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors whitespace-nowrap ${activeTab === keyName
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white/70 text-neutral-700 border-neutral-300 hover:bg-white"
                    }`}
                >
                  {label} <span className="ml-1 text-[10px] opacity-80">({count})</span>
                </button>
              );

              const current = lists[activeTab];

              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <TabBtn keyName="agree" label="개정강화" count={lists.agree.length} />
                    <TabBtn keyName="repeal" label="폐지약화" count={lists.repeal.length} />
                    <TabBtn keyName="disagree" label="현상유지" count={lists.disagree.length} />
                  </div>
                  <ul className="list-disc pl-4 text-xs text-neutral-700 space-y-1">
                    {(current.length > 0 ? current : ["(표본 없음)"])
                      .slice(0, 5)
                      .map((t, i) => (
                        <li key={i} className="line-clamp-1">
                          {truncateText(t ?? "", 20)}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}
      </aside>
    </div>
  );
}
