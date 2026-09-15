"use client";

import { useEffect, useMemo, useState } from "react";
import MetricsCharts from "../../components/MetricsCharts";
import MetricsConversion from "../../components/MetricsConversion";
import MetricsRoi from "../../components/MetricsRoi";
import { CHANNEL_LABEL, type ChannelKey } from "../../metrics-channels";
import { unitFunnels, UNIT_LABEL } from "../../metrics-conversion";
import { RANGE_LABEL, daysForRange, sumRange, type RangeKey } from "../../metrics-range";
import "../../metrics-polish.css";
import "../../metrics-range.css";
import "../../metrics-conversion.css";
import "../../metrics-roi.css";

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [unit, setUnit] = useState("fatima");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<RangeKey>("today");
  const [channel, setChannel] = useState<ChannelKey>("all");

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

  const totals = useMemo(
    () => sumRange(days, daysForRange(today, days, range), channel),
    [days, today, range, channel],
  );

  const unitRows = useMemo(
    () => unitFunnels(days, daysForRange(today, days, range)),
    [days, today, range],
  );

  async function register(stage: MetricStage) {
    setBusy(true);
    setError("");
    setFeedback(null);
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
      const stageLabel = stage === "order_completed" ? "Pedido concluído" : "Conversa recebida";
      const unitLabel = UNIT_LABEL[unit] || unit;
      setFeedback(`✓ ${stageLabel} registrado com sucesso para a loja ${unitLabel}!`);
      load();
    } catch {
      setError("Não deu para registrar agora. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(webhook.verifyTokenReady && webhook.appSecretReady);

  return (
    <div className="metrics-page">
      <div className="metrics-wrap">
        <div className="metrics-top">
          <div>
            <p className="eyebrow">Uso interno</p>
            <h1>Contatos e vendas</h1>
            <p className="metrics-lead">
              {RANGE_LABEL[range]} · {CHANNEL_LABEL[channel]}. Clique não é pedido.
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
              <span>{totals.stages[stage] || 0}</span>
              <small>{STAGE_COPY[stage].hint}</small>
            </article>
          ))}
        </div>

        <MetricsCharts
          today={today}
          days={days}
          range={range}
          channel={channel}
          onRange={setRange}
          onChannel={setChannel}
        />

        <MetricsConversion
          today={today}
          days={days}
          range={range}
          channel={channel}
          onChannel={setChannel}
        />

        <MetricsRoi today={today} days={days} range={range} channel={channel} />

        {channel === "all" ? (
          <section className="metrics-block">
            <h2>Desempenho por loja</h2>
            <p>
              Acompanhamento das unidades de Sabará: cliques no WhatsApp, conversas iniciadas e vendas concluídas.
            </p>
            <div className="metrics-unit-grid">
              {unitRows.map((u) => (
                <article className="metrics-unit-card" key={u.unit}>
                  <div className="metrics-unit-card-header">
                    <strong>{u.label}</strong>
                    <span className="metrics-unit-rate-badge">
                      {u.clicks > 0 ? `${u.clickToSale.toFixed(1).replace(".", ",")}% conv.` : "Sem dados"}
                    </span>
                  </div>
                  <div className="metrics-unit-card-stats">
                    <div>
                      <b>{u.clicks}</b>
                      <small>Cliques</small>
                    </div>
                    <div>
                      <b>{u.talks}</b>
                      <small>Conversas</small>
                    </div>
                    <div>
                      <b>{u.sales}</b>
                      <small>Pedidos</small>
                    </div>
                  </div>
                  <div className="metrics-unit-card-footer">
                    <small>
                      Clique → Conversa: <b>{u.clicks > 0 ? `${u.clickToTalk.toFixed(1).replace(".", ",")}%` : "—"}</b>
                    </small>
                    <small>
                      Conversa → Pedido: <b>{u.talks > 0 ? `${u.talkToSale.toFixed(1).replace(".", ",")}%` : "—"}</b>
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
          {feedback ? (
            <div className="metrics-feedback-success" role="status">
              {feedback}
            </div>
          ) : null}
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
    </div>
  );
}
