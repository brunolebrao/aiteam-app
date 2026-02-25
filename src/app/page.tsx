import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Title */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">
              🤖 AI Team
            </h1>
            <p className="text-xl text-purple-200">
              Seu time de desenvolvimento com agentes de IA
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-12 border border-white/20">
            <p className="text-lg text-white mb-6">
              Gerencie projetos de desenvolvimento com a ajuda de agentes especializados:
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">👩‍💼</div>
                <div className="text-sm text-white font-semibold">Anna</div>
                <div className="text-xs text-purple-200">Product Owner</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">🧑‍🏫</div>
                <div className="text-sm text-white font-semibold">Frank</div>
                <div className="text-xs text-purple-200">Scrum Master</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-sm text-white font-semibold">Rask</div>
                <div className="text-xs text-purple-200">UX Designer</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">👨‍💻</div>
                <div className="text-sm text-white font-semibold">Bruce</div>
                <div className="text-xs text-purple-200">Developer</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm text-white font-semibold">Ali</div>
                <div className="text-xs text-purple-200">QA Engineer</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <a
                href="https://github.com/brunolebrao/aiteam-app"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Ver no GitHub
              </a>
              <Link
                href="/dashboard"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Acessar Dashboard
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Board Kanban</h3>
              <p className="text-sm text-purple-200">
                Gerencie tasks visualmente com drag & drop
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="text-lg font-semibold text-white mb-2">IA Inteligente</h3>
              <p className="text-sm text-purple-200">
                Seleção automática de modelo por complexidade
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">Automação</h3>
              <p className="text-sm text-purple-200">
                PRs criadas automaticamente ao concluir tasks
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-purple-300 text-sm">
            <p>Desenvolvido em São Paulo • 2026</p>
          </div>
        </div>
      </div>
    </div>
  )
}
