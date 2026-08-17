import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar, consultarUm } from "@/lib/db";
import { num, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Selo, Painel } from "@/components/ui";
import { CORES_PONTO } from "@/components/icones";
import { Rosca, BarrasVerticais } from "@/components/graficos";
import NovaSolicitacao from "./nova";
import Triar from "./triar";

export const dynamic = "force-dynamic";

/* /quadro agora e SO triagem: lista as solicitacoes que ainda nao viraram OS
   e apresenta o formulario de triagem inline. Clicar num card abre ele no
   formulario acima da lista. A OS nasce dai; a etapa de execucao vive em
   /execucao (rota /solicitacoes renomeada no menu). */

const COR_NAT: Record<string, string> = {
  LIMPEZA: "#0891b2", MANUTENCAO: "#1e3a5f", SEGURANCA: "#6d28d9",
  TI: "#334155", JARDINAGEM: "#15803d", FROTA: "#b45309", OUTRO: "#64748b",
};
const COR_PRIO: Record<string, string> = {
  URGENTE: "#dc2626", ALTA: "#ea580c", MEDIA: "#0284c7", BAIXA: "#059669",
};

export default async function Quadro({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const natSel = sp.natureza ?? null;
  const selId = typeof sp.sel === "string" && /^[0-9a-f-]{36}$/i.test(sp.sel) ? sp.sel : null;

  const [pendentes, predios, pontos, contratadas, sel] = await Promise.all([
    consultar(ctx, `
      select s.id, s.numero, s.titulo, s.descricao, s.prioridade, s.natureza,
             s.solicitante_nome, s.criado_em, s.prazo_em, s.origem,
             (s.prazo_em < now()) as vencida,
             round(extract(epoch from (now() - s.criado_em))/3600.0) as horas_aberta,
             p.nome as predio, pt.nome as ponto, pt.tipo as ponto_tipo
        from manutencao.solicitacao s
        left join manutencao.predio p on p.id = s.predio_id
        left join manutencao.ponto pt on pt.id = s.ponto_id
       where s.excluido_em is null and s.tenant_id = manutencao.tenant_atual()
         and s.situacao in ('ABERTA','TRIAGEM')
         and ($1::text is null or s.natureza = $1::text)
       order by (s.prazo_em < now()) desc,
                array_position(array['URGENTE','ALTA','MEDIA','BAIXA'], s.prioridade),
                s.criado_em asc`, [natSel]),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, nome, predio_id from manutencao.ponto
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, razao_social as nome from manutencao.contratada
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by razao_social`),
    selId ? consultarUm(ctx, `
      select s.id, s.numero, s.titulo, s.descricao, s.prioridade, s.natureza,
             s.solicitante_nome, s.criado_em,
             p.nome as predio, pt.nome as ponto
        from manutencao.solicitacao s
        left join manutencao.predio p on p.id = s.predio_id
        left join manutencao.ponto pt on pt.id = s.ponto_id
       where s.id = $1 and s.tenant_id = manutencao.tenant_atual()`, [selId]) : Promise.resolve(null),
  ]);

  const naturezas = [...new Set(pendentes.map((i: any) => i.natureza))] as string[];

  // grafico 1: por prioridade
  const porPrio = ["URGENTE","ALTA","MEDIA","BAIXA"].map((k) => ({
    rotulo: rotulo(k), valor: pendentes.filter((i: any) => i.prioridade === k).length, cor: COR_PRIO[k]!,
  })).filter((p) => p.valor > 0);

  // grafico 2: por predio (top do que esta esperando)
  const porPredioMap = new Map<string, number>();
  for (const i of pendentes as any[]) porPredioMap.set(i.predio ?? "Sem prédio",
    (porPredioMap.get(i.predio ?? "Sem prédio") ?? 0) + 1);
  const porPredio = [...porPredioMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([rot, v]) => ({ rotulo: rot, valor: v, cor: "#1e3a5f" }));

  // grafico 3: envelhecimento (>30/60/90d aguardando triagem)
  const buckets = { "até 30 dias": 0, "31 a 60 dias": 0, "61 a 90 dias": 0, "mais de 90 dias": 0 };
  for (const i of pendentes as any[]) {
    const dias = Number(i.horas_aberta ?? 0) / 24;
    if (dias <= 30) buckets["até 30 dias"]++;
    else if (dias <= 60) buckets["31 a 60 dias"]++;
    else if (dias <= 90) buckets["61 a 90 dias"]++;
    else buckets["mais de 90 dias"]++;
  }
  const cores30 = ["#059669", "#d97706", "#ea580c", "#dc2626"];
  const partesIdade = Object.entries(buckets).map(([r, v], i) => ({ rotulo: r, valor: v, cor: cores30[i]! }));

  return (
    <div className="space-y-5">
      <Titulo titulo="Quadro de atividades"
        sub={`${pendentes.length} solicitação(ões) aguardando triagem. Clique numa para triar e converter em OS.`}
        acao={<NovaSolicitacao predios={predios as any} pontos={pontos as any} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Pendentes por prioridade">
          <Rosca centroRotulo="pendentes" formato="numero" dados={porPrio} />
        </Painel>
        <Painel titulo="Pendentes por prédio">
          <BarrasVerticais formato="numero" dados={porPredio} />
        </Painel>
        <Painel titulo="Tempo aguardando triagem">
          <Rosca centroRotulo="pendentes" formato="numero" dados={partesIdade} />
        </Painel>
      </div>

      <Triar sel={sel as any} contratadas={contratadas as any} />

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

      <Painel titulo={`Solicitações pendentes (${pendentes.length})`}>
        <ul className="space-y-2">
          {(pendentes as any[]).map((s) => {
            const ativo = selId === s.id;
            return (
              <li key={s.id}>
                <Link href={`/quadro?sel=${s.id}${natSel ? `&natureza=${natSel}` : ""}`} scroll={false}
                  className={`block rounded-lg border p-3 transition
                    ${ativo ? "border-marinho-700 bg-marinho-50 shadow-sm"
                            : s.vencida ? "border-l-4 border-l-red-500 border-slate-200 bg-white hover:border-marinho-300"
                                       : "border-slate-200 bg-white hover:border-marinho-300"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-500">{s.numero}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ background: COR_NAT[s.natureza] ?? "#64748b" }}>
                          {rotulo(s.natureza)}
                        </span>
                        <Selo v={s.prioridade} />
                        {s.origem === "QRCODE" && (
                          <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-900">QR</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">{s.titulo}</p>
                      {s.descricao && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{s.descricao}</p>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        <span>{s.predio}</span>
                        {s.ponto && (
                          <span className="flex items-center gap-1">
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: CORES_PONTO[s.ponto_tipo] ?? "#64748b" }} />
                            {s.ponto}
                          </span>
                        )}
                        <span>· {s.solicitante_nome}</span>
                        <span>· aberta em {dataHora(s.criado_em)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold tabular-nums
                        ${s.vencida ? "text-red-600" : "text-slate-700"}`}>
                        {num(s.horas_aberta)} h
                      </p>
                      {ativo && <p className="text-[10px] font-semibold text-marinho-700">selecionada ↑</p>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {pendentes.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
              Nenhuma solicitação aguardando triagem. Fila zerada.
            </li>
          )}
        </ul>
      </Painel>
    </div>
  );
}
