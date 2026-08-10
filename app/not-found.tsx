import Link from "next/link";
export default function NaoEncontrado() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-marinho-800">404</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-800">Página não encontrada</h1>
        <p className="mt-1 text-sm text-slate-600">O endereço solicitado não existe ou o registro foi removido.</p>
        <Link href="/" className="mt-5 inline-block rounded bg-marinho-700 px-4 py-2 text-sm font-medium text-white">
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
