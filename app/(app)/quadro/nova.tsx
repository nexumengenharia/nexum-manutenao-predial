"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* Painel de abertura manual de solicitacao — para o gestor/fiscal registrar
   um chamado que chegou por telefone ou presencialmente, sem passar pelo QR. */

type Predio = { id: string; nome: string };
type Ponto = { id: string; nome: string; predio_id: string };

const NATUREZAS = [
  ["MANUTENCAO", "Manutenção"], ["LIMPEZA", "Limpeza"], ["SEGURANCA", "Segurança"],
  ["TI", "TI"], ["JARDINAGEM", "Jardinagem"], ["FROTA", "Frota"], ["OUTRO", "Outro"],
] as const;
const PRIORIDADES = [["URGENTE", "Urgente"], ["ALTA", "Alta"], ["MEDIA", "Média"], ["BAIXA", "Baixa"]] as const;

export default function NovaSolicitacao({ predios, pontos }: { predios: Predio[]; pontos: Ponto[] }) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [predioId, setPredioId] = useState("");
  const router = useRouter();
  const refForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aberto]);

  function fechar() { setAberto(false); setErro(null); setPredioId(""); }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    const dados = Object.fromEntries(f.entries());
    try {
      const r = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível registrar."); return; }
      fechar();
      router.refresh();
    } catch { setErro("Falha de comunicação. Tente novamente."); }
    finally { setOcupado(false); }
  }

  const pontosDoPredio = pontos.filter((p) => !predioId || p.predio_id === predioId);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-md bg-marinho-700 px-3.5 py-2 text-sm font-medium text-white
                   transition hover:bg-marinho-800">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        Nova solicitação
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Nova solicitação">
          <button type="button" aria-label="Fechar" onClick={fechar}
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />

          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-marinho-900">Nova solicitação</h2>
                <p className="text-xs text-slate-500">
                  Para registrar um chamado relatado por telefone ou presencialmente. Campos com{" "}
                  <span className="text-red-600">*</span> são obrigatórios.
                </p>
              </div>
              <button type="button" onClick={fechar} aria-label="Fechar"
                className="grid h-8 w-8 place-items-center rounded text-slate-500 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </header>

            <form ref={refForm} onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
              <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-3.5 overflow-y-auto p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Título <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <input name="titulo" required
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">Descrição</label>
                  <textarea name="descricao" rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Prédio <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <select name="predioId" required value={predioId}
                    onChange={(e) => setPredioId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Selecione…</option>
                    {predios.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Ponto (opcional)</label>
                  <select name="pontoId"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">—</option>
                    {pontosDoPredio.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Natureza <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <select name="natureza" required
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    {NATUREZAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Prioridade</label>
                  <select name="prioridade" defaultValue="MEDIA"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    {PRIORIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Nome de quem relatou <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <input name="solicitanteNome" required
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Contato (telefone/ramal)</label>
                  <input name="solicitanteContato"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>
              </div>

              {erro && (
                <p role="alert" className="mx-5 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {erro}
                </p>
              )}

              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
                <button type="button" onClick={fechar}
                        className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button disabled={ocupado}
                        className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-semibold text-white
                                   transition hover:bg-marinho-800 disabled:opacity-60">
                  {ocupado ? "Registrando…" : "Registrar solicitação"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
