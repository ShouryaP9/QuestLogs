import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabaseClient'
import { AuthScreen } from './AuthScreen'

const navClass = ({ isActive }) => `btn btn-ghost btn-sm ${isActive ? 'btn-active theme-accent' : ''}`
const themeOrder = ['synthwave', 'aqua', 'frost', 'light']
const themeIcon = { synthwave: '☾', aqua: '✦', frost: '❄', light: '𖤓' }
const emptyTasks = { today: [], tomorrow: [], week: [], unassigned: [] }

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

// --- row <-> app-state mappers -------------------------------------------
const taskFromRow = (row) => ({ id: row.id, name: row.name, time: row.time || '', description: row.description || '', gems: row.gems, themeId: row.theme_id, position: row.position })
const themeFromRow = (row) => ({ id: row.id, name: row.name, color: row.color })
const logFromRow = (row) => ({ id: row.id, name: row.name, gems: row.gems, themeId: row.theme_id, completedAt: row.completed_at })

function groupTasks(rows) {
  const grouped = { today: [], tomorrow: [], week: [], unassigned: [] }
  for (const row of rows) grouped[row.column_id]?.push(taskFromRow(row))
  for (const column of Object.keys(grouped)) grouped[column].sort((a, b) => a.position - b.position)
  return grouped
}

function groupLogs(rows) {
  const grouped = {}
  for (const row of rows) { const date = row.completed_date; (grouped[date] ??= []).push(logFromRow(row)) }
  for (const date of Object.keys(grouped)) grouped[date].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
  return grouped
}

