"use client";

import { useMemo, useState } from "react";

const TICKERS = ["ASML", "ADBE", "PYPL"]; // muda aqui

export default function Home() {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateBrief() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: TICKERS, daysBack: 3 }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro no /api/brief (${res.status}): ${text}`);
      }

      const data = await res.json();
      setBrief(data.brief ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Erro desconhecido ao gerar brief");
    } finally {
      setLoading(false);
    }
  }

  const hasBrief = useMemo(() => brief.trim().length > 0, [brief]);

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "Arial, sans-serif",
        maxWidth: 980,
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Portfolio Brief</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            Sumário dos últimos 3 dias • {TICKERS.join(", ")}
          </p>
        </div>

        <button
          onClick={generateBrief}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: loading ? "#f3f3f3" : "#111",
            color: loading ? "#666" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "A gerar…" : "Gerar Brief"}
        </button>
      </header>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#ffecec",
            border: "1px solid #ffb3b3",
            borderRadius: 10,
          }}
        >
          <strong>Erro:</strong> {error}
        </div>
      )}

      <section
        style={{
          marginTop: 18,
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 16,
          background: "white",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Brief</h2>

        {!hasBrief ? (
          <p style={{ color: "#666" }}>
            Clica em <strong>Gerar Brief</strong> para criar um sumário das notícias do teu portfólio.
          </p>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{brief}</div>
        )}
      </section>

      <section style={{ marginTop: 18, color: "#666", fontSize: 12 }}>
        Dica: se quiseres, a seguir podemos mostrar também as fontes (links) por baixo do sumário para validação rápida.
      </section>
    </div>
  );
}