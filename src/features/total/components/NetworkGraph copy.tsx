"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-2d";
import * as d3 from "d3";
import HalfPieChart from "./HalfPieChart.tsx";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

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
  description?: string;
}

interface CountsBy {
  agree: number;
  repeal: number;
  neutral: number;
}

interface IncidentNode extends BaseNode {
  type: "incident";
  count: number;
  mid: string;
  countsBy?: CountsBy;
  sample?: {
    agree?: string[];
    repeal?: string[];
    neutral?: string[];
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

function slugify(s: string) {
  return String(s)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function buildGraph(
  raw: any,
  _opts: { startDate?: string; endDate?: string; period?: PeriodKey; maxArticles: number }
) {
  if (raw?.nodes && Array.isArray(raw.nodes)) {
    const nodes: (LegalNode | IncidentNode)[] = [];
    const links: LinkDatum[] = [];

    for (const category of raw.nodes) {
      const label = category.label ?? String(category.id ?? "");
      const id: string =
        category.id ?? `${slugify(label)}-${Math.random().toString(36).slice(2, 8)}`;

      const items: any[] = Array.isArray(category.incidents) ? category.incidents : [];

      const normalized = items
        .map((it, idx) => {
          if (!it) return null;
          const name = it?.name ?? `incident-${idx}`;
          const agreeCnt = it?.["개정강화"]?.count ?? 0;
          const repealCnt = it?.["폐지완화"]?.count ?? it?.["폐지약화"]?.count ?? 0;
          const neutralCnt = it?.["현상유지"]?.count ?? 0;
          const total = agreeCnt + repealCnt + neutralCnt;

          return {
            id: `${id}::${slugify(name)}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
            label: name,
            weight: Math.max(1, total),
            count: Math.max(1, total),
            countsBy: { agree: agreeCnt, repeal: repealCnt, neutral: neutralCnt } as CountsBy,
            sample: {
              agree: Array.isArray(it?.["개정강화"]?.opinions) ? it["개정강화"].opinions : [],
              repeal:
                Array.isArray(it?.["폐지완화"]?.opinions)
                  ? it["폐지완화"].opinions
                  : (Array.isArray(it?.["폐지약화"]?.opinions) ? it["폐지약화"].opinions : []),
              neutral: Array.isArray(it?.["현상유지"]?.opinions) ? it["현상유지"].opinions : [],
            },
          };
        })
        .filter(Boolean) as any[];

      nodes.push({
        id,
        type: "legal",
        label,
        totalCount: normalized.length,
        description: category.description ?? "",
      });

      normalized.forEach((inc) => {
        nodes.push({
          id: inc.id,
          type: "incident",
          label: inc.label,
          count: inc.count,
          mid: id,
          countsBy: inc.countsBy,
          sample: inc.sample,
        });
        links.push({
          source: id,
          target: inc.id,
          weight: inc.weight,
        });
      });
    }

    return { nodes, links };
  }
  return { nodes: [], links: [] };
}

function repelFromLegal(alpha: number, nodes: BaseNode[]) {
  const legals = nodes.filter((n): n is BaseNode => !!n && n.type === "legal");
  const incidents = nodes.filter((n): n is BaseNode => !!n && n.type === "incident");

  incidents.forEach((inc) => {
    if (inc.x == null || inc.y == null) return;

    legals.forEach((legal) => {
      if (legal.x == null || legal.y == null) return;

      const dx = inc.x - legal.x;
      const dy = inc.y - legal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = 120;
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist) * alpha * 0.8;
        inc.x += (dx / dist) * push;
        inc.y += (dy / dist) * push;
      }
    });
  });
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

export default function NetworkGraph({
  data,
  startDate,
  endDate,
  period = "daily_timeline",
  maxArticles = 5,
}: NetworkGraphProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const [selected, setSelected] = useState<LegalNode | IncidentNode | null>(null);
  const [activeTab, setActiveTab] = useState<"agree" | "repeal" | "disagree">("agree");

  const truncateText = (text: string, maxLength: number) =>
    text?.length > maxLength ? text.slice(0, maxLength) + "..." : text ?? "";

  const graph = useMemo(
    () => buildGraph(data, { startDate, endDate, period, maxArticles }),
    [data, startDate, endDate, period, maxArticles]
  );

  useEffect(() => {
    if (!graph?.nodes?.length) return;
    const incidents = graph.nodes.filter((n) => n.type === "incident") as IncidentNode[];
    if (incidents.length === 0) return;
    setSelected(incidents[Math.floor(Math.random() * incidents.length)]);
  }, [graph]);

  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;
    fg.d3Force("link")?.distance((l: any) => 100 + Math.sqrt(l.weight ?? 1) * 2);
    fg.d3Force("link")?.strength(0.4);
    fg.d3Force("charge")?.strength(-300);
    fg.d3Force(
      "collide",
      d3.forceCollide().radius((n: any) => (n.type === "legal" ? 75 : 35)).strength(1.0)
    );
    fg.d3ReheatSimulation();
  }, [graph]);

  const sizeScale = useMemo(() => {
    const counts = graph.nodes.filter((n: any) => n.type === "incident").map((n: any) => n.count as number);
    return makeSqrtSizeScale(counts);
  }, [graph.nodes]);

  const width = 920;
  const height = 490;

  const tabMeta = useMemo(() => {
    return {
      agree: { label: "개정강화", getCount: (n?: IncidentNode) => n?.countsBy?.agree ?? 0, getList: (n?: IncidentNode) => n?.sample?.agree ?? [] },
      repeal: { label: "폐지완화", getCount: (n?: IncidentNode) => n?.countsBy?.repeal ?? 0, getList: (n?: IncidentNode) => n?.sample?.repeal ?? [] },
      disagree: { label: "현상유지", getCount: (n?: IncidentNode) => n?.countsBy?.neutral ?? 0, getList: (n?: IncidentNode) => n?.sample?.neutral ?? [] },
    } as const;
  }, []);

  const selIncident = selected && selected.type === "incident" ? (selected as IncidentNode) : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full h-[400px]">
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/70 p-4">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block w-3 h-3 rounded-full bg-[#e6f0ff] border border-[#7aa1ff]" /> Incident
          <span className="inline-block w-4 h-3 rounded bg-[#fff7ed] border border-[#f59e0b]" /> Legal
        </div>
        <div className="mt-4 rounded-xl overflow-hidden" style={{ width: "100%", height }}>
          <ForceGraph2D
            key={graph.nodes.map((n) => n.id).join(",")}
            nodeId="id"
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
            onEngineTick={() => repelFromLegal(0.3, graph.nodes as BaseNode[])}
            nodeCanvasObject={(node, ctx) => {
  const n = node as LegalNode | IncidentNode;
  ctx.font = `${n.type === "legal" ? 12 : 11}px Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const radius = n.type === "incident" ? sizeScale((n as IncidentNode).count) : 30;

  // 배경 색상 설정
  ctx.fillStyle = n.type === "legal" ? "#9abdf7ff" : "#94a3b8";
  ctx.beginPath();
  ctx.arc(n.x!, n.y!, radius, 0, 2 * Math.PI);
  ctx.fill();

  // 테두리
  ctx.strokeStyle = "#213547";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 텍스트
  ctx.fillStyle = "#ffffff";
  ctx.fillText(n.label ?? "", n.x!, n.y!);
}}

nodePointerAreaPaint={(node, color, ctx) => {
  const n = node as LegalNode | IncidentNode;
  const radius = n.type === "incident" ? sizeScale((n as IncidentNode).count) + 2 : 32;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(n.x!, n.y!, radius, 0, 2 * Math.PI);
  ctx.fill();
}}

            minZoom={0.3}
            maxZoom={2}
          />
        </div>
      </div>

      <aside className="lg:col-span-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/70 p-4 flex flex-col">
        {!selected ? (
          <div className="mt-4 text-sm text-neutral-500">항목을 선택하면 상세가 표시됩니다.</div>
        ) : selected.type === "legal" ? (
          <div className="mt-4 text-sm text-neutral-700 space-y-3">
            <div>
              <div className="text-neutral-500 text-xs mb-1">법조항</div>
              <div className="text-base font-semibold mb-1">{selected.label}</div>
              {selected.description && (
                <p className="text-[13px] leading-relaxed text-neutral-600 bg-white/60 border border-neutral-200 rounded-md px-2 py-2">
                  {truncateText(selected.description, 550)}
                </p>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              총 사건 수: <b className="text-neutral-700">{selected.totalCount}</b>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-neutral-700 space-y-3">
            <div className="text-neutral-500 text-xs">Incident</div>
            <div className="text-base font-semibold">{selIncident?.label}</div>

            {/* ✅ 반원 차트 삽입 */}
            <HalfPieChart
              data={[
                { key: "agree", label: "개정강화", value: tabMeta.agree.getCount(selIncident) },
                { key: "repeal", label: "폐지완화", value: tabMeta.repeal.getCount(selIncident) },
                { key: "disagree", label: "현상유지", value: tabMeta.disagree.getCount(selIncident) },
              ]}
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
            />

            <div className="mt-1">
              <div className="text-xs text-neutral-500 mb-1">{tabMeta[activeTab].label} 의견</div>
              <ul className="space-y-1.5 max-h-50 overflow-auto pr-1">
                {(tabMeta[activeTab].getList(selIncident) || []).slice(0, 6).map((t, i) => (
                  <li key={i} className="text-[12px] leading-snug bg-white/60 border border-neutral-200 rounded-md px-2 py-1">
                    • {t}
                  </li>
                ))}
                {tabMeta[activeTab].getList(selIncident)?.length === 0 && (
                  <li className="text-[12px] text-neutral-400">표시할 의견이 없습니다.</li>
                )}
              </ul>
            </div>

            <div className="pt-1 text-xs text-neutral-500">
              총 코멘트 수: <b className="text-neutral-700">{selIncident?.count.toLocaleString()}</b>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
