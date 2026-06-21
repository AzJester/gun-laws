"use client";

import type { StateSummary } from "@/lib/types";

interface TileMapProps {
  states: Record<string, StateSummary>;
  selected: string | null;
  changed: Set<string>;
  colorFor: (code: string) => { bg: string; fg: string };
  dimmed: (code: string) => boolean;
  onSelect: (code: string) => void;
}

// Tile cartogram: 11 columns x 8 rows. Each state's [row, col] is 1-indexed.
const COLS = 11;
const ROWS = 8;

export default function TileMap({
  states,
  selected,
  changed,
  colorFor,
  dimmed,
  onSelect,
}: TileMapProps) {
  const placed = Object.values(states).filter((s) => s.grid);

  return (
    <div
      className="grid w-full gap-1"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
      }}
      role="group"
      aria-label="US states tile-grid cartogram"
    >
      {placed.map((s) => {
        const [row, col] = s.grid as [number, number];
        const c = colorFor(s.code);
        const cls = [
          "tile",
          s.code === selected ? "selected" : "",
          changed.has(s.code) && s.code !== selected ? "changed" : "",
          dimmed(s.code) ? "dim" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div
            key={s.code}
            className={cls}
            style={{
              gridColumn: col,
              gridRow: row,
              background: c.bg,
              color: c.fg,
            }}
            tabIndex={0}
            role="button"
            aria-label={`${s.name} — Grade ${s.grade}`}
            onClick={() => onSelect(s.code)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s.code);
              }
            }}
          >
            {s.code}
          </div>
        );
      })}
    </div>
  );
}
