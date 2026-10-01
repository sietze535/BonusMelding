"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Watch = {
  id: string;
  supermarket: string;
  externalProductId: string;
  name: string;
  imageUrl: string | null;
};

type SearchProduct = {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  unitSize?: string;
  imageUrl?: string;
  isBonus?: boolean;
  bonusLabel?: string;
  supermarket: string;
  supermarketLabel: string;
};

export function DashboardClient({ initialWatches }: { initialWatches: Watch[] }) {
  const [watches, setWatches] = useState(initialWatches);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const watchedIds = new Set(
    watches.map((w) => `${w.supermarket}:${w.externalProductId}`),
  );

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(q)}&supermarket=ah`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Zoeken mislukt");
        setResults([]);
        return;
      }
      setResults(data.products ?? []);
    } catch {
      setError("Netwerkfout bij zoeken");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  async function follow(product: SearchProduct) {
    setError("");
    const res = await fetch("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supermarket: product.supermarket,
        externalProductId: product.id,
        name: product.name,
        imageUrl: product.imageUrl ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kon product niet volgen");
      return;
    }
    setWatches((prev) => {
      if (prev.some((w) => w.id === data.watch.id)) return prev;
      return [data.watch, ...prev];
    });
  }

  async function unfollow(id: string) {
    setError("");
    const res = await fetch(`/api/watches/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Kon product niet ontvolgen");
      return;
    }
    setWatches((prev) => prev.filter((w) => w.id !== id));
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  return (
    <div className="dashboard">
      <section className="panel">
        <h2>Zoek een product</h2>
        <p className="muted">Zoek in het Albert Heijn-assortiment en volg wat jij wilt.</p>
        <form onSubmit={onSearchSubmit} className="search-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bijv. Nutella, AH melk, courgette…"
            className="search-input"
            aria-label="Zoekproduct"
          />
        </form>
        {searching ? <p className="muted">Zoeken…</p> : null}
        {error ? <p className="form-msg error">{error}</p> : null}
        <ul className="product-list">
          {results.map((p) => {
            const key = `${p.supermarket}:${p.id}`;
            const following = watchedIds.has(key);
            return (
              <li key={key} className="product-row">
                <div className="product-media">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    <div className="img-fallback" />
                  )}
                </div>
                <div className="product-meta">
                  <span className="badge">{p.supermarketLabel}</span>
                  <strong>{p.name}</strong>
                  <span className="muted">
                    {p.price != null ? `€ ${p.price.toFixed(2)}` : ""}
                    {p.unitSize ? ` · ${p.unitSize}` : ""}
                    {p.isBonus ? ` · ${p.bonusLabel ?? "Bonus"}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className={following ? "btn ghost" : "btn"}
                  disabled={following}
                  onClick={() => void follow(p)}
                >
                  {following ? "Volgend" : "Volgen"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Jouw lijst</h2>
        <p className="muted">
          {watches.length === 0
            ? "Nog geen producten. Zoek hierboven om te beginnen."
            : `${watches.length} product${watches.length === 1 ? "" : "en"} in de gaten.`}
        </p>
        <ul className="product-list">
          {watches.map((w) => (
            <li key={w.id} className="product-row">
              <div className="product-media">
                {w.imageUrl ? (
                  <Image
                    src={w.imageUrl}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                  />
                ) : (
                  <div className="img-fallback" />
                )}
              </div>
              <div className="product-meta">
                <span className="badge">{w.supermarket === "ah" ? "Albert Heijn" : w.supermarket}</span>
                <strong>{w.name}</strong>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => void unfollow(w.id)}
              >
                Ontvolgen
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
