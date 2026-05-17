# Peblo

Peblo is a modern, AI-powered note-taking application designed to help you organize your thoughts and generate insights from your notes. With intelligent summarization, action item extraction, and sharing capabilities, Peblo transforms how you capture and work with information.

## Overview

Peblo provides a clean, intuitive interface for creating and managing notes with integrated AI analysis. Users can generate summaries, extract action items, and track their productivity through detailed analytics. The app supports note sharing, pinning, and search functionality, all powered by a secure backend API.

## Tech Stack

**Frontend:**
- Next.js 14+ (React)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Zustand (state management)
- next-themes (dark mode)
- Sonner (toast notifications)
- Lucide icons

**Backend:**
- Node.js + Express
- TypeScript
- Prisma (ORM)
- PostgreSQL
- JWT authentication
- OpenRouter API (AI/LLM integration)

**DevOps & Tools:**
- ESLint & TypeScript compiler
- PostCSS for styling
- Nanoid for ID generation

## Features

- **Note Management** - Create, edit, delete, and organize notes with rich text support
- **AI Insights** - Generate summaries, extract action items, and get suggested titles
- **Persistent AI History** - AI-generated summaries are saved and persist across sessions
- **Smart Search** - Search notes by title or content with instant filtering
- **Note Sharing** - Generate public share links for individual notes
- **Pin Notes** - Keep important notes at the top of your library
- **Analytics Dashboard** - View productivity metrics and AI generation history
- **Dark Mode** - Built-in light/dark theme toggle
- **User Authentication** - Secure login and signup with JWT
- **Real-time Sync** - Auto-save functionality with visual feedback

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 13+
- OpenRouter API key (for AI features)

### Environment Setup

Create `.env` files for both applications with the following variables:

**apps/api/.env:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/peblo
JWT_SECRET=your-secret-key-here
OPENROUTER_API_KEY=your-openrouter-api-key
NODE_ENV=development
PORT=3001
```

**apps/web/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running Locally

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd peblo-notes
```

#### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install

# Return to root
cd ../..
```

#### 3. Set Up the Database

```bash
cd apps/api

# Create and migrate the database
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

#### 4. Start the API Server

```bash
cd apps/api
npm run dev
```

The API will be available at `http://localhost:3001`

#### 5. Start the Web Application

In a new terminal:

```bash
cd apps/web
npm run dev
```

The web app will be available at `http://localhost:3000`

#### 6. Access the Application

- Navigate to `http://localhost:3000` in your browser
- Create a new account or log in
- Start creating notes and generating AI insights

### Build for Production

**API:**
```bash
cd apps/api
npm run build
npm start
```

**Web:**
```bash
cd apps/web
npm run build
npm run start
```

## Environment Variables Explanation

### Backend (apps/api/.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/peblo` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Any random string (min 32 chars recommended) |
| `OPENROUTER_API_KEY` | API key for OpenRouter AI models | Get from openrouter.ai |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3001` |

### Frontend (apps/web/.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (publicly accessible) | `http://localhost:3001` |

## Project Architecture

### Directory Structure

```
peblo-notes/
├── apps/
│   ├── api/                 # Express backend API
│   │   ├── src/
│   │   │   ├── routes/      # API endpoint handlers
│   │   │   ├── middleware/  # Auth & utility middleware
│   │   │   ├── lib/         # Prisma client & utilities
│   │   │   └── index.ts     # Server entry point
│   │   └── prisma/          # Database schema
│   │
│   └── web/                 # Next.js frontend application
│       ├── src/
│       │   ├── app/         # App directory (routes & layouts)
│       │   ├── components/  # Reusable React components
│       │   ├── lib/         # API client & utilities
│       │   └── store/       # Zustand state management
│       └── public/          # Static assets
│
└── package.json             # Root workspace configuration
```

### API Routes

**Authentication:**
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Authenticate user

**Notes:**
- `GET /notes` - List all user notes
- `GET /notes/:id` - Get single note
- `POST /notes` - Create new note
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note
- `PATCH /notes/:id/pin` - Toggle note pin status
- `POST /notes/:id/share` - Generate share link
- `DELETE /notes/:id/share` - Disable sharing
- `GET /notes/:id/summary` - Get saved AI summary

**AI:**
- `POST /ai/summarize` - Generate summary and action items
- `GET /ai/history` - Get user's AI generation history

**Stats:**
- `GET /stats` - Get workspace analytics

### Data Model

**User** - User account with email and authentication
**Note** - Individual note with content and metadata
**AIGeneration** - Saved AI-generated summaries and insights
**Share** - Public share links for notes
**Tag** - Optional note tags for organization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please open an issue in the repository.
