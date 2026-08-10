import Link from "next/link";
import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { Cartao, Selo, Tabela, Td, Titulo } from "@/components/ui";
import { brl, data, num } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Medicoes() {
  const ctx = await contexto();
  const lista = await q.listarMedicoes(ctx);
  const bruto = lista.reduce((s: number, m: any) => s + Number(m.valor_bruto), 0);
  const glosa = lista.reduce((s: number, m: any) => s + Number(m.valor_glosa), 0);
  const pagas = lista.filter((m: any) => m.situacao === "PAGA").length;

  return (
    <>
      <Titulo titulo="Medições e faturamento"
              sub="Fechamento mensal por contratada, atesto da fiscalização e glosas" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao titulo="Medições" valor={num(lista.length)} />
        <Cartao titulo="Valor bruto acumulado" valor={brl(bruto)} />
        <Cartao titulo="Glosas aplicadas" valor={brl(glosa)}
                tom={glosa > 0 ? "alerta" : "neutro"}
                detalhe={bruto > 0 ? `${((glosa / bruto) * 100).toFixed(2)}% do bruto` : undefined} />
        <Cartao titulo="Medições pagas" valor={num(pagas)} tom="bom" />
      </div>

      <Tabela cols={["Medição", "Contratada", "Contrato", "Competência", "Período", "Ordens", "Bruto", "Glosa", "Líquido", "Situação"]}
              vazio={lista.length === 0}>
        {lista.map((m: any) => (
          <tr key={m.id} className="hover:bg-slate-50">
            <Td><Link href={`/medicoes/${m.id}`} className="font-mono text-xs font-medium text-marinho-700 hover:underline">{m.numero}</Link></Td>
            <Td className="max-w-[220px] truncate">{m.contratada}</Td>
            <Td className="whitespace-nowrap font-mono text-xs">{m.numero_contrato}</Td>
            <Td className="whitespace-nowrap tabular-nums">{data(m.competencia).slice(3)}</Td>
            <Td className="whitespace-nowrap text-xs tabular-nums">{data(m.periodo_inicio)} — {data(m.periodo_fim)}</Td>
            <Td className="tabular-nums">{m.ordens}</Td>
            <Td className="tabular-nums">{brl(m.valor_bruto)}</Td>
            <Td className="tabular-nums">{Number(m.valor_glosa) > 0 ? <span className="text-red-700">{brl(m.valor_glosa)}</span> : "—"}</Td>
            <Td className="tabular-nums font-medium">{brl(m.valor_liquido)}</Td>
            <Td><Selo v={m.situacao} /></Td>
          </tr>
        ))}
      </Tabela>
    </>
  );
}
