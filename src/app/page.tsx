import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Arquitecto de Soluciones
        </h1>
        <p className="text-xl text-slate-300 mb-4">
          Describe lo que te quita tiempo. Te ayudamos a convertirlo en una herramienta de IA.
        </p>
        <p className="text-slate-400 mb-10 max-w-lg mx-auto">
          Una entrevista guiada transforma tu conocimiento en un <strong className="text-white">Prompt Master</strong> técnico, listo para que otra IA construya la herramienta que necesitas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/auth/login"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
          >
            Empezar gratis
          </Link>
          <Link
            href="/dashboard"
            className="border border-white/20 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
          >
            Mis proyectos
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
              title: "Entrevista inteligente",
              desc: "El Arquitecto hace una pregunta a la vez para extraer el problema real.",
            },
            {
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              title: "Resumen estructurado",
              desc: "Genera un resumen editable que puedes confirmar o corregir.",
            },
            {
              icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              title: "Descarga el .md",
              desc: "Obtén el Prompt Master técnico para usar en cualquier IA constructora.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white/10 backdrop-blur rounded-2xl p-5">
              <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
