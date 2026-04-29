import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/ui/button'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import type { CardRecord } from '../../../shared/api/services/projects.service'
import { Avatar } from './Avatar'
import { formatProjectDate, getPriorityConfig, isDueDateOverdue, isDueDateSoon } from '../lib/format'
import { cn } from '../../../shared/lib/cn'
import { resolveMediaUrl } from '../../../shared/lib/media-url'

type CardDetailModalProps = {
  card: CardRecord | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  boardName?: string
  projectName?: string
  canManage?: boolean
}

function getCardImageUrl(image: { url?: string | null; url_path?: string | null }) {
  const value = image.url ?? image.url_path ?? ''
  return resolveMediaUrl(value) ?? value
}

function DetailInfoBlock({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-(--muted)">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </div>
      <div className="text-sm font-semibold text-[var(--foreground)]">{children}</div>
    </div>
  )
}

export function CardDetailModal({
  card,
  open,
  onClose,
  onEdit,
  onDelete,
  boardName,
  projectName,
  canManage = true,
}: CardDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const lt = translateCurrentLiteral

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [card?.id, open])

  if (!open || !card) return null

  const priorityConfig = getPriorityConfig()
  const priority = card.priority ? priorityConfig[card.priority] : null
  const overdue = card.due_date ? isDueDateOverdue(card.due_date) : false
  const soon = card.due_date ? isDueDateSoon(card.due_date) : false
  const images = Array.isArray(card.images)
    ? card.images
    : Array.isArray(card.files)
      ? card.files
      : []
  const selectedImage = images[selectedImageIndex] ?? images[0] ?? null

  const priorityTheme = {
    urgent: {
      bg: 'from-red-500/20 via-red-500/5 to-transparent',
      accent: 'bg-red-500',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]',
      border: 'border-red-500/20',
      text: 'text-red-400'
    },
    high: {
      bg: 'from-orange-500/20 via-orange-500/5 to-transparent',
      accent: 'bg-orange-500',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
      border: 'border-orange-500/20',
      text: 'text-orange-400'
    },
    medium: {
      bg: 'from-blue-500/20 via-blue-500/5 to-transparent',
      accent: 'bg-blue-500',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      border: 'border-blue-500/20',
      text: 'text-blue-400'
    },
    low: {
      bg: 'from-slate-500/20 via-slate-500/5 to-transparent',
      accent: 'bg-slate-500',
      glow: '',
      border: 'border-white/10',
      text: 'text-slate-400'
    },
    default: {
      bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
      accent: 'bg-blue-500',
      glow: '',
      border: 'border-white/10',
      text: 'text-blue-400'
    }
  }[card.priority ?? 'default']

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/85 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={lt('Close')}
      />

      {/* Main Container */}
      <div className="relative z-10 flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0c14] shadow-2xl">
        
        {/* Top Header Decor - Dynamic based on priority */}
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b opacity-60", priorityTheme.bg)} />

        {/* Header Section */}
        <div className="relative z-10 flex flex-col gap-6 border-b border-white/5 p-6 sm:px-10 sm:py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
                {projectName && (
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{projectName}</span>
                   </div>
                )}
                {projectName && boardName && (
                  <span className="text-white/15 h-3 w-[1px] bg-current" />
                )}
                {boardName && (
                   <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{boardName}</span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {card.title}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canManage && (
                <div className="hidden sm:flex items-center gap-2.5">
                  <Button variant="ghost" size="sm" className="rounded-2xl h-11 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/90" onClick={onEdit}>
                    {lt('Edit')}
                  </Button>
                  <Button variant="danger" size="sm" className="rounded-2xl h-11 px-5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" onClick={onDelete}>
                    {lt('Delete')}
                  </Button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4">
             <div className={cn("flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300", 
                "bg-white/[0.03]", priorityTheme.border
             )}>
                <div className={cn("h-2.5 w-2.5 rounded-full", priorityTheme.accent, priorityTheme.glow)} />
                <span className={cn("text-xs font-bold uppercase tracking-widest", priorityTheme.text)}>
                   {priority?.label}
                </span>
             </div>

             {card.due_date && (
                <div className={cn(
                   "flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300",
                   overdue ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]" :
                   soon ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]" :
                   "bg-white/[0.03] border-white/10 text-white/70"
                )}>
                   <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
                   </svg>
                   <span className="text-xs font-bold uppercase tracking-widest">
                      {lt('Due')} {formatProjectDate(card.due_date)}
                   </span>
                </div>
             )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
            
            {/* Main Column */}
            <div className="p-6 sm:p-10 space-y-12">
              
              {/* Media Viewer */}
              {selectedImage && (
                <div className="space-y-6">
                   <div className="relative group overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-inner">
                      <img
                        src={getCardImageUrl(selectedImage)}
                        alt={selectedImage.filename}
                        className="h-auto max-h-[540px] w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex items-end justify-between">
                         <div className="min-w-0">
                            <p className="text-base font-bold text-white truncate mb-1">{selectedImage.filename}</p>
                            <a href={getCardImageUrl(selectedImage)} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white transition flex items-center gap-1.5 font-medium">
                               <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                               {lt('View original')}
                            </a>
                         </div>
                         <div className="bg-white/10 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl text-[11px] font-black text-white/90 tracking-tighter">
                            {selectedImageIndex + 1} / {images.length}
                         </div>
                      </div>
                   </div>

                   {images.length > 1 && (
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar scroll-smooth px-1">
                         {images.map((img, idx) => (
                            <button
                               key={img.id}
                               onClick={() => setSelectedImageIndex(idx)}
                               className={cn(
                                  "relative shrink-0 w-24 h-24 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                                  idx === selectedImageIndex ? "border-blue-500 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-white/5 opacity-40 hover:opacity-100 hover:scale-105"
                               )}
                            >
                               <img src={getCardImageUrl(img)} alt="" className="w-full h-full object-cover" />
                            </button>
                         ))}
                      </div>
                   )}
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className={cn("h-4 w-1 rounded-full", priorityTheme.accent)} />
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white/40">{lt('Description')}</h3>
                 </div>
                 <div className={cn(
                    "rounded-[24px] p-8 bg-white/[0.02] border border-white/5 shadow-sm leading-relaxed",
                    !card.description && "bg-transparent border-dashed border-white/10 py-12"
                 )}>
                    {card.description ? (
                      <p className="text-[16px] text-white/80 whitespace-pre-wrap selection:bg-blue-500/30">
                        {card.description}
                      </p>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                         <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                         <p className="text-sm font-semibold tracking-wide italic">{lt('Task description is empty')}</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Sidebar metadata */}
            <div className="lg:border-l border-white/5 bg-white/[0.015] p-6 sm:p-10 space-y-10">
              
              {/* Assignment Card */}
              <div className="space-y-8">
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-5">{lt('Assignee')}</h4>
                    {card.assignee ? (
                      <div className="flex items-center gap-4 p-5 rounded-[24px] bg-white/[0.04] border border-white/5 shadow-sm transition-transform hover:scale-[1.02] duration-300">
                        <Avatar
                          name={card.assignee.name}
                          surname={card.assignee.surname}
                          imageUrl={card.assignee.profile_image}
                          size="md"
                          className="ring-2 ring-white/5 ring-offset-2 ring-offset-[#0a0c14]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate leading-none mb-1.5">
                            {card.assignee.name} {card.assignee.surname}
                          </p>
                          <p className="text-[11px] text-white/40 truncate font-semibold uppercase tracking-wider">{card.assignee.job_title || lt('Member')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 group hover:border-white/20 transition-colors duration-300">
                         <div className="h-10 w-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                         </div>
                         <p className="text-[11px] font-black uppercase tracking-widest text-white/20">{lt('Unassigned')}</p>
                      </div>
                    )}
                 </div>

                 <div className="pt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-5">{lt('Created by')}</h4>
                    <div className="flex items-center gap-3.5 px-2">
                       <Avatar
                          name={card.created_by.name}
                          surname={card.created_by.surname}
                          imageUrl={card.created_by.profile_image}
                          size="sm"
                          className="ring-1 ring-white/10"
                       />
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-white/80 truncate leading-none">{card.created_by.name} {card.created_by.surname}</p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter mt-1">{lt('Owner')}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Timeline Info */}
              <div className="space-y-6 pt-10 border-t border-white/5">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{lt('Task Timeline')}</h4>
                 <div className="grid gap-6">
                    <DetailInfoBlock 
                       label={lt('Created')} 
                       icon={<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                    >
                       <span className="text-white/60 font-medium">{formatProjectDate(card.created_at)}</span>
                    </DetailInfoBlock>
                    
                    <DetailInfoBlock 
                       label={lt('Last update')}
                       icon={<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>}
                    >
                       <span className="text-white/60 font-medium">{formatProjectDate(card.updated_at)}</span>
                    </DetailInfoBlock>

                    {card.due_date && (
                       <DetailInfoBlock 
                          label={lt('Deadline')}
                          icon={<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                       >
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-black", 
                             overdue ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                             soon ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 
                             'text-white/90 bg-white/5'
                          )}>
                             {formatProjectDate(card.due_date)}
                          </span>
                       </DetailInfoBlock>
                    )}
                 </div>
              </div>

              {/* Mobile Actions */}
              {canManage && (
                 <div className="sm:hidden pt-8 border-t border-white/5 flex gap-3">
                    <Button variant="secondary" className="flex-1 rounded-[18px] h-12 font-bold" onClick={onEdit}>{lt('Edit')}</Button>
                    <Button variant="danger" className="flex-1 rounded-[18px] h-12 font-bold" onClick={onDelete}>{lt('Delete')}</Button>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
