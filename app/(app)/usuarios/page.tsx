import { redirect } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import * as q from "@/lib/servicos/consultas";
import { Tabela, Td, Titulo } from "@/components/ui";
import { dataHora } from "@/lib/fmt";

export const dynamic = "force-dynamic";

const DESCRICAO: Record<string, string> = {
  ADMIN: "Administra usuários, permissões e cadastros",
  GESTOR: "Abre e encerra ordens, gera medições, gerencia cadastros",
  FISCAL: "Fiscaliza execução, atesta medições, aplica glosas",
  TECNICO: "Executa ordens, preenche checklist, registra andamento",
  CONTRATADA: "Consulta ordens próprias e registra comentários",
  CONSULTA: "Somente leitura",
};

export default async function Usuarios() {
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "usuario.gerenciar")) redirect("/");
  const lista = await q.listarUsuarios(ctx);

  return (
    <>
      <Titulo titulo="Usuários e permissões"
              sub="Segregação de funções por perfil de acesso, administrável pelo próprio tribunal" />

      <Tabela cols={["Nome", "E-mail", "Perfil", "Atribuições", "Departamento", "Situação", "Último acesso"]}
              vazio={lista.length === 0}>
        {lista.map((u: any) => (
          <tr key={u.id} className="hover:bg-slate-50">
            <Td className="font-medium">{u.nome}</Td>
            <Td className="text-xs">{u.email}</Td>
            <Td><span className="rounded bg-marinho-50 px-2 py-0.5 text-xs font-medium text-marinho-800">{u.papel}</span></Td>
            <Td className="max-w-[280px] text-xs text-slate-600">{DESCRICAO[u.papel]}</Td>
            <Td className="text-xs">{u.departamento}</Td>
            <Td>{u.ativo
              ? <span className="text-xs font-medium text-emerald-700">ativo</span>
              : <span className="text-xs text-slate-500">inativo</span>}</Td>
            <Td className="whitespace-nowrap text-xs tabular-nums">{dataHora(u.ultimo_acesso_em)}</Td>
          </tr>
        ))}
      </Tabela>

      <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
        A identidade é isolada por desenho: a tabela de usuário possui a coluna
        <code className="mx-1 font-mono text-xs">provedor_id</code> reservada ao identificador
        externo. Na Fase 2 o Keycloak passa a emitir o token e essa coluna é preenchida —
        nenhuma outra tabela do sistema é alterada.
      </p>
    </>
  );
}
