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

function pctDiff(current: number, ref: number) {
  return ((current - ref) / ref) * 100;
}

async function fetchTwelveTimeSeries(symbol: string) {
  const key = process.env.TWELVE_DATA_API_KEY!;
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
    symbol
  )}&interval=1day&outputsize=260&apikey=${encodeURIComponent(key)}`;

  const r = await fetch(url, { cache: "no-store" });
  const data = await r.json();

  // Twelve Data errors come as { status: "error", message: "..."}
  if (!r.ok || data?.status === "error") {
    throw new Error(`TwelveData error for ${symbol}: ${data?.message ?? r.status}`);
  }

  // values: [{datetime, open, high, low, close, volume}, ...]
  return data;
}

async function fetchFinnhubMetrics(ticker: string) {
  const key = process.env.FINNHUB_API_KEY!;
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
    ticker
  )}&metric=all&token=${encodeURIComponent(key)}`;

  const r = await fetch(url, { cache: "no-store" });
  const data = await r.json();

  if (!r.ok) {
    throw new Error(`Finnhub metrics error for ${ticker}: ${r.status}`);
  }
  return data;
}

export async function GET() {
  try {
    if (!process.env.TWELVE_DATA_API_KEY) {
      return NextResponse.json({ error: "Missing TWELVE_DATA_API_KEY" }, { status: 500 });
    }
    if (!process.env.FINNHUB_API_KEY) {
      return NextResponse.json({ error: "Missing FINNHUB_API_KEY" }, { status: 500 });
    }

    // ⚠️ Para evitar rate limits no free tier, começa com poucos tickers.
    // Depois adicionamos cache (revalidate) e/ou batching.
    const rows: Row[] = [];

    for (const a of UNIVERSE) {
      let price: number | null = null;
      let low52: number | null = null;
      let high52: number | null = null;
      let currency: string | null = null;

      // Prices + 52w range via Twelve Data
      try {
        const ts = await fetchTwelveTimeSeries(a.providerSymbol);
        currency = ts?.meta?.currency ?? null;

        const values = Array.isArray(ts?.values) ? ts.values : [];
        if (values.length > 0) {
          const closes = values.map((v: any) => Number(v.close)).filter((n: number) => Number.isFinite(n));
          const highs = values.map((v: any) => Number(v.high)).filter((n: number) => Number.isFinite(n));
          const lows = values.map((v: any) => Number(v.low)).filter((n: number) => Number.isFinite(n));

          price = closes[0] ?? null;       // latest (Twelve returns most recent first)
          high52 = highs.length ? Math.max(...highs) : null;
          low52 = lows.length ? Math.min(...lows) : null;
        }
      } catch {
        // keep nulls
      }

      // Valuation metrics via Finnhub (best-effort; often null for non-US/ETFs)
      let pe: number | null = null;
      let evEbitda: number | null = null;

      try {
        const m = await fetchFinnhubMetrics(a.ticker);
        // Finnhub naming varies; these are common keys:
        const metric = m?.metric ?? {};
        pe = Number.isFinite(metric?.peTTM) ? metric.peTTM : (Number.isFinite(metric?.peBasicExclExtraTTM) ? metric.peBasicExclExtraTTM : null);
        evEbitda = Number.isFinite(metric?.evEbitdaTTM) ? metric.evEbitdaTTM : null;
      } catch {
        // keep nulls
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

    // group by strategy
    const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
      acc[r.strategy] = acc[r.strategy] ?? [];
      acc[r.strategy].push(r);
      return acc;
    }, {});

    // sort inside each group by ticker
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => a.ticker.localeCompare(b.ticker));
    }

    return NextResponse.json({ grouped, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json(
      { error: "dashboard_failed", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}