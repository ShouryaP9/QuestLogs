import { useOutletContext } from 'react-router-dom'

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function LogsPage() {
  const { logs } = useOutletContext()
  const dates = Object.keys(logs).sort((a, b) => b.localeCompare(a))
  return <section className="mx-auto max-w-3xl"><div className="mb-6"><p className="theme-accent text-sm font-semibold uppercase tracking-widest">Completed quests</p><h1 className="text-3xl font-black md:text-4xl">Your quest log.</h1></div>{dates.length === 0 ? <div className="rounded-3xl border border-dashed border-primary/40 bg-base-100 p-8 text-center shadow-sm"><div className="text-5xl">📜</div><h2 className="mt-4 text-xl font-bold">No completed quests yet.</h2><p className="mt-2 opacity-70">Finish a quest from the planner and it will appear here.</p></div> : <div className="space-y-3">{dates.map((date, index) => <details key={date} className="collapse collapse-arrow rounded-2xl border border-base-content/10 bg-base-100 shadow-sm" open={index === 0}><summary className="collapse-title flex items-center gap-3 font-bold"><span>{formatDate(date)}</span><span className="badge badge-ghost">{logs[date].length} {logs[date].length === 1 ? 'quest' : 'quests'}</span></summary><div className="collapse-content"><div className="divide-y divide-base-content/10">{logs[date].map((task) => <div key={`${task.id}-${task.completedAt}`} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0 truncate font-medium">{task.name}</span><span className="whitespace-nowrap text-sm">{'💎'.repeat(task.gems) || '—'} <span className="opacity-60">{task.gems}</span></span></div>)}</div></div></details>)}</div>}</section>
}
