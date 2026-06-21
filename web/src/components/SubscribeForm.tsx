"use client";

import { useMemo, useState } from "react";

interface StateOption {
  code: string;
  name: string;
}

interface PolicyOption {
  key: string;
  label: string;
}

interface SubscribeFormProps {
  states: StateOption[];
  policies: PolicyOption[];
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; message: string; emailConfigured: boolean }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export default function SubscribeForm({ states, policies }: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.name.localeCompare(b.name)),
    [states],
  );

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          states: selectedStates,
          policies: selectedPolicies,
          channel: "email",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) {
        setStatus({
          kind: "not_configured",
          message:
            data.error ??
            "Email subscriptions are not configured on this deployment. You can still follow the RSS feed.",
        });
        return;
      }
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setStatus({
        kind: "ok",
        message:
          data.message ?? "Check your email to confirm your subscription.",
        emailConfigured: Boolean(data.emailConfigured),
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const submitting = status.kind === "submitting";
  const hasError = status.kind === "error";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <label
          htmlFor="sub-email"
          className="mb-1 block text-[13px] font-semibold"
        >
          Email address
        </label>
        <input
          id="sub-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "sub-status" : undefined}
          className="w-full max-w-[360px] rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <fieldset className="border-0 p-0">
        <legend className="mb-1 text-[13px] font-semibold">
          States to watch{" "}
          <span className="font-normal text-[var(--muted)]">
            (none selected = all states)
          </span>
        </legend>
        <div className="flex max-h-[180px] flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2">
          {sortedStates.map((s) => {
            const on = selectedStates.includes(s.code);
            return (
              <button
                key={s.code}
                type="button"
                aria-pressed={on}
                onClick={() => setSelectedStates((prev) => toggle(prev, s.code))}
                className={[
                  "rounded-md border px-2 py-1 text-[11.5px]",
                  on
                    ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-[#06121f]"
                    : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]",
                ].join(" ")}
                title={s.name}
              >
                {s.code}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="mb-1 text-[13px] font-semibold">
          Policy topics{" "}
          <span className="font-normal text-[var(--muted)]">
            (none selected = all topics)
          </span>
        </legend>
        <div className="flex flex-col gap-1.5">
          {policies.map((p) => {
            const on = selectedPolicies.includes(p.key);
            return (
              <label
                key={p.key}
                className="flex cursor-pointer items-center gap-2 text-[13px]"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setSelectedPolicies((prev) => toggle(prev, p.key))
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {p.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06121f] disabled:opacity-60"
        >
          {submitting ? "Subscribing…" : "Subscribe to alerts"}
        </button>
      </div>

      {status.kind === "ok" ? (
        <p
          id="sub-status"
          className="rounded-lg border border-[#2c5e3a] bg-[#16361f] px-3 py-2 text-[13px] text-[#7ee29a]"
          role="status"
        >
          <span aria-hidden="true">✓ </span>
          {status.message}
        </p>
      ) : null}
      {status.kind === "not_configured" ? (
        <p
          id="sub-status"
          className="rounded-lg border border-[#5b4a1d] bg-[#241d0d] px-3 py-2 text-[13px] text-[#e3b341]"
          role="status"
        >
          {status.message}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p
          id="sub-status"
          className="rounded-lg border border-[#5e2c2c] bg-[#2a0f0f] px-3 py-2 text-[13px] text-[#e29a9a]"
          role="alert"
        >
          {status.message}
        </p>
      ) : null}

      <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
        <strong>Privacy:</strong> we store only your email and the
        states/topics you pick — nothing else. Subscriptions use double opt-in
        (we email you a confirmation link; you&apos;re not subscribed until you
        click it), and every email includes a one-click unsubscribe link.
      </p>
    </form>
  );
}
