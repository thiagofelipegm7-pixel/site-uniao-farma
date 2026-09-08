import { CHANNEL_LABEL, sourceToChannel, splitSourceKey, type ChannelKey } from "./metrics-channels";
import { type DayBucket, type MetricStage } from "./metrics-range";

export type ChannelFunnel = {
  channel: ChannelKey;
  label: string;
  clicks: number;
  talks: number;
  sales: number;
  clickToTalk: number;
  talkToSale: number;
  clickToSale: number;
};

function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function channelFunnels(days: Record<string, DayBucket>, keys: string[]): ChannelFunnel[] {
  const rows = new Map<ChannelKey, { clicks: number; talks: number; sales: number }>();

  function bump(channel: ChannelKey, stage: MetricStage, count: number) {
    const current = rows.get(channel) || { clicks: 0, talks: 0, sales: 0 };
    if (stage === "conversation_received") current.talks += count;
    else if (stage === "order_completed") current.sales += count;
    else current.clicks += count;
    rows.set(channel, current);
  }

  for (const key of keys) {
    const bucket = days[key];
    for (const [sourceKey, count] of Object.entries(bucket?.sources || {})) {
      const parts = splitSourceKey(sourceKey);
      const stage =
        parts.stage === "conversation_received" || parts.stage === "order_completed"
          ? parts.stage
          : "whatsapp_click";
      bump(sourceToChannel(parts.source), stage, count);
    }
  }

  return (Object.keys(CHANNEL_LABEL) as ChannelKey[])
    .filter((channel) => channel !== "all")
    .map((channel) => {
      const row = rows.get(channel) || { clicks: 0, talks: 0, sales: 0 };
      return {
        channel,
        label: CHANNEL_LABEL[channel],
        ...row,
        clickToTalk: rate(row.talks, row.clicks),
        talkToSale: rate(row.sales, row.talks),
        clickToSale: rate(row.sales, row.clicks),
      };
    })
    .filter((row) => row.clicks || row.talks || row.sales)
    .sort((left, right) => right.clicks + right.talks + right.sales - (left.clicks + left.talks + left.sales));
}

export function overallFunnel(rows: ChannelFunnel[]): ChannelFunnel {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const talks = rows.reduce((sum, row) => sum + row.talks, 0);
  const sales = rows.reduce((sum, row) => sum + row.sales, 0);
  return {
    channel: "all",
    label: CHANNEL_LABEL.all,
    clicks,
    talks,
    sales,
    clickToTalk: rate(talks, clicks),
    talkToSale: rate(sales, talks),
    clickToSale: rate(sales, clicks),
  };
}
