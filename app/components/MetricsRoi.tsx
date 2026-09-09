"use client";

import { useEffect, useMemo, useState } from "react";
import { type ChannelKey } from "../metrics-channels";
import { channelFunnels } from "../metrics-conversion";
import { daysForRange, type DayBucket, type RangeKey } from "../metrics-range";

const STORAGE = "uf-roi-settings";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseAmount(value: string) {
  const normalized = value.replace(/\s/g, "").replace("R$", "").replace(".", "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export default function MetricsRoi({
  today,
  days,
  range,
  channel,
}: {
  today: string;
  days: Record<string, DayBucket>;
  range: RangeKey;
  channel: ChannelKey;
}) {
  const [ticket, setTicket] = useState("80");
  const [costs, setCosts] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ticket?: string; costs?: Record<string, string> };
      if (parsed.ticket) setTicket(parsed.ticket);
      if (parsed.costs) setCosts(parsed.costs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE, JSON.stringify({ ticket, costs }));
  }, [ticket, costs]);

  const rows = useMemo(() => {
    const ticketValue = parseAmount(ticket);
    return channelFunnels(days, daysForRange(today, days, range))
      .filter((row) => (channel === "all" ? true : row.channel === channel))
      .map((row) => {
        const cost = parseAmount(costs[row.channel] || "");
        const revenue = row.sales * ticketValue;
        const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null;
        const costPerOrder = row.sales > 0 && cost > 0 ? cost / row.sales : null;
        return { ...row, cost, revenue, roi, costPerOrder };
      });
  }, [days, today, range, channel, ticket, costs]);

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalRoi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : null;

  return (
    <section className="metrics-block">
      <h2>ROI por canal</h2>
      <p>
        Coloque o ticket médio da loja e o que gastou no canal no período. A receita é estimada: pedidos × ticket.
      </p>

      <label>
        Ticket médio
        <input
          inputMode="decimal"
          value={ticket}
          onChange={(event) => setTicket(event.target.value)}
          placeholder="80,00"
        />
      </label>

      <div className="metrics-grid" style={{ marginTop: "0.9rem" }}>
        <article className="metrics-card">
          <strong>Receita estimada</strong>
          <span>{money(totalRevenue)}</span>
          <small>{totalSales} pedidos no período</small>
        </article>
        <article className="metrics-card">
          <strong>Custo informado</strong>
          <span>{money(totalCost)}</span>
          <small>Soma dos canais preenchidos</small>
        </article>
        <article className="metrics-card">
          <strong>ROI</strong>
          <span>{totalRoi == null ? "—" : `${totalRoi.toFixed(0).replace(".", ",")}%`}</span>
          <small>(receita − custo) ÷ custo</small>
        </article>
      </div>

      <div className="metrics-roi-list">
        {rows.map((row) => (
          <article className="metrics-roi-row" key={row.channel}>
            <div>
              <strong>{row.label}</strong>
              <span>
                {row.sales} pedidos · {money(row.revenue)}
              </span>
              <small>
                {row.roi == null ? "Preencha o custo para ver o ROI" : `ROI ${row.roi.toFixed(0)}%`}
                {row.costPerOrder != null ? ` · custo/pedido ${money(row.costPerOrder)}` : ""}
              </small>
            </div>
            <label>
              Custo
              <input
                inputMode="decimal"
                value={costs[row.channel] || ""}
                onChange={(event) => setCosts((current) => ({ ...current, [row.channel]: event.target.value }))}
                placeholder="0,00"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
