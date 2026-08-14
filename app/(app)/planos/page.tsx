import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import * as q from "@/lib/servicos/consultas";
import { Selo, Tabela, Td, Titulo } from "@/components/ui";
import { brl, data } from "@/lib/fmt";
import { pode } from "@/lib/auth";
import Cadastro from "@/components/cadastro";
import { camposPlano } from "@/components/campos";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const ctx = await contexto();
  const [lista, predios, contratadas, checklists] = await Promise.all([
    q.listarPlanos(ctx),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, razao_social as nome from manutencao.contratada
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by razao_social`),
    consultar(ctx, `select id, nome from manutencao.checklist_modelo
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);
  const pmoc = lista.filter((p: any) => p.tipo === "PMOC").length;
  const podeEditar = pode(ctx.sessao.papel, "cadastro.editar");
  const campos = camposPlano(predios as any, contratadas as any, checklists as any);

  return (
    <>
      <Titulo titulo="Planos de manutenção e PMOC"
              sub={`${lista.length} planos ativos, dos quais ${pmoc} são PMOC (Portaria nº 3.523/MS)`}
              acao={podeEditar && <Cadastro entidade="plano" titulo="Plano" campos={campos} />} />

      <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
        <strong>PMOC.</strong> Os planos do tipo PMOC geram ordens com o checklist da
        Portaria nº 3.523/1998 do Ministério da Saúde já vinculado — limpeza de filtros,
        bandeja de condensado, medição de temperatura de insuflamento, corrente do
        compressor e vazão de ar exterior de renovação.
      </div>

      <Tabela cols={["Plano", "Tipo", "Periodicidade", "Prédio", "Contratada", "Checklist / Norma", "Próxima execução", "SLA (h)", "Custo estimado", ""]}
              vazio={lista.length === 0}>
        {lista.map((p: any) => {
          const proximo = p.proxima_execucao &&
            new Date(p.proxima_execucao) <= new Date(Date.now() + 15 * 864e5);
          return (
            <tr key={p.id} className={proximo ? "bg-sky-50/60" : "hover:bg-slate-50"}>
              <Td className="max-w-[240px] truncate font-medium">{p.nome}</Td>
              <Td><Selo v={p.tipo} /></Td>
              <Td className="text-xs">{p.periodicidade}</Td>
              <Td className="max-w-[160px] truncate">{p.predio}</Td>
              <Td className="max-w-[180px] truncate">{p.contratada}</Td>
              <Td className="text-xs">
                {p.checklist ? <><span className="block">{p.checklist}</span>
                  <span className="block text-slate-500">{p.norma}</span></> : null}
              </Td>
              <Td className="whitespace-nowrap tabular-nums">{data(p.proxima_execucao)}</Td>
              <Td className="tabular-nums">{p.prazo_sla_horas}</Td>
              <Td className="tabular-nums">{p.custo_estimado ? brl(p.custo_estimado) : null}</Td>
              <Td>
                {podeEditar && (
                  <Cadastro entidade="plano" titulo="Plano" campos={campos} registro={p}
                            gatilho="Editar" variante="discreto" />
                )}
              </Td>
            </tr>
          );
        })}
      </Tabela>
    </>
  );
}
