import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { num, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel } from "@/components/ui";
import { CORES_PONTO } from "@/components/icones";
import { Rosca } from "@/components/graficos";

export const dynamic = "force-dynamic";

export default async function Pontos({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const predioSel = sp.predio ?? null;

  const [pontos, predios, porTipo] = await Promise.all([
    consultar(ctx, `
      select pt.id, pt.nome, pt.codigo, pt.codigo_publico, pt.tipo, pt.pavimento,
             pt.localizacao, pt.publico_alvo, pt.ativo,
             p.nome as predio, s.nome as setor,
             (select count(*) from manutencao.solicitacao so
               where so.ponto_id = pt.id and so.excluido_em is null)                as chamados,
             (select count(*) from manutencao.solicitacao so
               where so.ponto_id = pt.id and so.excluido_em is null
                 and so.situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO'))             as abertos,
             (select max(so.criado_em) from manutencao.solicitacao so
               where so.ponto_id = pt.id and so.excluido_em is null)                as ultimo_chamado
        from manutencao.ponto pt
        left join manutencao.predio p on p.id = pt.predio_id
        left join manutencao.setor s on s.id = pt.setor_id
       where pt.excluido_em is null and pt.tenant_id = manutencao.tenant_atual()
         and ($1::uuid is null or pt.predio_id = $1::uuid)
       order by p.nome, pt.tipo, pt.nome`, [predioSel]),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select tipo, count(*)::int as total from manutencao.ponto
                     where excluido_em is null and tenant_id = manutencao.tenant_atual()
                     group by 1 order by 2 desc`),
  ]);

  const comChamado = (pontos as any[]).filter((p) => Number(p.abertos) > 0).length;

  return (
    <div className="space-y-5">
      <Titulo titulo="Pontos com QR Code"
        sub="Locais de uso comum onde qualquer pessoa pode reportar um problema lendo o QR, sem login." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { r: "Pontos cadastrados", v: num(pontos.length) },
          { r: "Com chamado aberto", v: num(comChamado) },
          { r: "Chamados no total", v: num((pontos as any[]).reduce((s, p) => s + Number(p.chamados), 0)) },
          { r: "Abertos agora", v: num((pontos as any[]).reduce((s, p) => s + Number(p.abertos), 0)) },
        ].map((k) => (
          <div key={k.r} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.r}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-marinho-900">{k.v}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Pontos por tipo">
          <Rosca centroRotulo="pontos"
            dados={porTipo.map((t: any) => ({
              rotulo: rotulo(t.tipo), valor: Number(t.total),
              cor: CORES_PONTO[t.tipo] ?? "#64748b",
            }))} />
        </Painel>

        <div className="lg:col-span-2">
          <Painel titulo="Filtrar por prédio">
            <div className="flex flex-wrap gap-1.5">
              <Link href="/pontos"
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition
                  ${!predioSel ? "bg-marinho-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                Todos
              </Link>
              {predios.map((p: any) => (
                <Link key={p.id} href={`/pontos?predio=${p.id}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition
                    ${predioSel === p.id ? "bg-marinho-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {p.nome}
                </Link>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-marinho-50 p-3 text-xs leading-relaxed text-marinho-900">
              <strong>Como funciona na prática:</strong> imprima o QR de cada ponto e fixe no local.
              Quem encontrar um problema aponta a câmera, escolhe entre limpeza, manutenção ou
              segurança, descreve em uma linha e recebe o protocolo. O chamado entra no
              {" "}<Link href="/quadro" className="font-semibold underline">quadro de atividades</Link>{" "}
              da equipe certa, com prazo próprio por natureza — a zeladoria responde em 8h,
              a manutenção em 24h.
            </div>
          </Painel>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {(pontos as any[]).map((p) => {
          const cor = CORES_PONTO[p.tipo] ?? "#64748b";
          return (
            <article key={p.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="flex items-start gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                      style={{ background: cor }}>
                  {p.tipo.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{p.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.predio}{p.pavimento ? ` · ${p.pavimento}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">{p.codigo}</p>
                </div>
                {Number(p.abertos) > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {num(p.abertos)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <div className="text-[11px] text-slate-500">
                  <p>{num(p.chamados)} chamado(s) no histórico</p>
                  {p.ultimo_chamado && <p className="text-slate-400">último {dataHora(p.ultimo_chamado)}</p>}
                </div>
                <a href={`/ponto/${p.codigo_publico}`} target="_blank" rel="noopener"
                  className="shrink-0 rounded-md bg-marinho-700 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-marinho-800">
                  Abrir QR
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {pontos.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white py-14 text-center text-slate-500">
          Nenhum ponto cadastrado neste filtro.
        </p>
      )}
    </div>
  );
}
