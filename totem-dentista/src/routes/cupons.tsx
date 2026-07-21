import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Coupon } from "@/lib/coupons";

export const Route = createFileRoute("/cupons")({
  head: () => ({
    meta: [
      { title: "Consulta de Cupons" },
      { name: "description", content: "Consulte cupons pelo código e veja o prêmio e a validade." },
    ],
  }),
  component: CuponsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const COUPONS_KEY = "totem_cupons_v1";

function readCoupons(): Coupon[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COUPONS_KEY);
    return raw ? (JSON.parse(raw) as Coupon[]) : [];
  } catch {
    return [];
  }
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function CuponsPage() {
  const [codigo, setCodigo] = useState("");
  const [buscou, setBuscou] = useState(false);

  const resultado = useMemo<Coupon | null>(() => {
    if (!buscou) return null;
    const alvo = codigo.trim().toUpperCase();
    if (!alvo) return null;
    const list = readCoupons();
    return list.find((c) => c.codigo.toUpperCase() === alvo) ?? null;
  }, [codigo, buscou]);

  const valido =
    resultado && new Date(resultado.validoAte).getTime() >= Date.now();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Consultar Cupom</h1>
          <Link to="/" className="text-sm text-muted-foreground underline">
            Início
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBuscou(true);
          }}
          className="space-y-3"
        >
          <label htmlFor="codigo" className="text-sm font-medium">
            Código do cupom
          </label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              setBuscou(false);
            }}
            placeholder="Ex.: TP-ABC12345"
            className="w-full rounded-md border border-input bg-background px-3 py-2 uppercase tracking-wider"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-md bg-primary text-primary-foreground py-2 font-semibold"
          >
            Consultar
          </button>
        </form>

        {buscou && !resultado && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center">
            Cupom não encontrado.
          </div>
        )}

        {resultado && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Código</div>
              <div className="font-mono font-bold">{resultado.codigo}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                {resultado.premios && resultado.premios.length > 1
                  ? `Prêmios (${resultado.premios.length})`
                  : "Prêmio"}
              </div>
              {resultado.premios && resultado.premios.length > 1 ? (
                <ul className="mt-1 space-y-1 text-base font-semibold">
                  {resultado.premios.map((p, i) => (
                    <li key={i}>• {p.prizeNome}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-lg font-semibold">{resultado.prizeNome}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Emitido</div>
                <div className="text-sm">{fmt(resultado.criadoEm)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Válido até</div>
                <div className="text-sm">{fmt(resultado.validoAte)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Nota</div>
                <div className="text-sm">{resultado.nota}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Valor</div>
                <div className="text-sm">
                  R$ {resultado.valorPago.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>
            <div
              className={`rounded-md px-3 py-2 text-center font-semibold ${
                valido
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {valido ? "✓ Cupom válido" : "✗ Cupom expirado"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
