# WeRead Web

English | [简体中文](README.md)

> WeRead assistant platform — Bookshelf management, reading stats, note export, smart search. All-in-one for your WeRead data.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

## Preview

<table>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>Bookshelf</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dashboard.png" alt="Dashboard" width="480" /></td>
    <td><img src="docs/screenshots/bookshelf.png" alt="Bookshelf" width="480" /></td>
  </tr>
  <tr>
    <td align="center"><b>Notes</b></td>
    <td align="center"><b>Settings</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/notes.png" alt="Notes" width="480" /></td>
    <td><img src="docs/screenshots/settings.png" alt="Settings" width="480" /></td>
  </tr>
  <tr>
    <td align="center"><b>Search</b></td>
    <td align="center"><b>Dark Mode</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/search.png" alt="Search" width="480" /></td>
    <td><img src="docs/screenshots/dashboard_dark.png" alt="Dark Mode" width="480" /></td>
  </tr>
</table>

## Features

- **Bookshelf Management** — Sync WeRead bookshelf, filter by all/reading/finished/recommended
- **Incremental Sync** — Change detection via `readUpdateTime`, only sync notes for changed books, auto-clean deleted data
- **Global Search** — Real-time WeRead store search from the top search bar
- **Reading Stats** — Dashboard with reading days, duration, trend charts, category preferences, book rankings, supports weekly/monthly/yearly/overall views
- **Notes Center** — Browse all notebooks, view highlights and reviews
- **Book Detail** — Table of contents, notes, reviews, multi-format export (Markdown/HTML/TXT/PDF)
- **Image Cache** — Local proxy cache for book covers, 30-day HTTP cache
- **Dark Mode** — Full dark mode support, follow system or manual toggle
- **Responsive Layout** — Collapsible sidebar, mobile-friendly, breadcrumb navigation
- **Scheduled Sync** — Configurable auto-sync frequency (hourly/6h/12h/daily/weekly) via Cron scheduler

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.24 / GoFrame v2.10.0 / SQLite / MySQL |
| Frontend | React 19 / TypeScript 5.8 / Vite 6.2 / Tailwind CSS / Recharts |
| Icons | Lucide React |
| Storage | Local filesystem / S3-compatible (RustFS) |

## Getting Started

### Run from Source

**Prerequisites:** Go 1.24+, Node.js 22+

```bash
# Clone the project
git clone https://github.com/cicbyte/weread-web.git
cd weread-web

# Build frontend
cd web && npm i && npm run build && cd ..
mkdir -p resource/public/html && cp -r web/dist/* resource/public/html/

# Run (SQLite database is auto-created on first start)
go run main.go
```

Visit `http://localhost:8793`. Defaults to SQLite (data stored in `data/db/weread_web.db`), no external database required.

### Frontend Development

```bash
cd web
npm run dev    # Dev server (port 8898)
npm run build  # Build to web/dist/
```

Build output must be copied to `resource/public/html/` for the Go backend to serve.

### Using MySQL

Edit `manifest/config/config.yaml`:

```yaml
database:
  default:
    link: "mysql:root:123456@tcp(127.0.0.1:3306)/weread_web?charset=utf8mb4&parseTime=true&loc=Local"
```

Tables are auto-created on first start.

## Login

First-time use requires a WeRead Skill API Key (obtained via WeRead Skill). After login, the token is stored locally.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Reading stats overview: summary cards, key metrics, trend charts, category preferences, book rankings, reading tags |
| Bookshelf | `/bookshelf` | Bookshelf management + recommendations, filter by all/reading/finished/recommended |
| Notes | `/notes` | Notebook list → highlights and reviews |
| Book Detail | `/book/:bookId` | TOC, notes, reviews, multi-format export |
| Settings | `/settings` | Profile, API Key management, sync config, about |

## Project Structure

```
weread-web/
├── api/v1/                  # API request/response definitions (g.Meta route tags)
├── internal/
│   ├── cmd/                 # Entry point, auto-migration, constraint patching
│   ├── controller/          # HTTP controllers
│   ├── service/             # Service interface definitions
│   ├── logic/               # Business logic implementations (init() auto-register)
│   │   ├── auth/            # Auth: JWT, API Key management
│   │   ├── sync/            # Sync: shelf/notes/progress/stats (incremental)
│   │   ├── weread/          # WeRead API proxy
│   │   └── proxy/           # Image cache proxy
│   ├── dao/                 # Data access layer (auto-generated, do not edit)
│   ├── model/               # Data models (entity/do/info)
│   ├── router/              # Route registration
│   ├── cron/                # Scheduled task scheduler
│   ├── mcp/                 # MCP Server (StreamableHTTP)
│   └── storage/             # Storage abstraction (Local / S3)
├── web/                     # React frontend
│   ├── components/          # Layout, Toast, and other shared components
│   ├── pages/               # Page components
│   └── services/            # API call services
├── resource/
│   ├── public/html/         # Frontend build output (bundled into binary)
│   └── sql/                 # Database init scripts (MySQL / SQLite)
├── scripts/                 # Screenshot and other utility scripts
├── manifest/config/         # Config files
└── Dockerfile               # Multi-stage build
```

## API

| Module | Path | Description |
|--------|------|-------------|
| Auth | `/api/v1/auth/*` | Login, token refresh, API key management, user profile |
| WeRead Proxy | `/api/v1/weread/proxy` | Proxy forwarding to WeRead API |
| Image Proxy | `/api/v1/image/proxy` | Book cover cache proxy |
| Note Export | `/api/v1/notes/export` | Markdown/HTML/TXT/PDF export |
| Data Sync | `/api/v1/sync/*` | Shelf, notes, progress, stats sync (incremental) |
| System | `/api/v1/health` | Health check (with version, uptime) |
| MCP | `/mcp/*` | AI tool integration (StreamableHTTP) |

## Sync Strategy

| Scope | Strategy |
|-------|----------|
| Shelf | Upsert (`vid + book_id`), clean up removed books after sync |
| Notes | Change detection via `readUpdateTime`, only fetch notes for changed books, upsert + clean deleted notes |
| Progress | Upsert (`vid + book_id`), clean up removed books after sync |
| Stats | Delete + Insert (only 4 rows) |
| Trigger | Manual / Cron scheduler (configurable frequency) |

## Docker Deployment

```bash
docker build -t weread-web .

docker run -d -p 8793:8793 \
  -v ./manifest:/app/manifest \
  -v ./data:/app/data \
  weread-web
```

## License

[MIT](LICENSE)
