import { useState } from 'react'

const columns = [
  { id: 'today', title: 'Today', color: 'border-t-teal-400' },
  { id: 'tomorrow', title: 'Tomorrow', color: 'border-t-blue-400' },
  { id: 'week', title: 'This week', color: 'border-t-purple-400' },
  { id: 'unassigned', title: 'Unassigned', color: 'border-t-pink-400' },
]
const initialTasks = { today: [{ id: 'test-quest', name: 'Test quest', gems: 1 }], tomorrow: [], week: [], unassigned: [] }

export function PlannerPage() {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeColumn, setActiveColumn] = useState(null)
  const [name, setName] = useState('')
  const [gemValue, setGemValue] = useState(1)

  const openTaskDialog = (column) => { setActiveColumn(column); setName(''); setGemValue(1) }
  const addTask = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setTasks((current) => ({ ...current, [activeColumn]: [...current[activeColumn], { id: crypto.randomUUID(), name: name.trim(), gems: Number(gemValue) }] }))
    setActiveColumn(null)
  }
  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="theme-accent text-sm font-semibold uppercase tracking-widest">Your quest board</p><h1 className="text-3xl font-black md:text-4xl">Make today count.</h1></div>
    </div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => <article key={column.id} className={`rounded-2xl border border-base-content/10 border-t-4 ${column.color} bg-base-100 p-3 shadow-sm`}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{column.title}</h2><span className="badge badge-ghost badge-sm">{tasks[column.id].length}/9</span></div>
        <div className="space-y-2">
          {tasks[column.id].map((task) => <div key={task.id} className="task-row"><span className="min-w-0 flex-1 truncate font-medium">{task.name}</span><span className="text-sm whitespace-nowrap">💎 {task.gems}</span></div>)}
          {Array.from({ length: Math.max(1, 9 - tasks[column.id].length) }).map((_, index) => <button key={index} onClick={() => openTaskDialog(column.id)} className="task-row border-dashed text-base-content/45"><span className="text-lg">+</span> Add quest</button>)}
        </div>
      </article>)}
    </section>
    <dialog className={`modal ${activeColumn ? 'modal-open' : ''}`}><form method="dialog" onSubmit={addTask} className="modal-box"><button onClick={() => setActiveColumn(null)} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button><h3 className="text-xl font-bold">Add a quest</h3><p className="mt-1 text-sm opacity-70">Start small. Every finish is progress.</p><label className="form-control mt-5"><span className="label-text mb-2 font-semibold">Quest name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="input input-bordered w-full" placeholder="e.g. Review science notes" maxLength="120" /></label><label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Gem count</span><select value={gemValue} onChange={(event) => setGemValue(event.target.value)} className="select select-bordered w-full">{[0, 1, 2, 3].map((value) => <option key={value} value={value}>{'💎 '.repeat(value) || 'No gems'} ({value})</option>)}</select></label><div className="modal-action"><button type="button" className="btn btn-ghost" onClick={() => setActiveColumn(null)}>Cancel</button><button className="btn theme-button" type="submit">Add quest</button></div></form></dialog>
  </>
}
