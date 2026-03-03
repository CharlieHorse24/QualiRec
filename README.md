# QualiRec — Recruiter Qualification Platform

A real-time call companion that guides recruiters through structured qualification conversations with candidates and clients, integrates with VOIP/meeting software, and syncs call outcomes to the company CRM.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  React Frontend │────▶│  Express API    │────▶│  PostgreSQL  │
│  (Vite + TS)    │◀────│  (TypeScript)   │◀────│  (Prisma)    │
│  Port 5173      │ WS  │  Port 3001      │     │  Port 5432   │
└─────────────────┘     └────────┬────────┘     └──────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ VOIP     │ │ CRM      │ │ Anthropic│
              │ Adapters │ │ Adapters │ │ API      │
              └──────────┘ └──────────┘ └──────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand, Vite |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | JWT-based with role support (Admin, Recruiter) |
| AI | Anthropic Claude (claude-sonnet-4-20250514) for call summaries |
| Realtime | Socket.io for live session state |

### Project Structure

```
/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── call/       # Live call session UI
│   │   │   │   ├── layout/     # Sidebar, AppLayout
│   │   │   │   └── ui/         # Button, Card, Badge, Modal, etc.
│   │   │   ├── store/          # Zustand stores (auth, session)
│   │   │   ├── lib/            # API client, utilities
│   │   │   ├── pages/          # Page components
│   │   │   └── styles/
│   │   └── index.html
│   └── api/                    # Express backend (TypeScript)
│       ├── src/
│       │   ├── routes/         # Auth, templates, sessions, CRM, admin, webhooks
│       │   ├── services/       # Summary generation
│       │   ├── adapters/
│       │   │   ├── voip/       # Zoom, Teams, Twilio, Manual
│       │   │   └── crm/        # HubSpot, Salesforce, Bullhorn, Mock
│       │   ├── middleware/     # Auth, error handling
│       │   ├── lib/            # Prisma client, encryption
│       │   └── prisma/         # Schema, seed script
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── shared/                 # Shared TypeScript types, constants, validation
├── docker-compose.yml
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm 9+

### Quick Start with Docker

```bash
# Start PostgreSQL
docker compose up postgres -d

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database setup
cd apps/api && npx prisma db push && cd ../..

# Seed the database
npm run db:seed

# Start development servers
npm run dev
```

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example apps/api/.env
   # Edit apps/api/.env with your database URL and secrets
   ```

3. **Set up the database:**
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma db push
   npx tsx src/prisma/seed.ts
   cd ../..
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

5. **Access the app:**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001
   - API Health: http://localhost:3001/api/health

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@qualirec.com | admin123 |
| Recruiter | recruiter@qualirec.com | recruiter123 |
| Recruiter | recruiter2@qualirec.com | recruiter123 |

## Core Features

### 1. Call Session Interface
The primary screen during an active call:
- Qualification sheet with guided (one-at-a-time) or scroll view
- Free-text notes, quick-select answer chips, and status indicators
- Live call timer with soft pulse animation
- Call status banner showing connected integration
- CRM profile sidebar
- Floating notes panel for unstructured notes
- Full keyboard navigation (Arrow keys, Tab, Ctrl+N)

### 2. Template System
Full template builder supporting:
- Candidate, Client, and Custom template types
- Multiple sections with reorderable questions
- Response types: Free Text, Single Select, Multi Select, Numeric, Date, Yes/No
- CRM field mapping per question
- Version tracking, draft/publish workflow
- Clone and archive operations

### 3. VOIP Integration
Adapter pattern with four implementations:
- **Manual Mode** — always available, no integration required
- **Zoom** — via webhooks and OAuth
- **Microsoft Teams** — via Microsoft Graph API
- **Twilio** — via Voice webhooks

### 4. Post-Call Summary
- AI-generated narrative summary, highlights, and next actions
- Powered by Claude (claude-sonnet-4-20250514) with 30-second timeout
- Editable before saving — falls back to manual entry on failure

### 5. CRM Sync
Adapter pattern with four implementations:
- **Mock/Local CRM** — PostgreSQL-backed for development
- **HubSpot** — via HubSpot API v3
- **Salesforce** — via Salesforce REST API
- **Bullhorn** — via Bullhorn REST API

Duplicate detection, preview before commit, async sync with status tracking.

### 6. Dashboard & History
- Today's calls, weekly/monthly stats, average duration
- CRM sync rate tracking
- Flagged items needing attention
- Session history with search, filter, and pagination

### 7. Admin Panel
- User management (create, activate/deactivate, role assignment)
- Integration configuration
- Webhook URL display
- All sessions view (read-only)

## How to Add a New VOIP Adapter

1. Create a new file in `apps/api/src/adapters/voip/`:

