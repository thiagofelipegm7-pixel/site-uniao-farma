"use client";

import { useEffect, useState } from "react";

type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";

type DayBucket = {
  total: number;
  stages?: Record<MetricStage, number>;
  units: Record<string, number>;
  intents: Record<string, number>;
  sources: Record<string, number>;
};

const UNIT_LABEL: Record<string, string> = {
  fatima: "F\u00e1tima",
  nacoes: "Na\u00e7\u00f5es",
  itacolomi: "Itacolomi",
};

const STAGE_COPY: Record<MetricStage, { title: string; hint: string }> = {
  whatsapp_click: {
    title: "Cliques no WhatsApp",
    hint: "O visitante tocou e o app abriu. Ainda n\u00e3o \u00e9 conversa nem venda.",
  },
  conversation_received: {
    title: "Conversas recebidas",
    hint: "A loja recebeu e atendeu a mensagem. A equipe registra aqui.",
  },
  order_completed: {
    title: "Pedidos conclu\u00eddos",
    hint: "Venda fechada depois da conversa. S\u00f3 a loja confirma.",
  },
};

export default function MetricsPage() {
  const [today, setToday] = useState("");
  const [days, setDays] = useState<Record<string, DayBucket>>({});
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("fatima");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/metricas")
      .then((response) => response.json())
      .then((payload) => {
        setToday(payload.today);
        setDays(payload.days || {});
      })
      .catch(() => setError("N\u00e3o deu para ler as m\u00e9tricas agora."));
  }

  useEffect(() => {
    load();
  }, []);

  const current = days[today] || {
    total: 0,
    stages: { whatsapp_click: 0, conversation_received: 0, order_completed: 0 },
    units: {},
    intents: {},
    sources: {},
  };
  const stages = current.stages || {
    whatsapp_click: current.total || 0,
    conversation_received: 0,
    order_completed: 0,
  };

  async function register(stage: MetricStage) {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/metricas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          unit,
          source: "staff_panel",
          intent: stage,
        }),
      });
      load();
    } catch {
      setError("N\u00e3o deu para registrar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="metrics-page">
      <section className="section-inner">
        <p className="eyebrow">Uso interno</p>
        <h1>Contatos e vendas</h1>
        <p>
          Dia {today || "\u2014"}. Clique no site n\u00e3o \u00e9 pedido. A venda s\u00f3 entra quando a loja marca
          o pedido como conclu\u00eddo.
        </p>
        {error ? <p>{error}</p> : null}

        <div className="metrics-grid">
          {(Object.keys(STAGE_COPY) as MetricStage[]).map((stage) => (
            <article key={stage}>
              <strong>{STAGE_COPY[stage].title}</strong>
              <span>{stages[stage] || 0}</span>
              <small>{STAGE_COPY[stage].hint}</small>
            </article>
          ))}
        </div>

        <h2>Cliques por loja</h2>
        <div className="metrics-grid">
          {Object.entries(UNIT_LABEL).map(([id, label]) => (
            <article key={id}>
              <strong>{label}</strong>
              <span>{current.units[id] || 0}</span>
            </article>
          ))}
        </div>

        <h2>Registrar conversa ou venda</h2>
        <p>Use depois que a loja atender no WhatsApp ou fechar o pedido.</p>
        <label>
          Loja{" "}
          <select value={unit} onChange={(event) => setUnit(event.target.value)} disabled={busy}>
            {Object.entries(UNIT_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p>
          <button type="button" disabled={busy} onClick={() => register("conversation_received")}>
            Marcar conversa recebida
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => register("order_completed")}>
            Marcar pedido conclu\u00eddo
          </button>
        </p>

        <h2>Origem dos cliques</h2>
        <ul>
          {Object.entries(current.sources).filter(([key]) => !key.includes(":")).length === 0 ? (
            <li>Nenhum clique ainda.</li>
          ) : (
            Object.entries(current.sources)
              .filter(([key]) => !key.includes(":"))
              .map(([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              ))
          )}
        </ul>

        <h2>No GA4</h2>
        <p>
          Evento <code>whatsapp_click</code> com <code>unit</code>, <code>source</code> e{" "}
          <code>placement</code>. N\u00e3o use esse evento como convers\u00e3o de venda.
        </p>
      </section>
    </main>
  );
}
