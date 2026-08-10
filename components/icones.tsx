/* ------------------------------------------------------------------
   Icones por categoria de ativo.
   Decisao: desenho vetorial proprio em vez de imagem gerada. Uma
   ilustracao "realista" de um elevador generico e ficcao — para um
   tribunal isso vale menos que um simbolo honesto. Quando existe foto
   real anexada ao ativo (R8), a foto substitui o icone automaticamente.
------------------------------------------------------------------- */

export const CORES_CATEGORIA: Record<string, { bg: string; fg: string; nome: string }> = {
  ELEVADOR:          { bg: "#e0e7ff", fg: "#3730a3", nome: "Elevador" },
  COMBATE_INCENDIO:  { bg: "#fee2e2", fg: "#b91c1c", nome: "Combate a incêndio" },
  CLIMATIZACAO:      { bg: "#cffafe", fg: "#0e7490", nome: "Climatização" },
  ELETRICA:          { bg: "#fef3c7", fg: "#b45309", nome: "Elétrica" },
  HIDRAULICA:        { bg: "#dbeafe", fg: "#1d4ed8", nome: "Hidráulica" },
  CIVIL:             { bg: "#e7e5e4", fg: "#57534e", nome: "Civil" },
  SEGURANCA:         { bg: "#ede9fe", fg: "#6d28d9", nome: "Segurança" },
  GERACAO_ENERGIA:   { bg: "#fef9c3", fg: "#a16207", nome: "Geração de energia" },
  VEICULO:           { bg: "#dcfce7", fg: "#15803d", nome: "Veículo" },
  MOBILIARIO:        { bg: "#f5f5f4", fg: "#44403c", nome: "Mobiliário" },
  TI:                { bg: "#f1f5f9", fg: "#334155", nome: "Tecnologia" },
  OUTRO:             { bg: "#f1f5f9", fg: "#475569", nome: "Outro" },
};

export function catCor(c?: string | null) {
  return CORES_CATEGORIA[c ?? "OUTRO"] ?? CORES_CATEGORIA.OUTRO!;
}

function Svg({ children, cor }: { children: React.ReactNode; cor: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className="h-full w-full" aria-hidden>
      {children}
    </svg>
  );
}

export function IconeCategoria({ categoria, className = "" }: { categoria?: string | null; className?: string }) {
  const { fg } = catCor(categoria);
  const d = (() => {
    switch (categoria) {
      case "ELEVADOR":
        return <><rect x="4" y="2.5" width="16" height="19" rx="1.5" /><path d="M12 2.5v19" />
                 <path d="M8 8l1.6-2 1.6 2M8 16l1.6 2 1.6-2" /></>;
      case "COMBATE_INCENDIO":
        return <><path d="M9 3.5h5a1 1 0 011 1v1.5H8V4.5a1 1 0 011-1z" />
                 <rect x="7.5" y="6" width="8" height="14.5" rx="2" /><path d="M15.5 8.5h3.5M19 8.5v5" />
                 <path d="M9.5 10.5h4" /></>;
      case "CLIMATIZACAO":
        return <><rect x="2.5" y="5" width="19" height="8" rx="2" /><path d="M6 9.5h12" />
                 <path d="M7 16c0 1.5 1 1.5 1 3M12 16c0 1.5 1 1.5 1 3M17 16c0 1.5 1 1.5 1 3" /></>;
      case "ELETRICA":
        return <><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z" /></>;
      case "HIDRAULICA":
        return <><path d="M12 21.5c3 0 5.5-2.3 5.5-5.2C17.5 12.6 12 2.5 12 2.5S6.5 12.6 6.5 16.3c0 2.9 2.5 5.2 5.5 5.2z" /></>;
      case "CIVIL":
        return <><path d="M3 21h18M5 21V9l7-5.5L19 9v12" /><rect x="9" y="13" width="6" height="8" />
                 <path d="M8 9.5h2M14 9.5h2" /></>;
      case "SEGURANCA":
        return <><path d="M12 2.5l8 3v6c0 5-3.4 8.9-8 10-4.6-1.1-8-5-8-10v-6l8-3z" /><path d="M9 12l2 2 4-4" /></>;
      case "GERACAO_ENERGIA":
        return <><rect x="3" y="7" width="18" height="11" rx="2" /><path d="M7 7V4.5h10V7" />
                 <path d="M8 12.5h3l-1.2 3 4.2-4.5h-3l1.2-3-4.2 4.5z" /></>;
      case "VEICULO":
        return <><path d="M4 16.5V12l1.8-4.4A2 2 0 017.6 6.5h8.8a2 2 0 011.8 1.1L20 12v4.5" />
                 <path d="M4 12h16" /><circle cx="7.5" cy="16.8" r="1.7" /><circle cx="16.5" cy="16.8" r="1.7" />
                 <path d="M2.5 16.5h1.8M19.7 16.5h1.8" /></>;
      case "MOBILIARIO":
        return <><path d="M4 20v-5M20 20v-5" /><rect x="3" y="9" width="18" height="6" rx="2" />
                 <path d="M5.5 9V6a2 2 0 012-2h9a2 2 0 012 2v3" /></>;
      case "TI":
        return <><rect x="2.5" y="4" width="19" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>;
      default:
        return <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M8 12h8M12 8v8" /></>;
    }
  })();
  return <span className={className}><Svg cor={fg}>{d}</Svg></span>;
}

