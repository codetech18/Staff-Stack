export default function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`mb-4 rounded-lg p-3 text-xs ${error ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok'}`}
    >
      {message}
    </div>
  )
}
