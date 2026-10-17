const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const time = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));
export const formatVnd = (amount: number) => money.format(amount);

/** A typed ticket code, normalised (`lvc-7k3q9m ` → `LVC-7K3Q9M`), or null. */
export function normaliseTicketCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^LVC-[0-9A-HJKMNP-TV-Z]{6}$/.test(code) ? code : null;
}
