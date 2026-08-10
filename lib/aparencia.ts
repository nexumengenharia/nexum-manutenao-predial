/* Preferencias de aparencia.

   Fica FORA de components/chrome.tsx de proposito: aquele arquivo e "use
   client", e quando um Server Component importa de um modulo cliente o valor
   chega como referencia de cliente, nao como o texto em si — o script inline
   sairia quebrado no HTML. Aqui e um modulo neutro, entao o servidor le a
   string de verdade e o componente cliente reusa as mesmas chaves. */

export const CHAVE_TEMA = "nx.tema";
export const CHAVE_MENU = "nx.menu";

/** Roda antes da primeira pintura para nao piscar branco antes de escurecer. */
export const SCRIPT_APARENCIA = `
(function(){
  try {
    var t = localStorage.getItem("${CHAVE_TEMA}");
    if (t === "escuro") document.documentElement.classList.add("dark");
    var m = localStorage.getItem("${CHAVE_MENU}");
    if (m === "recolhido") document.documentElement.classList.add("menu-recolhido");
  } catch (e) {}
})();
`;
