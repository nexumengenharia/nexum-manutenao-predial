import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { pode } from "@/lib/auth";

type Item = { href: string; rotulo: string; acao?: string };
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  { titulo: "Visão geral", itens: [
    { href: "/",             rotulo: "Painel do gestor" },
    { href: "/carteira",     rotulo: "Carteira de serviços" },
    { href: "/relatorios",   rotulo: "Relatórios" },
  ]},
  { titulo: "Atendimento", itens: [
    { href: "/quadro",       rotulo: "Quadro de atividades" },
    { href: "/solicitacoes", rotulo: "Solicitações" },
    { href: "/ordens",       rotulo: "Ordens de serviço" },
  ]},
  { titulo: "Patrimônio", itens: [
    { href: "/ativos",       rotulo: "Ativos" },
    { href: "/predios",      rotulo: "Prédios e mapa" },
    { href: "/pontos",       rotulo: "Pontos com QR" },
    { href: "/planos",       rotulo: "Planos e PMOC" },
    { href: "/controles",    rotulo: "Controles e vencimentos" },
  ]},
  { titulo: "Frota", itens: [
    { href: "/frota",              rotulo: "Veículos",       acao: "frota.ver" },
    { href: "/frota/monitoramento",rotulo: "Monitoramento",  acao: "frota.ver" },
  ]},
  { titulo: "Administração", itens: [
    { href: "/contratadas",  rotulo: "Contratadas" },
    { href: "/medicoes",     rotulo: "Medições" },
    { href: "/estoque",      rotulo: "Estoque" },
    { href: "/auditoria",    rotulo: "Auditoria", acao: "auditoria.ver" },
    { href: "/usuarios",     rotulo: "Usuários",  acao: "usuario.gerenciar" },
  ]},
];

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const s = await exigirSessao();
  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter((m) => !m.acao || pode(s.papel, m.acao)) }))
    .filter((g) => g.itens.length > 0);
  const itens = grupos.flatMap((g) => g.itens);

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="pular-para-conteudo">Pular para o conteúdo</a>

      <header className="nao-imprimir sticky top-0 z-40 border-b border-marinho-800 bg-marinho-900 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded bg-institucional-500 text-sm font-bold text-marinho-900">
              NX
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Gestão de Manutenção Predial</p>
              <p className="text-[11px] text-white/60">{s.tribunalNome}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{s.nome}</p>
              <p className="text-[11px] text-white/60">
                {s.papel.charAt(0) + s.papel.slice(1).toLowerCase()} · {s.tribunal}
              </p>
            </div>
            <form action="/api/auth/sair" method="post">
              <button className="rounded border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6">
        <nav aria-label="Menu principal" className="nao-imprimir hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">
            {grupos.map((g) => (
              <div key={g.titulo}>
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {g.titulo}
                </p>
                <ul className="space-y-0.5">
                  {g.itens.map((m) => (
                    <li key={m.href}>
                      <Link href={m.href}
                        className="block rounded-md px-3 py-1.5 text-sm text-slate-700 transition
                                   hover:bg-white hover:text-marinho-800 hover:shadow-sm">
                        {m.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main id="conteudo" className="min-w-0 flex-1">{children}</main>
      </div>

      <nav aria-label="Menu" className="nao-imprimir border-t border-slate-200 bg-white lg:hidden">
        <ul className="flex flex-wrap gap-1 p-2">
          {itens.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="block rounded px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                {m.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