```typescript
import type { VoipAdapter } from './index';
import type {
  AdapterConfig, CallStartEvent, CallEndEvent,
  ParticipantEvent, CallMetadata, VoipAdapterInfo
} from '@qualirec/shared';

export class MyVoipAdapter implements VoipAdapter {
  name = 'myadapter';
  displayName = 'My Adapter';

  async connect(config: AdapterConfig): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  onCallStart(cb: (event: CallStartEvent) => void): void { /* ... */ }
  onCallEnd(cb: (event: CallEndEvent) => void): void { /* ... */ }
  onParticipantJoin(cb: (event: ParticipantEvent) => void): void { /* ... */ }
  async getActiveCallMetadata(): Promise<CallMetadata | null> { return null; }
  getInfo(): VoipAdapterInfo {
    return {
      name: this.name, displayName: this.displayName,
      requiresOAuth: true, isConfigured: false, isConnected: false,
    };
  }
}
```

2. Register it in `apps/api/src/adapters/voip/index.ts`:
```typescript
import { MyVoipAdapter } from './myadapter';
const adapters = { ...existing, myadapter: new MyVoipAdapter() };
```

3. If it uses webhooks, add a route in `apps/api/src/routes/webhooks.ts`.

## How to Add a New CRM Adapter

1. Create a new file in `apps/api/src/adapters/crm/`:

```typescript
import type { CrmAdapter } from './index';
import type {
  ContactSearchQuery, CrmContact, NewContactData,
  CrmNote, CrmActivity, CrmTask
} from '@qualirec/shared';

export class MyCrmAdapter implements CrmAdapter {
  name = 'mycrm';
  async searchContacts(query: ContactSearchQuery): Promise<CrmContact[]> { /* ... */ }
  async getContact(id: string): Promise<CrmContact | null> { /* ... */ }
  async createContact(data: NewContactData): Promise<CrmContact> { /* ... */ }
  async updateContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> { /* ... */ }
  async addNote(contactId: string, note: CrmNote): Promise<void> { /* ... */ }
  async addActivity(contactId: string, activity: CrmActivity): Promise<void> { /* ... */ }
  async createTask(contactId: string, task: CrmTask): Promise<void> { /* ... */ }
}
```

2. Register it in `apps/api/src/adapters/crm/index.ts`:
```typescript
import { MyCrmAdapter } from './mycrm';
const adapters = { ...existing, mycrm: new MyCrmAdapter() };
```

## Integration Credentials Setup

### Zoom
1. Create a Zoom App at marketplace.zoom.us
2. Set OAuth redirect URL to `{YOUR_URL}/api/auth/zoom/callback`
3. Enable Event Subscriptions: `meeting.started`, `meeting.ended`, `meeting.participant_joined`
4. Set webhook URL to `{YOUR_URL}/api/webhooks/zoom`
5. Env vars: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`

### Microsoft Teams
1. Register an app in Azure AD (portal.azure.com)
2. Grant permissions: `CallRecords.Read.All`, `OnlineMeetings.Read`
3. Set notification URL to `{YOUR_URL}/api/webhooks/teams`
4. Env vars: `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID`

### Twilio
1. Get credentials from console.twilio.com
2. Configure phone number Voice webhook to `{YOUR_URL}/api/webhooks/twilio`
3. Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

### HubSpot
1. Create an app at developers.hubspot.com
2. Set OAuth redirect to `{YOUR_URL}/api/auth/hubspot/callback`
3. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`
4. Env vars: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`

### Salesforce
1. Create a Connected App in Salesforce Setup
2. Set callback URL to `{YOUR_URL}/api/auth/salesforce/callback`
3. Scopes: `api`, `refresh_token`
4. Env vars: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_INSTANCE_URL`

### Bullhorn
1. Register at bullhorn.com/developers
2. Set redirect to `{YOUR_URL}/api/auth/bullhorn/callback`
3. Env vars: `BULLHORN_CLIENT_ID`, `BULLHORN_CLIENT_SECRET`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256 encryption |
| `ANTHROPIC_API_KEY` | No | For AI summary generation |
| `ZOOM_*` | No | Zoom integration credentials |
| `TEAMS_*` | No | Microsoft Teams integration credentials |
| `TWILIO_*` | No | Twilio integration credentials |
| `HUBSPOT_*` | No | HubSpot CRM integration credentials |
| `SALESFORCE_*` | No | Salesforce CRM integration credentials |
| `BULLHORN_*` | No | Bullhorn CRM integration credentials |

## Key Design Decisions

- **Offline resilience**: The call interface works fully offline. Answers are saved to local state and synced when connectivity returns.
- **Template versioning**: Sessions record which template version was used. Template edits bump the version number.
- **Idempotent CRM writes**: Sync operations check for duplicates and can be safely retried.
- **Credential encryption**: OAuth tokens and API keys are encrypted at rest using AES-256-GCM.
- **Adapter pattern**: Both VOIP and CRM integrations use a common adapter interface for easy extensibility.
- **30-second AI timeout**: Summary generation has a hard timeout with graceful fallback to manual entry.
