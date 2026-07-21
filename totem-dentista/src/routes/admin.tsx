import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DEFAULT_PRIZES,
  ICON_META,
  CATEGORY_META,
  CATEGORY_KEYS,
  getPrizeBg,
  fetchConfig,
  PISO_GIRO,
  inferCategoria,
  type CategoryKey,
  type Prize,
  type SpinMode,
} from "@/lib/prizes";

import { savePrizesToDb, verifyAdminPassword } from "@/lib/prizes-admin.functions";



export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel ADM — Totem de Prêmios" },
      { name: "description", content: "Configuração de prêmios e probabilidades do totem." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [senha, setSenha] = useState("");
  const [senhaAutorizada, setSenhaAutorizada] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const verify = useServerFn(verifyAdminPassword);

  if (!senhaAutorizada) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4">
        <h1 className="totem-title text-3xl">Painel ADM</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!senha) return;
            setVerificando(true);
            setErroSenha(null);
            try {
              const { ok } = await verify({ data: { password: senha } });
              if (ok) {
                setSenhaAutorizada(senha);
              } else {
                setErroSenha("Senha incorreta.");
              }
            } catch (err) {
              console.error(err);
              setErroSenha("Falha ao verificar. Tente novamente.");
            } finally {
              setVerificando(false);
            }
          }}
          className="w-full rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Senha de administrador
          </label>
          <input
            autoFocus
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="adm-input mt-2 text-center text-lg"
            placeholder="••••••"
          />
          {erroSenha && (
            <p className="mt-2 text-sm text-destructive-foreground">{erroSenha}</p>
          )}
          <button
            type="submit"
            disabled={verificando}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {verificando ? "Verificando…" : "Entrar"}
          </button>
          <Link
            to="/"
            className="mt-3 block text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao totem
          </Link>
        </form>
      </main>
    );
  }

  return <AdminEditor password={senhaAutorizada} />;
}

