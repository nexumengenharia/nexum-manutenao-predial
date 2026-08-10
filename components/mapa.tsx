"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Marcador = {
  id: string; nome: string; lat: number; lon: number;
  cor: string; rotulo?: string; detalhe?: string; href?: string;
  tipo: "predio" | "veiculo";
};
export type Trajeto = { pontos: [number, number][]; cor: string };

/**
 * Leaflet carregado sob demanda a partir do bundle local (nao CDN),
 * porque o mapa e opcional: nenhuma outra tela quebra se ele falhar.
 */
export default function Mapa({
  marcadores, trajetos = [], centro, zoom = 12, altura = 460, tiles, atribuicao,
}: {
  marcadores: Marcador[]; trajetos?: Trajeto[];
  centro: [number, number]; zoom?: number; altura?: number;
  tiles: string; atribuicao: string;
}) {
  const div = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const router = useRouter();
  const [erro, setErro] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelado || !div.current || mapRef.current) return;

        const m = L.map(div.current, { scrollWheelZoom: false, attributionControl: true })
                   .setView(centro, zoom);
        L.tileLayer(tiles, { attribution: atribuicao, maxZoom: 19 }).addTo(m);
        mapRef.current = m;

        for (const t of trajetos) {
          if (t.pontos.length > 1) {
            L.polyline(t.pontos, { color: t.cor, weight: 3, opacity: 0.75 }).addTo(m);
          }
        }

        const grupo: any[] = [];
        for (const mk of marcadores) {
          const icone = L.divIcon({
            className: "",
            html: mk.tipo === "predio"
              ? `<div style="transform:translate(-50%,-100%)">
                   <div style="background:${mk.cor};color:#fff;border-radius:8px;padding:4px 8px;
                        font:600 11px/1.2 system-ui;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);
                        border:2px solid #fff">${mk.nome}</div>
                   <div style="width:0;height:0;margin:0 auto;border:5px solid transparent;
                        border-top-color:${mk.cor}"></div>
                 </div>`
              : `<div style="transform:translate(-50%,-50%)">
                   <div style="width:16px;height:16px;border-radius:50%;background:${mk.cor};
                        border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
                 </div>`,
            iconSize: [0, 0],
          });
          const marcador = L.marker([mk.lat, mk.lon], { icon: icone, title: mk.nome }).addTo(m);
          marcador.bindPopup(
            `<div style="font:13px system-ui;min-width:170px">
               <strong>${mk.nome}</strong>
               ${mk.rotulo ? `<div style="color:#64748b;font-size:11px">${mk.rotulo}</div>` : ""}
               ${mk.detalhe ? `<div style="margin-top:6px">${mk.detalhe}</div>` : ""}
               ${mk.href ? `<div style="margin-top:8px"><a href="${mk.href}"
                   style="color:#1e3a5f;font-weight:600">Abrir detalhes →</a></div>` : ""}
             </div>`);
          if (mk.href) marcador.on("dblclick", () => router.push(mk.href!));
          grupo.push(marcador);
        }

        if (grupo.length > 1) {
          m.fitBounds(L.featureGroup(grupo).getBounds().pad(0.25));
        }
        setPronto(true);
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(marcadores), JSON.stringify(trajetos)]);

  if (erro) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
           style={{ height: altura }}>
        <div>
          <p className="text-sm font-medium text-slate-700">Mapa indisponível</p>
          <p className="mt-1 text-xs text-slate-500">
            O servidor de tiles não respondeu. As listas abaixo continuam funcionando normalmente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={div} style={{ height: altura, width: "100%", background: "#e8eef3" }} />
      {!pronto && (
        <div className="absolute inset-0 grid place-items-center bg-slate-50/80">
          <p className="text-sm text-slate-500">Carregando mapa…</p>
        </div>
      )}
    </div>
  );
}
