"use client";
import { useState } from "react";

/* A classificacao entre limpeza e manutencao e feita por quem esta no
   local, e nao numa triagem posterior — e o unico jeito de o chamado
   chegar na equipe certa sem passar por um intermediario. Os exemplos
   embaixo de cada opcao existem porque "natureza da demanda" nao
   significa nada para quem so quer avisar que o banheiro acabou papel. */
const NATUREZAS = [
  { k: "LIMPEZA",    t: "Limpeza / zeladoria", d: "Sujeira, lixo, falta de papel ou sabonete, mau cheiro",
    cor: "border-cyan-400 bg-cyan-50 text-cyan-900", ativo: "border-cyan-600 bg-cyan-600 text-white" },
  { k: "MANUTENCAO", t: "Manutenção / conserto", d: "Vazamento, lâmpada queimada, algo quebrado ou sem funcionar",
    cor: "border-blue-400 bg-blue-50 text-blue-900", ativo: "border-marinho-700 bg-marinho-700 text-white" },
  { k: "SEGURANCA",  t: "Segurança", d: "Risco de acidente, porta sem tranca, situação perigosa",
    cor: "border-violet-400 bg-violet-50 text-violet-900", ativo: "border-violet-700 bg-violet-700 text-white" },
];

const URGENCIAS = [
  { k: "BAIXA",   t: "Pode aguardar" },
  { k: "MEDIA",   t: "Atrapalha" },
  { k: "ALTA",    t: "Impede o uso" },
  { k: "URGENTE", t: "Risco imediato" },
];

export default function FormPonto({ codigo, local }: { codigo: string; local: string }) {
  const [natureza, setNatureza] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState("MEDIA");
  const [ok, setOk] = useState<{ numero: string; equipe: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!natureza) { setErro("Escolha o tipo de problema."); return; }
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/publico/ponto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo, natureza, prioridade,
          titulo: f.get("titulo"), descricao: f.get("descricao"),
          solicitante: f.get("solicitante") || "Usuário do prédio",
          contato: f.get("contato"),
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível registrar."); return; }
      setOk({ numero: j.numero, equipe: j.equipe });
    } catch { setErro("Falha de comunicação. Tente novamente."); }
    finally { setOcupado(false); }
  }

  if (ok) {
    return (
      <div role="status" className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
        <p className="mt-3 font-semibold text-emerald-900">Chamado registrado</p>
        <p className="mt-2 text-sm text-emerald-800">
          Protocolo <strong className="font-mono text-base">{ok.numero}</strong>
        </p>
        <p className="mt-1 text-sm text-emerald-700">Encaminhado para <strong>{ok.equipe}</strong>.</p>
        <button onClick={() => { setOk(null); setNatureza(null); }}
          className="mt-4 text-sm font-medium text-emerald-800 underline">
          Registrar outro problema
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Que tipo de problema é? <span className="text-red-600" aria-hidden>*</span>
        </legend>
        <div className="space-y-2">
          {NATUREZAS.map((n) => (
            <button key={n.k} type="button" onClick={() => setNatureza(n.k)}
              aria-pressed={natureza === n.k}
              className={`w-full rounded-xl border-2 p-3 text-left transition
                ${natureza === n.k ? n.ativo : `${n.cor} hover:brightness-95`}`}>
              <p className="text-sm font-semibold">{n.t}</p>
              <p className={`mt-0.5 text-xs ${natureza === n.k ? "text-white/80" : "opacity-70"}`}>{n.d}</p>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">
          Descreva rapidamente <span className="text-red-600" aria-hidden>*</span>
        </label>
        <input id="titulo" name="titulo" required maxLength={120}
          placeholder="Ex.: torneira da pia não fecha"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">
          Mais detalhes <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea id="descricao" name="descricao" rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Urgência</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {URGENCIAS.map((u) => (
            <button key={u.k} type="button" onClick={() => setPrioridade(u.k)}
              aria-pressed={prioridade === u.k}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition
                ${prioridade === u.k
                  ? "border-marinho-700 bg-marinho-700 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {u.t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="solicitante" className="block text-sm font-medium text-slate-700">
            Seu nome <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input id="solicitante" name="solicitante"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="contato" className="block text-sm font-medium text-slate-700">
            Ramal ou e-mail <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input id="contato" name="contato"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      <button disabled={ocupado}
        className="w-full rounded-xl bg-marinho-700 px-4 py-3 text-sm font-semibold text-white
                   transition hover:bg-marinho-800 disabled:opacity-60">
        {ocupado ? "Registrando…" : "Enviar chamado"}
      </button>
      <p className="text-center text-[11px] text-slate-400">
        Local identificado automaticamente pelo QR: {local}
      </p>
    </form>
  );
}
