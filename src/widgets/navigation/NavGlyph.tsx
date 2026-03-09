import type { SVGProps } from 'react'
import { cn } from '../../shared/lib/cn'
import type { GlyphName } from './navGlyphMap'

type NavGlyphProps = SVGProps<SVGSVGElement> & {
  name: GlyphName
}

function glyphPath(name: GlyphName) {
  switch (name) {
    case 'overview':
      return (
        <>
          <path d="M3.75 5.75h16.5v12.5H3.75z" />
          <path d="M8.25 10.25h3.5" />
          <path d="M8.25 13.75h7.5" />
        </>
      )
    case 'ceo':
      return (
        <>
          <path d="M4.75 18.25h14.5" />
          <path d="M6.25 18.25v-7l5-3.5 5 3.5v7" />
          <path d="M9.25 18.25v-4.5h3.5v4.5" />
        </>
      )
    case 'crm':
      return (
        <>
          <path d="M5.25 6.25h13.5v11.5H5.25z" />
          <path d="M8 10h8" />
          <path d="M8 13.5h5" />
          <circle cx="8.5" cy="8.5" r="1" />
        </>
      )
    case 'finance':
      return (
        <>
          <rect x="4.5" y="6" width="15" height="12" rx="2" />
          <path d="M8 12h8" />
          <path d="M8 9h3" />
          <path d="M8 15h5" />
        </>
      )
    case 'payment':
      return (
        <>
          <rect x="3.75" y="6.5" width="16.5" height="11" rx="2" />
          <path d="M3.75 10h16.5" />
          <path d="M7 14h3.5" />
        </>
      )
    case 'wordpress':
      return (
        <>
          <circle cx="12" cy="12" r="7.25" />
          <path d="M8.5 8.75c.7 3 2.1 6.1 3.5 8.5 1.5-2.5 2.7-5.4 3.5-8.5" />
          <path d="M9.75 8.75h4.5" />
        </>
      )
    case 'updates':
      return (
        <>
          <path d="M7.25 12l3 3 6-6" />
          <circle cx="12" cy="12" r="8" />
        </>
      )
    case 'integrations':
      return (
        <>
          <rect x="4.5" y="4.5" width="5" height="5" rx="1.2" />
          <rect x="14.5" y="4.5" width="5" height="5" rx="1.2" />
          <rect x="9.5" y="14.5" width="5" height="5" rx="1.2" />
          <path d="M9.5 7h5" />
          <path d="M12 9.5v5" />
        </>
      )
    case 'auth':
      return (
        <>
          <path d="M9.5 7.25V6a2.5 2.5 0 0 1 5 0v1.25" />
          <rect x="7.25" y="7.25" width="9.5" height="9.5" rx="2" />
          <path d="M12 11.25v2.5" />
        </>
      )
    default:
      return (
        <>
          <path d="M5 6.25h14" />
          <path d="M5 12h14" />
          <path d="M5 17.75h14" />
        </>
      )
  }
}

export function NavGlyph({ name, className, ...props }: NavGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 shrink-0', className)}
      {...props}
    >
      {glyphPath(name)}
    </svg>
  )
}
