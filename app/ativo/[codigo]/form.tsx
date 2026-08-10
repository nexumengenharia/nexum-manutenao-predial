"use client";
import { useState } from "react";

export default function FormChamado({ codigo }: { codigo: string }) {
  const [ok, setOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/publico/chamado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo,
          titulo: f.get("titulo"),
          descricao: f.get("descricao"),
          solicitante: f.get("solicitante"),
          contato: f.get("contato"),
          prioridade: f.get("prioridade"),
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível registrar."); return; }
      setOk(j.numero);
      e.currentTarget.reset();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  if (ok) {
    return (
      <div role="status" className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-900">Chamado registrado com sucesso.</p>
        <p className="mt-1 text-sm text-emerald-800">
          Número de protocolo: <strong className="font-mono">{ok}</strong>
        </p>
        <button onClick={() => setOk(null)}
          className="mt-3 text-sm font-medium text-emerald-800 underline">
          Registrar outro chamado
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-3">
      <div>
        <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">
          Qual o problema? <span className="text-red-600" aria-hidden>*</span>
        </label>
        <input id="titulo" name="titulo" required maxLength={120}
          placeholder="Ex.: ar-condicionado não está refrigerando"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Detalhes</label>
        <textarea id="descricao" name="descricao" rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="solicitante" className="block text-sm font-medium text-slate-700">
            Seu nome <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input id="solicitante" name="solicitante" required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="contato" className="block text-sm font-medium text-slate-700">Ramal ou e-mail</label>
          <input id="contato" name="contato"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label htmlFor="prioridade" className="block text-sm font-medium text-slate-700">Urgência</label>
        <select id="prioridade" name="prioridade" defaultValue="MEDIA"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="BAIXA">Baixa — pode aguardar</option>
          <option value="MEDIA">Média — atrapalha o trabalho</option>
          <option value="ALTA">Alta — impede o trabalho</option>
          <option value="URGENTE">Urgente — risco à segurança</option>
        </select>
      </div>

      {erro && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}

      <button disabled={ocupado}
        className="w-full rounded bg-marinho-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marinho-800 disabled:opacity-60">
        {ocupado ? "Registrando…" : "Registrar chamado"}
      </button>
    </form>
  );
}
