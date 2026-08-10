import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { Barras, Painel, Tabela, Td, Titulo } from "@/components/ui";
import { brl, num } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Relatorios() {
  const ctx = await contexto();
  const [mes, predio, setor, tipos, contratadas] = await Promise.all([
    q.custoPorMes(ctx), q.custoPorPredio(ctx), q.custoPorSetor(ctx),
    q.ordensPorTipo(ctx), q.listarContratadas(ctx),
  ]);
  const total = predio.reduce((s: number, p: any) => s + Number(p.custo_total), 0);

  return (
    <>
      <Titulo titulo="Relatórios gerenciais"
        sub={`${ctx.sessao.tribunalNome} — custo total executado: ${brl(total)}`}
        acao={<button form="nada" className="nao-imprimir rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
          Use Ctrl+P para gerar PDF
        </button>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Custo por período (12 meses)">
          <Barras dados={mes.map((m: any) => ({
            rotulo: m.competencia, valor: Number(m.custo_total), detalhe: `${m.ordens} ordens`,
          }))} />
        </Painel>

        <Painel titulo="Custo por prédio">
          <Barras dados={predio.map((p: any) => ({
            rotulo: p.predio_nome, valor: Number(p.custo_total), detalhe: `${p.ordens} ordens`,
          }))} />
        </Painel>
      </div>

      <div className="mt-4">
        <Painel titulo="Custo por setor / centro de custo">
          <Tabela cols={["Setor", "Prédio", "Centro de custo", "Ordens", "Custo total", "% do total"]}
                  vazio={setor.length === 0}>
            {setor.map((s: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td className="font-medium">{s.setor_nome}</Td>
                <Td>{s.predio_nome}</Td>
                <Td className="font-mono text-xs">{s.centro_custo}</Td>
                <Td className="tabular-nums">{s.ordens}</Td>
                <Td className="tabular-nums">{brl(s.custo_total)}</Td>
                <Td className="tabular-nums">{total > 0 ? `${((Number(s.custo_total) / total) * 100).toFixed(1)}%` : "—"}</Td>
              </tr>
            ))}
          </Tabela>
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Painel titulo="Manutenções realizadas por tipo">
          <Tabela cols={["Tipo", "Ordens", "Custo executado", "Custo médio"]} vazio={tipos.length === 0}>
            {tipos.map((t: any) => (
              <tr key={t.tipo} className="hover:bg-slate-50">
                <Td className="font-medium">{t.tipo}</Td>
                <Td className="tabular-nums">{t.total}</Td>
                <Td className="tabular-nums">{brl(t.custo)}</Td>
                <Td className="tabular-nums">{brl(Number(t.custo) / Math.max(t.total, 1))}</Td>
              </tr>
            ))}
          </Tabela>
        </Painel>

        <Painel titulo="Pagamentos e desempenho por contratada">
          <Tabela cols={["Contratada", "Ordens", "Executado", "SLA"]} vazio={contratadas.length === 0}>
            {contratadas.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td className="max-w-[200px] truncate font-medium">{c.razao_social}</Td>
                <Td className="tabular-nums">{c.ordens}</Td>
                <Td className="tabular-nums">{brl(c.executado)}</Td>
                <Td className="tabular-nums">{c.sla != null ? `${num(c.sla, 1)}%` : "—"}</Td>
              </tr>
            ))}
          </Tabela>
        </Painel>
      </div>
    </>
  );
}
