import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import {
  ICON_META,
  CATEGORY_META,
  PISO_GIRO,
  DEFAULT_PRIZES,
  fetchConfig,
  SLOTS,
  sortearPrize,
  inferCategoria,
  type Prize,
  type CategoryKey,
} from "@/lib/prizes";


const GRID_SIZE = 16;

function buildShuffledSlots(): CategoryKey[] {
  const base = SLOTS.map((s) => s.categoria);
  const out: CategoryKey[] = [];
  for (let i = 0; i < GRID_SIZE; i++) out.push(base[i % base.length]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickSlotForPrize(slots: CategoryKey[], prize: Prize): number {
  const cat = prize.categoria ?? inferCategoria(prize.icone);
  const candidatos: number[] = [];
  slots.forEach((c, i) => {
    if (c === cat) candidatos.push(i);
  });
  if (candidatos.length === 0) return 0;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}


import {
  gerarCodigoCupom,
  normalizarNota,
  notaJaUsada,
  registrarNota,
  salvarCupom,
} from "@/lib/coupons";
import { beginAudioFocus, buzzer, endAudioFocus, fanfare, primeAudio, tick } from "@/lib/totem-audio";
import { Confetti } from "@/components/Confetti";
import { useWakeLock } from "@/lib/use-wake-lock";

const configQueryOptions = queryOptions({
  queryKey: ["prize_config"],
  queryFn: fetchConfig,
  staleTime: 30_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sorriso Premiado — Aperte e Ganhe" },
      { name: "description", content: "Totem interativo de prêmios para pacientes da clínica." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(configQueryOptions),
  component: Totem,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-center text-destructive-foreground">
      Erro ao carregar configuração: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div role="status" className="p-8 text-center text-muted-foreground">
      Página não encontrada.
    </div>
  ),
});


type Fase = "form" | "girando" | "resultado";

interface PremioGanho {
  prize: Prize;
  slotIndex: number;
}

interface Resultado {
  prize: Prize;
  slotIndex: number;
  codigo: string | null;
  validoAte: Date | null;
  nota: string;
  giroAtual: number;
  totalGiros: number;
  premiosGanhos: PremioGanho[];
}



function Totem() {
  useWakeLock();
  const { data: config } = useSuspenseQuery(configQueryOptions);
  const prizes = config.prizes ?? DEFAULT_PRIZES;
  const minNoteValue = config.minNoteValue ?? PISO_GIRO;
  const spinMode = config.spinMode ?? "por_nota";

  const [fase, setFase] = useState<Fase>("form");

  const [nota, setNota] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [litIndex, setLitIndex] = useState<number | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [slots, setSlots] = useState<CategoryKey[]>(() => SLOTS.map((s) => s.categoria));
  const timeouts = useRef<number[]>([]);
  const sessaoRef = useRef<{ notaTrim: string; valorNum: number; totalGiros: number; premiosGanhos: PremioGanho[] } | null>(null);


  const limparTimers = () => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
  };

  useEffect(() => limparTimers, []);

  useEffect(() => {
    if (fase === "form") setSlots(buildShuffledSlots());
  }, [prizes, fase]);

  const executarGiro = useCallback(
    (notaTrim: string, valorNum: number, giroAtual: number, totalGiros: number) => {
      primeAudio();
      beginAudioFocus();

      const prize = sortearPrize(prizes);
      const novosSlots = buildShuffledSlots();
      setSlots(novosSlots);
      const target = pickSlotForPrize(novosSlots, prize);

      const voltas = 3;
      const totalPassos = novosSlots.length * voltas + target + 1;
      const passos: number[] = [];
      for (let i = 0; i < totalPassos; i++) passos.push(i % novosSlots.length);

      setFase("girando");
      setLitIndex(null);

      let acc = 0;
      passos.forEach((idx, i) => {
        const progress = i / (totalPassos - 1);
        const delay = 45 + Math.pow(progress, 3) * 320;
        acc += delay;
        const t = window.setTimeout(() => {
          setLitIndex(idx);
          const freq = 400 + (i % 8) * 60;
          tick(freq, 0.04, 0.5);
        }, acc);
        timeouts.current.push(t);
      });

      const finalT = window.setTimeout(() => {
        const sessao = sessaoRef.current;
        const premiosAnteriores = sessao?.premiosGanhos ?? [];
        const premiosGanhos: PremioGanho[] = [
          ...premiosAnteriores,
          { prize, slotIndex: target },
        ];
        if (sessao) sessao.premiosGanhos = premiosGanhos;

        const isUltimo = giroAtual >= totalGiros;
        let codigo: string | null = null;
        let validoAte: Date | null = null;

        if (isUltimo) {
          codigo = gerarCodigoCupom();
          const minValidade = Math.min(...premiosGanhos.map((p) => p.prize.validadeDias));
          validoAte = new Date();
          validoAte.setDate(validoAte.getDate() + minValidade);
          const premios = premiosGanhos.map((p) => ({
            prizeId: p.prize.id,
            prizeNome: p.prize.nome,
          }));
          salvarCupom({
            codigo,
            prizeId: premios[0].prizeId,
            prizeNome: premios[0].prizeNome,
            premios,
            nota: notaTrim,
            valorPago: valorNum,
            criadoEm: new Date().toISOString(),
            validoAte: validoAte.toISOString(),
          });
        }

        setResultado({
          prize,
          slotIndex: target,
          codigo,
          validoAte,
          nota: notaTrim,
          giroAtual,
          totalGiros,
          premiosGanhos,
        });
        setFase("resultado");
        fanfare();
        const focusEnd = window.setTimeout(() => endAudioFocus(), 900);
        timeouts.current.push(focusEnd);
      }, acc + 500);
      timeouts.current.push(finalT);

    },
    [prizes]
  );

  const iniciar = useCallback(() => {
    setErro(null);
    const notaTrim = normalizarNota(nota);
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!notaTrim) {
      setErro("Informe o número da nota.");
      return;
    }
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (notaJaUsada(notaTrim)) {
      buzzer();
      setErro("Esta nota já foi usada. Cada nota dá direito a apenas um giro.");
      return;
    }

    let totalGiros = 1;
    if (spinMode === "por_valor") {
      totalGiros = Math.floor(valorNum / minNoteValue);
      if (totalGiros < 1) {
        buzzer();
        setErro(
          `Valor mínimo por giro é R$${minNoteValue.toFixed(2)}. Nota atual: R$${valorNum.toFixed(2)}.`
        );
        return;
      }
    } else if (valorNum < minNoteValue) {
      buzzer();
      setErro(
        `Valor mínimo para girar é R$${minNoteValue.toFixed(2)}. Nota atual: R$${valorNum.toFixed(2)}.`
      );
      return;
    }

    registrarNota(notaTrim);
    sessaoRef.current = { notaTrim, valorNum, totalGiros, premiosGanhos: [] };
    executarGiro(notaTrim, valorNum, 1, totalGiros);
  }, [nota, valor, minNoteValue, spinMode, executarGiro]);

  const proximoGiro = () => {
    limparTimers();
    const s = sessaoRef.current;
    if (!s || !resultado) return;
    const proximo = resultado.giroAtual + 1;
    setLitIndex(null);
    setResultado(null);
    executarGiro(s.notaTrim, s.valorNum, proximo, s.totalGiros);
  };

  const novoGiro = () => {
    limparTimers();
    endAudioFocus();
    sessaoRef.current = null;
    setNota("");
    setValor("");
    setErro(null);
    setLitIndex(null);
    setResultado(null);
    setFase("form");
  };


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center gap-6 px-4 py-6">
      <header className="flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Sorriso Premiado</p>
        <h1 className="totem-title text-4xl sm:text-5xl">Aperte e Ganhe</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {spinMode === "por_valor"
            ? `A cada R$${minNoteValue} em procedimentos você ganha 1 giro na sorte.`
            : `Consultas e procedimentos a partir de R$${minNoteValue} dão direito a 1 giro na sorte.`}
        </p>

      </header>

      <PrizeGrid litIndex={litIndex} winnerIndex={fase === "resultado" ? resultado?.slotIndex ?? null : null} prizes={prizes} slots={slots} />

      {fase === "form" && (
        <>
          <FormCard
            nota={nota}
            valor={valor}
            erro={erro}
            onNota={setNota}
            onValor={setValor}
            onSubmit={iniciar}
          />
          <PrizeListPreview prizes={prizes} />
        </>
      )}

      {fase === "girando" && (
        <div className="text-center">
          <p className="animate-pulse text-lg font-semibold text-primary">Siga a Luz…</p>
          <p className="text-xs text-muted-foreground">Boa sorte!</p>
        </div>
      )}

      {fase === "resultado" && resultado && (
        <>
          <Confetti />
          <ResultadoCard resultado={resultado} onNovo={novoGiro} onProximo={proximoGiro} prizes={prizes} />
        </>
      )}

      <footer className="mt-auto flex w-full items-center justify-between pt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>
          {spinMode === "por_valor"
            ? `Cada R$${minNoteValue} em procedimentos = 1 giro. Comprovante usado não pode ser reutilizado.`
            : "Cada comprovante dá direito a apenas 1 giro"}
        </span>

        <div className="flex items-center gap-3">
          <Link
            to="/cupons"
            className="opacity-60 transition hover:opacity-100"
            aria-label="Consultar cupons"
          >
            Consultar cupons
          </Link>
          <Link
            to="/admin"
            className="opacity-40 transition hover:opacity-100"
            aria-label="Painel administrativo"
          >
            ADM
          </Link>
        </div>
      </footer>
    </main>
  );
}

