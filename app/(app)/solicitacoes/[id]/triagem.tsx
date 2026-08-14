"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIORIDADES = [["URGENTE", "Urgente"], ["ALTA", "Alta"], ["MEDIA", "Média"], ["BAIXA", "Baixa"]] as const;

export default function Triagem({ id, prioridadeAtual }: { id: string; prioridadeAtual: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOk(false); setOcupado(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/solicitacoes/${id}/triagem`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prioridade: f.get("prioridade") }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível salvar."); return; }
      setOk(true);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-slate-600">Definir prioridade</label>
        <select name="prioridade" defaultValue={prioridadeAtual}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
          {PRIORIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>
      <button disabled={ocupado}
        className="rounded-md bg-marinho-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-marinho-800 disabled:opacity-60">
        {ocupado ? "Salvando…" : "Confirmar triagem"}
      </button>
      {ok && <span className="text-xs font-medium text-emerald-600">Triagem salva.</span>}
      {erro && <span className="text-xs font-medium text-red-600">{erro}</span>}
    </form>
  );
}
