// Configuração de prêmios do totem.
// Fonte de verdade: tabela `prize_config` no Lovable Cloud.
// Os valores em DEFAULT_PRIZES são apenas fallback inicial.
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SprayCan,
  Star,
  Gem,
  Crown,
  Gift,
  Zap,
  Trophy,
  Heart,
  Flame,
  Ticket,
  PartyPopper,
  Coins,
  Footprints,
  FlaskConical,
  Droplet,
  HardHat,
  GraduationCap,
  ChefHat,
} from "lucide-react";

export type IconKey =
  | "premium"
  | "gold"
  | "promo"
  | "tenis"
  | "tenis2"
  | "tenis3"
  | "tenis4"
  | "perfume"
  | "perfume2"
  | "perfume3"
  | "perfume4"
  | "perfume5"
  | "bone"
  | "bone2"
  | "bone3"
  | "bone4"
  | "meia"
  | "meia2"
  | "estrela"
  | "diamante"
  | "coroa"
  | "presente"
  | "raio"
  | "trofeu"
  | "coracao"
  | "fogo"
  | "ticket"
  | "festa"
  | "moedas";


export type CategoryKey =
  | "limpeza"
  | "clareamento"
  | "aparelho"
  | "cupom"
  | "kit"
  | "escova"
  | "fio"
  | "raro"
  | "ultra_raro";

export interface Prize {
  id: string;
  nome: string;
  icone: IconKey;
  /** Categoria fixa. Define o ícone exibido nos slots e o casamento na grade. */
  categoria: CategoryKey;
  /** Cor/gradiente de fundo customizado (CSS). Sobrescreve o padrão do ícone. */
  corFundo?: string;
  raridade: "comum" | "raro" | "epico";
  peso: number; // usado no sorteio ponderado
  faixaValorElegivel?: { min?: number; max?: number };
  linhaAplicavel?: string;
  tetoReais?: number;
  validadeDias: number;
  descricao: string;
}

export type SpinMode = "por_nota" | "por_valor";

export interface PrizeConfig {
  prizes: Prize[];
  minNoteValue: number;
  spinMode: SpinMode;
}


/** Ícone fixo por categoria. */
export const CATEGORY_META: Record<CategoryKey, { icone: IconKey; label: string }> = {
  limpeza: { icone: "premium", label: "Limpeza" },
  clareamento: { icone: "gold", label: "Clareamento" },
  aparelho: { icone: "promo", label: "Aparelho/Ortodontia" },
  cupom: { icone: "ticket", label: "Cupom (% OFF)" },
  kit: { icone: "perfume", label: "Kit de higiene" },
  escova: { icone: "bone", label: "Escova" },
  fio: { icone: "meia", label: "Fio dental" },
  raro: { icone: "estrela", label: "Raro (⭐)" },
  ultra_raro: { icone: "coroa", label: "Ultra raro (👑)" },
};

export const CATEGORY_KEYS: CategoryKey[] = [
  "limpeza",
  "clareamento",
  "aparelho",
  "cupom",
  "kit",
  "escova",
  "fio",
  "raro",
  "ultra_raro",
];

/** Infere a categoria a partir do ícone (usado para migrar dados legados). */
export function inferCategoria(icone: IconKey): CategoryKey {
  switch (icone) {
    case "premium":
    case "tenis":
    case "tenis2":
      return "limpeza";
    case "gold":
    case "tenis3":
      return "clareamento";
    case "promo":
    case "tenis4":
      return "aparelho";
    case "ticket":
    case "presente":
    case "festa":
    case "moedas":
      return "cupom";
    case "perfume":
    case "perfume2":
    case "perfume3":
    case "perfume4":
    case "perfume5":
      return "kit";
    case "bone":
    case "bone2":
    case "bone3":
    case "bone4":
      return "escova";
    case "meia":
    case "meia2":
      return "fio";
    case "coroa":
    case "diamante":
      return "ultra_raro";
    case "estrela":
    case "trofeu":
    case "raio":
    case "coracao":
    case "fogo":
      return "raro";
    default:
      return "cupom";
  }
}

/** Normaliza um prêmio garantindo `categoria` e alinhando `icone` ao ícone da categoria. */
export function normalizePrize(p: Prize): Prize {
  const categoria = p.categoria ?? inferCategoria(p.icone);
  return { ...p, categoria, icone: CATEGORY_META[categoria].icone };
}

