import { toNum } from './numbers';

export type Thresholds = {
  criticalRatio: number;
  approachRatio: number;
  excessRatio: number;
  volatilityRatio: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  criticalRatio: 0.5,
  approachRatio: 1.1,
  excessRatio: 2.0,
  volatilityRatio: 0.35,
};

export function classifyStockStatus(
  stockTotal: number | null | undefined,
  rol: number | null | undefined,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): string {
  const stock = toNum(stockTotal);
  const r = toNum(rol);

  if (stock !== null && stock === 0) return 'STOCKOUT';
  if (r === null || r === 0) return 'NO_ROL';
  if (stock === null) return 'NO_ROL';

  const ratio = stock / r;
  if (ratio < thresholds.criticalRatio) return 'CRITICAL';
  if (stock < r) return 'BELOW_ROL';
  if (stock === r) return 'AT_ROL';
  if (ratio >= thresholds.excessRatio) return 'EXCESS';
  if (ratio < thresholds.approachRatio) return 'APPROACHING_ROL';
  if (stock > r) return 'ABOVE_ROL';
  return 'NORMAL';
}

export function recommendedAction(
  status: string,
  poOps: number | null | undefined,
  trendLabel: string | null | undefined,
  highVol: boolean,
): string | null {
  if (status === 'STOCKOUT' || status === 'CRITICAL') {
    return 'Immediate replenishment attention';
  }
  if (status === 'BELOW_ROL') {
    const po = toNum(poOps) || 0;
    return po > 0
      ? 'Expedite open purchase orders'
      : 'Raise replenishment / review ROQ';
  }
  if (trendLabel === 'CONTINUOUSLY_DECREASING') {
    return 'Investigate sustained net stock reduction';
  }
  if (status === 'EXCESS') {
    return 'Review for possible overstock / capital lock-up';
  }
  if (highVol) {
    return 'Investigate inconsistent stock movements';
  }
  return null;
}
