import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const columns = [
  { id: 'today', title: 'Today', color: 'border-t-teal-400', accent: '#2dd4bf' },
  { id: 'tomorrow', title: 'Tomorrow', color: 'border-t-blue-400', accent: '#60a5fa' },
  { id: 'week', title: 'This week', color: 'border-t-purple-400', accent: '#c084fc' },
  { id: 'unassigned', title: 'Unassigned', color: 'border-t-pink-400', accent: '#f472b6' },
]

export function PlannerPage() {
  const { tasks, themes, addTask, updateTask, removeTask, finishTask } = useOutletContext()
  const [editor, setEditor] = useState(null)
  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [gemValue, setGemValue] = useState(1)
  const [themeId, setThemeId] = useState('')

  const openEditor = (column, task = null) => { setSelected(null); setEditor({ column, task }); setName(task?.name || ''); setTime(task?.time || ''); setDescription(task?.description || ''); setGemValue(task?.gems ?? 1); setThemeId(task?.themeId || themes[0]?.id || '') }
  const saveTask = (event) => {
    event.preventDefault()
    if (!name.trim() || !themeId) return
    const task = { id: editor.task?.id || crypto.randomUUID(), name: name.trim(), time: time.trim(), description: description.trim(), gems: Number(gemValue), themeId }
    if (editor.task) updateTask(editor.column, task); else addTask(editor.column, task)
    setEditor(null)
  }
  const closeActionMenu = () => setSelected(null)
  const completeSelected = () => { finishTask(selected.column, selected.task); closeActionMenu() }
  const deleteSelected = () => { removeTask(selected.column, selected.task.id); closeActionMenu() }

  return <>
    <div className="mb-6"><p className="theme-accent text-sm font-semibold uppercase tracking-widest">Your quest board</p><h1 className="page-title text-3xl font-black md:text-4xl">Make today count.</h1></div>
    <section className="grid gap-8 sm:grid-cols-2 xl:-mr-8 xl:grid-cols-4">
      {columns.map((column) => <article key={column.id} className={`parchment-surface rounded-2xl border border-t-4 ${column.color} p-3 shadow-sm`}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{column.title}</h2><span className="badge badge-ghost badge-sm">{tasks[column.id].length}/9</span></div>
        <div className="space-y-2">
          {tasks[column.id].map((task) => { const taskTheme = themes.find((theme) => theme.id === task.themeId); return <button key={task.id} onClick={() => setSelected({ column: column.id, task })} className="parchment-task task-row border-l-4" style={taskTheme ? { borderLeftColor: taskTheme.color } : undefined}>{task.time && <span className="badge time-badge shrink-0 border-0 font-semibold" style={{ '--column-color': column.accent }}>{task.time}</span>}<span className="min-w-0 flex-1 truncate font-medium">{task.name}</span><span className="text-sm whitespace-nowrap">💎 {task.gems}</span></button> })}
          {Array.from({ length: Math.max(0, 9 - tasks[column.id].length) }).map((_, index) => <button key={index} onClick={() => openEditor(column.id)} className="parchment-muted parchment-task task-row border-dashed"><span className="text-lg">+</span> Add quest</button>)}
        </div>
      </article>)}
    </section>

    <dialog className={`modal ${selected ? 'modal-open' : ''}`}><div className="parchment-surface modal-box"><button onClick={closeActionMenu} className="parchment-close btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button><h2 className="text-xl font-bold">{selected?.task.name}</h2><p className="mt-1 text-sm opacity-70">Choose what happens to this quest.</p><div className="mt-6 grid gap-3"><button onClick={completeSelected} className="btn parchment-button">Finish · earn {selected?.task.gems} 💎</button><button onClick={() => openEditor(selected.column, selected.task)} className="btn parchment-button">Edit</button><button onClick={deleteSelected} className="btn parchment-button">Delete</button></div></div></dialog>
    <dialog className={`modal ${editor ? 'modal-open' : ''}`}><form method="dialog" onSubmit={saveTask} className="parchment-surface modal-box"><button onClick={() => setEditor(null)} type="button" className="parchment-close btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button><h2 className="text-xl font-bold">{editor?.task ? 'Edit quest' : 'Add a quest'}</h2><label className="form-control mt-5"><span className="label-text mb-2 font-semibold">Quest name</span><textarea autoFocus value={name} onChange={(event) => setName(event.target.value)} className="parchment-field textarea textarea-bordered min-h-24 w-full" placeholder="e.g. Review science notes" maxLength="500" /></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Time</span><input type="text" value={time} onChange={(event) => setTime(event.target.value)} className="parchment-field input input-bordered w-full" placeholder="e.g. 6:00 PM" maxLength="40" /></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="parchment-field textarea textarea-bordered min-h-20 w-full" placeholder="Add details about this quest" maxLength="1000" /></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Gem count</span><select value={gemValue} onChange={(event) => setGemValue(event.target.value)} className="parchment-field select select-bordered w-full">{[0, 1, 2, 3].map((value) => <option key={value} value={value}>({value}) {value ? '💎 '.repeat(value) : 'No gems'}</option>)}</select></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Theme</span><select value={themeId} onChange={(event) => setThemeId(event.target.value)} className="parchment-field select select-bordered w-full" required><option value="" disabled>{themes.length ? 'Choose a theme' : 'Add a theme from Logs first'}</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label><div className="modal-action"><button type="button" className="btn parchment-button" onClick={() => setEditor(null)}>Cancel</button><button className="btn parchment-button" type="submit" disabled={!themes.length}>{editor?.task ? 'Save changes' : 'Add quest'}</button></div></form></dialog>
  </>
}
