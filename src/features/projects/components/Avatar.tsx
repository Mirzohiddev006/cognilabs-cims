import { cn } from '../../../shared/lib/cn'
import { translateCurrent } from '../../../shared/i18n/translations'
import { getInitials, stringToHue } from '../lib/format'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

type AvatarProps = {
  name?: string | null
  surname?: string | null
  imageUrl?: string | null
  size?: AvatarSize
  className?: string
  title?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function Avatar({ name, surname, imageUrl, size = 'md', className, title }: AvatarProps) {
  const displayName = [name, surname]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ') || translateCurrent('projects.unknown_user', 'Unknown user')
  const initials = getInitials(name, surname)
  const hue = stringToHue(displayName)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title ?? displayName}
        title={title ?? displayName}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    )
  }

  return (
    <span
      title={title ?? displayName}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        sizeClasses[size],
        className,
      )}
      style={{
        background: `hsl(${hue}, 55%, 20%)`,
        color: `hsl(${hue}, 75%, 72%)`,
        boxShadow: `0 0 0 2px hsl(${hue}, 40%, 14%)`,
      }}
      aria-label={title ?? displayName}
    >
      {initials}
    </span>
  )
}

type AvatarGroupProps = {
  users: Array<{ id: number; name?: string | null; surname?: string | null; email: string; profile_image?: string | null }>
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({ users, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, idx) => (
        <div
          key={user.id}
          className="ring-2 ring-[var(--surface)] rounded-full"
          style={{ marginLeft: idx === 0 ? 0 : '-6px', zIndex: visible.length - idx }}
        >
          <Avatar name={user.name} surname={user.surname} imageUrl={user.profile_image} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--muted-strong)] ring-2 ring-[var(--surface)] select-none',
            sizeClasses[size],
          )}
          style={{ marginLeft: '-6px', fontSize: '9px' }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