export const DEFAULT_PRIZES: Prize[] = [
  {
    id: "limpeza-20",
    nome: "Limpeza 20% OFF",
    categoria: "cupom",
    icone: "ticket",
    raridade: "comum",
    peso: 22,
    linhaAplicavel: "Limpeza/Profilaxia",
    tetoReais: 40,
    validadeDias: 30,
    descricao: "20% de desconto em 1 sessão de limpeza. Teto de R$40 de desconto.",
  },
  {
    id: "clareamento-15",
    nome: "Clareamento 15% OFF",
    categoria: "cupom",
    icone: "ticket",
    raridade: "comum",
    peso: 20,
    linhaAplicavel: "Clareamento",
    tetoReais: 80,
    validadeDias: 30,
    descricao: "15% de desconto em 1 sessão de clareamento dental. Teto de R$80.",
  },
  {
    id: "avaliacao-gratis",
    nome: "Avaliação/Consulta Grátis",
    categoria: "cupom",
    icone: "ticket",
    raridade: "comum",
    peso: 18,
    linhaAplicavel: "Avaliação",
    validadeDias: 45,
    descricao: "1 consulta de avaliação gratuita para novo procedimento.",
  },
  {
    id: "clareamento-3x2",
    nome: "Clareamento: Leve 3 Sessões, Pague 2",
    categoria: "clareamento",
    icone: "gold",
    raridade: "epico",
    peso: 3,
    linhaAplicavel: "Clareamento",
    validadeDias: 60,
    descricao: "Pacote de 3 sessões de clareamento pagando apenas 2.",
  },
  {
    id: "limpeza-anual",
    nome: "Limpeza Semestral Grátis",
    categoria: "limpeza",
    icone: "premium",
    raridade: "epico",
    peso: 4,
    validadeDias: 90,
    descricao: "1 sessão de limpeza gratuita, válida por até 90 dias.",
  },
  {
    id: "manutencao-aparelho",
    nome: "Manutenção de Aparelho Grátis",
    categoria: "aparelho",
    icone: "promo",
    raridade: "raro",
    peso: 6,
    linhaAplicavel: "Ortodontia",
    validadeDias: 30,
    descricao: "1 manutenção de aparelho ortodôntico gratuita.",
  },
  {
    id: "kit-higiene",
    nome: "Kit de Higiene Cortesia",
    categoria: "kit",
    icone: "perfume",
    raridade: "comum",
    peso: 8,
    validadeDias: 30,
    descricao: "Kit de higiene bucal cortesia (item físico) — retirar na recepção.",
  },
  {
    id: "escova-eletrica",
    nome: "Escova Cortesia",
    categoria: "escova",
    icone: "bone",
    raridade: "raro",
    peso: 4,
    validadeDias: 30,
    descricao: "Escova de dente cortesia (item físico) — retirar na recepção.",
  },
  {
    id: "fio-enxaguante",
    nome: "Fio Dental + Enxaguante Cortesia",
    categoria: "fio",
    icone: "meia",
    raridade: "comum",
    peso: 4,
    validadeDias: 30,
    descricao: "Fio dental e enxaguante cortesia (item físico) — retirar na recepção.",
  },
  {
    id: "raro-estrela",
    nome: "Prêmio Raro",
    categoria: "raro",
    icone: "estrela",
    raridade: "epico",
    peso: 2,
    validadeDias: 30,
    descricao: "Prêmio raro surpresa — configure na ADM.",
  },
  {
    id: "ultra-coroa",
    nome: "Prêmio Ultra Raro",
    categoria: "ultra_raro",
    icone: "coroa",
    raridade: "epico",
    peso: 1,
    validadeDias: 30,
    descricao: "Prêmio ultra raro surpresa — configure na ADM.",
  },
];

export async function fetchConfig(): Promise<PrizeConfig> {
  try {
    const { data, error } = await supabase
      .from("prize_config")
      .select("prizes, min_note_value, spin_mode")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("fetchConfig error", error);
      return { prizes: DEFAULT_PRIZES, minNoteValue: PISO_GIRO, spinMode: "por_nota" };
    }
    const list = (data?.prizes as unknown as Prize[] | null) ?? null;
    const prizes = Array.isArray(list) && list.length > 0 ? list.map(normalizePrize) : DEFAULT_PRIZES;
    const minNoteValue = typeof data?.min_note_value === "number" ? data.min_note_value : PISO_GIRO;
    const spinMode: SpinMode = data?.spin_mode === "por_valor" ? "por_valor" : "por_nota";
    return { prizes, minNoteValue, spinMode };
  } catch (e) {
    console.error("fetchConfig exception", e);
    return { prizes: DEFAULT_PRIZES, minNoteValue: PISO_GIRO, spinMode: "por_nota" };
  }
}

export async function fetchPrizes(): Promise<Prize[]> {
  return (await fetchConfig()).prizes;
}



