---
name: Project Overview
description: CIMS project tech stack, fonts, styling conventions
type: project
---

CognilabsAI CIMS (Customer Interaction Management System).

- Stack: React 18, TypeScript, Vite, Tailwind CSS v4, @dnd-kit, react-router-dom
- Fonts: DM Sans (body, `--font-sans`), Space Grotesk (headings h1-h3, `--font-display`), DM Mono (code)
- Theme: dark default, light mode via `html.light` class
- Design tokens: CSS vars `--foreground`, `--border`, `--surface-elevated`, etc.
- API base URL from `env.apiBaseUrl`
- Auth: Bearer token from `getAccessToken()`

**Why:** Context for styling and architecture decisions.
**How to apply:** Always use project CSS vars for colors. Headings use Space Grotesk automatically. Chat page uses dark-specific hardcoded colors (bg-[#09090b], zinc-*) intentionally.
