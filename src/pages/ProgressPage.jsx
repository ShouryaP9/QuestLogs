import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const BLUE = '#38bdf8'

function shortDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function ProgressPage() {
  const { logs, themes } = useOutletContext()
  const [goal, setGoal] = useState(() => Number(localStorage.getItem('questlogs-goal') || 100))
  const daily = useMemo(() => Object.entries(logs).map(([date, tasks]) => ({ date, gems: tasks.reduce((total, task) => total + task.gems, 0) })).sort((a, b) => a.date.localeCompare(b.date)), [logs])
  const total = daily.reduce((sum, day) => sum + day.gems, 0)
  const distribution = useMemo(() => { const maximum = Math.max(3, ...daily.map((day) => day.gems)); return Array.from({ length: maximum + 1 }, (_, gems) => ({ gems, days: daily.filter((day) => day.gems === gems).length })) }, [daily])
  const byTheme = useMemo(() => themes.map((theme) => ({ ...theme, gems: daily.flatMap((day) => logs[day.date]).filter((task) => task.themeId === theme.id).reduce((sum, task) => sum + task.gems, 0) })), [daily, logs, themes])

  useEffect(() => localStorage.setItem('questlogs-goal', String(goal)), [goal])

  return <section className="mx-auto w-full max-w-7xl"><div><p className="theme-accent text-sm font-semibold uppercase tracking-widest">Quest statistics</p><h1 className="text-3xl font-black md:text-4xl">Progress.</h1></div><div className="mt-12 max-w-2xl"><div className="flex items-center gap-4"><progress className="quest-progress progress h-8 flex-1" value={Math.min(total, goal || 1)} max={goal || 1} /><span className="text-lg font-black">x{total}</span></div><label className="form-control mt-8 max-w-sm"><span className="label-text mb-2 font-semibold">Gem goal</span><input type="number" min="1" value={goal} onChange={(event) => setGoal(Math.max(1, Number(event.target.value) || 1))} className="input input-bordered" /></label></div><div className="mt-14 space-y-12"><LineChart daily={daily} /><div className="grid gap-12 md:grid-cols-2"><BarChart title="Days by gems earned" values={distribution} label={(item) => `${item.gems} gems`} valueKey="days" color={BLUE} empty="Finish quests to see your daily gem distribution." /><BarChart title="Gems by theme" values={byTheme} label={(item) => item.name} valueKey="gems" color={(item) => item.color} empty="Add themes and finish quests to see this chart." /></div></div></section>
}

function LineChart({ daily }) {
  const width = 1000
  const height = 260
  const pad = { left: 56, right: 24, top: 24, bottom: 44 }
  const maximum = Math.max(3, ...daily.map((day) => day.gems))
  const x = (index) => pad.left + (daily.length < 2 ? 0 : index * ((width - pad.left - pad.right) / (daily.length - 1)))
  const y = (value) => height - pad.bottom - (value / maximum) * (height - pad.top - pad.bottom)
  const path = daily.map((day, index) => `${index ? 'L' : 'M'}${x(index)},${y(day.gems)}`).join(' ')
  return <figure><figcaption className="mb-4 text-xl font-bold">Gems earned each day</figcaption>{daily.length ? <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Line graph of gems earned each day"><line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="currentColor" opacity=".35" /><line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="currentColor" opacity=".35" /><text x="8" y={pad.top + 4} fill="currentColor" fontSize="12">{maximum} gems</text><text x="18" y={height - pad.bottom + 4} fill="currentColor" fontSize="12">0</text><path d={path} fill="none" stroke={BLUE} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />{daily.map((day, index) => <g key={day.date}><circle cx={x(index)} cy={y(day.gems)} r="5" fill={BLUE}><title>{`${shortDate(day.date)}: ${day.gems} gems`}</title></circle><text x={x(index)} y={height - 14} textAnchor="middle" fill="currentColor" fontSize="12">{shortDate(day.date)}</text></g>)}</svg> : <EmptyChart text="Finish quests to begin tracking your daily gems." />}</figure>
}

function BarChart({ title, values, label, valueKey, color, empty }) {
  const maximum = Math.max(1, ...values.map((item) => item[valueKey]))
  return <figure><figcaption className="mb-4 text-xl font-bold">{title}</figcaption>{values.length ? <div className="border-b border-base-content/30 px-2"><div className="flex h-64 items-end gap-3">{values.map((item) => <div key={label(item)} className="flex h-full min-w-0 flex-1 flex-col justify-end"><span className="mb-1 text-center text-xs font-semibold">{item[valueKey]}</span><div className="w-full rounded-t" style={{ height: `${Math.max(item[valueKey] ? 8 : 0, (item[valueKey] / maximum) * 86)}%`, backgroundColor: typeof color === 'function' ? color(item) : color }} /></div>)}</div><div className="flex gap-3 pt-2">{values.map((item) => <span key={label(item)} className="min-w-0 flex-1 truncate text-center text-xs">{label(item)}</span>)}</div></div> : <EmptyChart text={empty} />}</figure>
}

function EmptyChart({ text }) {
  return <div className="border-y border-base-content/20 py-8 text-sm opacity-70">{text}</div>
}
