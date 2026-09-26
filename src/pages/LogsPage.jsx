import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const EMPTY_SLOTS = 4

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function textColor(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
  const brightness = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000
  return brightness > 155 ? '#432f22' : '#fff9ef'
}

export function LogsPage() {
  const { logs, themes, addTheme, updateTheme, deleteTheme } = useOutletContext()
  const [editor, setEditor] = useState(undefined)
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#8b5cf6')
  const dates = Object.keys(logs).sort((a, b) => b.localeCompare(a))
  const slots = [...themes, ...Array.from({ length: Math.max(0, EMPTY_SLOTS - themes.length) }, () => null)]

  const openEditor = (theme = null) => { setSelectedTheme(null); setEditor(theme); setName(theme?.name || ''); setColor(theme?.color || '#8b5cf6') }
  const closeEditor = () => setEditor(undefined)
  const saveTheme = (event) => {
    event.preventDefault()
    const hex = color.trim()
    if (!name.trim() || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const theme = { id: editor?.id || crypto.randomUUID(), name: name.trim(), color: hex }
    if (editor) updateTheme(theme); else addTheme(theme)
    closeEditor()
  }
  const removeTheme = () => { deleteTheme(selectedTheme.id); setSelectedTheme(null) }

  return <section className="logs-board xl:-mr-8">
    <div className="mb-6"><p className="theme-accent text-sm font-semibold uppercase tracking-widest">Completed quests</p><h1 className="page-title text-3xl font-black md:text-4xl">Your quest log</h1><p className="mt-2 text-sm opacity-70">Right-click a theme column to edit or delete it.</p></div>
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(18rem,1fr))]">
      {slots.map((theme, index) => theme ? <ThemeColumn key={theme.id} theme={theme} dates={dates} logs={logs} onContextMenu={(event) => { event.preventDefault(); setSelectedTheme(theme) }} /> : <button key={`empty-${index}`} onClick={() => openEditor()} className="theme-empty-surface flex min-h-[calc(100vh+10rem)] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center shadow-sm transition hover:-translate-y-0.5"><span className="text-3xl">+</span><span className="mt-2 font-semibold">Add theme</span></button>)}
    </div>
    <dialog className={`modal ${selectedTheme ? 'modal-open' : ''}`}><div className="parchment-surface modal-box"><button onClick={() => setSelectedTheme(null)} className="parchment-close btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button><h2 className="text-xl font-bold">{selectedTheme?.name}</h2><p className="mt-1 text-sm opacity-70">Manage this quest theme.</p><div className="mt-6 grid gap-3"><button onClick={() => openEditor(selectedTheme)} className="btn parchment-button">Edit theme</button><button onClick={removeTheme} className="btn parchment-button">Delete theme</button></div></div></dialog>
    <dialog className={`modal ${editor !== undefined ? 'modal-open' : ''}`}><form method="dialog" onSubmit={saveTheme} className="parchment-surface modal-box"><button onClick={closeEditor} type="button" className="parchment-close btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button><h2 className="text-xl font-bold">{editor ? 'Edit theme' : 'Add a theme'}</h2><p className="mt-1 text-sm opacity-70">Use themes to group related quests in your log.</p><label className="form-control mt-5"><span className="label-text mb-2 font-semibold">Theme name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="parchment-field input input-bordered w-full" placeholder="e.g. Summer Program" maxLength="40" /></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Color (hex)</span><div className="flex gap-2"><input value={color} onChange={(event) => setColor(event.target.value)} className="parchment-field input input-bordered min-w-0 flex-1" placeholder="#22a06b" maxLength="7" /><input aria-label="Theme color preview" type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#8b5cf6'} onChange={(event) => setColor(event.target.value)} className="h-12 w-14 cursor-pointer rounded-lg border border-base-content/20 bg-transparent p-1" /></div></label><div className="modal-action"><button type="button" className="btn parchment-button" onClick={closeEditor}>Cancel</button><button className="btn parchment-button" type="submit">{editor ? 'Save changes' : 'Add theme'}</button></div></form></dialog>
  </section>
}

function ThemeColumn({ theme, dates, logs, onContextMenu }) {
  return <article onContextMenu={onContextMenu} className="min-h-[calc(100vh+10rem)] rounded-2xl border border-t-4 p-4 shadow-sm" style={{ backgroundColor: theme.color, borderColor: theme.color, color: textColor(theme.color) }}>
    <div className="mb-4 flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.color }} /><h2 className="min-w-0 flex-1 truncate text-lg font-bold">{theme.name}</h2></div>
    <div className="space-y-2">{dates.length ? dates.map((date) => { const tasks = logs[date].filter((task) => task.themeId === theme.id); return <details key={date} className="parchment-entry rounded-xl border"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold">{formatDate(date)} <span className="opacity-60">({tasks.length})</span></summary><div className="border-t border-current/15 px-3 pb-3">{tasks.length ? <ul className="space-y-2 pt-3">{tasks.map((task) => <li key={`${task.id}-${task.completedAt}`} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{task.name}</span><span className="whitespace-nowrap">💎 {task.gems}</span></li>)}</ul> : <p className="pt-3 text-sm opacity-60">No completed quests.</p>}</div></details> }) : <p className="parchment-muted parchment-entry rounded-xl border border-dashed p-3 text-sm">Finish a quest to start your log.</p>}</div>
  </article>
}
