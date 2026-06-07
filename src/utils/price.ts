import type { MemberLevel, PricingRule } from '../types';

export function getDiscountRate(level: MemberLevel): number {
  const rates: Record<MemberLevel, number> = {
    normal: 1,
    silver: 0.9,
    gold: 0.8,
    diamond: 0.65,
  };
  return rates[level];
}

export function calculateActualPrice(
  basePrice: number,
  level: MemberLevel
): { actualPrice: number; discountRate: number } {
  const discountRate = getDiscountRate(level);
  return {
    actualPrice: Math.round(basePrice * discountRate),
    discountRate,
  };
}

export function calculateRefundAmount(
  paidAmount: number,
  totalSessions: number,
  completedSessions: number
): { refundAmount: number; refundRatio: number } {
  if (totalSessions === 0) {
    return { refundAmount: paidAmount, refundRatio: 1 };
  }
  const completedRatio = completedSessions / totalSessions;
  const refundRatio = Math.max(0, 1 - completedRatio);
  return {
    refundAmount: Math.round(paidAmount * refundRatio),
    refundRatio: Number(refundRatio.toFixed(2)),
  };
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function getLevelName(level: MemberLevel): string {
  const names: Record<MemberLevel, string> = {
    normal: '普通会员',
    silver: '银卡会员',
    gold: '金卡会员',
    diamond: '钻石会员',
  };
  return names[level];
}

export function getDefaultPricingRules(): PricingRule[] {
  return [
    {
      level: 'normal',
      levelName: '普通会员',
      discountRate: 1,
      singlePrice: 0,
      monthlyPrice: 399,
      quarterlyPrice: 999,
      yearlyPrice: 3599,
    },
    {
      level: 'silver',
      levelName: '银卡会员',
      discountRate: 0.9,
      singlePrice: 0,
      monthlyPrice: 599,
      quarterlyPrice: 1499,
      yearlyPrice: 5399,
    },
    {
      level: 'gold',
      levelName: '金卡会员',
      discountRate: 0.8,
      singlePrice: 0,
      monthlyPrice: 899,
      quarterlyPrice: 2299,
      yearlyPrice: 8199,
    },
    {
      level: 'diamond',
      levelName: '钻石会员',
      discountRate: 0.65,
      singlePrice: 0,
      monthlyPrice: 1499,
      quarterlyPrice: 3899,
      yearlyPrice: 13999,
    },
  ];
}
