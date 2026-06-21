"use client";

import { useCallback, useEffect, useState } from "react";

// Minimal editorial review UI. Lists pending drafts from GET /api/review and
// posts approve/reject to POST /api/review/[id]. The admin token is entered in
// a field (kept only in component state) and sent as `x-admin-token`.

interface Draft {
  id: number;
  stateCode: string;
  stateName: string;
  kind: string;
  headline: string;
  summary: string | null;
  policyKey: string | null;
  proposedStatus: string | null;
  citation: string | null;
  confidence: number | null;
  method: string | null;
  url: string | null;
  eventDate: string;
  reviewStatus: string;
}

interface ReviewResponse {
  database: boolean;
  note?: string;
  count?: number;
  pending: Draft[];
}

export default function AdminReviewPage() {
  const [token, setToken] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review", { cache: "no-store" });
      const data = (await res.json()) as ReviewResponse;
      setDrafts(data.pending ?? []);
      setNote(data.note ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: number, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/review/${id}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        // Drop the acted-on row from the queue.
        setDrafts((d) => d.filter((x) => x.id !== id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8 text-[var(--text)]">
      <h1 className="m-0 text-2xl font-bold">Editorial review queue</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Auto-detected drafts from the ingestion pipeline. Approving appends an
        immutable provision version and publishes the change to the public
        changelog. Nothing publishes without approval.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="password"
          placeholder="ADMIN_TOKEN (sent as x-admin-token)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-[360px] max-w-full rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm hover:bg-[rgba(88,166,255,0.1)]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-[#5b1d1d] bg-[#2a1010] px-3 py-2 text-sm text-[#f1a1a1]">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--muted)]">
          {note}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {loading && drafts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : null}
        {!loading && drafts.length === 0 && !note ? (
          <p className="text-sm text-[var(--muted)]">No pending drafts. 🎉</p>
        ) : null}

        {drafts.map((d) => (
          <article
            key={d.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded bg-[var(--panel-2)] px-2 py-0.5 font-bold text-[var(--text)]">
                {d.stateCode}
              </span>
              <span>{d.eventDate}</span>
              <span>·</span>
              <span>{d.kind}</span>
              {d.method ? (
                <span className="rounded bg-[var(--panel-2)] px-2 py-0.5">
                  via {d.method}
                </span>
              ) : null}
              {d.confidence != null ? (
                <span className="rounded bg-[var(--panel-2)] px-2 py-0.5">
                  conf {d.confidence}
                </span>
              ) : null}
              <span className="rounded bg-[var(--panel-2)] px-2 py-0.5">
                {d.reviewStatus}
              </span>
            </div>

            <h2 className="mt-2 text-base font-semibold">{d.headline}</h2>
            {d.summary ? (
              <p className="mt-1 text-sm text-[#cdd7e1]">{d.summary}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
              {d.policyKey ? <span>policy: {d.policyKey}</span> : null}
              {d.proposedStatus ? (
                <span>proposed status: {d.proposedStatus}</span>
              ) : null}
              {d.citation ? <span>cite: {d.citation}</span> : null}
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[var(--accent)] hover:underline"
                >
                  source
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => void act(d.id, "approve")}
                className="rounded-md border border-[#2c5e3a] bg-[#16361f] px-3 py-1.5 text-sm font-bold text-[#7ee29a] disabled:opacity-50"
              >
                {busyId === d.id ? "…" : "Approve & publish"}
              </button>
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => void act(d.id, "reject")}
                className="rounded-md border border-[#5b1d1d] bg-[#2a1010] px-3 py-1.5 text-sm font-bold text-[#f1a1a1] disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
