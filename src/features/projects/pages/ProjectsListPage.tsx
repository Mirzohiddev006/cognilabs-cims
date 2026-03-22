import { useState, useMemo } from 'react'
import { PageHeader } from '../../../shared/ui/page-header'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { StateBlock } from '../../../shared/ui/state-block'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { projectsService, type ProjectRecord } from '../../../shared/api/services/projects.service'
import { ProjectCard, ProjectCardSkeleton } from '../components/ProjectCard'
import { ProjectFormModal } from '../components/ProjectFormModal'

export function ProjectsListPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const projectsQuery = useAsyncData(() => projectsService.listProjects(), [])

  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<ProjectRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const projects = projectsQuery.data?.projects ?? []
  const total = projectsQuery.data?.total_count ?? 0

  const filtered = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase()
    return projects.filter(
      (p) =>
        p.project_name.toLowerCase().includes(q) ||
        (p.project_description ?? '').toLowerCase().includes(q),
    )
  }, [projects, search])

  async function handleCreate(fd: FormData) {
    setIsSubmitting(true)
    try {
      await projectsService.createProject(fd)
      showToast({ title: 'Project created', tone: 'success' })
      setIsCreateOpen(false)
      await projectsQuery.refetch()
    } catch {
      showToast({ title: 'Failed to create project', tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(fd: FormData) {
    if (!editProject) return
    setIsSubmitting(true)
    try {
      await projectsService.updateProject(editProject.id, fd)
      showToast({ title: 'Project updated', tone: 'success' })
      setEditProject(null)
      await projectsQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update project', tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(project: ProjectRecord) {
    const ok = await confirm({
      title: 'Delete project?',
      description: `"${project.project_name}" and all its boards will be permanently deleted. This cannot be undone.`,
      tone: 'danger',
    })
    if (!ok) return
    try {
      await projectsService.deleteProject(project.id)
      showToast({ title: 'Project deleted', tone: 'success' })
      await projectsQuery.refetch()
    } catch {
      showToast({ title: 'Failed to delete project', tone: 'error' })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6 page-enter">
        {/* Header */}
        <PageHeader
          title="Projects"
          meta={[{ label: 'Total projects', value: String(total), tone: 'blue' }]}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              }
            >
              New project
            </Button>
          }
        />

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="6.5" cy="6.5" r="3.5" />
              <path d="M9.5 9.5l3 3" strokeLinecap="round" />
            </svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-9"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content */}
        {projectsQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projectsQuery.isError ? (
          <StateBlock
            tone="error"
            eyebrow="Error"
            title="Failed to load projects"
            description="Something went wrong. Please try again."
            actionLabel="Retry"
            onAction={() => projectsQuery.refetch()}
          />
        ) : filtered.length === 0 ? (
          <StateBlock
            tone="empty"
            eyebrow="No results"
            title={search ? 'No projects match your search' : 'No projects yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Create your first project to get started organizing your work.'
            }
            actionLabel={!search ? 'Create project' : undefined}
            onAction={!search ? () => setIsCreateOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditProject(p)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <ProjectFormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        title="Create project"
        submitLabel="Create"
        isSubmitting={isSubmitting}
      />

      {/* Edit modal */}
      <ProjectFormModal
        open={editProject !== null}
        onClose={() => setEditProject(null)}
        onSubmit={handleUpdate}
        initial={editProject}
        title="Edit project"
        submitLabel="Save changes"
        isSubmitting={isSubmitting}
      />
    </>
  )
}