// Grade fixa de 16 slots por categoria.
// Composição: 2 Limpeza + 2 Clareamento + 2 Aparelho + 2 Cupom + 2 Kit + 2 Escova + 2 Fio + 1 Raro + 1 Ultra raro.
// Cada slot mostra apenas o ícone da categoria — o prêmio real é revelado só na tela de resultado.
export const SLOTS: { categoria: CategoryKey }[] = [
  { categoria: "limpeza" },
  { categoria: "limpeza" },
  { categoria: "clareamento" },
  { categoria: "clareamento" },
  { categoria: "aparelho" },
  { categoria: "aparelho" },
  { categoria: "cupom" },
  { categoria: "cupom" },
  { categoria: "kit" },
  { categoria: "kit" },
  { categoria: "escova" },
  { categoria: "escova" },
  { categoria: "fio" },
  { categoria: "fio" },
  { categoria: "raro" },
  { categoria: "ultra_raro" },
];


export const PISO_GIRO = 400;

export function sortearPrize(prizes: Prize[]): Prize {
  const list = prizes.length > 0 ? prizes : DEFAULT_PRIZES;
  const total = list.reduce((s, p) => s + Math.max(0, p.peso), 0);
  if (total <= 0) return list[0];
  let r = Math.random() * total;
  for (const p of list) {
    r -= Math.max(0, p.peso);
    if (r <= 0) return p;
  }
  return list[0];
}


export function slotIndexParaPrize(prize: Prize): number {
  const cat = prize.categoria ?? inferCategoria(prize.icone);
  const candidatos: number[] = [];
  SLOTS.forEach((s, i) => {
    if (s.categoria === cat) candidatos.push(i);
  });
  if (candidatos.length === 0) return 0;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}


// Cores por ícone: prata (Premium), dourado (Gold), verde (Promo).
export const ICON_META: Record<
  IconKey,
  { emoji: ReactNode; label: string; color: string; bg: string }
