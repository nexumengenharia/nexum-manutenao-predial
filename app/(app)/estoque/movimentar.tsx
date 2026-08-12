"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Movimentar({ itemId, nome, saldo }: { itemId: string; nome: string; saldo: number }) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    const dados = Object.fromEntries(f.entries());
    try {
      const r = await fetch("/api/estoque/movimentar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, ...dados }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível movimentar."); return; }
      setAberto(false);
      router.refresh();
    } catch { setErro("Falha de comunicação. Tente novamente."); }
    finally { setOcupado(false); }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
        Movimentar
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true"
         aria-label={`Movimentar ${nome}`}>
      <button type="button" aria-label="Fechar" onClick={() => setAberto(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
      <form onSubmit={enviar} className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-marinho-900">{nome}</h3>
        <p className="text-xs text-slate-500">Saldo atual: <strong className="tabular-nums">{saldo}</strong></p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo de movimento</label>
            <select name="tipo" defaultValue="ENTRADA"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="ENTRADA">Entrada (compra/recebimento)</option>
              <option value="SAIDA">Saída (uso em OS/consumo)</option>
              <option value="AJUSTE">Ajuste (define o saldo exato)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Quantidade</label>
            <input name="quantidade" type="number" min="0" step="any" required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Motivo (opcional)</label>
            <input name="motivo" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        {erro && (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erro}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={() => setAberto(false)}
                  className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button disabled={ocupado}
                  className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white
                             transition hover:bg-marinho-800 disabled:opacity-60">
            {ocupado ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
