"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Ref = { id: string; nome: string };

const ALVOS = [
  ["ativo", "Ativo (equipamento)"], ["predio", "Prédio"], ["contratada", "Contratada"],
  ["veiculo", "Veículo"], ["ponto", "Ponto de QR"],
] as const;

export default function NovoControle({ ativos, predios, contratadas, veiculos, pontos }: {
  ativos: Ref[]; predios: Ref[]; contratadas: Ref[]; veiculos: Ref[]; pontos: Ref[];
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [alvoTipo, setAlvoTipo] = useState<typeof ALVOS[number][0]>("ativo");
  const router = useRouter();
  const refForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aberto]);

  function fechar() { setAberto(false); setErro(null); }

  const listasPorAlvo: Record<typeof ALVOS[number][0], Ref[]> = {
    ativo: ativos, predio: predios, contratada: contratadas, veiculo: veiculos, ponto: pontos,
  };

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    const dados = Object.fromEntries(f.entries());
    try {
      const r = await fetch("/api/controles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível cadastrar."); return; }
      fechar();
      router.refresh();
    } catch { setErro("Falha de comunicação. Tente novamente."); }
    finally { setOcupado(false); }
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        className="rounded-md bg-marinho-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-marinho-800">
        Novo controle
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Novo controle">
          <button type="button" aria-label="Fechar" onClick={fechar}
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />

          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-marinho-900">Novo controle de vencimento</h2>
                <p className="text-xs text-slate-500">
                  Campos com <span className="text-red-600">*</span> são obrigatórios.
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
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Aplica-se a <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <select name="alvoTipo" required value={alvoTipo}
                    onChange={(e) => setAlvoTipo(e.target.value as typeof alvoTipo)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    {ALVOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Item <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <select name="alvoId" required
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Selecione…</option>
                    {listasPorAlvo[alvoTipo].map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Nome do controle <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <input name="nome" required placeholder="Ex.: Recarga de extintor, laudo do elevador, seguro do veículo"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tipo <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <input name="tipo" required placeholder="Ex.: EXTINTOR, LAUDO, ALVARA, SEGURO, CONTRATO"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Norma / referência</label>
                  <input name="norma" placeholder="Ex.: NBR 12962"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Última vistoria / aplicação
                  </label>
                  <input name="ultimaData" type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Próxima vistoria / substituição / limpeza <span className="text-red-600" aria-hidden>*</span>
                  </label>
                  <input name="proximaData" type="date" required
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Periodicidade (meses)</label>
                  <input name="periodicidadeMeses" type="number" min="1" step="1"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Custo previsto (R$)</label>
                  <input name="custoPrevisto" type="number" min="0" step="0.01"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                    <input name="geraOrdem" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Gerar Ordem de Serviço automaticamente quando vencer
                  </label>
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
                  {ocupado ? "Salvando…" : "Cadastrar"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
