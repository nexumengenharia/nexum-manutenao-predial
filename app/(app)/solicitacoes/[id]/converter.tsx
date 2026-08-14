"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Ref = { id: string; nome: string };

const TIPOS = [["CORRETIVA", "Corretiva"], ["PREVENTIVA", "Preventiva"], ["PREDITIVA", "Preditiva"], ["PMOC", "PMOC"]] as const;
const PRIORIDADES = [["URGENTE", "Urgente"], ["ALTA", "Alta"], ["MEDIA", "Média"], ["BAIXA", "Baixa"]] as const;

export default function Converter({ id, tituloSugerido, descricaoSugerida, prioridadeSugerida, contratadas, ativos, ativoSugerido }: {
  id: string; tituloSugerido: string; descricaoSugerida?: string | null; prioridadeSugerida: string;
  contratadas: Ref[]; ativos: Ref[]; ativoSugerido?: string | null;
}) {
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
      const r = await fetch(`/api/solicitacoes/${id}/converter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível converter."); return; }
      router.push(`/ordens/${j.id}`);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        className="rounded-md bg-marinho-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-marinho-800">
        Converter em OS
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Título da OS</label>
        <input name="titulo" defaultValue={tituloSugerido} required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Descrição técnica</label>
        <textarea name="descricao" rows={3} defaultValue={descricaoSugerida ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Tipo</label>
          <select name="tipo" defaultValue="CORRETIVA"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Prioridade</label>
          <select name="prioridade" defaultValue={prioridadeSugerida}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PRIORIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Ativo (opcional)</label>
          <select name="ativoId" defaultValue={ativoSugerido ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {ativos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Contratada (opcional)</label>
          <select name="contratadaId" defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {contratadas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Prazo (horas)</label>
          <input name="prazoHoras" type="number" min="1" step="1"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Custo estimado (R$)</label>
          <input name="custoEstimado" type="number" min="0" step="0.01"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
          Cancelar
        </button>
        <button disabled={ocupado}
          className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marinho-800 disabled:opacity-60">
          {ocupado ? "Criando…" : "Criar Ordem de Serviço"}
        </button>
      </div>
    </form>
  );
}
