import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Séance', icon: '🏋️' },
  { to: '/history', label: 'Historique', icon: '📅' },
  { to: '/exercises', label: 'Exercices', icon: '📈' },
  { to: '/activities', label: 'Sport', icon: '🏃' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              isActive ? 'text-indigo-400' : 'text-slate-500'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