function PrizeGrid({
  litIndex,
  winnerIndex,
  prizes,
  slots,
}: {
  litIndex: number | null;
  winnerIndex: number | null;
  prizes: Prize[];
  slots: CategoryKey[];
}) {
  const winnerCat = winnerIndex != null ? slots[winnerIndex] : null;
  const isRareWin = winnerCat === "raro";
  const isUltraRareWin = winnerCat === "ultra_raro";

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-primary/40 bg-black/40 p-3 shadow-[0_0_40px_oklch(0.82_0.17_75/0.25)]">
      <div className="grid grid-cols-4 gap-2">
        {slots.map((cat, i) => {
          const icon = CATEGORY_META[cat].icone;
          const meta = ICON_META[icon];
          const match = prizes.find(
            (p) => (p.categoria ?? inferCategoria(p.icone)) === cat,
          );
          const isRareCat = cat === "raro" || cat === "ultra_raro";
          const bg = isRareCat ? meta.bg : (match?.corFundo ?? meta.bg);
          const isWinner = winnerIndex === i;
          const isLit = litIndex === i && !isWinner;
          let slotClass = "slot-base";
          if (isWinner) {
            if (isUltraRareWin) slotClass += " slot-ultra-rare";
            else if (isRareWin) slotClass += " slot-rare";
            else slotClass += " slot-winner";
          } else if (isLit) {
            slotClass += " slot-lit";
          }
          return (
            <div
              key={i}
              className={slotClass}
              style={!isWinner && !isLit ? { background: bg } : undefined}
            >
              <span className={`drop-shadow ${meta.color}`}>{meta.emoji}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function FormCard(props: {
  nota: string;
  valor: string;
  erro: string | null;
  onNota: (v: string) => void;
  onValor: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
      className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Número do comprovante
          </label>
          <input
            inputMode="numeric"
            value={props.nota}
            onChange={(e) => props.onNota(e.target.value)}
            placeholder="Ex: 000123"
            className="rounded-lg border border-input bg-background px-3 py-3 text-lg tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            maxLength={20}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Valor do procedimento (R$)
          </label>
          <input
            inputMode="decimal"
            value={props.valor}
            onChange={(e) => props.onValor(e.target.value)}
            placeholder="Ex: 450,00"
            className="rounded-lg border border-input bg-background px-3 py-3 text-lg tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            maxLength={12}
          />
        </div>
        {props.erro && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {props.erro}
          </div>
        )}
        <button
          type="submit"
          className="rounded-xl bg-primary px-6 py-4 text-lg font-black uppercase tracking-widest text-primary-foreground shadow-lg transition hover:brightness-110 active:scale-[0.98]"
        >
          Ativar 🎰
        </button>
      </div>
    </form>
  );
}

function ResultadoCard({
  resultado,
  onNovo,
  onProximo,
  prizes,
}: {
  resultado: Resultado;
  onNovo: () => void;
  onProximo: () => void;
  prizes: Prize[];
}) {
  const { prize, codigo, validoAte, nota, giroAtual, totalGiros, premiosGanhos } = resultado;
  const meta = ICON_META[prize.icone];
  const temProximo = giroAtual < totalGiros;
  const mostrarCupom = !temProximo && codigo && validoAte;
  return (
    <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border-2 border-primary/60 bg-card p-6 shadow-[0_0_60px_oklch(0.82_0.17_75/0.4)]">
      <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-2xl bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        Nota: <span className="font-semibold text-foreground">{nota}</span>
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Parabéns!</p>
        {totalGiros > 1 && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Giro {giroAtual} de {totalGiros}
          </p>
        )}
        <div className="my-3 text-7xl">{meta.emoji}</div>
        <h2 className="totem-title text-3xl">{prize.nome}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{prize.descricao}</p>

        {mostrarCupom && (
          <div className="my-5 w-full rounded-xl border border-dashed border-primary/50 bg-black/30 p-4">
            {premiosGanhos.length > 1 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prêmios ganhos ({premiosGanhos.length})
                </p>
                <ul className="mt-2 space-y-1 text-left">
                  {premiosGanhos.map((pg, idx) => {
                    const m = ICON_META[pg.prize.icone];
                    return (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`text-lg ${m.color}`}>{m.emoji}</span>
                        <span className="font-semibold text-foreground">{pg.prize.nome}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Código do cupom
            </p>
            <p className="mt-1 font-mono text-2xl font-black tracking-widest text-primary">
              {codigo}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Válido até{" "}
              <span className="font-semibold text-foreground">
                {validoAte!.toLocaleDateString("pt-BR")}
              </span>
            </p>
          </div>
        )}

        {temProximo ? (
          <button
            onClick={onProximo}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
          >
            Próximo giro ({giroAtual + 1} de {totalGiros}) 🎰
          </button>
        ) : (
          <button
            onClick={onNovo}
            className="w-full rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
          >
            Novo giro
          </button>
        )}
        {mostrarCupom && (
          <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Apresente o código na recepção
          </p>
        )}
      </div>



      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Ver todos os prêmios possíveis</summary>
        <ul className="mt-2 space-y-1">
          {prizes.map((p: Prize) => (
            <li key={p.id} className="flex gap-2">
              <span>
                {ICON_META[p.icone].emoji} {p.nome}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function PrizeListPreview({ prizes }: { prizes: Prize[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground transition hover:bg-card hover:text-foreground"
      >
        {aberto ? "Ocultar prêmios possíveis" : "Ver prêmios possíveis 🎁"}
      </button>
      {aberto && (
        <ul className="mt-2 grid gap-2 rounded-2xl border border-border bg-card/60 p-3">
          {prizes.map((p) => {
            const meta = ICON_META[p.icone];
            return (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-2"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-2xl"
                  style={{ background: meta.bg }}
                >
                  <span className={meta.color}>{meta.emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
