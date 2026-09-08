"use client";

import { useMemo, useState } from "react";

type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";

type DayBucket = {
  total: number;
  stages?: Record<MetricStage, number>;
  units: Record<string, number>;
};

const STAGE_COLOR: Record<MetricStage, string> = {
  whatsapp_click: "#148f8a",
  conversation_received: "#0b6244",
  order_completed: "#083a3b",
};

const STAGE_LABEL: Record<MetricStage, string> = {
  whatsapp_click: "Cliques",
  conversation_received: "Conversas",
  order_completed: "Pedidos",
};

const UNIT_LABEL: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

function lastDays(today: string, count: number) {
  if (!today) return [];
  const start = new Date(`${today}T12:00:00-03:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function stageValue(day: DayBucket | undefined, stage: MetricStage) {
  if (!day) return 0;
  if (day.stages?.[stage] != null) return day.stages[stage];
  return stage === "whatsapp_click" ? day.total || 0 : 0;
}

export default function MetricsCharts({
  today,
  days,
}: {
  today: string;
  days: Record<string, DayBucket>;
}) {
  const [focus, setFocus] = useState("");
  const week = useMemo(() => lastDays(today, 7), [today]);

  const series = week.map((day) => ({
    day,
    label: day.slice(8),
    clicks: stageValue(days[day], "whatsapp_click"),
    talks: stageValue(days[day], "conversation_received"),
    sales: stageValue(days[day], "order_completed"),
  }));

  const maxDay = Math.max(1, ...series.flatMap((item) => [item.clicks, item.talks, item.sales]));
  const units = Object.keys(UNIT_LABEL).map((id) => ({
    id,
    label: UNIT_LABEL[id],
    value: days[today]?.units[id] || 0,
  }));
  const maxUnit = Math.max(1, ...units.map((item) => item.value));

  return (
    <section className="metrics-block metrics-charts">
      <h2>Gráficos da semana</h2>
      <p>Toque numa barra para ver o número do dia.</p>
      {focus ? <p className="metrics-chart-focus">{focus}</p> : null}

      <div className="metrics-chart-legend">
        {(Object.keys(STAGE_LABEL) as MetricStage[]).map((stage) => (
          <span key={stage}>
            <i style={{ background: STAGE_COLOR[stage] }} />
            {STAGE_LABEL[stage]}
          </span>
        ))}
      </div>

      <svg className="metrics-week-chart" viewBox="0 0 360 180" role="img" aria-label="Cliques, conversas e pedidos nos últimos sete dias">
        {series.map((item, index) => {
          const x = 24 + index * 48;
          const bars = [
            { key: "clicks", value: item.clicks, color: STAGE_COLOR.whatsapp_click, label: "cliques" },
            { key: "talks", value: item.talks, color: STAGE_COLOR.conversation_received, label: "conversas" },
            { key: "sales", value: item.sales, color: STAGE_COLOR.order_completed, label: "pedidos" },
          ];
          return (
            <g key={item.day}>
              {bars.map((bar, barIndex) => {
                const height = Math.max(2, (bar.value / maxDay) * 128);
                return (
                  <rect
                    key={bar.key}
                    x={x + barIndex * 12}
                    y={148 - height}
                    width="10"
                    height={height}
                    rx="3"
                    fill={bar.color}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.day}: ${bar.value} ${bar.label}`}
                    onClick={() => setFocus(`${item.day}: ${bar.value} ${bar.label}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setFocus(`${item.day}: ${bar.value} ${bar.label}`);
                      }
                    }}
                  />
                );
              })}
              <text x={x + 16} y="168" textAnchor="middle" fontSize="11" fill="#3a5554">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>

      <h3>Hoje por loja</h3>
      <div className="metrics-unit-bars">
        {units.map((item) => (
          <button
            type="button"
            key={item.id}
            className="metrics-unit-bar"
            onClick={() => setFocus(`${item.label}: ${item.value} cliques hoje`)}
          >
            <span>{item.label}</span>
            <b>{item.value}</b>
            <i style={{ width: `${(item.value / maxUnit) * 100}%` }} />
          </button>
        ))}
      </div>
    </section>
  );
}
