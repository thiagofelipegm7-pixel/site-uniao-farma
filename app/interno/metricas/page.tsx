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
    hint: "Mensagem que chegou na loja pelo webhook da Meta, ou registro manual.",
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
      <section className="section-inner">
        <p className="eyebrow">Uso interno</p>
        <h1>Contatos e vendas</h1>
        <p>
          {"Dia "}{today || "—"}{". Clique no site não é pedido. Conversa só conta quando a Meta avisa que a loja recebeu a mensagem."}
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

        <h2>WhatsApp Business</h2>
        <p>
          Callback: <code>{webhook.callbackPath || "/api/whatsapp/webhook"}</code>
        </p>
        <ul>
          <li>Verify token: {webhook.verifyTokenReady ? "configurado" : "faltando WHATSAPP_VERIFY_TOKEN"}</li>
          <li>App secret: {webhook.appSecretReady ? "configurado" : "faltando WHATSAPP_APP_SECRET"}</li>
          <li>{"Phone ID Fátima: "}{webhook.phoneIds?.fatima ? "ok" : "opcional"}</li>
          <li>{"Phone ID Nações: "}{webhook.phoneIds?.nacoes ? "ok" : "opcional"}</li>
          <li>Phone ID Itacolomi: {webhook.phoneIds?.itacolomi ? "ok" : "opcional"}</li>
        </ul>
        <p>{ready ? "Webhook pronto para a Meta verificar." : "Coloque as variáveis no ambiente de produção e volte aqui."}</p>

        <h3>{"Últimos eventos do webhook"}</h3>
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
        <p>{"Use se o webhook ainda não estiver no ar, ou para marcar a venda fechada."}</p>
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
            {"Marcar pedido concluído"}
          </button>
        </p>
      </section>
    </main>
  );
}
