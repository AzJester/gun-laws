"use client";

import { useEffect, useRef, useState } from "react";

import type { GeoData } from "@/lib/geo";
import type { StateSummary } from "@/lib/types";

interface GeoMapProps {
  geo: GeoData;
  states: Record<string, StateSummary>;
  selected: string | null;
  changed: Set<string>;
  /** code -> {bg, fg} */
  colorFor: (code: string) => { bg: string; fg: string };
  /** code -> true if it should be dimmed (grade filter) */
  dimmed: (code: string) => boolean;
  onSelect: (code: string) => void;
}

// Small Northeast cluster that gets external leader-line labels.
const SMALL = new Set(["RI", "CT", "NJ", "DE", "MD", "MA", "NH", "VT", "DC"]);

interface Centroid {
  x: number;
  y: number;
}

export default function GeoMap({
  geo,
  states,
  selected,
  changed,
  colorFor,
  dimmed,
  onSelect,
}: GeoMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [centroids, setCentroids] = useState<Record<string, Centroid>>({});

  // Compute centroids with getBBox() once the paths are mounted.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const cen: Record<string, Centroid> = {};
    for (const code of Object.keys(geo.states)) {
      const el = svg.querySelector<SVGPathElement>(`path[data-code="${code}"]`);
      if (!el) continue;
      const b = el.getBBox();
      cen[code] = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    setCentroids(cen);
  }, [geo]);

  const codes = Object.keys(geo.states);

  // External leader-line label column for the small NE cluster.
  const LX = 1006;
  const baseY = 150;
  const gap = 30;
  const smalls = [...SMALL]
    .filter((c) => centroids[c])
    .sort((a, b) => centroids[a].y - centroids[b].y);

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="-60 0 1180 610"
        className="block h-auto w-full"
        role="group"
        aria-label="US states map"
      >
        <g>
          {codes.map((code) => {
            const c = colorFor(code);
            const cls = [
              "state",
              code === selected ? "selected" : "",
              changed.has(code) && code !== selected ? "changed" : "",
              dimmed(code) ? "dim" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <path
                key={code}
                d={geo.states[code].d}
                data-code={code}
                className={cls}
                style={{ fill: c.bg }}
                tabIndex={0}
                role="button"
                aria-label={`${states[code]?.name ?? code} — Grade ${
                  states[code]?.grade ?? "?"
                }`}
                onClick={() => onSelect(code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(code);
                  }
                }}
              />
            );
          })}
        </g>

        {/* labels */}
        <g>
          {codes
            .filter((c) => !SMALL.has(c) && centroids[c])
            .map((code) => (
              <text
                key={`lbl-${code}`}
                x={centroids[code].x}
                y={centroids[code].y}
                className="lbl"
                onClick={() => onSelect(code)}
              >
                {code}
              </text>
            ))}

          {smalls.map((code, i) => {
            const ly = baseY + i * gap;
            const cen = centroids[code];
            return (
              <g key={`ext-${code}`}>
                <line
                  x1={cen.x}
                  y1={cen.y}
                  x2={LX - 6}
                  y2={ly}
                  className="leader"
                />
                <circle cx={cen.x} cy={cen.y} r={1.6} className="leader-dot" />
                <text
                  x={LX}
                  y={ly}
                  className="lbl ext"
                  onClick={() => onSelect(code)}
                >
                  {code}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
