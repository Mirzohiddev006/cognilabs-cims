export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (userId?: number) => [...projectKeys.lists(), userId] as const,
  detail: (id: number) => [...projectKeys.all, 'detail', id] as const,
  boards: (projectId: number) => [...projectKeys.all, 'boards', projectId] as const,
  board: (boardId: number, projectId?: number | null, userId?: number) =>
    [...projectKeys.all, 'board', boardId, projectId, userId] as const,
  users: () => [...projectKeys.all, 'users'] as const,
}
