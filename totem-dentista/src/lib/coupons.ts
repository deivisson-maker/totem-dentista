export interface CouponPrize {
  prizeId: string;
  prizeNome: string;
}

export interface Coupon {
  codigo: string;
  prizeId: string;
  prizeNome: string;
  premios?: CouponPrize[];
  nota: string;
  valorPago: number;
  criadoEm: string; // ISO
  validoAte: string; // ISO
}


const NOTAS_KEY = "totem_notas_usadas_v1";
const COUPONS_KEY = "totem_cupons_v1";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export function normalizarNota(nota: string): string {
  const limpa = nota.trim().replace(/^0+/, "");
  return limpa || "0";
}

export function notaJaUsada(nota: string): boolean {
  const notas = safeRead<string[]>(NOTAS_KEY, []);
  return notas.includes(normalizarNota(nota));
}

export function registrarNota(nota: string) {
  const notas = safeRead<string[]>(NOTAS_KEY, []);
  notas.push(normalizarNota(nota));
  safeWrite(NOTAS_KEY, notas);
}

export function gerarCodigoCupom(): string {
  const alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alfa[Math.floor(Math.random() * alfa.length)];
  return `TP-${out}`;
}

export function salvarCupom(c: Coupon) {
  const list = safeRead<Coupon[]>(COUPONS_KEY, []);
  list.push(c);
  safeWrite(COUPONS_KEY, list);
}
