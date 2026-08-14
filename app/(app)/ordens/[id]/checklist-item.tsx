"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChecklistItem({ item, podeEditar }: {
  item: { id: string; ordem_exibicao: number; descricao: string; resposta: string | null; conforme: boolean | null; observacao: string | null };
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    const conformeRaw = f.get("conforme");
    try {
      const r = await fetch(`/api/checklist/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resposta: f.get("resposta"),
          conforme: conformeRaw === "" ? null : conformeRaw === "true",
          observacao: f.get("observacao"),
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível salvar."); return; }
      setEditando(false);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  if (!editando) {
    return (
      <tr className="hover:bg-slate-50">
        <td className="px-3 py-2 tabular-nums text-xs">{item.ordem_exibicao}</td>
        <td className="px-3 py-2">{item.descricao}</td>
        <td className="px-3 py-2 text-xs">{item.resposta || <span className="text-slate-400">—</span>}</td>
        <td className="px-3 py-2">
          {item.conforme === null || item.conforme === undefined
            ? <span className="text-slate-400">não respondido</span>
            : item.conforme
              ? <span className="font-medium text-emerald-700">conforme</span>
              : <span className="font-medium text-red-700">não conforme</span>}
        </td>
        <td className="px-3 py-2 text-xs">{item.observacao}</td>
        <td className="px-3 py-2">
          {podeEditar && (
            <button type="button" onClick={() => setEditando(true)}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
              Responder
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-marinho-50/40">
      <td className="px-3 py-2 tabular-nums text-xs align-top">{item.ordem_exibicao}</td>
      <td className="px-3 py-2 align-top" colSpan={4}>
        <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
          <p className="w-full text-sm font-medium text-slate-700">{item.descricao}</p>
          <div>
            <label className="block text-[11px] font-medium text-slate-600">Resposta</label>
            <input name="resposta" defaultValue={item.resposta ?? ""}
              className="mt-1 w-40 rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600">Conforme?</label>
            <select name="conforme" defaultValue={item.conforme === null ? "" : String(item.conforme)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm">
              <option value="">não respondido</option>
              <option value="true">conforme</option>
              <option value="false">não conforme</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium text-slate-600">Observação</label>
            <input name="observacao" defaultValue={item.observacao ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setEditando(false)}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button disabled={ocupado}
              className="rounded bg-marinho-700 px-3 py-1 text-xs font-medium text-white hover:bg-marinho-800 disabled:opacity-60">
              {ocupado ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
