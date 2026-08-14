"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Comentar({ id }: { id: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setOcupado(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/ordens/${id}/comentar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: f.get("texto") }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível salvar."); return; }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch { setErro("Falha de comunicação."); }
    finally { setOcupado(false); }
  }

  return (
    <form onSubmit={enviar} className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
      <textarea name="texto" rows={2} required placeholder="Escreva um comentário sobre o andamento…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div>
        <button disabled={ocupado}
          className="rounded-md bg-marinho-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-marinho-800 disabled:opacity-60">
          {ocupado ? "Enviando…" : "Comentar"}
        </button>
      </div>
    </form>
  );
}
