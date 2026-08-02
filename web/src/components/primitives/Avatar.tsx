interface Props {
  initials?: string | null
  color?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
}

// Tailwind size presets mapping the size prop to width/height/font classes.
const sizeMap = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
// Named color keys -> hex background values; unknown colors fall through to the raw value.
const colorMap: Record<string, string> = {
  blue: '#2b5fff', green: '#1f8a4c', purple: '#6c3eb8',
  amber: '#d97706', pink: '#e91e8c', teal: '#0d9488',
}

// Renders a circular user/group avatar showing initials on a colored background.
// Resolves the background color from the named map (or raw value), defaulting to grey.
export function Avatar({ initials, color, name, size = 'md' }: Props) {
  const bg = color ? (colorMap[color] ?? color) : '#8a93a4'
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none`}
      style={{ backgroundColor: bg }}
      title={name ?? undefined}
    >
      {initials ?? '?'}
    </div>
  )
}
