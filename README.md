# Peblo — AI-Powered Notes Workspace

A lightweight, full-stack notes application with integrated AI analysis. Write freely, let Peblo surface what matters.

---

## Live Demo

| | Link |
|---|---|
| Frontend |https://peblonotes.vercel.app/login|


---

## Features

**Notes**
- Create, edit, pin, archive, and delete notes
- Auto-save as you type (1.5s debounce)
- Tag-based organization with color-coded pills
- Instant keyword search and tag filtering

**AI Integration**
- One-click generation of summary, action items, and suggested title
- AI results saved to database and reload on note revisit
- AI usage tracked in the analytics dashboard

**Sharing & Collaboration**
- Generate public share links for any note
- Shared notes accessible without login on a clean public page

**Dashboard**
- Total notes, pinned, shared, and AI summaries count
- Recently edited notes
- Most used tags
- Weekly activity chart

**Experience**
- Dark and light mode
- Keyboard shortcuts (Ctrl+N to create, Ctrl+S to save)
- Responsive layout for desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| State management | Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| AI | OpenRouter API |
| Deployment | Vercel (frontend), Render (backend) |

---

## Project Structure

```
peblo-notes/
├── apps/
│   ├── api/                     # Express backend
│   │   ├── src/
│   │   │   ├── routes/          # Auth, notes, AI, dashboard
│   │   │   ├── middleware/      # JWT auth, error handling
│   │   │   └── lib/             # Prisma client
│   │   └── prisma/
│   │       └── schema.prisma    # Database schema
│   │
│   └── web/                     # Next.js frontend
│       └── src/
│           ├── app/             # App Router pages
│           ├── components/      # NoteEditor, DashboardShell, etc.
│           ├── lib/             # Axios API client
│           └── store/           # Zustand stores
│
└── package.json                 # Root workspace config
```

---

## Database Schema

```
User          id, name, email, passwordHash
Note          id, userId, title, content, isPinned, isPublic
Tag           id, userId, name, color
NoteTag       noteId, tagId
Share         id, noteId, shareToken, isActive
AIGeneration  id, noteId, userId, type, prompt, result
```

---

## API Reference

**Authentication**
```
POST /auth/signup
POST /auth/login
```

**Notes**
```
GET    /notes
POST   /notes
GET    /notes/:id
PUT    /notes/:id
PATCH  /notes/:id
DELETE /notes/:id
PATCH  /notes/:id/pin
POST   /notes/:id/share
DELETE /notes/:id/share
```

**AI**
```
POST /ai/summarize
GET  /ai/summary/:noteId
GET  /ai/history
```

**Public and Analytics**
```
GET /share/:shareToken
GET /dashboard/stats
```

---

## Sample AI Output

Input note:
```
Team discussed Q3 roadmap. Need to finalize designs by Friday,
review API contract with backend team, and send updated timeline
to stakeholders.
```

Output:
```json
{
  "summary": "The team reviewed the Q3 roadmap with key deliverables around design, API alignment, and stakeholder communication.",
  "action_items": [
    "Finalize designs by Friday",
    "Review API contract with backend team",
    "Send updated timeline to stakeholders"
  ],
  "suggested_title": "Q3 Roadmap Planning"
}
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Neon)
- OpenRouter API key from openrouter.ai

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/peblo-notes.git
cd peblo-notes

cd apps/api && npm install
cd ../web && npm install
```

### Environment variables

**apps/api/.env**
```
DATABASE_URL=postgresql://user:password@localhost:5432/peblo
JWT_SECRET=your_random_secret_here
OPENROUTER_API_KEY=your_openrouter_key_here
PORT=3001
NODE_ENV=development
```

**apps/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Database setup

```bash
cd apps/api
npx prisma migrate dev --name init
```

### Start servers

Terminal 1:
```bash
cd apps/api
npm run dev
```

Terminal 2:
```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

---

## Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| DATABASE_URL | api | PostgreSQL connection string |
| JWT_SECRET | api | Token signing secret, min 32 characters |
| OPENROUTER_API_KEY | api | AI provider key from openrouter.ai |
| PORT | api | Backend port, defaults to 3001 |
| NEXT_PUBLIC_API_URL | web | Full URL of the running backend |

---

## Screenshots
![alt text](image.png)
![alt text](image-1.png)
![alt text](image-2.png)
![alt text](image-3.png)
![alt text](image-4.png)
---

## What I Would Add With More Time

- Markdown preview mode in the editor
- Realtime collaboration using WebSockets
- Note folders and collections
- Automated test suite with Jest and Supertest
- Rate limiting and request throttling on AI endpoints

---

## License

MIT