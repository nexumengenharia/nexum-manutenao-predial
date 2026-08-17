"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Abastecer({ id }: { id: string }) {
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
      const r = await fetch(`/api/frota/${id}/abastecer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível registrar."); return; }
      (e.target as HTMLFormElement).reset();
      setAberto(false);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
        Registrar abastecimento
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" onClick={() => setAberto(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
      <form onSubmit={enviar} className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-marinho-900">Novo abastecimento</h3>
        <p className="text-xs text-slate-500">Preencha o que foi bombeado, com o número da NF para conferência.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Data</label>
            <input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Hodômetro (km)</label>
            <input name="hodometro" type="number" min="0" step="1"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Litros <span className="text-red-600" aria-hidden>*</span>
            </label>
            <input name="litros" type="number" min="0.01" step="0.01" required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Valor total (R$) <span className="text-red-600" aria-hidden>*</span>
            </label>
            <input name="valor" type="number" min="0" step="0.01" required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Combustível</label>
            <select name="combustivel" defaultValue=""
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="GASOLINA">Gasolina</option>
              <option value="ETANOL">Etanol</option>
              <option value="DIESEL">Diesel</option>
              <option value="DIESEL_S10">Diesel S10</option>
              <option value="GNV">GNV</option>
              <option value="FLEX">Flex</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Posto</label>
            <input name="posto"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Motorista</label>
            <input name="motoristaNome"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Nota fiscal (nº ou link)</label>
            <input name="notaFiscal"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600">Observações</label>
            <input name="observacoes"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
                  className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marinho-800 disabled:opacity-60">
            {ocupado ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
