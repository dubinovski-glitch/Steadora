import { CheckCircle } from 'lucide-react'

interface ToastItem { id: string; text: string }
interface Props { toasts: ToastItem[] }

// Fixed top-right stack rendering transient toast notifications; renders nothing when empty.
export function ToastStack({ toasts }: Props) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="toast-enter flex items-start gap-2.5 bg-inverse text-text-inverse px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs pointer-events-auto">
          <CheckCircle size={15} className="shrink-0 mt-0.5 opacity-80" />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
