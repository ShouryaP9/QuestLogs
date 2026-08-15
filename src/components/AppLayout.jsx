import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navClass = ({ isActive }) => `btn btn-ghost btn-sm ${isActive ? 'btn-active theme-accent' : ''}`
const starterTasks = { today: [{ id: 'test-quest', name: 'Test quest', gems: 1 }], tomorrow: [], week: [], unassigned: [] }

function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function AppLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem('questlogs-theme') || 'synthwave')
  const [gems, setGems] = useState(() => Number(localStorage.getItem('questlogs-gems') || 0))
  const [tasks, setTasks] = useState(() => readSaved('questlogs-tasks', starterTasks))
  const [logs, setLogs] = useState(() => readSaved('questlogs-logs', {}))

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('questlogs-theme', theme) }, [theme])
  useEffect(() => localStorage.setItem('questlogs-gems', String(gems)), [gems])
  useEffect(() => localStorage.setItem('questlogs-tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('questlogs-logs', JSON.stringify(logs)), [logs])

  const addTask = (column, task) => setTasks((current) => ({ ...current, [column]: [...current[column], task] }))
  const updateTask = (column, updatedTask) => setTasks((current) => ({ ...current, [column]: current[column].map((task) => task.id === updatedTask.id ? updatedTask : task) }))
  const removeTask = (column, id) => setTasks((current) => ({ ...current, [column]: current[column].filter((task) => task.id !== id) }))
  const finishTask = (column, task) => {
    removeTask(column, task.id)
    setGems((current) => current + task.gems)
    const date = localDateKey()
    setLogs((current) => ({ ...current, [date]: [{ ...task, completedAt: new Date().toISOString() }, ...(current[date] || [])] }))
  }

  return (
    <div className="app-shell min-h-screen bg-base-200 text-base-content">
      <header className="app-header navbar sticky top-0 z-20 border-b border-base-content/10 bg-base-100/85 px-4 shadow-sm backdrop-blur md:px-8">
        <div className="navbar-start"><NavLink to="/planner" className="text-xl font-black tracking-tight">Quest<span className="theme-accent">Logs</span></NavLink></div>
        <nav className="navbar-center hidden gap-2 md:flex" aria-label="Main navigation"><NavLink to="/planner" className={navClass}>Planner</NavLink><NavLink to="/logs" className={navClass}>Logs</NavLink></nav>
        <div className="navbar-end gap-2"><span className="badge badge-lg gap-1 border-primary/30 bg-primary/10 px-3 font-bold" title="Gems earned">💎 {gems}</span><label className="swap swap-rotate btn btn-ghost btn-circle btn-sm" title="Toggle theme"><input type="checkbox" checked={theme === 'aqua'} onChange={() => setTheme(theme === 'aqua' ? 'synthwave' : 'aqua')} /><span className="swap-off text-lg">☾</span><span className="swap-on text-lg">✦</span></label></div>
      </header>
      <main className="app-page mx-auto w-full max-w-7xl px-4 pt-6 md:px-8"><Outlet context={{ tasks, logs, addTask, updateTask, removeTask, finishTask }} /></main>
      <nav className="app-nav btm-nav fixed z-30 border-t border-base-content/10 bg-base-100 md:hidden" aria-label="Main navigation"><NavLink to="/planner" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">☷</span><span className="btm-nav-label">Planner</span></NavLink><NavLink to="/logs" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">◷</span><span className="btm-nav-label">Logs</span></NavLink></nav>
    </div>
  )
}
