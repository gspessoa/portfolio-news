import { NextResponse } from "next/server";
import { UNIVERSE } from "@/lib/universe";

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

type AssetError = {
  ticker: string;
  providerSymbol: string;
  source: "twelvedata" | "finnhub";
  message: string;
};

function pctDiff(current: number, ref: number) {
  return ((current - ref) / ref) * 100;
}

async function getJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { ok: r.ok, status: r.status, data, text };
}

async function fetchTwelveTimeSeries(symbol: string) {
  const key = process.env.TWELVE_DATA_API_KEY!;
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
    symbol
  )}&interval=1day&outputsize=260&apikey=${encodeURIComponent(key)}`;

  const { ok, status, data, text } = await getJson(url);

  if (!ok || data?.status === "error") {
    const msg = data?.message ?? data?.error ?? `HTTP ${status}: ${text?.slice(0, 120)}`;
    throw new Error(msg);
  }
  return data;
}

async function fetchFinnhubMetrics(ticker: string) {
  const key = process.env.FINNHUB_API_KEY!;
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
    ticker
  )}&metric=all&token=${encodeURIComponent(key)}`;

  const { ok, status, data, text } = await getJson(url);

  if (!ok) {
    throw new Error(`HTTP ${status}: ${text?.slice(0, 120)}`);
  }
  return data;
}

export async function GET() {
  const errors: AssetError[] = [];

  if (!process.env.TWELVE_DATA_API_KEY) {
    return NextResponse.json(
      { error: "Missing TWELVE_DATA_API_KEY" },
      { status: 500 }
    );
  }
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  const rows: Row[] = [];

  for (const a of UNIVERSE) {
    let price: number | null = null;
    let low52: number | null = null;
    let high52: number | null = null;
    let currency: string | null = null;

    // Prices + 52W
    try {
      const ts = await fetchTwelveTimeSeries(a.providerSymbol);
      currency = ts?.meta?.currency ?? null;

      const values = Array.isArray(ts?.values) ? ts.values : [];
      if (values.length > 0) {
        const closes = values.map((v: any) => Number(v.close)).filter(Number.isFinite);
        const highs = values.map((v: any) => Number(v.high)).filter(Number.isFinite);
        const lows = values.map((v: any) => Number(v.low)).filter(Number.isFinite);

        price = closes[0] ?? null;
        high52 = highs.length ? Math.max(...highs) : null;
        low52 = lows.length ? Math.min(...lows) : null;
      }
    } catch (e: any) {
      errors.push({
        ticker: a.ticker,
        providerSymbol: a.providerSymbol,
        source: "twelvedata",
        message: e?.message ?? String(e),
      });
    }

    // Valuation metrics
    let pe: number | null = null;
    let evEbitda: number | null = null;

    try {
      const m = await fetchFinnhubMetrics(a.ticker);
      const metric = m?.metric ?? {};
      pe = Number.isFinite(metric?.peTTM)
        ? metric.peTTM
        : Number.isFinite(metric?.peBasicExclExtraTTM)
        ? metric.peBasicExclExtraTTM
        : null;
      evEbitda = Number.isFinite(metric?.evEbitdaTTM) ? metric.evEbitdaTTM : null;
    } catch (e: any) {
      errors.push({
        ticker: a.ticker,
        providerSymbol: a.providerSymbol,
        source: "finnhub",
        message: e?.message ?? String(e),
      });
    }

    rows.push({
      ticker: a.ticker,
      name: a.name,
      exchange: a.exchange,
      strategy: a.strategy,
      price,
      low52,
      low52DiffPct: price != null && low52 != null ? pctDiff(price, low52) : null,
      high52,
      high52DiffPct: price != null && high52 != null ? pctDiff(price, high52) : null,
      pe,
      evEbitda,
      currency,
    });
  }

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.strategy] ||= []).push(r);
    return acc;
  }, {});

  Object.keys(grouped).forEach((k) => grouped[k].sort((a, b) => a.ticker.localeCompare(b.ticker)));

  return NextResponse.json({
    grouped,
    errors,
    updatedAt: new Date().toISOString(),
  });
}