> = {
  premium: {
    emoji: "🦷",
    label: "Limpeza",
    color: "text-slate-800",
    bg: "linear-gradient(135deg, oklch(0.95 0.01 220), oklch(0.85 0.02 220))",
  },
  gold: {
    emoji: "✨",
    label: "Clareamento",
    color: "text-cyan-950",
    bg: "linear-gradient(135deg, oklch(0.92 0.08 210), oklch(0.78 0.1 205))",
  },
  promo: {
    emoji: "😁",
    label: "Aparelho",
    color: "text-blue-950",
    bg: "linear-gradient(135deg, oklch(0.88 0.06 230), oklch(0.72 0.09 225))",
  },
  tenis: {
    emoji: "👟",
    label: "Tênis",
    color: "text-slate-100",
    bg: "linear-gradient(135deg, oklch(0.85 0.01 250), oklch(0.65 0.02 250))",
  },
  tenis2: {
    emoji: <Footprints className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Tênis corrida",
    color: "text-slate-100",
    bg: "linear-gradient(135deg, oklch(0.85 0.01 250), oklch(0.65 0.02 250))",
  },
  tenis3: {
    emoji: "👞",
    label: "Sapato",
    color: "text-amber-950",
    bg: "linear-gradient(135deg, oklch(0.9 0.15 90), oklch(0.7 0.18 70))",
  },
  tenis4: {
    emoji: "🥾",
    label: "Bota",
    color: "text-amber-50",
    bg: "linear-gradient(135deg, oklch(0.65 0.18 75), oklch(0.4 0.16 65))",
  },
  perfume: {
    emoji: <SprayCan className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Kit de higiene",
    color: "text-cyan-100",
    bg: "linear-gradient(135deg, oklch(0.8 0.12 210), oklch(0.6 0.15 205))",
  },
  perfume2: {
    emoji: <FlaskConical className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Frasco",
    color: "text-pink-100",
    bg: "linear-gradient(135deg, oklch(0.75 0.15 340), oklch(0.55 0.18 340))",
  },
  perfume3: {
    emoji: <Droplet className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Gota",
    color: "text-cyan-100",
    bg: "linear-gradient(135deg, oklch(0.8 0.15 210), oklch(0.55 0.18 220))",
  },
  perfume4: {
    emoji: "🧴",
    label: "Loção",
    color: "text-pink-100",
    bg: "linear-gradient(135deg, oklch(0.75 0.15 340), oklch(0.55 0.18 340))",
  },
  perfume5: {
    emoji: "🌸",
    label: "Flor",
    color: "text-pink-100",
    bg: "linear-gradient(135deg, oklch(0.85 0.14 330), oklch(0.6 0.16 335))",
  },
  bone: {
    emoji: "🪥",
    label: "Escova",
    color: "text-sky-100",
    bg: "linear-gradient(135deg, oklch(0.7 0.15 230), oklch(0.5 0.18 240))",
  },
  bone2: {
    emoji: <HardHat className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Capacete",
    color: "text-sky-100",
    bg: "linear-gradient(135deg, oklch(0.7 0.15 230), oklch(0.5 0.18 240))",
  },
  bone3: {
    emoji: <GraduationCap className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Formatura",
    color: "text-sky-100",
    bg: "linear-gradient(135deg, oklch(0.72 0.12 230), oklch(0.52 0.15 240))",
  },
  bone4: {
    emoji: <ChefHat className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Chef",
    color: "text-sky-100",
    bg: "linear-gradient(135deg, oklch(0.68 0.08 230), oklch(0.48 0.1 240))",
  },
  meia: {
    emoji: "🧵",
    label: "Fio dental",
    color: "text-violet-100",
    bg: "linear-gradient(135deg, oklch(0.7 0.18 300), oklch(0.5 0.2 300))",
  },
  meia2: {
    emoji: "🧦",
    label: "Meia 2",
    color: "text-violet-100",
    bg: "linear-gradient(135deg, oklch(0.72 0.14 300), oklch(0.52 0.16 300))",
  },
  estrela: {
    emoji: <Star className="h-[1em] w-[1em]" strokeWidth={2.25} fill="currentColor" />,
    label: "Estrela",
    color: "text-slate-300",
    bg: "linear-gradient(135deg, oklch(0.18 0 0), oklch(0.08 0 0))",
  },
  diamante: {
    emoji: <Gem className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Diamante",
    color: "text-cyan-100",
    bg: "linear-gradient(135deg, oklch(0.88 0.12 210), oklch(0.6 0.18 220))",
  },
  coroa: {
    emoji: <Crown className="h-[1em] w-[1em]" strokeWidth={2.25} fill="currentColor" />,
    label: "Coroa",
    color: "text-amber-400",
    bg: "linear-gradient(135deg, oklch(0.18 0 0), oklch(0.08 0 0))",
  },
  presente: {
    emoji: <Gift className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Presente",
    color: "text-rose-100",
    bg: "linear-gradient(135deg, oklch(0.75 0.18 15), oklch(0.5 0.2 20))",
  },
  raio: {
    emoji: <Zap className="h-[1em] w-[1em]" strokeWidth={2.25} fill="currentColor" />,
    label: "Raio",
    color: "text-yellow-50",
    bg: "linear-gradient(135deg, oklch(0.9 0.18 100), oklch(0.6 0.22 70))",
  },
  trofeu: {
    emoji: <Trophy className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Troféu",
    color: "text-amber-50",
    bg: "linear-gradient(135deg, oklch(0.85 0.15 75), oklch(0.55 0.2 50))",
  },
  coracao: {
    emoji: <Heart className="h-[1em] w-[1em]" strokeWidth={2.25} fill="currentColor" />,
    label: "Coração",
    color: "text-rose-50",
    bg: "linear-gradient(135deg, oklch(0.75 0.2 10), oklch(0.5 0.22 15))",
  },
  fogo: {
    emoji: <Flame className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Fogo",
    color: "text-orange-50",
    bg: "linear-gradient(135deg, oklch(0.82 0.18 45), oklch(0.55 0.22 30))",
  },
  ticket: {
    emoji: <Ticket className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Ticket",
    color: "text-teal-50",
    bg: "linear-gradient(135deg, oklch(0.8 0.15 180), oklch(0.55 0.18 190))",
  },
  festa: {
    emoji: <PartyPopper className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Festa",
    color: "text-fuchsia-50",
    bg: "linear-gradient(135deg, oklch(0.78 0.2 320), oklch(0.55 0.22 330))",
  },
  moedas: {
    emoji: <Coins className="h-[1em] w-[1em]" strokeWidth={2.25} />,
    label: "Moedas",
    color: "text-yellow-950",
    bg: "linear-gradient(135deg, oklch(0.9 0.16 90), oklch(0.65 0.2 75))",
  },
};

/** Retorna o background efetivo do prêmio.
 *  - corFundo preenchido: usa o custom.
 *  - corFundo === "": transparente (sem cor).
 *  - corFundo undefined: padrão do ícone.
 */
export function getPrizeBg(p: Pick<Prize, "icone" | "corFundo">): string {
  if (p.corFundo === "") return "transparent";
  return p.corFundo ?? ICON_META[p.icone].bg;
}


