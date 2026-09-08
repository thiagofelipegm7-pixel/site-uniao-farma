"use client";

import { useMemo, useState } from "react";
import {
  RANGE_LABEL,
  daysForRange,
  stageValue,
  sumRange,
  type DayBucket,
  type RangeKey,
} from "../metrics-range";

const STAGE_COLOR = {
  whatsapp_click: "#148f8a",
  conversation_received: "#0b6244",
  order_completed: "#083a3b",
} as const;

const STAGE_LABEL = {
  whatsapp_click: "Cliques",
  conversation_received: "Conversas",
  order_completed: "Pedidos",
} as const;

const UNIT_LABEL: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

export default function MetricsCharts({
  today,
  days,
  range,
  onRange,
}: {
  today: string;
  days: Record<string, DayBucket>;
  range: RangeKey;
  onRange: (value: RangeKey) => void;
}) {
  const [focus, setFocus] = useState("");
  const keys = useMemo(() => daysForRange(today, days, range), [today, days, range]);
  const totals = useMemo(() => sumRange(days, keys), [days, keys]);

  const series = keys.map((day) => ({
    day,
    label: range === "today" ? day.slice(5) : day.slice(8),
    clicks: stageValue(days[day], "whatsapp_click"),
    talks: stageValue(days[day], "conversation_received"),
    sales: stageValue(days[day], "order_completed"),
  }));

  const maxDay = Math.max(1, ...series.flatMap((item) => [item.clicks, item.talks, item.sales]));
  const units = Object.keys(UNIT_LABEL).map((id) => ({
    id,
    label: UNIT_LABEL[id],
    value: totals.units[id] || 0,
  }));
  const maxUnit = Math.max(1, ...units.map((item) => item.value));
  const barWidth = Math.max(6, Math.min(12, 320 / Math.max(keys.length, 1) / 3));
  const groupWidth = Math.max(18, 320 / Math.max(keys.length, 1));

  return (
    <section className="metrics-block metrics-charts">
      <h2>Gráficos</h2>
      <div className="metrics-range" role="tablist" aria-label="Período">
        {(Object.keys(RANGE_LABEL) as RangeKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={range === key}
            className={range === key ? "is-on" : ""}
            onClick={() => {
              setFocus("");
              onRange(key);
            }}
          >
            {RANGE_LABEL[key]}
          </button>
        ))}
      </div>
      <p>
        {RANGE_LABEL[range]}: {totals.stages.whatsapp_click} cliques, {totals.stages.conversation_received} conversas,{" "}
        {totals.stages.order_completed} pedidos.
      </p>
      {focus ? <p className="metrics-chart-focus">{focus}</p> : null}

      <div className="metrics-chart-legend">
        {(Object.keys(STAGE_LABEL) as Array<keyof typeof STAGE_LABEL>).map((stage) => (
          <span key={stage}>
            <i style={{ background: STAGE_COLOR[stage] }} />
            {STAGE_LABEL[stage]}
          </span>
        ))}
      </div>

      <svg
        className="metrics-week-chart"
        viewBox="0 0 360 180"
        role="img"
        aria-label={`Cliques, conversas e pedidos em ${RANGE_LABEL[range].toLowerCase()}`}
      >
        {series.map((item, index) => {
          const x = 16 + index * groupWidth;
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
                    x={x + barIndex * (barWidth + 1)}
                    y={148 - height}
                    width={barWidth}
                    height={height}
                    rx="2"
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
              {keys.length <= 10 ? (
                <text x={x + groupWidth / 2 - 4} y="168" textAnchor="middle" fontSize="11" fill="#3a5554">
                  {item.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <h3>Lojas no período</h3>
      <div className="metrics-unit-bars">
        {units.map((item) => (
          <button
            type="button"
            key={item.id}
            className="metrics-unit-bar"
            onClick={() => setFocus(`${item.label}: ${item.value} cliques no período`)}
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
