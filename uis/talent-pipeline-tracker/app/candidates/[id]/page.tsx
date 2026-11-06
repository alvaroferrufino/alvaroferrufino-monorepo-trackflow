import Link from "next/link";
import { Suspense } from "react";
import CandidateDetail from "./candidate-detail";
import NotesPanel from "./notes-panel";

// `export const dynamic` is incompatible with cacheComponents; awaiting params inside Suspense renders per request.
async function CandidateContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CandidateDetail key={`detail-${id}`} candidateId={id} />
      <NotesPanel key={`notes-${id}`} candidateId={id} />
    </>
  );
}

export default function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main lang="es" className="min-h-screen w-full bg-white px-4 py-8 font-sans text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">
          ← Volver a candidaturas
        </Link>
        <header className="mb-8 mt-4 border-l-4 border-emerald-700 pl-4">
          <p className="text-lg font-semibold text-emerald-800">TrackFlow</p>
          <h1 className="mt-1 text-2xl font-semibold">Detalle del candidato</h1>
        </header>
        <Suspense fallback={<p role="status" className="py-6 text-zinc-600">Cargando candidato...</p>}>
          <CandidateContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}
