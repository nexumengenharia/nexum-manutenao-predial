import Link from "next/link";
import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { Selo, Tabela, Td, Titulo } from "@/components/ui";
import { brl, data, dataHora } from "@/lib/fmt";

export const dynamic = "force-dynamic";

const OPCOES = {
  situacao: ["ABERTA", "EM_EXECUCAO", "AGUARDANDO_PECA", "CONCLUIDA", "CANCELADA"],
  tipo: ["PREVENTIVA", "PREDITIVA", "CORRETIVA", "PMOC"],
  prioridade: ["URGENTE", "ALTA", "MEDIA", "BAIXA"],
};

export default async function Ordens({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const lista = await q.listarOrdens(ctx, {
    situacao: sp.situacao, tipo: sp.tipo, prioridade: sp.prioridade, busca: sp.busca,
  });

  return (
    <>
      <Titulo titulo="Ordens de serviço"
              sub={`${lista.length} ordens listadas — ${ctx.sessao.tribunal}`} />

      <form className="nao-imprimir mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div>
          <label htmlFor="busca" className="block text-xs font-medium text-slate-600">Buscar</label>
          <input id="busca" name="busca" defaultValue={sp.busca ?? ""} placeholder="Número ou título"
                 className="mt-1 w-56 rounded border border-slate-300 px-2.5 py-1.5 text-sm" />
        </div>
        {(["situacao", "tipo", "prioridade"] as const).map((campo) => (
          <div key={campo}>
            <label htmlFor={campo} className="block text-xs font-medium capitalize text-slate-600">{campo}</label>
            <select id={campo} name={campo} defaultValue={sp[campo] ?? ""}
                    className="mt-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm">
              <option value="">Todas</option>
              {OPCOES[campo].map((o) => (
                <option key={o} value={o}>{o.replace(/_/g, " ").toLowerCase()}</option>
              ))}
            </select>
          </div>
        ))}
        <button className="rounded bg-marinho-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-marinho-800">
          Filtrar
        </button>
        <Link href="/ordens" className="px-2 py-1.5 text-sm text-slate-600 hover:underline">Limpar</Link>
      </form>

      <Tabela cols={["Número", "Título", "Tipo", "Prioridade", "Situação", "Prédio / Setor", "Contratada", "Prazo", "Custo"]}
              vazio={lista.length === 0}>
        {lista.map((o: any) => (
          <tr key={o.id} className={o.atrasada ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"}>
            <Td>
              <Link href={`/ordens/${o.id}`} className="font-medium text-marinho-700 hover:underline">{o.numero}</Link>
              {o.atrasada && <span className="ml-1.5 text-[10px] font-bold uppercase text-red-700">atrasada</span>}
            </Td>
            <Td className="max-w-[260px] truncate">{o.titulo}</Td>
            <Td><Selo v={o.tipo} /></Td>
            <Td><Selo v={o.prioridade} /></Td>
            <Td><Selo v={o.situacao} /></Td>
            <Td><span className="block truncate">{o.predio}</span>
                <span className="block truncate text-xs text-slate-500">{o.setor}</span></Td>
            <Td className="max-w-[180px] truncate">{o.contratada}</Td>
            <Td className="whitespace-nowrap tabular-nums text-xs">
              {o.concluida_em ? `concl. ${data(o.concluida_em)}` : o.prazo_em ? data(o.prazo_em) : "—"}
            </Td>
            <Td className="tabular-nums">{o.custo_real ? brl(o.custo_real) : o.custo_estimado ? <span className="text-slate-500">{brl(o.custo_estimado)}*</span> : "—"}</Td>
          </tr>
        ))}
      </Tabela>
      <p className="mt-2 text-xs text-slate-500">* valor estimado; ordens não concluídas ainda não têm custo realizado.</p>
    </>
  );
}
