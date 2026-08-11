"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* Concluir uma ordem sem informar custo e a origem do buraco nos indicadores:
   a ordem sai da fila mas nunca entra no custo do mes. Por isso o custo e
   pedido no mesmo gesto de concluir, e nao numa tela separada. */

const PROXIMO: Record<string, { k: string; t: string }[]> = {
  ABERTA:          [{ k: "EM_EXECUCAO", t: "Iniciar execução" }, { k: "CANCELADA", t: "Cancelar" }],
  EM_EXECUCAO:     [{ k: "CONCLUIDA", t: "Concluir" }, { k: "AGUARDANDO_PECA", t: "Aguardar peça" }],
  AGUARDANDO_PECA: [{ k: "EM_EXECUCAO", t: "Retomar" }, { k: "CANCELADA", t: "Cancelar" }],
  CONCLUIDA:       [{ k: "EM_EXECUCAO", t: "Reabrir" }],
};

export default function MudarSituacao({ id, situacao }: { id: string; situacao: string }) {
  const [alvo, setAlvo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const opcoes = PROXIMO[situacao] ?? [];
  if (!opcoes.length) return null;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/ordens/${id}/situacao`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          situacao: alvo,
          custoReal: f.get("custoReal") || null,
          horas: f.get("horas") || null,
          nota: f.get("nota") || null,
          parecer: f.get("parecer") || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível atualizar."); return; }
      setAlvo(null);
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  const concluindo = alvo === "CONCLUIDA";

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <button key={o.k} type="button" onClick={() => { setAlvo(o.k); setErro(null); }}
            className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
            {o.t}
          </button>
        ))}
      </div>

      {alvo && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar" onClick={() => setAlvo(null)}
                  className="absolute inset-0 bg-slate-900/50" />
          <form onSubmit={enviar}
                className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-marinho-900">
              {opcoes.find((o) => o.k === alvo)?.t}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {concluindo
                ? "Informe o custo realizado — é ele que alimenta o custo do mês e o custo por prédio."
                : "A mudança fica registrada na trilha de auditoria."}
            </p>

            {concluindo && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="custoReal" className="block text-xs font-medium text-slate-600">
                    Custo realizado (R$)
                  </label>
                  <input id="custoReal" name="custoReal" type="number" step="0.01" min="0"
                         className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="horas" className="block text-xs font-medium text-slate-600">
                    Horas trabalhadas
                  </label>
                  <input id="horas" name="horas" type="number" step="0.5" min="0"
                         className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="nota" className="block text-xs font-medium text-slate-600">
                    Nota de qualidade (0 a 5)
                  </label>
                  <input id="nota" name="nota" type="number" step="0.1" min="0" max="5"
                         className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="parecer" className="block text-xs font-medium text-slate-600">
                    Parecer do fiscal
                  </label>
                  <textarea id="parecer" name="parecer" rows={2}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {erro && (
              <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {erro}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAlvo(null)}
                      className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button disabled={ocupado}
                      className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white
                                 hover:bg-marinho-800 disabled:opacity-60">
                {ocupado ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
