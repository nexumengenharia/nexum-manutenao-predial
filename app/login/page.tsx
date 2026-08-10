import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import FormLogin from "./form";

export default async function Login() {
  if (await sessaoAtual()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-marinho-900 px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl md:grid md:grid-cols-2">
        <div className="hidden bg-marinho-800 p-10 text-white md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-institucional-500">
            Nexum Engenharia e Tecnologia
          </p>
          <h1 className="mt-4 text-2xl font-semibold leading-snug">
            Gestão de Manutenção Predial e Patrimonial
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Controle de manutenções preventivas, preditivas e corretivas; planos PMOC;
            fiscalização com trilha de auditoria; medição e faturamento de contratadas.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-white/80">
            <li>· Multi-entidade com isolamento por tribunal</li>
            <li>· Rastreabilidade completa de alterações</li>
            <li>· Abertura de chamado por QR Code</li>
            <li>· Relatórios de custo por prédio, setor e período</li>
          </ul>
          <p className="mt-10 text-xs text-white/40">
            Versão 1.0 · Ambiente de demonstração
          </p>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-lg font-semibold text-marinho-900">Acesso ao sistema</h2>
          <p className="mt-1 text-sm text-slate-600">
            Identifique-se com seu e-mail funcional e senha pessoal.
          </p>
          <FormLogin />
        </div>
      </div>
    </main>
  );
}
