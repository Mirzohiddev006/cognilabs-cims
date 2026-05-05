import { Link } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { Badge } from '../../../shared/ui/badge'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import type { ProjectRecord } from '../../../shared/api/services/projects.service'
import { resolveMediaUrl } from '../../../shared/lib/media-url'

type ProjectCardProps = {
  project: ProjectRecord
  onEdit: (project: ProjectRecord) => void
  onDelete: (project: ProjectRecord) => void
  canManage?: boolean
}

export function ProjectCard({ project, onEdit, onDelete, canManage = true }: ProjectCardProps) {
  const { t } = useLocale()
  const boardCount = project.boards_count ?? 0
  const memberCount = (project.members ?? []).length

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:border-[var(--border-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Title + Action */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {project.image ? (
              <img
                src={resolveMediaUrl(project.image) ?? project.image}
                alt={project.project_name}
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                style={{
                  background: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 45%, 18%)`,
                  color: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 65%, 65%)`,
                }}
              >
                {project.project_name.charAt(0).toUpperCase()}
              </div>
            )}
            <Link
              to={`/projects/${project.id}`}
              className="text-xs font-semibold text-[var(--foreground)] hover:text-white transition-colors truncate"
            >
              {project.project_name}
            </Link>
          </div>
          
          {canManage ? (
            <div className="shrink-0">
              <ActionsMenu
                label={t('projects.project_actions', 'Project actions')}
                items={[
                  { label: t('common.edit', 'Edit'), onSelect: () => onEdit(project) },
                  { label: t('common.delete', 'Delete'), tone: 'danger', onSelect: () => onDelete(project) },
                ]}
              />
            </div>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" size="sm" className="px-1.5 h-4 text-[9px] uppercase tracking-wider">
            {boardCount} {t('projects.boards', 'Boards')}
          </Badge>
          {memberCount > 0 && (
            <Badge variant="outline" size="sm" className="px-1.5 h-4 text-[9px] uppercase tracking-wider">
              {memberCount} {t('projects.members', 'Members')}
            </Badge>
          )}
        </div>
      </div>

      {/* Click-to-navigate overlay (behind content) */}
      <Link
        to={`/projects/${project.id}`}
        className="absolute inset-0 z-0"
        aria-label={t('projects.open_project', 'Open {name}', { name: project.project_name })}
        tabIndex={-1}
      />
    </div>
  )
}

/** Skeleton placeholder while loading */
export function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-elevated)]">
      <div className="h-36 animate-pulse bg-[var(--muted-surface)]" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[var(--muted-surface)]" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-[var(--muted-surface)]" />
        <div className="h-3 w-2/3 animate-pulse rounded-lg bg-[var(--muted-surface)]" />
        <div className="flex gap-2 mt-1">
          <div className="h-5 w-16 animate-pulse rounded-lg bg-[var(--muted-surface)]" />
          <div className="h-5 w-20 animate-pulse rounded-lg bg-[var(--muted-surface)]" />
        </div>
      </div>
    </div>
  )
}
