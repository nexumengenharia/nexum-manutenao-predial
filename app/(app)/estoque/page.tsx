import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import * as q from "@/lib/servicos/consultas";
import { Cartao, Tabela, Td, Titulo } from "@/components/ui";
import { brl, num } from "@/lib/fmt";
import { pode } from "@/lib/auth";
import Cadastro from "@/components/cadastro";
import { camposItemEstoque } from "@/components/campos";
import Movimentar from "./movimentar";

export const dynamic = "force-dynamic";

export default async function Estoque() {
  const ctx = await contexto();
  const [lista, predios] = await Promise.all([
    q.listarEstoque(ctx),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);
  const criticos = lista.filter((i: any) => i.critico).length;
  const valor = lista.reduce((s: number, i: any) => s + Number(i.valor_total ?? 0), 0);
  const podeEditar = pode(ctx.sessao.papel, "cadastro.editar");

  return (
    <>
      <Titulo titulo="Controle de estoque"
              sub="Materiais de manutenção, saldo e ponto de reposição"
              acao={podeEditar && (
                <Cadastro entidade="item_estoque" titulo="Item de estoque"
                          campos={camposItemEstoque(predios as any)} />
              )} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Cartao titulo="Itens cadastrados" valor={num(lista.length)} />
        <Cartao titulo="Itens em nível crítico" valor={num(criticos)}
                tom={criticos > 0 ? "alerta" : "bom"} detalhe="No mínimo ou abaixo dele" />
        <Cartao titulo="Valor imobilizado" valor={brl(valor)} />
      </div>

      <Tabela cols={["Código", "Item", "Categoria", "Local", "Saldo", "Mínimo", "Custo unitário", "Valor total", ""]}
              vazio={lista.length === 0}>
        {lista.map((i: any) => (
          <tr key={i.id} className={i.critico ? "bg-amber-50/70" : "hover:bg-slate-50"}>
            <Td className="font-mono text-xs">{i.codigo}</Td>
            <Td className="font-medium">{i.nome}
              {i.critico && <span className="ml-2 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">repor</span>}
            </Td>
            <Td className="text-xs">{i.categoria}</Td>
            <Td className="max-w-[180px] truncate text-xs">{i.localizacao}</Td>
            <Td className="tabular-nums font-medium">{num(i.quantidade, 0)} {i.unidade}</Td>
            <Td className="tabular-nums text-slate-500">{i.quantidade_minima ? num(i.quantidade_minima, 0) : null}</Td>
            <Td className="tabular-nums">{i.custo_unitario ? brl(i.custo_unitario) : null}</Td>
            <Td className="tabular-nums">{brl(i.valor_total)}</Td>
            <Td>
              {podeEditar && <Movimentar itemId={i.id} nome={i.nome} saldo={Number(i.quantidade)} />}
            </Td>
          </tr>
        ))}
      </Tabela>
    </>
  );
}
