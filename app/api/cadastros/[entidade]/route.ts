import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { salvarCadastro, excluirLogicamente, CADASTROS } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Criacao e edicao dos cadastros base. A entidade da URL so e aceita se
    existir no mapa CADASTROS — nome de tabela nunca vem do cliente. */
export async function POST(req: Request, { params }: { params: Promise<{ entidade: string }> }) {
  const { entidade } = await params;
  if (!CADASTROS[entidade]) {
    return NextResponse.json({ erro: "Cadastro não reconhecido." }, { status: 404 });
  }

  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "cadastro.editar")) {
    return NextResponse.json({ erro: "Seu perfil não permite alterar cadastros." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { id, ...dados } = corpo ?? {};

  try {
    const r = await salvarCadastro(ctx, entidade, dados, id ?? null);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    if (msg.startsWith("CAMPO_OBRIGATORIO:")) {
      return NextResponse.json({ erro: `Preencha o campo "${msg.split(":")[1]}".` }, { status: 400 });
    }
    // 23505 = unique_violation; costuma ser codigo/CNPJ repetido.
    if (msg.includes("duplicate key") || (e?.code === "23505")) {
      return NextResponse.json({ erro: "Já existe um registro com esse código ou documento." }, { status: 409 });
    }
    if (msg.includes("violates check constraint") || e?.code === "23514") {
      return NextResponse.json({ erro: "Algum valor selecionado não é aceito para este campo." }, { status: 400 });
    }
    if (msg.includes("violates foreign key") || e?.code === "23503") {
      return NextResponse.json({ erro: "Selecione um prédio/setor válido." }, { status: 400 });
    }
    return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 500 });
  }
}

/** Exclusao logica (R4: a aplicacao nunca faz DELETE fisico). */
export async function DELETE(req: Request, { params }: { params: Promise<{ entidade: string }> }) {
  const { entidade } = await params;
  const def = CADASTROS[entidade];
  if (!def) return NextResponse.json({ erro: "Cadastro não reconhecido." }, { status: 404 });

  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "cadastro.editar")) {
    return NextResponse.json({ erro: "Seu perfil não permite excluir cadastros." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "Informe o registro." }, { status: 400 });

  try {
    await excluirLogicamente(ctx, def.tabela, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Não foi possível excluir." }, { status: 500 });
  }
}
