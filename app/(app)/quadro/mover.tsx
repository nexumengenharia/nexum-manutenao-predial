"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PROXIMO: Record<string, { k: string; t: string }[]> = {
  ABERTA:      [{ k: "TRIAGEM", t: "Triar" }, { k: "EM_EXECUCAO", t: "Executar" }],
  TRIAGEM:     [{ k: "EM_EXECUCAO", t: "Executar" }, { k: "CANCELADA", t: "Cancelar" }],
  EM_EXECUCAO: [{ k: "CONCLUIDA", t: "Concluir" }],
};

export default function Mover({ id, situacao }: { id: string; situacao: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const opcoes = PROXIMO[situacao] ?? [];
  if (!opcoes.length) return null;

  async function mover(nova: string) {
    setOcupado(true); setErro(null);
    try {
      const r = await fetch(`/api/solicitacoes/${id}/situacao`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ situacao: nova }),
      });
      if (!r.ok) { const j = await r.json(); setErro(j.erro ?? "Falha"); return; }
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="flex flex-wrap gap-1">
        {opcoes.map((o) => (
          <button key={o.k} disabled={ocupado} onClick={() => mover(o.k)}
            className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600
                       transition hover:border-marinho-400 hover:bg-marinho-50 hover:text-marinho-800
                       disabled:opacity-50">
            {ocupado ? "…" : o.t}
          </button>
        ))}
      </div>
      {erro && <p className="mt-1 text-[10px] text-red-600">{erro}</p>}
    </div>
  );
}
