import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { pode } from "@/lib/auth";
import { brl, num, data } from "@/lib/fmt";
import { Titulo, Tabela, Td, Selo, Cartao } from "@/components/ui";
import Cadastro from "@/components/cadastro";
import { CAMPOS_CONTRATADA } from "@/components/campos";

export const dynamic = "force-dynamic";

/* Esta tela existia no menu mas nao no codigo — o link levava a 404. Alem de
   listar, ela e o unico lugar onde o contrato ganha data de fim, que e o que
   alimenta o alerta de "contrato vencendo em 90 dias" do painel. */

export default async function Contratadas() {
  const ctx = await contexto();
  const podeEditar = pode(ctx.sessao.papel, "cadastro.editar");
  const lista = (await q.listarContratadas(ctx)) as any[];

  const hoje = new Date();
  const dias = (d: string | null) =>
    d ? Math.ceil((new Date(d).getTime() - hoje.getTime()) / 86_400_000) : null;

  const vigentes = lista.filter((c) => c.ativo).length;
  const vencendo = lista.filter((c) => {
    const n = dias(c.contrato_fim);
    return n !== null && n >= 0 && n <= 90;
  }).length;
  const vencidos = lista.filter((c) => {
    const n = dias(c.contrato_fim);
    return n !== null && n < 0;
  }).length;
  const total = lista.reduce((s, c) => s + Number(c.valor_contrato ?? 0), 0);

  return (
    <div className="space-y-5">
      <Titulo titulo="Contratadas"
        sub={`${lista.length} empresa(s) cadastrada(s) — ${ctx.sessao.tribunal}`}
        acao={podeEditar && (
          <Cadastro entidade="contratada" titulo="Contratada" campos={CAMPOS_CONTRATADA} />
        )} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Contratos vigentes" valor={num(vigentes)}
                detalhe={`de ${lista.length} cadastradas`} />
        <Cartao titulo="Vencendo em 90 dias" valor={num(vencendo)}
                tom={vencendo > 0 ? "alerta" : "neutro"}
                detalhe={vencendo > 0 ? "exige abertura de novo processo" : "nada no horizonte"} />
        <Cartao titulo="Vigência expirada" valor={num(vencidos)}
                tom={vencidos > 0 ? "critico" : "bom"}
                detalhe={vencidos > 0 ? "serviço sem cobertura contratual" : "nenhum contrato vencido"} />
        <Cartao titulo="Valor contratado" valor={brl(total)}
                detalhe="soma dos contratos cadastrados" />
      </div>

      <Tabela
        cols={["Razão social", "CNPJ", "Especialidade", "Contrato", "Vigência", "Ordens", "Executado", "SLA", "Situação"]}
        vazio={lista.length === 0}>
        {lista.map((c) => {
          const n = dias(c.contrato_fim);
          const critico = n !== null && n < 0;
          const alerta = n !== null && n >= 0 && n <= 90;
          return (
            <tr key={c.id} className={critico ? "bg-red-50/60" : "hover:bg-slate-50"}>
              <Td>
                <span className="font-medium text-slate-800">{c.razao_social}</span>
                {c.responsavel && (
                  <span className="block text-xs text-slate-500">{c.responsavel}</span>
                )}
              </Td>
              <Td className="tabular-nums text-xs">{c.cnpj}</Td>
              <Td><Selo v={c.especialidade} /></Td>
              <Td className="text-xs">{c.numero_contrato}</Td>
              <Td className="whitespace-nowrap text-xs">
                {c.contrato_fim ? (
                  <>
                    <span className={critico ? "font-semibold text-red-700" : alerta ? "font-semibold text-amber-700" : ""}>
                      {data(c.contrato_fim)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {critico ? `vencido há ${Math.abs(n!)} d` : `faltam ${n} d`}
                    </span>
                  </>
                ) : <span className="text-slate-400">sem data</span>}
              </Td>
              <Td className="tabular-nums">{num(c.ordens)}</Td>
              <Td className="tabular-nums">{brl(c.executado)}</Td>
              <Td className="tabular-nums">
                {c.sla !== null && c.sla !== undefined
                  ? <span className={Number(c.sla) < 90 ? "font-medium text-amber-700" : "text-emerald-700"}>{c.sla}%</span>
                  : <span className="text-slate-400">—</span>}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    c.ativo ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                            : "bg-slate-200 text-slate-600 ring-slate-500/20"}`}>
                    {c.ativo ? "Vigente" : "Encerrado"}
                  </span>
                  {podeEditar && (
                    <Cadastro entidade="contratada" titulo="Contratada" variante="discreto"
                              campos={CAMPOS_CONTRATADA} registro={c} gatilho="Editar" />
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </Tabela>

      <p className="text-xs text-slate-500">
        A data de fim da vigência alimenta o alerta de contratos vencendo do painel do gestor.
        Contrato sem data cadastrada nunca gera aviso.
      </p>
    </div>
  );
}
