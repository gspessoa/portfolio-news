"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  ticker: string;
  name: string;
  exchange: string;
  strategy: string;
  price: number | null;
  low52: number | null;
  low52DiffPct: number | null;
  high52: number | null;
  high52DiffPct: number | null;
  pe: number | null;
  evEbitda: number | null;
  currency?: string | null;
};

type ApiResp = {
  grouped: Record<string, Row[]>;
  updatedAt: string;
};

function fmtNum(n: number | null, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

function fmtPct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function Home() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedCluster, setSelectedCluster] = useState<string>("ALL");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/dashboard", { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to load dashboard");
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const clusters = useMemo(() => {
    const keys = Object.keys(data?.grouped ?? {});
    keys.sort((a, b) => a.localeCompare(b));
    return keys;
  }, [data]);

  const visibleGroups = useMemo(() => {
    if (!data) return [];
    if (selectedCluster === "ALL") return clusters.map((k) => [k, data.grouped[k]] as const);
    return [[selectedCluster, data.grouped[selectedCluster] ?? []] as const];
  }, [data, clusters, selectedCluster]);

  return (
    <div style={{ padding: 28, fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0 }}>Portfolio Dashboard</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            Current price, 52W range, and valuation metrics (best-effort).{" "}
            {data?.updatedAt ? `Last update: ${new Date(data.updatedAt).toLocaleString("en-GB")}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Cluster</div>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="ALL">All</option>
              {clusters.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: loading ? "#f3f3f3" : "#111",
              color: loading ? "#666" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              height: 40
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {err && (
        <div style={{ marginTop: 16, padding: 12, background: "#ffecec", border: "1px solid #ffb3b3", borderRadius: 10 }}>
          <strong>Error:</strong> {err}
        </div>
      )}

      {!data && !err && <p style={{ marginTop: 16 }}>Loading…</p>}

      {data && (
        <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
          {visibleGroups.map(([cluster, rows]) => (
            <section key={cluster} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: 0 }}>{cluster}</h2>
                <span style={{ fontSize: 12, color: "#666" }}>{rows.length} assets</span>
              </div>

              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                      <th style={{ padding: "10px 8px" }}>Ticker</th>
                      <th style={{ padding: "10px 8px" }}>Name</th>
                      <th style={{ padding: "10px 8px" }}>Exchange</th>
                      <th style={{ padding: "10px 8px" }}>Price</th>
                      <th style={{ padding: "10px 8px" }}>52W Low (Δ%)</th>
                      <th style={{ padding: "10px 8px" }}>52W High (Δ%)</th>
                      <th style={{ padding: "10px 8px" }}>P/E</th>
                      <th style={{ padding: "10px 8px" }}>EV/EBITDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.ticker} style={{ borderBottom: "1px solid #f2f2f2" }}>
                        <td style={{ padding: "10px 8px", fontWeight: 700 }}>{r.ticker}</td>
                        <td style={{ padding: "10px 8px" }}>{r.name}</td>
                        <td style={{ padding: "10px 8px", color: "#666" }}>{r.exchange}</td>
                        <td style={{ padding: "10px 8px" }}>
                          {fmtNum(r.price, 2)}{r.currency ? ` ${r.currency}` : ""}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {fmtNum(r.low52, 2)} <span style={{ color: "#666" }}>({fmtPct(r.low52DiffPct)})</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {fmtNum(r.high52, 2)} <span style={{ color: "#666" }}>({fmtPct(r.high52DiffPct)})</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>{fmtNum(r.pe, 1)}</td>
                        <td style={{ padding: "10px 8px" }}>{fmtNum(r.evEbitda, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
                Note: P/E and EV/EBITDA may be unavailable for some non-US tickers and ETFs on free data tiers (shown as “—”).
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}