export function AppLayout() {
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('questlogs-color-mode') || 'synthwave')
  const [session, setSession] = useState(undefined) // undefined = still checking, null = signed out
  const [tasks, setTasks] = useState(emptyTasks)
  const [logs, setLogs] = useState({})
  const [themes, setThemes] = useState([])
  const [gems, setGems] = useState(0)
  const [goal, setGoalState] = useState(100)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [syncError, setSyncError] = useState(null)

  useEffect(() => { document.documentElement.dataset.theme = colorMode; localStorage.setItem('questlogs-color-mode', colorMode) }, [colorMode])

  // --- auth session -------------------------------------------------------
  useEffect(() => {
    if (!supabaseConfigured) { setSession(null); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  // --- initial load + realtime subscriptions ------------------------------
  useEffect(() => {
    if (!userId) { setDataLoaded(false); return }
    let cancelled = false

    async function load(attempt = 0) {
      const [taskRes, themeRes, logRes, settingsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('themes').select('*').eq('user_id', userId),
        supabase.from('completed_tasks').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      ])
      if (cancelled) return
      const failure = taskRes.error || themeRes.error || logRes.error || settingsRes.error
      if (failure) {
        // Never render an empty app on a failed fetch (it looks identical to "your data is gone").
        // Retry a few times with backoff first — e.g. a Supabase free-tier project waking from its
        // idle pause can take a few seconds before it accepts queries again.
        if (attempt < 4) { setTimeout(() => load(attempt + 1), 1000 * (attempt + 1)); return }
        setLoadError(failure.message || 'Could not load your quests.')
        return
      }
      setLoadError(null)
      setTasks(groupTasks(taskRes.data || []))
      setThemes((themeRes.data || []).map(themeFromRow))
      setLogs(groupLogs(logRes.data || []))
      if (settingsRes.data) { setGems(settingsRes.data.gems); setGoalState(settingsRes.data.gem_goal) }
      else { await supabase.from('user_settings').upsert({ user_id: userId, gems: 0, gem_goal: 100 }, { onConflict: 'user_id', ignoreDuplicates: true }); setGems(0); setGoalState(100) }
      setDataLoaded(true)
    }
    load()

    const channel = supabase.channel(`sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, (payload) => {
        setTasks((current) => {
          const next = { today: [...current.today], tomorrow: [...current.tomorrow], week: [...current.week], unassigned: [...current.unassigned] }
          for (const column of Object.keys(next)) next[column] = next[column].filter((task) => task.id !== payload.new?.id && task.id !== payload.old?.id)
          if (payload.eventType !== 'DELETE') next[payload.new.column_id].push(taskFromRow(payload.new))
          for (const column of Object.keys(next)) next[column].sort((a, b) => a.position - b.position)
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'themes', filter: `user_id=eq.${userId}` }, (payload) => {
        setThemes((current) => {
          const withoutRow = current.filter((theme) => theme.id !== (payload.new?.id || payload.old?.id))
          return payload.eventType === 'DELETE' ? withoutRow : [...withoutRow, themeFromRow(payload.new)]
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'completed_tasks', filter: `user_id=eq.${userId}` }, (payload) => {
        setLogs((current) => {
          const next = { ...current }
          for (const date of Object.keys(next)) next[date] = next[date].filter((log) => log.id !== (payload.new?.id || payload.old?.id))
          if (payload.eventType !== 'DELETE') { const date = payload.new.completed_date; next[date] = [...(next[date] || []), logFromRow(payload.new)] }
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.new) { setGems(payload.new.gems); setGoalState(payload.new.gem_goal) }
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [userId, retryTick])

  // --- mutations (optimistic local update + write to Supabase) -----------
  const reportIfFailed = (promise, what) => { promise.then(({ error }) => { if (error) setSyncError(`Couldn't save (${what}): ${error.message}`) }) }
  const addTask = (column, task) => {
    setTasks((current) => ({ ...current, [column]: [...current[column], { ...task, position: Date.now() }] }))
    reportIfFailed(supabase.from('tasks').insert({ id: task.id, user_id: userId, column_id: column, name: task.name, time: task.time, description: task.description, gems: task.gems, theme_id: task.themeId || null, position: Date.now() }), 'add quest')
  }
  const updateTask = (column, updatedTask) => {
    setTasks((current) => ({ ...current, [column]: current[column].map((task) => task.id === updatedTask.id ? { ...task, ...updatedTask } : task) }))
    reportIfFailed(supabase.from('tasks').update({ name: updatedTask.name, time: updatedTask.time, description: updatedTask.description, gems: updatedTask.gems, theme_id: updatedTask.themeId || null }).eq('id', updatedTask.id), 'edit quest')
  }
  const removeTask = (column, id) => {
    setTasks((current) => ({ ...current, [column]: current[column].filter((task) => task.id !== id) }))
    reportIfFailed(supabase.from('tasks').delete().eq('id', id), 'delete quest')
  }
  const finishTask = (column, task) => {
    removeTask(column, task.id)
    const date = localDateKey()
    const completedAt = new Date().toISOString()
    const logId = crypto.randomUUID()
    setLogs((current) => ({ ...current, [date]: [{ id: logId, name: task.name, gems: task.gems, themeId: task.themeId, completedAt }, ...(current[date] || [])] }))
    const newGems = gems + task.gems
    setGems(newGems)
    reportIfFailed(supabase.from('completed_tasks').insert({ id: logId, user_id: userId, name: task.name, gems: task.gems, theme_id: task.themeId || null, completed_date: date, completed_at: completedAt }), 'log finished quest')
    reportIfFailed(supabase.from('user_settings').update({ gems: newGems }).eq('user_id', userId), 'update gem total')
  }
  const rolloverToToday = () => {
    const todayIds = tasks.today.map((task) => task.id)
    const tomorrowIds = tasks.tomorrow.map((task) => task.id)
    const carriedOver = tasks.tomorrow.map((task, index) => ({ ...task, id: crypto.randomUUID(), position: Date.now() + index }))
    setTasks((current) => ({ ...current, today: carriedOver, tomorrow: [] }))
    if (todayIds.length) reportIfFailed(supabase.from('tasks').delete().in('id', todayIds), 'clear today')
    if (carriedOver.length) reportIfFailed(supabase.from('tasks').insert(carriedOver.map((task) => ({ id: task.id, user_id: userId, column_id: 'today', name: task.name, time: task.time, description: task.description, gems: task.gems, theme_id: task.themeId || null, position: task.position }))), 'copy tomorrow into today')
    if (tomorrowIds.length) reportIfFailed(supabase.from('tasks').delete().in('id', tomorrowIds), 'clear tomorrow')
  }
  const addTheme = (theme) => {
    setThemes((current) => [...current, theme])
    reportIfFailed(supabase.from('themes').insert({ id: theme.id, user_id: userId, name: theme.name, color: theme.color }), 'add theme')
  }
  const updateTheme = (updatedTheme) => {
    setThemes((current) => current.map((theme) => theme.id === updatedTheme.id ? updatedTheme : theme))
    reportIfFailed(supabase.from('themes').update({ name: updatedTheme.name, color: updatedTheme.color }).eq('id', updatedTheme.id), 'edit theme')
  }
  const deleteTheme = (id) => {
    setThemes((current) => current.filter((theme) => theme.id !== id))
    setTasks((current) => Object.fromEntries(Object.entries(current).map(([column, columnTasks]) => [column, columnTasks.map((task) => task.themeId === id ? { ...task, themeId: null } : task)])))
    setLogs((current) => Object.fromEntries(Object.entries(current).map(([date, dateTasks]) => [date, dateTasks.map((task) => task.themeId === id ? { ...task, themeId: null } : task)])))
    reportIfFailed(supabase.from('themes').delete().eq('id', id), 'delete theme') // FK "on delete set null" clears theme_id on tasks/completed_tasks server-side
  }
  const setGoal = (nextGoal) => {
    setGoalState(nextGoal)
    reportIfFailed(supabase.from('user_settings').update({ gem_goal: nextGoal }).eq('user_id', userId), 'update gem goal')
  }
  const signOut = () => supabase.auth.signOut()

  const context = useMemo(() => ({ tasks, logs, themes, gems, goal, addTask, updateTask, removeTask, finishTask, rolloverToToday, addTheme, updateTheme, deleteTheme, setGoal }), [tasks, logs, themes, gems, goal])

  if (session === undefined) return <div className="app-shell flex min-h-screen items-center justify-center bg-base-200 text-base-content">Loading…</div>
  if (!session) return <AuthScreen />
  if (loadError) return <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 px-4 text-center text-base-content"><p className="max-w-sm text-sm opacity-80">Couldn't load your quests: {loadError}. Your data is safe on the server — this is just a connection hiccup.</p><button type="button" className="btn parchment-button" onClick={() => { setLoadError(null); setRetryTick((tick) => tick + 1) }}>Try again</button></div>
  if (!dataLoaded) return <div className="app-shell flex min-h-screen items-center justify-center bg-base-200 text-base-content">Loading your quests…</div>

  return (
    <div className="app-shell min-h-screen bg-base-200 text-base-content">
      <header className="app-header navbar sticky top-0 z-20 border-b border-base-content/10 bg-base-100/85 px-4 shadow-sm backdrop-blur md:px-8">
        <div className="navbar-start"><NavLink to="/planner" className="text-xl font-black tracking-tight"><span className="brand-quest">Quest</span><span className="theme-accent">Logs</span></NavLink></div>
        <nav className="navbar-center hidden gap-2 md:flex" aria-label="Main navigation"><NavLink to="/planner" className={navClass}>Planner</NavLink><NavLink to="/logs" className={navClass}>Logs</NavLink><NavLink to="/progress" className={navClass}>Progress</NavLink></nav>
        <div className="navbar-end gap-2">
          <span className="badge badge-lg gap-1 border-primary/30 bg-primary/10 px-3 font-bold" title="Gems earned">💎 {gems}</span>
          <button type="button" className="btn btn-ghost btn-circle btn-sm text-lg" style={colorMode === 'light' ? { color: '#FFD700' } : undefined} title={`Theme: ${colorMode} (click to switch)`} aria-label={`Switch theme, currently ${colorMode}`} onClick={() => setColorMode(themeOrder[(themeOrder.indexOf(colorMode) + 1) % themeOrder.length])}>{themeIcon[colorMode]}</button>
          <button type="button" onClick={signOut} className="btn btn-ghost btn-sm" title="Sign out">Sign out</button>
        </div>
      </header>
      {syncError && <div className="flex items-center justify-between gap-3 border-b border-error/30 bg-error/10 px-4 py-2 text-sm text-error md:px-8"><span>{syncError}</span><button type="button" onClick={() => setSyncError(null)} className="btn btn-ghost btn-xs">✕</button></div>}
      <main className="app-page mx-auto w-full max-w-7xl px-4 pt-6 md:px-8"><Outlet context={context} /></main>
      <nav className="app-nav btm-nav fixed z-30 border-t border-base-content/10 bg-base-100 md:hidden" aria-label="Main navigation"><NavLink to="/planner" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">☷</span><span className="btm-nav-label">Planner</span></NavLink><NavLink to="/logs" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">◷</span><span className="btm-nav-label">Logs</span></NavLink><NavLink to="/progress" className={({ isActive }) => isActive ? 'active theme-accent' : ''}><span className="text-lg">↗</span><span className="btm-nav-label">Progress</span></NavLink></nav>
    </div>
  )
}
