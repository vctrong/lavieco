const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** `89.000 ₫` */
export const formatMoney = (amount: number) => money.format(amount);

export const priceRangeText = (min: number, max: number) =>
  min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
