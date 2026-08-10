"use client";
import { useEffect, useState } from "react";
import { CHAVE_TEMA, CHAVE_MENU } from "@/lib/aparencia";

/* ---------------------------------------------------------------------------
   Controles de aparencia (tema e menu lateral).

   A preferencia fica em localStorage e e reaplicada por um script inline no
   <head> (ver app/layout.tsx + lib/aparencia.ts) ANTES da primeira pintura —
   sem isso a tela pisca branco antes de escurecer.
--------------------------------------------------------------------------- */

export function BotaoTema() {
  const [escuro, setEscuro] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle("dark", novo);
    try { localStorage.setItem(CHAVE_TEMA, novo ? "escuro" : "claro"); } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      title={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="grid h-8 w-8 place-items-center rounded border border-white/25 text-white/90
                 transition hover:bg-white/10"
    >
      {!montado ? (
        <span className="block h-4 w-4" />
      ) : escuro ? (
        // sol
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        // lua
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function BotaoMenu() {
  const [recolhido, setRecolhido] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setRecolhido(document.documentElement.classList.contains("menu-recolhido"));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !recolhido;
    setRecolhido(novo);
    document.documentElement.classList.toggle("menu-recolhido", novo);
    try { localStorage.setItem(CHAVE_MENU, novo ? "recolhido" : "aberto"); } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={recolhido}
      title={recolhido ? "Expandir menu lateral" : "Recolher menu lateral"}
      aria-label={recolhido ? "Expandir menu lateral" : "Recolher menu lateral"}
      className="hidden h-8 w-8 place-items-center rounded border border-white/25 text-white/90
                 transition hover:bg-white/10 lg:grid"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        {montado && recolhido
          ? <path d="M13 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M18 9l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  );
}

/* O script anti-flash vive em lib/aparencia.ts — ver comentario la. */
