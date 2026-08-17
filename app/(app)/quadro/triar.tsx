"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Ref = { id: string; nome: string };
type Sel = {
  id: string; numero: string; titulo: string; descricao: string | null;
  predio: string | null; solicitante_nome: string; ponto: string | null;
  prioridade: string; natureza: string; criado_em: string;
} | null;

const PRIORIDADES = [["URGENTE","Urgente"],["ALTA","Alta"],["MEDIA","Média"],["BAIXA","Baixa"]] as const;

/* Formulário unico de triagem que aparece acima da lista no /quadro.
   Sem solicitacao selecionada: campos ficam desabilitados com dica.
   Selecionada: preenche os campos e ao confirmar cria a OS. */
export default function Triar({ sel, contratadas }: { sel: Sel; contratadas: Ref[] }) {
  const [tipo, setTipo] = useState<"LIMPEZA"|"MANUTENCAO">(sel?.natureza === "LIMPEZA" ? "LIMPEZA" : "MANUTENCAO");
  const [execucao, setExecucao] = useState<"INTERNA"|"EXTERNA">("INTERNA");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sel) return;
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);

    const exec = tipo === "LIMPEZA" ? "INTERNA_ZELADORIA"
               : execucao === "EXTERNA" ? "EXTERNA" : "INTERNA_MANUTENCAO";
    const contratadaId = exec === "EXTERNA" ? String(f.get("contratadaId") || "") : "";

    try {
      const r = await fetch(`/api/solicitacoes/${sel.id}/converter`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo: f.get("titulo") || sel.titulo,
          descricao: f.get("descricao") || sel.descricao,
          tipo: tipo === "LIMPEZA" ? "CORRETIVA" : "CORRETIVA",
          prioridade: f.get("prioridade") || sel.prioridade,
          contratadaId: contratadaId || null,
          prazoHoras: f.get("prazoHoras") || null,
          custoEstimado: f.get("custoEstimado") || null,
          execucao: exec,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível triar."); return; }
      router.push(`/quadro`);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  const desabilitado = !sel;

  return (
    <form onSubmit={enviar} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Triagem {sel ? <span className="ml-2 font-mono text-xs text-slate-500">· {sel.numero}</span> : ""}
        </h2>
        {sel ? (
          <span className="text-[11px] text-slate-500">
            {sel.predio} · relatado por {sel.solicitante_nome}
            {sel.ponto ? ` · ${sel.ponto}` : ""}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Selecione uma solicitação abaixo para começar</span>
        )}
      </div>

      <fieldset disabled={desabilitado} className={desabilitado ? "opacity-50" : ""}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Título da OS</label>
            <input name="titulo" defaultValue={sel?.titulo ?? ""} required
              key={sel?.id ?? "vazio"}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Descrição / observação técnica</label>
            <textarea name="descricao" rows={2} defaultValue={sel?.descricao ?? ""}
              key={"desc-" + (sel?.id ?? "vazio")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Prioridade</label>
            <select name="prioridade" defaultValue={sel?.prioridade ?? "MEDIA"} key={"prio-" + (sel?.id ?? "vazio")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {PRIORIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo de serviço</label>
            <div className="mt-1 flex gap-2">
              {(["LIMPEZA", "MANUTENCAO"] as const).map((v) => (
                <button type="button" key={v} onClick={() => setTipo(v)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition
                    ${tipo === v ? "border-marinho-700 bg-marinho-700 text-white"
                                 : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  {v === "LIMPEZA" ? "Limpeza" : "Manutenção"}
                </button>
              ))}
            </div>
          </div>

          {tipo === "MANUTENCAO" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600">Execução</label>
                <div className="mt-1 flex gap-2">
                  {(["INTERNA", "EXTERNA"] as const).map((v) => (
                    <button type="button" key={v} onClick={() => setExecucao(v)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition
                        ${execucao === v ? "border-marinho-700 bg-marinho-700 text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      {v === "INTERNA" ? "Equipe interna" : "Empresa externa"}
                    </button>
                  ))}
                </div>
              </div>

              {execucao === "EXTERNA" && (
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600">
                    Contratada <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <select name="contratadaId" required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Selecione…</option>
                    {contratadas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

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
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erro}
          </p>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button disabled={ocupado || desabilitado}
            className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white
                       transition hover:bg-marinho-800 disabled:opacity-60">
            {ocupado ? "Confirmando…" : "Confirmar triagem e criar OS"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
