import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { brl, num, data, dataHora } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo, Cartao, Tabela, Td } from "@/components/ui";

export const dynamic = "force-dynamic";

/* Espelho da medicao: quais ordens entraram, quanto cada uma valeu e o que foi
   glosado. E a peca que o fiscal precisa para atestar sem abrir planilha. */

export default async function Medicao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await contexto();
  const m: any = await q.obterMedicao(ctx, id);
  if (!m) notFound();

  const ordens = (await q.ordensDaMedicao(ctx, id)) as any[];
  const foraPrazo = ordens.filter((o) => o.dentro_prazo === false).length;
  const semNota = ordens.filter((o) => o.nota_qualidade == null).length;

  return (
    <div className="space-y-5">
      <Titulo titulo={`Medição ${m.numero}`}
        sub={`${m.contratada} · competência ${data(m.competencia)}`}
        acao={
          <Link href="/medicoes" className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
            Voltar às medições
          </Link>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Valor bruto" valor={brl(m.valor_bruto)}
                detalhe={`${ordens.length} ordem(ns) medida(s)`} />
        <Cartao titulo="Glosa" valor={brl(m.valor_glosa)}
                tom={Number(m.valor_glosa) > 0 ? "alerta" : "neutro"}
                detalhe={Number(m.valor_glosa) > 0 ? "descontado do pagamento" : "nenhum desconto aplicado"} />
        <Cartao titulo="Valor líquido" valor={brl(m.valor_liquido)}
                tom="bom" detalhe="a pagar à contratada" />
        <Cartao titulo="Fora do prazo" valor={num(foraPrazo)}
                tom={foraPrazo > 0 ? "critico" : "bom"}
                detalhe={foraPrazo > 0 ? "base objetiva para glosa" : "todas dentro do SLA"} />
      </div>

      <Painel titulo="Dados da medição">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Campo rotulo="Situação"><Selo v={m.situacao} /></Campo>
          <Campo rotulo="Contratada">{m.contratada}</Campo>
          <Campo rotulo="CNPJ">{m.cnpj}</Campo>
          <Campo rotulo="Contrato">{m.numero_contrato}</Campo>
          <Campo rotulo="Período">{data(m.periodo_inicio)} a {data(m.periodo_fim)}</Campo>
          <Campo rotulo="Atestada em">{m.atestada_em ? dataHora(m.atestada_em) : "não atestada"}</Campo>
          <Campo rotulo="Atestada por">{m.atestada_por_nome}</Campo>
          <Campo rotulo="E-mail da contratada">{m.email}</Campo>
        </dl>
        {m.observacoes && (
          <p className="mt-3 whitespace-pre-line rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {m.observacoes}
          </p>
        )}
        {semNota > 0 && (
          <p className="mt-3 text-xs text-amber-700">
            {semNota} ordem(ns) sem nota de qualidade — a avaliação da contratada fica incompleta.
          </p>
        )}
      </Painel>

      <Painel titulo={`Ordens incluídas (${ordens.length})`}>
        <Tabela cols={["Número", "Título", "Tipo", "Prédio", "Conclusão", "Prazo", "Nota", "Valor", "Glosa"]}
                vazio={ordens.length === 0}>
          {ordens.map((o) => (
            <tr key={o.id} className={o.dentro_prazo === false ? "bg-red-50/60" : "hover:bg-slate-50"}>
              <Td>
                <Link href={`/ordens/${o.id}`} className="font-medium text-marinho-700 hover:underline">
                  {o.numero}
                </Link>
              </Td>
              <Td className="max-w-[240px] truncate">{o.titulo}</Td>
              <Td><Selo v={o.tipo} /></Td>
              <Td className="max-w-[160px] truncate">{o.predio}</Td>
              <Td className="whitespace-nowrap text-xs">{o.concluida_em ? data(o.concluida_em) : "—"}</Td>
              <Td className="text-xs">
                {o.dentro_prazo === false
                  ? <span className="font-semibold text-red-700">fora</span>
                  : <span className="text-emerald-700">dentro</span>}
              </Td>
              <Td className="tabular-nums text-xs">{o.nota_qualidade ? num(o.nota_qualidade, 1) : "—"}</Td>
              <Td className="tabular-nums">{brl(o.valor)}</Td>
              <Td className="tabular-nums">
                {Number(o.glosa ?? 0) > 0
                  ? <span className="font-medium text-red-700">{brl(o.glosa)}</span>
                  : "—"}
                {o.motivo_glosa && <span className="block text-[11px] text-slate-500">{o.motivo_glosa}</span>}
              </Td>
            </tr>
          ))}
        </Tabela>
      </Painel>
    </div>
  );
}
