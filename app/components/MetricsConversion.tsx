"use client";

import { useMemo } from "react";
import { CHANNEL_LABEL, type ChannelKey } from "../metrics-channels";
import { channelFunnels, overallFunnel } from "../metrics-conversion";
import { daysForRange, type DayBucket, type RangeKey } from "../metrics-range";

function pct(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export default function MetricsConversion({
  today,
  days,
  range,
  channel,
  onChannel,
}: {
  today: string;
  days: Record<string, DayBucket>;
  range: RangeKey;
  channel: ChannelKey;
  onChannel: (value: ChannelKey) => void;
}) {
  const rows = useMemo(
    () => channelFunnels(days, daysForRange(today, days, range)),
    [days, today, range],
  );
  const total = overallFunnel(rows);
  const visible = channel === "all" ? rows : rows.filter((row) => row.channel === channel);

  return (
    <section className="metrics-block">
      <h2>Conversão por canal</h2>
      <p>
        Conversa e pedido entram no mesmo canal do último clique daquela loja, se o clique foi nas últimas 6 horas.
      </p>

      <div className="metrics-grid" style={{ marginTop: "0.8rem" }}>
        <article className="metrics-card">
          <strong>Clique → conversa</strong>
          <span>{pct(total.clickToTalk)}</span>
          <small>
            {total.talks} conversas em {total.clicks} cliques
          </small>
        </article>
        <article className="metrics-card">
          <strong>Conversa → pedido</strong>
          <span>{pct(total.talkToSale)}</span>
          <small>
            {total.sales} pedidos em {total.talks} conversas
          </small>
        </article>
        <article className="metrics-card">
          <strong>Clique → pedido</strong>
          <span>{pct(total.clickToSale)}</span>
          <small>Taxa final do período</small>
        </article>
      </div>

      <div className="metrics-conversion-list">
        {visible.length === 0 ? <p>Ainda não há dados deste canal no período.</p> : null}
        {visible.map((row) => (
          <button
            type="button"
            key={row.channel}
            className="metrics-conversion-row"
            onClick={() => onChannel(row.channel)}
          >
            <strong>{row.label}</strong>
            <span>
              {row.clicks} cliques · {row.talks} conversas · {row.sales} pedidos
            </span>
            <small>
              {pct(row.clickToTalk)} conversa · {pct(row.talkToSale)} pedido · {pct(row.clickToSale)} final
            </small>
          </button>
        ))}
      </div>

      {channel !== "all" ? (
        <p className="metrics-lead">Filtro atual: {CHANNEL_LABEL[channel]}.</p>
      ) : null}
    </section>
  );
}
