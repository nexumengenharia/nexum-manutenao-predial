import Link from "next/link";
import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { num, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Selo, Tabela, Td, Cartao } from "@/components/ui";

export const dynamic = "force-dynamic";

/* Esta rota estava no menu mas nao existia no codigo — dava 404. Enquanto o
   Quadro mostra os chamados como cartoes para trabalhar, esta tela e a lista
   completa e auditavel, inclusive dos ja encerrados e convertidos em ordem. */

const SITUACOES = ["ABERTA", "TRIAGEM", "EM_EXECUCAO", "CONCLUIDA", "CONVERTIDA", "CANCELADA"];

export default async function Solicitacoes({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const situacao = sp.situacao && SITUACOES.includes(sp.situacao) ? sp.situacao : undefined;

  const lista = (await q.listarSolicitacoes(ctx, situacao)) as any[];

  const conta = (s: string) => lista.filter((x) => x.situacao === s).length;
  const porQr = lista.filter((x) => x.origem === "QRCODE").length;
  const convertidas = lista.filter((x) => x.ordem_id).length;

  return (
    <div className="space-y-5">
      <Titulo titulo="Solicitações"
        sub={`${lista.length} chamado(s)${situacao ? ` em ${rotulo(situacao)}` : " nos registros recentes"} — ${ctx.sessao.tribunal}`}
        acao={
          <Link href="/quadro"
            className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
            Abrir o quadro
          </Link>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Aguardando triagem" valor={num(conta("ABERTA") + conta("TRIAGEM"))}
                tom={conta("ABERTA") + conta("TRIAGEM") > 0 ? "alerta" : "bom"}
                detalhe="ainda sem equipe atuando" />
        <Cartao titulo="Em execução" valor={num(conta("EM_EXECUCAO"))} detalhe="equipe já atuando" />
        <Cartao titulo="Viraram ordem de serviço" valor={num(convertidas)}
                detalhe="chamados que geraram OS formal" />
        <Cartao titulo="Abertas por QR Code" valor={num(porQr)}
                detalhe="registradas pelo próprio usuário do prédio" />
      </div>

      <div className="nao-imprimir flex flex-wrap gap-2">
        <Link href="/solicitacoes"
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition
            ${!situacao ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
          Todas
        </Link>
        {SITUACOES.map((s) => (
          <Link key={s} href={`/solicitacoes?situacao=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition
              ${situacao === s ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {rotulo(s)}
          </Link>
        ))}
      </div>

      <Tabela cols={["Número", "Título", "Situação", "Prioridade", "Origem", "Solicitante", "Prédio / Setor", "Ativo", "Aberta em", "Ordem gerada"]}
              vazio={lista.length === 0}>
        {lista.map((s) => (
          <tr key={s.id} className="hover:bg-slate-50">
            <Td className="font-mono text-xs">{s.numero}</Td>
            <Td className="max-w-[260px] truncate">{s.titulo}</Td>
            <Td><Selo v={s.situacao} /></Td>
            <Td><Selo v={s.prioridade} /></Td>
            <Td>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                ${s.origem === "QRCODE"
                  ? "bg-cyan-100 text-cyan-900 ring-cyan-600/20"
                  : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                {s.origem === "QRCODE" ? "QR" : rotulo(s.origem)}
              </span>
            </Td>
            <Td className="max-w-[160px] truncate text-xs">{s.solicitante_nome}</Td>
            <Td>
              <span className="block max-w-[180px] truncate">{s.predio}</span>
              <span className="block max-w-[180px] truncate text-xs text-slate-500">{s.setor}</span>
            </Td>
            <Td className="max-w-[160px] truncate text-xs">{s.ativo}</Td>
            <Td className="whitespace-nowrap text-xs">{dataHora(s.criado_em)}</Td>
            <Td>
              {s.ordem_id
                ? <Link href={`/ordens/${s.ordem_id}`} className="font-medium text-marinho-700 hover:underline">
                    {s.ordem_numero}
                  </Link>
                : <span className="text-slate-400">—</span>}
            </Td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}
