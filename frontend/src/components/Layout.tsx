import { NavLink, Outlet } from 'react-router-dom'
import { FileText, LayoutDashboard } from 'lucide-react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30'
      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
  }`

export function Layout() {
  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/95 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800/80 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-900/40">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              PagePilot
            </p>
            <p className="text-xs text-slate-500">Document intelligence</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
        </nav>
        <div className="border-t border-slate-800/80 p-4 text-xs text-slate-500">
          Connected to{' '}
          <span className="font-mono text-slate-400">localhost:8000</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white">PagePilot</span>
          </div>
          <nav className="ml-auto flex gap-2">
            <NavLink
              to="/"
              end
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
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
