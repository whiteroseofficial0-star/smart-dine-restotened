// All money is computed in integer paise to avoid floating point errors.
export const toPaise = (rupees: number | string): number => Math.round(Number(rupees) * 100);
export const fromPaise = (paise: number): number => paise / 100;
export const formatINR = (rupees: number | string): string =>
  "₹" + Number(rupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
