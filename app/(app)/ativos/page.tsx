import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, num, data, rotulo } from "@/lib/fmt";
import { Titulo, Selo } from "@/components/ui";
import { IconeCategoria, catCor, CORES_CATEGORIA } from "@/components/icones";

export const dynamic = "force-dynamic";

const COR_SIT: Record<string, string> = {
  OPERANTE: "bg-emerald-500", EM_MANUTENCAO: "bg-amber-500",
  PARADO: "bg-red-500", BAIXADO: "bg-slate-400",
};

export default async function Ativos({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const busca = (sp.q ?? "").trim();
  const cat = sp.categoria ?? null;
  const predio = sp.predio ?? null;
  const situacao = sp.situacao ?? null;
  const agrupar = sp.agrupar ?? "categoria";

  const [linhas, cats, predios] = await Promise.all([
    consultar(ctx, `
      select a.id, a.nome, a.codigo, a.tombamento, a.categoria, a.situacao, a.criticidade,
             a.pavimento, a.localizacao, a.fabricante, a.modelo, a.valor_aquisicao,
             a.codigo_publico, a.garantia_ate,
             p.nome as predio, p.id as predio_id, s.nome as setor,
             i.ordens, i.corretivas, i.em_aberto, i.custo_total, i.custo_medio,
             i.horas_medias, i.ultima_manutencao,
             (select count(*) from manutencao.controle c
               where c.ativo_id = a.id and c.excluido_em is null
                 and c.situacao in ('VENCIDO','A_VENCER'))               as controles_alerta,
             (select min(c.proxima_data) from manutencao.controle c
               where c.ativo_id = a.id and c.excluido_em is null
                 and c.situacao in ('VENCIDO','A_VENCER'))               as proximo_vencimento,
             (select an.chave from manutencao.anexo an
               where an.entidade = 'ativo' and an.entidade_id = a.id
                 and an.categoria = 'FOTO' and an.excluido_em is null
               order by an.criado_em desc limit 1)                       as foto
        from manutencao.ativo a
        left join manutencao.predio p on p.id = a.predio_id
        left join manutencao.setor s on s.id = a.setor_id
        left join manutencao.vw_indicador_ativo i on i.ativo_id = a.id
       where a.excluido_em is null
         and ($1 = '' or a.nome ilike '%'||$1||'%' or a.codigo ilike '%'||$1||'%'
              or a.tombamento ilike '%'||$1||'%')
         and ($2::text is null or a.categoria = $2::text)
         and ($3::uuid is null or a.predio_id = $3::uuid)
         and ($4::text is null or a.situacao = $4::text)
       order by a.categoria, a.nome`, [busca, cat, predio, situacao]),
    consultar(ctx, `select categoria, count(*)::int as total from manutencao.ativo
                     where excluido_em is null group by 1 order by 2 desc`),
    consultar(ctx, `select id, nome from manutencao.predio where excluido_em is null order by nome`),
  ]);

  const grupos = new Map<string, any[]>();
  for (const a of linhas as any[]) {
    const chave = agrupar === "predio" ? (a.predio ?? "Sem prédio") : (a.categoria ?? "OUTRO");
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(a);
  }

  const qs = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const base: Record<string, any> = { q: busca || null, categoria: cat, predio, situacao, agrupar, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, String(v));
    return `/ativos?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <Titulo titulo="Ativos" sub={`${linhas.length} equipamento(s) sob gestão.`}
        acao={
          <div className="flex gap-1">
            {[["categoria","Por categoria"],["predio","Por prédio"]].map(([k,l]) => (
              <Link key={k} href={qs({ agrupar: k })}
                className={`rounded px-3 py-1.5 text-xs font-medium transition
                  ${agrupar === k ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {l}
              </Link>
            ))}
          </div>
        } />

      <form className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input name="q" defaultValue={busca} placeholder="Nome, código ou tombamento"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input type="hidden" name="agrupar" value={agrupar} />
        <select name="categoria" defaultValue={cat ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as categorias</option>
          {cats.map((c: any) => (
            <option key={c.categoria} value={c.categoria}>
              {CORES_CATEGORIA[c.categoria]?.nome ?? rotulo(c.categoria)} ({c.total})
            </option>
          ))}
        </select>
        <select name="predio" defaultValue={predio ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos os prédios</option>
          {predios.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select name="situacao" defaultValue={situacao ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {["OPERANTE","EM_MANUTENCAO","PARADO","BAIXADO"].map((s) =>
            <option key={s} value={s}>{rotulo(s)}</option>)}
        </select>
        <button className="rounded-md bg-marinho-700 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800">
          Filtrar
        </button>
      </form>

      {[...grupos.entries()].map(([chave, itens]) => {
        const c = agrupar === "categoria" ? catCor(chave) : { bg: "#e2e8f0", fg: "#1e3a5f", nome: chave };
        const custoGrupo = itens.reduce((s, a) => s + Number(a.custo_total ?? 0), 0);
        return (
          <section key={chave}>
            <header className="mb-2.5 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg p-1.5" style={{ background: c.bg }}>
                <IconeCategoria categoria={agrupar === "categoria" ? chave : "OUTRO"} className="block h-full w-full" />
              </span>
              <h2 className="text-sm font-semibold text-marinho-900">
                {agrupar === "categoria" ? (CORES_CATEGORIA[chave]?.nome ?? rotulo(chave)) : chave}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                {itens.length}
              </span>
              <span className="text-xs text-slate-500">· {brl(custoGrupo)} em manutenção acumulada</span>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {itens.map((a: any) => {
                const cc = catCor(a.categoria);
                return (
                  <Link key={a.id} href={`/ativos/${a.id}`}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm
                               transition hover:-translate-y-1 hover:border-marinho-300 hover:shadow-lg">
                    <div className="flex items-start gap-3 p-4">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl p-2.5 transition
                                       group-hover:scale-110"
                            style={{ background: cc.bg }}>
                        <IconeCategoria categoria={a.categoria} className="block h-full w-full" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{a.nome}</p>
                          <span aria-hidden title={rotulo(a.situacao)}
                                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${COR_SIT[a.situacao] ?? "bg-slate-300"}`} />
                        </div>
                        <p className="truncate font-mono text-[11px] text-slate-400">{a.codigo}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {a.predio}{a.setor ? ` · ${a.setor}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                      <div className="px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Ordens</p>
                        <p className="text-sm font-bold tabular-nums text-slate-700">{num(a.ordens)}</p>
                      </div>
                      <div className="px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Custo</p>
                        <p className="text-sm font-bold tabular-nums text-slate-700">
                          {Number(a.custo_total) >= 1000
                            ? `${num(Number(a.custo_total) / 1000, 1)}k`
                            : num(a.custo_total)}
                        </p>
                      </div>
                      <div className="px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Tempo méd.</p>
                        <p className="text-sm font-bold tabular-nums text-slate-700">
                          {a.horas_medias ? `${num(a.horas_medias, 0)}h` : "—"}
                        </p>
                      </div>
                    </div>

                    {(Number(a.em_aberto) > 0 || Number(a.controles_alerta) > 0) && (
                      <div className="flex flex-wrap gap-1 border-t border-slate-100 px-3 py-2">
                        {Number(a.em_aberto) > 0 && (
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                            {num(a.em_aberto)} OS aberta(s)
                          </span>
                        )}
                        {Number(a.controles_alerta) > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            {num(a.controles_alerta)} vencimento(s) · {data(a.proximo_vencimento)}
                          </span>
                        )}
                        {a.criticidade === "ALTA" && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                            criticidade alta
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {linhas.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white py-14 text-center text-slate-500">
          Nenhum ativo encontrado com esses filtros.
        </p>
      )}
    </div>
  );
}
