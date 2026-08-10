/* ------------------------------------------------------------------
   Provedor de tiles isolado atras de configuracao.
   Motivo (R9): o sistema precisa rodar em servidor do orgao sem
   internet. Google/Mapbox nao rodam offline e cobram por visualizacao.
   Aqui o endereco do tile e um parametro: na Fase 1 aponta para o OSM
   publico; na Fase 2 aponta para um servidor de tiles dentro da rede
   do tribunal, e nenhuma tela muda.
------------------------------------------------------------------- */
export const mapa = {
  tiles: process.env.MAPA_TILES_URL
      ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  atribuicao: process.env.MAPA_ATRIBUICAO
      ?? '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  centroPadrao: [
    Number(process.env.MAPA_LAT ?? -3.1019030),
    Number(process.env.MAPA_LON ?? -60.0250000),
  ] as [number, number],
  zoomPadrao: Number(process.env.MAPA_ZOOM ?? 12),
};
