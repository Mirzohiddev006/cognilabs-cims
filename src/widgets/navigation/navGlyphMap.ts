export type GlyphName =
  | 'overview'
  | 'ceo'
  | 'crm'
  | 'finance'
  | 'payment'
  | 'wordpress'
  | 'updates'
  | 'auth'
  | 'integrations'
  | 'default'

export function getNavigationGlyphName(pathname: string): GlyphName {
  if (pathname.startsWith('/ceo')) return 'ceo'
  if (pathname.startsWith('/crm')) return 'crm'
  if (pathname.startsWith('/finance')) return 'finance'
  if (pathname.startsWith('/payment')) return 'payment'
  if (pathname.startsWith('/wordpress')) return 'wordpress'
  if (pathname.startsWith('/updates')) return 'updates'
  if (pathname.startsWith('/integrations')) return 'integrations'
  if (pathname.startsWith('/auth')) return 'auth'
  if (pathname.startsWith('/overview')) return 'overview'
  return 'default'
}
