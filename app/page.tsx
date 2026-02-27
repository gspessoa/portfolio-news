"use client";

import { useEffect, useState } from "react";

const TICKERS = ["ASML", "ADBE", "PYPL"]; // muda aqui

export default function Home() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      const allNews: any[] = [];

      for (const ticker of TICKERS) {
        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${getDate(
            3
          )}&to=${getDate(0)}&token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
        );
        const data = await res.json();

        const tagged = data.slice(0, 5).map((item: any) => ({
          ...item,
          ticker,
        }));

        allNews.push(...tagged);
      }

      setNews(allNews.sort((a, b) => b.datetime - a.datetime));
      setLoading(false);
    }

    fetchNews();
  }, []);

  function getDate(daysAgo: number) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Portfolio News</h1>
      {news.map((item, i) => (
        <div key={i} style={{ marginBottom: "20px" }}>
          <strong>{item.ticker}</strong>
          <p>
            <a href={item.url} target="_blank">
              {item.headline}
            </a>
          </p>
          <small>
            {new Date(item.datetime * 1000).toLocaleString()} — {item.source}
          </small>
          <hr />
        </div>
      ))}
    </div>
  );
}