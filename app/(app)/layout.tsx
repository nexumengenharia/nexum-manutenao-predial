import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { BotaoTema, BotaoMenu } from "@/components/chrome";

type Item = { href: string; rotulo: string; acao?: string; icone: React.ReactNode };

const I = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  { titulo: "Visão geral", itens: [
    { href: "/",           rotulo: "Painel do gestor",    icone: I("M3 12l9-9 9 9M5 10v10h14V10") },
    { href: "/carteira",   rotulo: "Carteira de serviços", icone: I("M3 7h18v13H3zM8 7V4h8v3") },
    { href: "/relatorios", rotulo: "Relatórios",           icone: I("M4 19V5m0 14h16M8 15V9m4 6V7m4 8v-4") },
  ]},
  { titulo: "Atendimento", itens: [
    { href: "/quadro",       rotulo: "Quadro de atividades", icone: I("M4 4h6v16H4zM14 4h6v9h-6z") },
    { href: "/solicitacoes", rotulo: "Solicitações",         icone: I("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z") },
    { href: "/ordens",       rotulo: "Ordens de serviço",    icone: I("M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11") },
  ]},
  { titulo: "Patrimônio", itens: [
    { href: "/ativos",    rotulo: "Ativos",                 icone: I("M20 7l-8-4-8 4 8 4 8-4zM4 12l8 4 8-4M4 17l8 4 8-4") },
    { href: "/predios",   rotulo: "Prédios e mapa",         icone: I("M3 21h18M5 21V7l7-4 7 4v14M9 9h2m2 0h2M9 13h2m2 0h2M9 17h2m2 0h2") },
    { href: "/pontos",    rotulo: "Pontos com QR",          icone: I("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z") },
    { href: "/planos",    rotulo: "Planos e PMOC",          icone: I("M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z") },
    { href: "/controles", rotulo: "Controles e vencimentos", icone: I("M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z") },
  ]},
  { titulo: "Frota", itens: [
    { href: "/frota",               rotulo: "Veículos",     acao: "frota.ver", icone: I("M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17V9l2-5h11l3 5v8") },
    { href: "/frota/monitoramento", rotulo: "Monitoramento", acao: "frota.ver", icone: I("M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z") },
  ]},
  { titulo: "Administração", itens: [
    { href: "/contratadas", rotulo: "Contratadas", icone: I("M3 21h18M6 21V8l6-4 6 4v13M10 12h4M10 16h4") },
    { href: "/medicoes",    rotulo: "Medições",    icone: I("M4 20h16M6 20V10m5 10V4m5 16v-7") },
    { href: "/estoque",     rotulo: "Estoque",     icone: I("M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10") },
    { href: "/auditoria",   rotulo: "Auditoria",   acao: "auditoria.ver", icone: I("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5") },
    { href: "/usuarios",    rotulo: "Usuários",    acao: "usuario.gerenciar", icone: I("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9") },
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
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <BotaoMenu />
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded bg-institucional-500 text-sm font-bold text-marinho-900">
              NX
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Gestão de Manutenção Predial</p>
              <p className="truncate text-[11px] text-white/60">{s.tribunalNome}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <BotaoTema />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{s.nome}</p>
              <p className="text-[11px] text-white/60">
                {s.papel.charAt(0) + s.papel.slice(1).toLowerCase()} · {s.tribunal}
              </p>
            </div>
            <form action="/api/auth/sair" method="post">
              <button className="rounded border border-white/25 px-2.5 py-1.5 text-xs hover:bg-white/10 sm:px-3">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex gap-4 px-3 py-5 sm:px-5 sm:py-6 lg:gap-6 2xl:px-8">
        {/* Menu lateral. A largura muda via classe no <html> (menu-recolhido),
            aplicada antes da primeira pintura — ver components/chrome.tsx. */}
        <nav aria-label="Menu principal"
             className="nao-imprimir hidden shrink-0 transition-[width] duration-200 lg:block
                        w-56 [.menu-recolhido_&]:w-[3.75rem]">
          <div className="sticky top-20 space-y-4">
            {grupos.map((g) => (
              <div key={g.titulo}>
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400
                              [.menu-recolhido_&]:sr-only">
                  {g.titulo}
                </p>
                <ul className="space-y-0.5">
                  {g.itens.map((m) => (
                    <li key={m.href}>
                      <Link href={m.href} title={m.rotulo}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 transition
                                   hover:bg-white hover:text-marinho-800 hover:shadow-sm
                                   [.menu-recolhido_&]:justify-center [.menu-recolhido_&]:px-0">
                        {m.icone}
                        <span className="truncate [.menu-recolhido_&]:hidden">{m.rotulo}</span>
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

      {/* Navegacao do celular: barra rolavel horizontal, sem quebrar em 5 linhas. */}
      <nav aria-label="Menu" className="nao-imprimir sticky bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
        <ul className="flex gap-1 overflow-x-auto p-2">
          {itens.map((m) => (
            <li key={m.href} className="shrink-0">
              <Link href={m.href}
                className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded px-2 py-1.5 text-[10px]
                           leading-tight text-slate-700 hover:bg-slate-100">
                {m.icone}
                <span className="text-center">{m.rotulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
