"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMOS = [
  { r: "Gestor · TJ-AM",  e: "gestor@tjam.demo.br",  s: "Tribunal@2026" },
  { r: "Fiscal · TJ-AM",  e: "fiscal@tjam.demo.br",  s: "Fiscal@2026" },
  { r: "Gestor · TCM-AM", e: "gestor@tcmam.demo.br", s: "Tribunal@2026" },
];

export default function FormLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível entrar."); return; }
      router.push("/");
      router.refresh();
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <form onSubmit={enviar} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
          <input id="email" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm" />
        </div>
        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
          <input id="senha" type="password" required autoComplete="current-password"
            value={senha} onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm" />
        </div>

        {erro && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erro}
          </p>
        )}

        <button type="submit" disabled={carregando}
          className="w-full rounded-md bg-marinho-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marinho-800 disabled:opacity-60">
          {carregando ? "Verificando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Perfis de demonstração
        </p>
        <ul className="mt-2 space-y-1">
          {DEMOS.map((d) => (
            <li key={d.e}>
              <button type="button"
                onClick={() => { setEmail(d.e); setSenha(d.s); }}
                className="w-full rounded px-2 py-1 text-left text-xs text-slate-600 hover:bg-white">
                <span className="font-medium text-slate-800">{d.r}</span> — {d.e}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-2 text-[11px] text-slate-500">
          Entre com os dois tribunais para verificar o isolamento dos dados.
        </p>
      </div>
    </>
  );
}
