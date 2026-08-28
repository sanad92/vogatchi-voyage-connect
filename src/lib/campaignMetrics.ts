import type { CampaignSend } from '@/types/crm';

export type CampaignDeliveryMetrics = {
  deliveredCount: number;
  readCount: number;
  respondedCount: number;
  readRate: number;
  responseRate: number;
};

const percentage = (value: number, total: number) => (
  total > 0 ? Math.round((value / total) * 1000) / 10 : 0
);

export const buildCampaignDeliveryMetrics = (
  campaignSends: CampaignSend[] = [],
): CampaignDeliveryMetrics => {
  const delivered = campaignSends.filter((send) => (
    send.status === 'delivered' || send.status === 'read'
  ));
  const readCount = delivered.filter((send) => send.status === 'read').length;
  const respondedCount = delivered.filter((send) => Boolean(send.response?.trim())).length;

  return {
    deliveredCount: delivered.length,
    readCount,
    respondedCount,
    readRate: percentage(readCount, delivered.length),
    responseRate: percentage(respondedCount, delivered.length),
  };
};
