# Drizzle + SQLite Setup Guide

This guide covers the complete setup for using Drizzle ORM with SQLite in your Hono application.

## Current Setup Status ✅

Your app is already properly configured for **Drizzle + SQLite**:

### 1. **Dependencies** (already installed)
- `drizzle-orm` - Core ORM
- `drizzle-kit` - Migration and schema management  
- `drizzle-zod` - Zod schema generation

**Note:** You'll need to install `better-sqlite3` for local SQLite support:
```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

### 2. **Configuration Files**
- **`drizzle.config.ts`** - Configured for local SQLite
- **`src/db/index.ts` - Database connection setup
- **`src/db/schema.ts`** - SQLite table definitions

### 3. **Environment Variables Required**
You need to set up these environment variables:

```bash
# .env file
DATABASE_PATH="./data/app.db"  # Path to your SQLite database file
NODE_ENV="development"
PORT=9999
LOG_LEVEL="info"
```

## Setup Steps

### 1. **Create Environment File**
Create a `.env` file in your project root:

```bash
touch .env
```

### 2. **Set Up Local SQLite Database**

#### Install Required Dependencies
```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

#### Update Configuration Files

**Update `drizzle.config.ts`:**
```typescript
import { defineConfig } from "drizzle-kit";
import env from "@/env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "better-sqlite",
  dbCredentials: {
    url: env.DATABASE_PATH,
  },
});
```

**Update `src/db/index.ts`:**
```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import env from "@/env";
import * as schema from "./schema";

// Create data directory if it doesn't exist
import { mkdirSync } from "fs";
import { dirname } from "path";

const dbDir = dirname(env.DATABASE_PATH);
mkdirSync(dbDir, { recursive: true });

// Initialize database with WAL mode enabled
const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma('journal_mode = WAL'); // Enable WAL mode for better performance
sqlite.pragma('synchronous = NORMAL'); // Optimize for WAL mode
sqlite.pragma('cache_size = -64000'); // Use 64MB cache
sqlite.pragma('temp_store = memory'); // Store temp tables in memory

const db = drizzle(sqlite, { schema });

export default db;
```

**Update `src/env.ts`:**
```typescript
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
  DATABASE_PATH: z.string().default("./data/app.db"),
});
```

### 3. **Run Migrations**
```bash
# Generate migration from your schema
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate
```

### 4. **Add Migration Scripts**
Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Current Database Schema

Your app already has a `tasks` table defined in `src/db/schema.ts`:

```typescript
export const tasks = sqliteTable("tasks", {
  id: integer({ mode: "number" })
    .primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  done: integer({ mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});
```

## Database Connection

Your database connection is configured in `src/db/index.ts` with WAL mode enabled for optimal performance:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import env from "@/env";
import * as schema from "./schema";

// Create data directory if it doesn't exist
import { mkdirSync } from "fs";
import { dirname } from "path";

const dbDir = dirname(env.DATABASE_PATH);
mkdirSync(dbDir, { recursive: true });

// Initialize database with WAL mode enabled
const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma('journal_mode = WAL'); // Enable WAL mode for better performance
sqlite.pragma('synchronous = NORMAL'); // Optimize for WAL mode
sqlite.pragma('cache_size = -64000'); // Use 64MB cache
sqlite.pragma('temp_store = memory'); // Store temp tables in memory

const db = drizzle(sqlite, { schema });

export default db;
```

### WAL Mode Benefits
- **Better Concurrency**: Multiple readers can access the database while a single writer is active
- **Improved Performance**: Faster writes and better I/O performance
- **Atomic Operations**: Better support for transactions and rollbacks
- **Reduced Locking**: Less contention between read and write operations

## Usage Examples

### Basic CRUD Operations
```typescript
import db from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

// Create
const newTask = await db.insert(tasks).values({
  name: "Learn Drizzle",
  done: false
});

// Read
const allTasks = await db.select().from(tasks);
const task = await db.select().from(tasks).where(eq(tasks.id, 1));

// Update
await db.update(tasks)
  .set({ done: true })
  .where(eq(tasks.id, 1));

// Delete
await db.delete(tasks).where(eq(tasks.id, 1));
```

## Drizzle Kit Commands

```bash
# Generate migrations from schema changes
pnpm drizzle-kit generate

# Apply pending migrations
pnpm drizzle-kit migrate

# Open Drizzle Studio (web UI for database)
pnpm drizzle-kit studio

# Push schema changes directly (development only)
pnpm drizzle-kit push

# Introspect existing database
pnpm drizzle-kit introspect
```

## Environment Configuration

The app uses Zod for environment validation in `src/env.ts`:

- `DATABASE_PATH` - Path to your SQLite database file (defaults to `./data/app.db`)
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (defaults to 9999)
- `LOG_LEVEL` - Logging level

### Database File Structure
```
your-app/
├── data/           # Database directory (auto-created)
│   ├── app.db      # Main database file
│   ├── app.db-wal  # WAL file (auto-created)
│   └── app.db-shm  # Shared memory file (auto-created)
├── src/
└── ...
```

## Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   - Ensure `.env` file exists in project root
   - Check that `dotenv` is properly configured

2. **Database connection failed**
   - Verify `DATABASE_PATH` is correct and accessible
   - Ensure the data directory has write permissions
   - Check if `better-sqlite3` is properly installed

3. **Migration errors**
   - Ensure database file path is writable
   - Check if the data directory exists and has proper permissions

4. **WAL mode issues**
   - Ensure the filesystem supports WAL mode (most do)
   - Check if the database directory has proper permissions
   - Verify that no other processes are locking the database

### Getting Help

- [Drizzle Documentation](https://orm.drizzle.team/)
- [Better-SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite WAL Mode Documentation](https://www.sqlite.org/wal.html)

## Summary

Your Drizzle + SQLite setup is **already complete**! You just need to:
1. Install `better-sqlite3` dependencies
2. Update configuration files for local SQLite
3. Create a `.env` file with your database path
4. Run migrations to create your tables

The app will automatically:
- Create the data directory if it doesn't exist
- Enable WAL mode for optimal performance
- Configure SQLite pragmas for better performance
- Work the same way in both development and production

Your app is ready to use local SQLite with Drizzle ORM and WAL mode enabled!
