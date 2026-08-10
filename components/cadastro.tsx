"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------------------------------------------------------------------------
   Formulario de cadastro em painel lateral.

   Um so componente atende criar e editar de todas as entidades: a diferenca
   entre as telas e o array de campos, nao o codigo. Painel lateral em vez de
   pagina nova porque o gestor cadastra olhando a lista — tirar ele da lista
   para voltar depois e o caminho mais rapido para o cadastro nao acontecer.
--------------------------------------------------------------------------- */

export type CampoDef = {
  nome: string;
  rotulo: string;
  tipo?: "texto" | "numero" | "data" | "selecao" | "area" | "sim_nao";
  obrigatorio?: boolean;
  opcoes?: { v: string; t: string }[];
  ajuda?: string;
  largura?: "cheia" | "meia";
  passo?: string;
  padrao?: string;
};

export function Cadastro({
  entidade, titulo, campos, registro, gatilho, variante = "principal", aoFechar,
}: {
  entidade: string;
  titulo: string;
  campos: CampoDef[];
  registro?: Record<string, any> | null;
  gatilho?: React.ReactNode;
  /** "discreto" para o botao que vive dentro de uma linha de tabela. */
  variante?: "principal" | "discreto";
  aoFechar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const refForm = useRef<HTMLFormElement>(null);
  const editando = Boolean(registro?.id);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aberto]);

  function fechar() { setAberto(false); setErro(null); aoFechar?.(); }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    const dados: Record<string, any> = {};
    for (const c of campos) {
      dados[c.nome] = c.tipo === "sim_nao" ? f.get(c.nome) === "on" : (f.get(c.nome) ?? "");
    }
    if (registro?.id) dados.id = registro.id;

    try {
      const r = await fetch(`/api/cadastros/${entidade}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dados),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível salvar."); return; }
      fechar();
      router.refresh();
    } catch { setErro("Falha de comunicação. Tente novamente."); }
    finally { setOcupado(false); }
  }

  /* O driver do Postgres devolve colunas `date` como objeto Date. String(Date)
     produz "Wed Jan 01 2027 ..." — recortar isso em 10 caracteres nao gera
     "AAAA-MM-DD" e o input[type=date] descarta o valor, deixando o campo vazio
     na edicao. Por isso a data e normalizada em UTC antes de virar texto. */
  const valor = (c: CampoDef) => {
    const v = registro?.[c.nome];
    if (v === null || v === undefined || v === "") return c.padrao ?? "";
    if (c.tipo === "data") {
      const d = v instanceof Date ? v : new Date(String(v));
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
      }
      return String(v).slice(0, 10);
    }
    return String(v);
  };

  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        className={variante === "discreto"
          ? "rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          : "rounded-md bg-marinho-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-marinho-800"}>
        {gatilho ?? (editando ? "Editar" : `Novo ${titulo.toLowerCase()}`)}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true"
             aria-label={`${editando ? "Editar" : "Novo"} ${titulo}`}>
          <button type="button" aria-label="Fechar" onClick={fechar}
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />

          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-marinho-900">
                  {editando ? `Editar ${titulo.toLowerCase()}` : `Novo ${titulo.toLowerCase()}`}
                </h2>
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
                {campos.map((c) => {
                  const id = `${entidade}-${c.nome}`;
                  const classe = c.largura === "cheia" || c.tipo === "area" ? "sm:col-span-2" : "";
                  const entrada =
                    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

                  return (
                    <div key={c.nome} className={classe}>
                      <label htmlFor={id} className="block text-xs font-medium text-slate-600">
                        {c.rotulo}{c.obrigatorio && <span className="text-red-600" aria-hidden> *</span>}
                      </label>

                      {c.tipo === "selecao" ? (
                        <select id={id} name={c.nome} defaultValue={valor(c)} required={c.obrigatorio}
                                className={entrada}>
                          <option value="">{c.obrigatorio ? "Selecione…" : "—"}</option>
                          {c.opcoes?.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                        </select>
                      ) : c.tipo === "area" ? (
                        <textarea id={id} name={c.nome} rows={3} defaultValue={valor(c)}
                                  required={c.obrigatorio} className={entrada} />
                      ) : c.tipo === "sim_nao" ? (
                        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                          <input id={id} name={c.nome} type="checkbox"
                                 defaultChecked={registro ? Boolean(registro[c.nome]) : c.padrao !== "nao"}
                                 className="h-4 w-4 rounded border-slate-300" />
                          Sim
                        </label>
                      ) : (
                        <input id={id} name={c.nome} defaultValue={valor(c)} required={c.obrigatorio}
                               type={c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text"}
                               step={c.tipo === "numero" ? (c.passo ?? "any") : undefined}
                               className={entrada} />
                      )}

                      {c.ajuda && <p className="mt-1 text-[11px] text-slate-500">{c.ajuda}</p>}
                    </div>
                  );
                })}
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
                  {ocupado ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Cadastro;
