import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type BriefRequest = {
  tickers: string[];
  daysBack?: number; // default 3
};

function isoDateDaysAgo(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export async function POST(req: Request) {
  const { tickers, daysBack = 3 } = (await req.json()) as BriefRequest;

  const token = process.env.FINNHUB_API_KEY; // (recomendado) chave Finnhub só no server
  if (!token) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY" }, { status: 500 });
  }

  const from = isoDateDaysAgo(daysBack);
  const to = isoDateDaysAgo(0);

  // 1) Fetch news per ticker
  const newsByTicker: Record<string, any[]> = {};

  for (const t of tickers) {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
      t
    )}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`;

    const r = await fetch(url);
    const data = await r.json();

    // Mantém só campos úteis para reduzir tokens
    newsByTicker[t] = (Array.isArray(data) ? data : [])
      .slice(0, 12)
      .map((x: any) => ({
        headline: x.headline,
        source: x.source,
        datetime: x.datetime,
        summary: x.summary ?? "",
        url: x.url,
      }));
  }

  // 2) Summarize with OpenAI
  const input = [
    {
      role: "system",
      content:
        "És o Gervásio. Faz um brief de notícias de portfólio. Não dês aconselhamento financeiro. Sê conciso, factual, e útil para monitorização.",
    },
    {
      role: "user",
      content: JSON.stringify({
        period: `últimos ${daysBack} dias`,
        tickers,
        newsByTicker,
        output_format: {
          portfolio_summary: [
            "3-6 bullets com temas recorrentes e riscos comuns",
            "Lista de tickers com maior atividade/notícias relevantes",
          ],
          per_ticker: {
            bullets: "3-6 bullets por ticker (o que aconteceu + porquê importa)",
            watch_next: "1-2 bullets: o que vigiar a seguir",
            impact: "🟢/🟡/🔴 (baixo/médio/alto) com 1 frase de justificação",
          },
        },
      }),
    },
  ];

  const resp = await client.responses.create({
    model: "gpt-5.2",
    input,
  });

  return NextResponse.json({ brief: resp.output_text });
}