"use client";

import { useEffect, useState } from "react";

type DayBucket = {
  total: number;
  units: Record<string, number>;
  intents: Record<string, number>;
  sources: Record<string, number>;
};

const UNIT_LABEL: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

export default function MetricsPage() {
  const [today, setToday] = useState("");
  const [days, setDays] = useState<Record<string, DayBucket>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/metricas")
      .then((response) => response.json())
      .then((payload) => {
        setToday(payload.today);
        setDays(payload.days || {});
      })
      .catch(() => setError("Não deu para ler as métricas agora."));
  }, []);

  const current = days[today] || { total: 0, units: {}, intents: {}, sources: {} };

  return (
    <main className="metrics-page">
      <section className="section-inner">
        <p className="eyebrow">Uso interno</p>
        <h1>Toques em Pedir</h1>
        <p>Contagem do dia {today || "—"} no próprio site. O GA4 continua valendo para o histórico longo.</p>
        {error ? <p>{error}</p> : null}
        <p className="metrics-total">{current.total} pedidos iniciados hoje</p>
        <div className="metrics-grid">
          {Object.entries(UNIT_LABEL).map(([id, label]) => (
            <article key={id}>
              <strong>{label}</strong>
              <span>{current.units[id] || 0}</span>
            </article>
          ))}
        </div>
        <h2>Por tipo</h2>
        <ul>
          {Object.entries(current.intents).length === 0 ? <li>Nenhum ainda.</li> : Object.entries(current.intents).map(([key, value]) => (
            <li key={key}>{key}: {value}</li>
          ))}
        </ul>
        <h2>No GA4</h2>
        <p>Evento <code>whatsapp_click</code>, parâmetro <code>unit</code> = fatima, nacoes ou itacolomi.</p>
      </section>
    </main>
  );
}
