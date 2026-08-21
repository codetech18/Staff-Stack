import { initials, avatarColor } from '@/lib/format'

export function StatCard({ label, value, sub, valueClass = 'text-white' }: {
  label: string; value: string; sub?: React.ReactNode; valueClass?: string
}) {
  return (
    <div className="panel p-5 flex flex-col gap-1">
      <div className="font-mono text-[10px] uppercase tracking-wider text-mut">{label}</div>
      <div className={`font-display text-2xl font-extrabold leading-none ${valueClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-mut mt-0.5">{sub}</div>}
    </div>
  )
}

export function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'danger' | 'info'; children: React.ReactNode }) {
  const tones = {
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-accent/10 text-accent',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${tones[tone]}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function Avatar({ first, last, size = 32 }: { first: string; last: string; size?: number }) {
  return (
    <div
      className="rounded-lg grid place-items-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, background: avatarColor(first + last) }}
    >
      {initials(first, last)}
    </div>
  )
}

export function EmptyState({ icon, text, action }: { icon: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <div className="text-3xl mb-3 opacity-40">{icon}</div>
      <div className="text-sm text-mut mb-4">{text}</div>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="panel-head sticky top-0 bg-surface z-10">
          <div className="panel-title">{title}</div>
          <button onClick={onClose} className="text-mut hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="w-6 h-6 border-2 border-line2 border-t-accent rounded-full animate-spin mx-auto my-8" />
}
