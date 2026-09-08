"use client";

import { useEffect, useState } from "react";
import "../../metrics-polish.css";

type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";

type DayBucket = {
  total: number;
  stages?: Record<MetricStage, number>;
  units: Record<string, number>;
  intents: Record<string, number>;
  sources: Record<string, number>;
};

type WebhookStatus = {
  verifyTokenReady?: boolean;
  appSecretReady?: boolean;
  callbackPath?: string;
  phoneIds?: Record<string, boolean>;
  recent?: Array<{ at: string; unit: string; type: string; source: string }>;
};

const UNIT_LABEL: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

const STAGE_COPY: Record<MetricStage, { title: string; hint: string }> = {
  whatsapp_click: {
    title: "Cliques no WhatsApp",
    hint: "O visitante tocou e o app abriu. Ainda não é conversa nem venda.",
  },
  conversation_received: {
    title: "Conversas recebidas",
    hint: "Mensagem que chegou na loja, ou registro manual da equipe.",
  },
  order_completed: {
    title: "Pedidos concluídos",
    hint: "Venda fechada depois da conversa. Só a loja confirma.",
  },
};

export default function MetricsPage() {
  const [today, setToday] = useState("");
  const [days, setDays] = useState<Record<string, DayBucket>>({});
  const [webhook, setWebhook] = useState<WebhookStatus>({});
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("fatima");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/metricas")
      .then((response) => response.json())
      .then((payload) => {
        setToday(payload.today);
        setDays(payload.days || {});
        setWebhook(payload.webhook || {});
      })
      .catch(() => setError("Não deu para ler as métricas agora."));
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
      setError("Não deu para registrar agora.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(webhook.verifyTokenReady && webhook.appSecretReady);

  return (
    <main className="metrics-page">
      <div className="metrics-wrap">
        <div className="metrics-top">
          <div>
            <p className="eyebrow">Uso interno</p>
            <h1>Contatos e vendas</h1>
            <p className="metrics-lead">
              {"Dia "}{today || "—"}{". Clique não é pedido. Conversa só conta quando a loja recebe a mensagem."}
            </p>
          </div>
          <a className="metrics-exit" href="/interno/sair">
            Sair
          </a>
        </div>

        {error ? <p className="metrics-error">{error}</p> : null}

        <div className="metrics-grid">
          {(Object.keys(STAGE_COPY) as MetricStage[]).map((stage) => (
            <article className="metrics-card" key={stage}>
              <strong>{STAGE_COPY[stage].title}</strong>
              <span>{stages[stage] || 0}</span>
              <small>{STAGE_COPY[stage].hint}</small>
            </article>
          ))}
        </div>

        <section className="metrics-block">
          <h2>Cliques por loja</h2>
          <div className="metrics-grid" style={{ margin: "0.6rem 0 0" }}>
            {Object.entries(UNIT_LABEL).map(([id, label]) => (
              <article className="metrics-card" key={id}>
                <strong>{label}</strong>
                <span>{current.units[id] || 0}</span>
                <small>Toques no WhatsApp desta unidade</small>
              </article>
            ))}
          </div>
        </section>

        <section className="metrics-block">
          <h2>Registrar conversa ou venda</h2>
          <p>{"Use se o WhatsApp ainda não avisar sozinho, ou para marcar a venda fechada."}</p>
          <label>
            Loja
            <select value={unit} onChange={(event) => setUnit(event.target.value)} disabled={busy}>
              {Object.entries(UNIT_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="metrics-actions">
            <button type="button" disabled={busy} onClick={() => register("conversation_received")}>
              Marcar conversa recebida
            </button>
            <button type="button" disabled={busy} onClick={() => register("order_completed")}>
              {"Marcar pedido concluído"}
            </button>
          </div>
        </section>

        <section className="metrics-block">
          <h2>WhatsApp Business</h2>
          <p>
            Callback: <code>{webhook.callbackPath || "/api/whatsapp/webhook"}</code>
          </p>
          <ul>
            <li>Verify token: {webhook.verifyTokenReady ? "configurado" : "faltando"}</li>
            <li>App secret: {webhook.appSecretReady ? "configurado" : "faltando"}</li>
            <li>{"Fátima: "}{webhook.phoneIds?.fatima ? "ok" : "opcional"}</li>
            <li>{"Nações: "}{webhook.phoneIds?.nacoes ? "ok" : "opcional"}</li>
            <li>Itacolomi: {webhook.phoneIds?.itacolomi ? "ok" : "opcional"}</li>
          </ul>
          <p>{ready ? "Webhook pronto para a Meta verificar." : "Falta terminar a configuração no ambiente."}</p>
          <h3>{"Últimos eventos"}</h3>
          <ul>
            {(webhook.recent || []).length === 0 ? (
              <li>{"Nenhuma mensagem inbound ainda. O texto da conversa não é gravado."}</li>
            ) : (
              (webhook.recent || []).map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  {event.at}{" · "}{UNIT_LABEL[event.unit] || event.unit}{" · "}{event.type}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
