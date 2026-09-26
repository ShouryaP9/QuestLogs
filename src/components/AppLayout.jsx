import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navClass = ({ isActive }) => `btn btn-ghost btn-sm ${isActive ? 'btn-active theme-accent' : ''}`
const themeOrder = ['synthwave', 'aqua', 'frost', 'light']
const themeIcon = { synthwave: '☾', aqua: '✦', frost: '❄', light: '𖤓' }
const starterTasks = { today: [{ id: 'test-quest', name: 'Test quest', gems: 1 }], tomorrow: [], week: [], unassigned: [] }
const starterThemes = []

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
  const [themes, setThemes] = useState(() => readSaved('questlogs-themes', starterThemes).filter((theme) => theme.id !== 'general'))

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('questlogs-theme', theme) }, [theme])
  useEffect(() => localStorage.setItem('questlogs-gems', String(gems)), [gems])
  useEffect(() => localStorage.setItem('questlogs-tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('questlogs-logs', JSON.stringify(logs)), [logs])
  useEffect(() => localStorage.setItem('questlogs-themes', JSON.stringify(themes)), [themes])

  const addTask = (column, task) => setTasks((current) => ({ ...current, [column]: [...current[column], task] }))
  const updateTask = (column, updatedTask) => setTasks((current) => ({ ...current, [column]: current[column].map((task) => task.id === updatedTask.id ? updatedTask : task) }))
  const removeTask = (column, id) => setTasks((current) => ({ ...current, [column]: current[column].filter((task) => task.id !== id) }))
  const finishTask = (column, task) => {
    removeTask(column, task.id)
    setGems((current) => current + task.gems)
    const date = localDateKey()
    setLogs((current) => ({ ...current, [date]: [{ ...task, completedAt: new Date().toISOString() }, ...(current[date] || [])] }))
  }
  const addTheme = (theme) => setThemes((current) => [...current, theme])
  const updateTheme = (updatedTheme) => setThemes((current) => current.map((theme) => theme.id === updatedTheme.id ? updatedTheme : theme))
  const deleteTheme = (id) => {
    setThemes((current) => current.filter((theme) => theme.id !== id))
    setTasks((current) => Object.fromEntries(Object.entries(current).map(([column, columnTasks]) => [column, columnTasks.map((task) => task.themeId === id ? { ...task, themeId: null } : task)])))
    setLogs((current) => Object.fromEntries(Object.entries(current).map(([date, dateTasks]) => [date, dateTasks.map((task) => task.themeId === id ? { ...task, themeId: null } : task)])))
  }

  return (
    <div className="app-shell min-h-screen bg-base-200 text-base-content">
      <header className="app-header navbar sticky top-0 z-20 border-b border-base-content/10 bg-base-100/85 px-4 shadow-sm backdrop-blur md:px-8">
        <div className="navbar-start"><NavLink to="/planner" className="text-xl font-black tracking-tight"><span className="brand-quest">Quest</span><span className="theme-accent">Logs</span></NavLink></div>
        <nav className="navbar-center hidden gap-2 md:flex" aria-label="Main navigation"><NavLink to="/planner" className={navClass}>Planner</NavLink><NavLink to="/logs" className={navClass}>Logs</NavLink><NavLink to="/progress" className={navClass}>Progress</NavLink></nav>
        <div className="navbar-end gap-2"><span className="badge badge-lg gap-1 border-primary/30 bg-primary/10 px-3 font-bold" title="Gems earned">💎 {gems}</span><button type="button" className="btn btn-ghost btn-circle btn-sm text-lg" style={theme === 'light' ? { color: '#FFD700' } : undefined} title={`Theme: ${theme} (click to switch)`} aria-label={`Switch theme, currently ${theme}`} onClick={() => setTheme(themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length])}>{themeIcon[theme]}</button></div>
      </header>
      <main className="app-page mx-auto w-full max-w-7xl px-4 pt-6 md:px-8"><Outlet context={{ tasks, logs, themes, addTask, updateTask, removeTask, finishTask, addTheme, updateTheme, deleteTheme }} /></main>
      <nav className="app-nav btm-nav fixed z-30 border-t border-base-content/10 bg-base-100 md:hidden" aria-label="Main navigation"><NavLink to="/planner" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">☷</span><span className="btm-nav-label">Planner</span></NavLink><NavLink to="/logs" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">◷</span><span className="btm-nav-label">Logs</span></NavLink><NavLink to="/progress" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">↗</span><span className="btm-nav-label">Progress</span></NavLink></nav>
    </div>
  )
}
