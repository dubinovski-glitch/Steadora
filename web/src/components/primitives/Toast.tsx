interface ToastItem { id: string; text: string }
interface Props { toasts: ToastItem[] }

export function ToastStack({ toasts }: Props) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="toast-enter bg-inverse text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs pointer-events-auto">
          {t.text}
        </div>
      ))}
    </div>
  )
}
