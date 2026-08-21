export default function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 h-[52px] bg-surface border-b border-line flex items-center px-6 gap-3">
      <div className="font-display text-[15px] font-bold text-white flex-1">{title}</div>
      {actions}
    </div>
  )
}
