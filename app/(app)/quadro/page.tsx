import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { num, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Selo, Painel } from "@/components/ui";
import { CORES_PONTO } from "@/components/icones";
import { Empilhada, BarrasNav } from "@/components/graficos";
import Mover from "./mover";
import NovaSolicitacao from "./nova";

export const dynamic = "force-dynamic";

const COLUNAS = [
  { k: "ABERTA",      t: "Recebidas",     cor: "border-sky-400",    fundo: "bg-sky-50" },
  { k: "TRIAGEM",     t: "Em triagem",    cor: "border-violet-400", fundo: "bg-violet-50" },
  { k: "EM_EXECUCAO", t: "Em execução",   cor: "border-amber-400",  fundo: "bg-amber-50" },
  { k: "CONCLUIDA",   t: "Concluídas",    cor: "border-emerald-400",fundo: "bg-emerald-50" },
];

const COR_NAT: Record<string, string> = {
  LIMPEZA: "#0891b2", MANUTENCAO: "#1e3a5f", SEGURANCA: "#6d28d9",
  TI: "#334155", JARDINAGEM: "#15803d", FROTA: "#b45309", OUTRO: "#64748b",
};
const COR_COL: Record<string, string> = {
  ABERTA: "#0284c7", TRIAGEM: "#7c3aed", EM_EXECUCAO: "#d97706", CONCLUIDA: "#059669",
};

