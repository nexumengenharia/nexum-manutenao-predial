import { notFound } from "next/navigation";
import { semContexto } from "@/lib/db";
import FormPonto from "./form";

export const dynamic = "force-dynamic";

/** Pagina publica lida pelo QR fixado no local. Sem login, por desenho:
    quem passa no corredor tem que conseguir reportar em 20 segundos. */
export default async function PontoPublico({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const p: any = await semContexto(async (c) => {
    const { rows } = await c.query(
      `select pt.id, pt.nome, pt.tipo, pt.pavimento, pt.localizacao, pt.codigo,
              pr.nome as predio, s.nome as setor, t.sigla, t.nome as tribunal_nome
         from manutencao.ponto pt
         join manutencao.tribunal t on t.id = pt.tenant_id
         left join manutencao.predio pr on pr.id = pt.predio_id
         left join manutencao.setor s on s.id = pt.setor_id
        where pt.codigo_publico = $1 and pt.excluido_em is null and pt.ativo`,
      [codigo.toUpperCase()]);
    return rows[0] ?? null;
  });
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <header className="rounded-t-2xl bg-marinho-900 p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-institucional-500">
          {p.sigla}
        </p>
        <h1 className="mt-1 text-base font-semibold leading-snug">{p.tribunal_nome}</h1>
      </header>

      <section className="border-x border-slate-200 bg-white px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Você está em</p>
        <h2 className="mt-0.5 text-xl font-semibold text-marinho-900">{p.nome}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {p.predio}{p.pavimento ? ` · ${p.pavimento}` : ""}{p.setor ? ` · ${p.setor}` : ""}
        </p>
        {p.localizacao && <p className="text-xs text-slate-500">{p.localizacao}</p>}
      </section>

      <section className="rounded-b-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-marinho-900">Encontrou algum problema aqui?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registre em poucos segundos, sem precisar de senha. O chamado vai direto para a
          equipe responsável e você recebe um número de protocolo.
        </p>
        <FormPonto codigo={codigo.toUpperCase()} local={p.nome} />
      </section>

      <p className="mt-4 text-center text-xs text-slate-500">
        Nexum Engenharia e Tecnologia · Gestão de Manutenção Predial
      </p>
    </main>
  );
}