export const CORES_PREDIO: Record<string, string> = {
  SEDE: "#1e3a5f", FORUM: "#0e7490", ANEXO: "#6d28d9", ARQUIVO: "#a16207",
  DEPOSITO: "#57534e", GARAGEM: "#15803d", CENTRO_TREINAMENTO: "#b45309", OUTRO: "#475569",
};

export function IconePredio({ tipo, className = "" }: { tipo?: string | null; className?: string }) {
  const cor = CORES_PREDIO[tipo ?? "OUTRO"] ?? CORES_PREDIO.OUTRO!;
  const d = (() => {
    switch (tipo) {
      case "SEDE":
        return <><path d="M2.5 21h19" /><path d="M3.5 21V9.5L12 4l8.5 5.5V21" />
                 <path d="M7 21v-6h3.2v6M13.8 21v-6H17v6" /><path d="M12 4V2" /><circle cx="12" cy="11" r="1.4" /></>;
      case "FORUM":
        return <><path d="M2.5 21h19M4 21V10M8 21V10M12 21V10M16 21V10M20 21V10" />
                 <path d="M2 10h20L12 3.5 2 10z" /><path d="M3 21.5h18" /></>;
      case "GARAGEM":
        return <><path d="M3 21V10l9-6.5 9 6.5v11" /><path d="M7 21v-6h10v6" /><path d="M7 18h10" /></>;
      case "CENTRO_TREINAMENTO":
        return <><path d="M12 3.5L2.5 8.5 12 13.5l9.5-5-9.5-5z" /><path d="M6.5 11v5c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-5" /></>;
      default:
        return <><path d="M3 21h18" /><rect x="4.5" y="6.5" width="15" height="14.5" rx="1.5" />
                 <path d="M8 10h2.5M13.5 10H16M8 14h2.5M13.5 14H16" /><path d="M4.5 6.5L12 2.5l7.5 4" /></>;
    }
  })();
  return <span className={className}><Svg cor={cor}>{d}</Svg></span>;
}

export const CORES_PONTO: Record<string, string> = {
  BANHEIRO: "#0891b2", BEBEDOURO: "#2563eb", COPA: "#c2410c", SALA: "#4f46e5",
  HALL: "#7c3aed", ELEVADOR: "#4338ca", ESCADA: "#57534e", ESTACIONAMENTO: "#15803d",
  AUDITORIO: "#a16207", RECEPCAO: "#be185d", OUTRO: "#475569",
};
