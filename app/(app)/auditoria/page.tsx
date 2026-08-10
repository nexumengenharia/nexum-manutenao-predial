import Link from "next/link";
import { redirect } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import * as q from "@/lib/servicos/consultas";
import { Painel, Selo, Tabela, Td, Titulo } from "@/components/ui";
import { dataHora } from "@/lib/fmt";

export const dynamic = "force-dynamic";

const ENTIDADES = ["", "ordem", "solicitacao", "ativo", "predio", "contratada", "medicao", "item_estoque", "usuario"];

/** Mostra apenas o que mudou entre antes e depois — a trilha fica legível. */
function diferencas(antes: any, depois: any) {
  if (!antes) return [{ campo: "registro", de: "—", para: "criado" }];
  if (!depois) return [{ campo: "registro", de: "existente", para: "removido" }];
  const ignorar = new Set(["atualizado_em", "atualizado_por", "criado_em", "criado_por", "tenant_id", "id"]);
  const saida: { campo: string; de: string; para: string }[] = [];
  for (const k of Object.keys(depois)) {
    if (ignorar.has(k)) continue;
    const a = antes[k], d = depois[k];
    if (JSON.stringify(a) !== JSON.stringify(d)) {
      saida.push({ campo: k, de: a === null || a === undefined ? "—" : String(a), para: d === null ? "—" : String(d) });
    }
  }
  return saida.slice(0, 4);
}

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "auditoria.ver")) redirect("/");

  const [trilha, acessos] = await Promise.all([
    q.trilhaAuditoria(ctx, sp.entidade), q.logDeAcesso(ctx),
  ]);

  return (
    <>
      <Titulo titulo="Trilha de auditoria"
        sub="Todo registro criado, alterado ou excluído, com autor, origem e valores anterior e posterior" />

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
        A trilha é gravada por gatilho no próprio banco de dados, dentro da mesma transação
        da alteração — não depende da aplicação lembrar de registrar. Exclusões são sempre
        lógicas: o papel usado pela aplicação não possui privilégio de <code className="font-mono text-xs">DELETE</code>.
      </div>

      <nav className="nao-imprimir mb-4 flex flex-wrap gap-2" aria-label="Filtrar por entidade">
        {ENTIDADES.map((e) => (
          <Link key={e || "todas"} href={e ? `/auditoria?entidade=${e}` : "/auditoria"}
            className={`rounded border px-3 py-1.5 text-sm ${
              (sp.entidade ?? "") === e ? "border-marinho-700 bg-marinho-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
            {e ? e.replace(/_/g, " ") : "Todas"}
          </Link>
        ))}
      </nav>

      <Tabela cols={["Data/hora", "Ação", "Entidade", "Registro", "Autor", "Origem (IP)", "Alterações"]}
              vazio={trilha.length === 0}>
        {trilha.map((l: any) => {
          const difs = diferencas(l.antes, l.depois);
          return (
            <tr key={l.id} className="hover:bg-slate-50">
              <Td className="whitespace-nowrap tabular-nums text-xs">{dataHora(l.ocorrido_em)}</Td>
              <Td>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                  l.acao === "CREATE" ? "bg-emerald-100 text-emerald-800"
                  : l.acao === "DELETE" ? "bg-red-100 text-red-800"
                  : "bg-sky-100 text-sky-800"}`}>{l.acao}</span>
              </Td>
              <Td className="text-xs">{l.entidade}</Td>
              <Td className="font-mono text-[11px] text-slate-500">{String(l.entidade_id ?? "").slice(0, 8)}</Td>
              <Td className="text-xs">{l.ator ?? <span className="text-slate-400">sistema</span>}</Td>
              <Td className="font-mono text-[11px]">{l.ip}</Td>
              <Td>
                <ul className="space-y-0.5 text-[11px]">
                  {difs.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium text-slate-600">{d.campo}:</span>{" "}
                      <span className="text-red-700 line-through">{d.de.slice(0, 22)}</span>{" → "}
                      <span className="text-emerald-700">{d.para.slice(0, 22)}</span>
                    </li>
                  ))}
                </ul>
              </Td>
            </tr>
          );
        })}
      </Tabela>

      <div className="mt-6">
        <Painel titulo="Registro de acessos (LGPD)">
          <Tabela cols={["Data/hora", "E-mail", "Resultado", "Motivo", "Origem (IP)"]} vazio={acessos.length === 0}>
            {acessos.map((a: any) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap tabular-nums text-xs">{dataHora(a.ocorrido_em)}</Td>
                <Td className="text-xs">{a.email}</Td>
                <Td>{a.sucesso
                  ? <span className="text-xs font-medium text-emerald-700">sucesso</span>
                  : <span className="text-xs font-medium text-red-700">negado</span>}</Td>
                <Td className="text-xs">{a.motivo}</Td>
                <Td className="font-mono text-[11px]">{a.ip}</Td>
              </tr>
            ))}
          </Tabela>
        </Painel>
      </div>
    </>
  );
}