function AdminEditor({ password }: { password: string }) {
  const queryClient = useQueryClient();
  const save = useServerFn(savePrizesToDb);
  const { data: configDb, isLoading } = useQuery({
    queryKey: ["prize_config"],
    queryFn: fetchConfig,
  });
  const [prizes, setPrizes] = useState<Prize[] | null>(null);
  const [minNoteValue, setMinNoteValue] = useState<number>(PISO_GIRO);
  const [spinMode, setSpinMode] = useState<SpinMode>("por_nota");
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  // Hidrata o estado local uma única vez, quando os dados chegam.
  useEffect(() => {
    if (prizes === null && configDb) {
      setPrizes(configDb.prizes);
      setMinNoteValue(configDb.minNoteValue);
      setSpinMode(configDb.spinMode);
    }
  }, [prizes, configDb]);

  useEffect(() => {
    if (!salvo) return;
    const t = window.setTimeout(() => setSalvo(false), 1800);
    return () => window.clearTimeout(t);
  }, [salvo]);

  const lista = prizes ?? configDb?.prizes ?? [];


  const totalPeso = useMemo(
    () => lista.reduce((s, p) => s + Math.max(0, Number(p.peso) || 0), 0),
    [lista]
  );

  const update = (i: number, patch: Partial<Prize>) => {
    setPrizes((prev) => (prev ?? lista).map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const remover = (i: number) => {
    if (!window.confirm("Remover este prêmio?")) return;
    setPrizes((prev) => (prev ?? lista).filter((_, idx) => idx !== i));
  };

  const adicionar = () => {
    setPrizes((prev) => [
      ...(prev ?? lista),
      {
        id: `novo-${Date.now()}`,
        nome: "Novo prêmio",
        categoria: "cupom",
        icone: CATEGORY_META.cupom.icone,
        raridade: "comum",
        peso: 5,
        validadeDias: 30,
        descricao: "",
      },
    ]);
  };


  const salvar = async () => {
    setSalvando(true);
    setErroSalvar(null);
    try {
      const res = await save({ data: { password, prizes: lista, minNoteValue, spinMode } });
      if (res.ok) {
        setSalvo(true);
        queryClient.invalidateQueries({ queryKey: ["prize_config"] });
      } else {
        setErroSalvar(res.error ?? "Falha ao salvar.");
      }
    } catch (err) {
      console.error(err);
      setErroSalvar("Erro de rede ao salvar.");
    } finally {
      setSalvando(false);
    }
  };


  const restaurar = () => {
    if (!window.confirm("Restaurar prêmios padrão? Salve para confirmar no servidor.")) return;
    setPrizes(DEFAULT_PRIZES);
  };

  if (isLoading && !prizes) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4">
        <p className="text-muted-foreground">Carregando prêmios…</p>
      </main>
    );
  }

  const prizesList = lista;


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Painel ADM</p>
          <h1 className="totem-title text-3xl">Prêmios & Probabilidades</h1>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-border px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Totem
        </Link>
      </header>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground">
            Prêmios: <span className="font-bold text-foreground tabular-nums">{prizesList.length}</span>
          </span>
        </div>
        <label className="grid gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Modo de giro
          </span>
          <select
            value={spinMode}
            onChange={(e) => setSpinMode(e.target.value as SpinMode)}
            className="adm-input"
          >
            <option value="por_nota">1 giro por nota (exige valor mínimo)</option>
            <option value="por_valor">1 giro a cada R$ gastos (múltiplos giros por nota)</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            {spinMode === "por_valor" ? "Valor por giro (R$)" : "Valor mínimo da nota (R$)"}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={minNoteValue}
            onChange={(e) => setMinNoteValue(Math.max(0, Number(e.target.value) || 0))}
            className="adm-input w-24 font-bold tabular-nums text-primary"
          />
        </label>
      </div>


      <div className="grid gap-3">
        {prizesList.map((p, i) => {
          const chance = totalPeso > 0 ? (Math.max(0, p.peso) / totalPeso) * 100 : 0;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border text-3xl"
                  style={{ background: getPrizeBg(p) }}
                >
                  <span className={ICON_META[p.icone].color}>
                    {ICON_META[p.icone].emoji}
                  </span>
                </div>
                <div className="grid flex-1 gap-2">
                  <input
                    value={p.nome}
                    onChange={(e) => update(i, { nome: e.target.value })}
                    className="adm-input font-semibold"
                  />
                  <textarea
                    value={p.descricao}
                    onChange={(e) => update(i, { descricao: e.target.value })}
                    rows={2}
                    className="adm-input resize-none"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Categoria
                  </span>
                  <select
                    value={p.categoria ?? inferCategoria(p.icone)}
                    onChange={(e) => {
                      const cat = e.target.value as CategoryKey;
                      update(i, { categoria: cat, icone: CATEGORY_META[cat].icone });
                    }}
                    className="adm-input"
                  >
                    {CATEGORY_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_META[k].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Peso
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={p.peso}
                    onChange={(e) => update(i, { peso: Number(e.target.value) })}
                    className="adm-input font-bold tabular-nums text-primary"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Validade (dias)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={p.validadeDias}
                    onChange={(e) => update(i, { validadeDias: Number(e.target.value) })}
                    className="adm-input tabular-nums"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Chance (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={Number(chance.toFixed(2))}
                    onChange={(e) => {
                      const novaChance = Math.max(0, Number(e.target.value) || 0);
                      const outros = Math.max(0, totalPeso - Math.max(0, p.peso));
                      const c = Math.min(0.9999, novaChance / 100);
                      const novoPeso =
                        outros <= 0 ? Math.max(0.0001, novaChance) : (outros * c) / (1 - c);
                      update(i, { peso: Number(novoPeso.toFixed(4)) });
                    }}
                    className="adm-input font-bold tabular-nums text-primary"
                  />
                </label>

              </div>


              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => remover(i)}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs uppercase tracking-widest text-destructive-foreground hover:bg-destructive/20"
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Simulador prizes={prizesList} />



      <div className="sticky bottom-3 mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
        <button
          onClick={adicionar}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          + Adicionar prêmio
        </button>
        <button
          onClick={restaurar}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          Restaurar padrão
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="ml-auto rounded-xl bg-primary px-5 py-2 text-sm font-black uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {salvo && (
          <span className="text-xs font-semibold text-primary">✓ Salvo no servidor</span>
        )}
        {erroSalvar && (
          <span className="text-xs font-semibold text-destructive-foreground">{erroSalvar}</span>
        )}
      </div>
    </main>
  );
}

function Simulador({ prizes }: { prizes: Prize[] }) {
  const [n, setN] = useState(1000);
  const [resultado, setResultado] = useState<
    { prize: Prize; count: number; chanceTeorica: number }[] | null
  >(null);
  const [rodando, setRodando] = useState(false);

  const totalPeso = useMemo(
    () => prizes.reduce((s, p) => s + Math.max(0, Number(p.peso) || 0), 0),
    [prizes]
  );

  const rodar = () => {
    if (totalPeso <= 0 || prizes.length === 0) return;
    setRodando(true);
    // Sorteio ponderado usando o estado atual (não salvo) do editor.
    const counts = new Map<string, number>();
    prizes.forEach((p) => counts.set(p.id, 0));
    const iter = Math.max(1, Math.min(100000, Math.floor(n)));
    for (let i = 0; i < iter; i++) {
      let r = Math.random() * totalPeso;
      for (const p of prizes) {
        r -= Math.max(0, p.peso);
        if (r <= 0) {
          counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
          break;
        }
      }
    }
    const res = prizes
      .map((p) => ({
        prize: p,
        count: counts.get(p.id) ?? 0,
        chanceTeorica: (Math.max(0, p.peso) / totalPeso) * 100,
      }))
      .sort((a, b) => b.count - a.count);
    setResultado(res);
    setRodando(false);
  };

  const totalSorteado = resultado?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
            Simulador
          </p>
          <h2 className="text-lg font-bold">Testar probabilidades</h2>
          <p className="text-xs text-muted-foreground">
            Usa os valores atuais do editor (mesmo que ainda não salvos).
          </p>
        </div>
        <label className="ml-auto grid gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nº de giros
          </span>
          <input
            type="number"
            min={1}
            max={100000}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="adm-input w-28 tabular-nums"
          />
        </label>
        <button
          onClick={rodar}
          disabled={rodando || totalPeso <= 0}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-black uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {rodando ? "Rodando…" : "Simular"}
        </button>
      </div>

      {resultado && (
        <div className="mt-4 grid gap-2">
          <p className="text-xs text-muted-foreground">
            {totalSorteado.toLocaleString("pt-BR")} giros simulados
          </p>
          {resultado.map((r) => {
            const pct = totalSorteado > 0 ? (r.count / totalSorteado) * 100 : 0;
            const delta = pct - r.chanceTeorica;
            return (
              <div
                key={r.prize.id}
                className="grid gap-1 rounded-xl border border-border bg-background/40 p-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-base"
                    style={{ background: getPrizeBg(r.prize) }}
                  >
                    <span className={ICON_META[r.prize.icone].color}>
                      {ICON_META[r.prize.icone].emoji}
                    </span>
                  </span>
                  <span className="flex-1 truncate font-semibold">{r.prize.nome}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.count}
                  </span>
                  <span className="w-16 text-right font-bold tabular-nums text-primary">
                    {pct.toFixed(1)}%
                  </span>
                  <span
                    className={`w-14 text-right text-xs tabular-nums ${
                      Math.abs(delta) < 1
                        ? "text-muted-foreground"
                        : delta > 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Teórico: {r.chanceTeorica.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


