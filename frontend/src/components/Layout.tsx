import { NavLink, Outlet } from 'react-router-dom'
import { FileText, LayoutDashboard } from 'lucide-react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-[#ff0033]/10 text-[#ff1744] ring-1 ring-[#ff0033]/30 shadow-[0_0_12px_rgba(255,0,51,0.15)]'
      : 'text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200'
  }`

export function Layout() {
  return (
    <div className="flex min-h-dvh bg-[#050505] text-neutral-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#ff0033]/10 bg-[#0a0a0a] md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#ff0033]/10 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff0033]/15 shadow-[0_0_20px_rgba(255,0,51,0.25)] ring-1 ring-[#ff0033]/30">
            <FileText className="h-5 w-5 text-[#ff1744]" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white tron-glow-text">
              PagePilot
            </p>
            <p className="text-xs text-neutral-600">Document intelligence</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
        </nav>
        <div className="border-t border-[#ff0033]/10 p-4 text-xs text-neutral-600">
          Connected to{' '}
          <span className="font-mono text-[#ff0033]/70">localhost:8000</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-[#ff0033]/10 bg-[#0a0a0a]/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff0033]/15 ring-1 ring-[#ff0033]/30">
              <FileText className="h-4 w-4 text-[#ff1744]" />
            </div>
            <span className="font-semibold text-white tron-glow-text">PagePilot</span>
          </div>
          <nav className="ml-auto flex gap-2">
            <NavLink
              to="/"
              end
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:bg-white/[0.03] hover:text-white"
            >
              Home
            </NavLink>
          </nav>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
