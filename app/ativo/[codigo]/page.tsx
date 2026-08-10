import { notFound } from "next/navigation";
import { ativoPorTokenPublico } from "@/lib/servicos/acoes";
import FormChamado from "./form";

export const dynamic = "force-dynamic";

export default async function AtivoPublico({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const a: any = await ativoPorTokenPublico(codigo);
  if (!a) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="rounded-t-lg bg-marinho-900 p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-institucional-500">
          {a.tribunal}
        </p>
        <h1 className="mt-1 text-lg font-semibold leading-snug">{a.tribunal_nome}</h1>
        <p className="mt-0.5 text-sm text-white/70">Consulta pública de ativo</p>
      </header>

      <section className="border-x border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-marinho-900">{a.nome}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Código", a.codigo],
            ["Tombamento", a.tombamento],
            ["Categoria", a.categoria],
            ["Situação", a.situacao?.replace(/_/g, " ")],
            ["Prédio", a.predio],
            ["Setor", a.setor],
            ["Pavimento", a.pavimento],
            ["Localização", a.localizacao],
            ["Fabricante", a.fabricante],
            ["Modelo", a.modelo],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-slate-800">{(v as string) || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-b-lg border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-marinho-900">Abrir chamado de manutenção</h2>
        <p className="mt-1 text-sm text-slate-600">
          Qualquer servidor pode registrar uma ocorrência deste equipamento sem precisar de
          senha. O chamado entra na fila da Divisão de Manutenção e Obras.
        </p>
        <FormChamado codigo={codigo} />
      </section>

      <p className="mt-4 text-center text-xs text-slate-500">
        Nexum Engenharia e Tecnologia · Gestão de Manutenção Predial
      </p>
    </main>
  );
}
