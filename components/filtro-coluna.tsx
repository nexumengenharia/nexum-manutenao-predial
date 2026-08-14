"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* Filtro estilo Excel embutido no cabecalho da coluna: clica no funil, escolhe
   um valor da lista (ou "Todos"), a URL muda e a lista recarrega filtrada.
   Fica junto do nome da coluna em vez de um formulario separado no topo —
   e onde o usuario de planilha espera encontrar o filtro. */

export default function FiltroColuna({ campo, rotulo, opcoes }: {
  campo: string; rotulo: string; opcoes: { v: string; t: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const ativo = sp.get(campo);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  function aplicar(valor: string | null) {
    const p = new URLSearchParams(sp.toString());
    if (valor) p.set(campo, valor); else p.delete(campo);
    router.push(`?${p.toString()}`);
    setAberto(false);
  }

  return (
    <span className="relative inline-flex items-center gap-1" ref={ref}>
      {rotulo}
      <button type="button" onClick={() => setAberto((v) => !v)}
        aria-label={`Filtrar por ${rotulo}`}
        className={`grid h-4 w-4 place-items-center rounded-sm transition
          ${ativo ? "bg-marinho-700 text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"}`}>
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
          <path d="M1 2h14l-5.5 6.5V14l-3-1.5V8.5z" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute left-0 top-6 z-20 w-44 rounded-md border border-slate-200 bg-white p-1 text-left normal-case shadow-lg">
          <button type="button" onClick={() => aplicar(null)}
            className={`block w-full rounded px-2 py-1.5 text-left text-xs font-medium hover:bg-slate-100
              ${!ativo ? "text-marinho-700" : "text-slate-600"}`}>
            (Todos)
          </button>
          <div className="my-1 border-t border-slate-100" />
          {opcoes.map((o) => (
            <button key={o.v} type="button" onClick={() => aplicar(o.v)}
              className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs font-medium hover:bg-slate-100
                ${ativo === o.v ? "bg-marinho-50 text-marinho-700" : "text-slate-600"}`}>
              {o.t}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