export default async function Quadro({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const natSel = sp.natureza ?? null;

  const [itens, predios, pontos] = await Promise.all([
    consultar(ctx, `
      select s.id, s.numero, s.titulo, s.descricao, s.situacao, s.prioridade, s.natureza,
             s.solicitante_nome, s.criado_em, s.prazo_em, s.origem, s.atendida_em,
             s.avaliacao_solicitante,
             (s.prazo_em < now() and s.situacao not in ('CONCLUIDA','CANCELADA','CONVERTIDA')) as vencida,
             round(extract(epoch from (now() - s.criado_em))/3600.0) as horas_aberta,
             p.nome as predio, p.id as predio_id, pt.nome as ponto, pt.tipo as ponto_tipo
        from manutencao.solicitacao s
        left join manutencao.predio p on p.id = s.predio_id
        left join manutencao.ponto pt on pt.id = s.ponto_id
       where s.excluido_em is null and s.tenant_id = manutencao.tenant_atual()
         and s.criado_em >= now() - interval '60 days'
         and ($1::text is null or s.natureza = $1::text)
       order by (s.prazo_em < now()) desc,
                array_position(array['URGENTE','ALTA','MEDIA','BAIXA'], s.prioridade),
                s.criado_em asc`, [natSel]),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, nome, predio_id from manutencao.ponto
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);

  const porCol = (k: string) => itens.filter((i: any) => i.situacao === k);
  const naturezas = [...new Set(itens.map((i: any) => i.natureza))] as string[];

  // gráfico 1: distribuição pelas 4 fases (recebidas/triagem/execução/concluídas)
  const partesFase = COLUNAS.map((c) => ({
    rotulo: c.t, valor: porCol(c.k).length, cor: COR_COL[c.k],
  }));

  // gráfico 2: por prédio (só o que ainda está em aberto, para priorizar)
  const abertos = (itens as any[]).filter((i) => !["CONCLUIDA", "CANCELADA", "CONVERTIDA"].includes(i.situacao));
  const porPredioMap = new Map<string, number>();
  for (const i of abertos) porPredioMap.set(i.predio ?? "Sem prédio", (porPredioMap.get(i.predio ?? "Sem prédio") ?? 0) + 1);
  const porPredio = [...porPredioMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rotulo, valor]) => ({ rotulo, valor, cor: "#1e3a5f" }));

  // gráfico 3: envelhecimento do que está aberto (30/60/90 dias)
  const buckets = { "até 30 dias": 0, "31 a 60 dias": 0, "61 a 90 dias": 0, "mais de 90 dias": 0 };
  for (const i of abertos) {
    const dias = Number(i.horas_aberta ?? 0) / 24;
    if (dias <= 30) buckets["até 30 dias"]++;
    else if (dias <= 60) buckets["31 a 60 dias"]++;
    else if (dias <= 90) buckets["61 a 90 dias"]++;
    else buckets["mais de 90 dias"]++;
  }
  const cores30 = ["#059669", "#d97706", "#ea580c", "#dc2626"];
  const partesIdade = Object.entries(buckets).map(([rotulo, valor], i) => ({ rotulo, valor, cor: cores30[i]! }));

  return (
    <div className="space-y-5">
      <Titulo titulo="Quadro de atividades"
        sub="Chamados abertos pelos usuários dos prédios, da triagem até a conclusão."
        acao={<NovaSolicitacao predios={predios as any} pontos={pontos as any} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Recebidas · triagem · execução · concluídas">
          <Empilhada partes={partesFase} />
        </Painel>
        <Painel titulo="Em aberto por prédio">
          <BarrasNav formato="numero" dados={porPredio} />
        </Painel>
        <Painel titulo="Tempo em aberto">
          <Empilhada partes={partesIdade} />
          <p className="mt-2 text-[11px] text-slate-500">
            Considera apenas o que ainda não foi concluído nem cancelado.
          </p>
        </Painel>
      </div>

      {naturezas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/quadro"
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition
              ${!natSel ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            Todas as naturezas
          </Link>
          {naturezas.map((n) => (
            <Link key={n} href={`/quadro?natureza=${n}`}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition
                ${natSel === n ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: COR_NAT[n] ?? "#64748b" }} />
              {rotulo(n)}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUNAS.map((col) => {
          const lista = porCol(col.k);
          const atrasadas = lista.filter((i: any) => i.vencida).length;
          return (
            <section key={col.k} className={`rounded-xl border-t-4 ${col.cor} bg-slate-50/70 p-3`}>
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">{col.t}</h2>
                <div className="flex items-center gap-1.5">
                  {atrasadas > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      {atrasadas} fora do prazo
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
                    {lista.length}
                  </span>
                </div>
              </header>

              <ul className="space-y-2">
                {lista.slice(0, 25).map((s: any) => (
                  <li key={s.id}
                      className={`rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md
                        ${s.vencida ? "border-l-4 border-l-red-500 border-slate-200" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/solicitacoes/${s.id}`} className="font-mono text-[10px] text-slate-400 hover:underline">
                        {s.numero}
                      </Link>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: COR_NAT[s.natureza] ?? "#64748b" }}>
                        {rotulo(s.natureza)}
                      </span>
                    </div>
                    <Link href={`/solicitacoes/${s.id}`}
                      className="mt-1 block text-sm font-medium leading-snug text-slate-800 hover:text-marinho-700 hover:underline">
                      {s.titulo}
                    </Link>
                    {s.descricao && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{s.descricao}</p>
                    )}
                    {s.ponto && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full"
                              style={{ background: CORES_PONTO[s.ponto_tipo] ?? "#64748b" }} />
                        {s.ponto}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {s.predio} · {s.solicitante_nome}
                      {s.origem === "QRCODE" && <span className="ml-1 font-medium text-marinho-600">QR</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      aberta em {dataHora(s.criado_em)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Selo v={s.prioridade} />
                      <span className={`text-[10px] font-medium tabular-nums
                        ${s.vencida ? "text-red-600" : "text-slate-400"}`}>
                        {num(s.horas_aberta)} h aberta
                      </span>
                    </div>
                    {s.situacao !== "CONCLUIDA" && (
                      <Mover id={s.id} situacao={s.situacao} />
                    )}
                    {s.avaliacao_solicitante && (
                      <p className="mt-1.5 text-[10px] text-emerald-600">
                        {"★".repeat(Number(s.avaliacao_solicitante))} avaliação do solicitante
                      </p>
                    )}
                  </li>
                ))}
                {lista.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">
                    Nenhum chamado
                  </li>
                )}
                {lista.length > 25 && (
                  <li className="py-2 text-center text-xs text-slate-500">
                    + {lista.length - 25} não exibidos
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
