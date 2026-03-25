# Template Setup Guide

Welcome! You've successfully created a new project from the Hono OpenAPI Starter Template. Follow these steps to get your API up and running.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual configuration
# You'll need to update:
# - DATABASE_URL (your PostgreSQL connection string)
# - SUPABASE_URL (your Supabase project URL)
# - SUPABASE_ANON_KEY (your Supabase anonymous key)
```

### 3. Set Up Your Database

#### Option A: Using Supabase (Recommended)
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to Settings > Database and copy your connection string
3. Update `DATABASE_URL` in your `.env` file
4. Copy your project URL and anon key to `.env`

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database
3. Update `DATABASE_URL` in your `.env` file

### 4. Run Database Migrations

```bash
# Generate migrations from schema
bun run db:generate

# Apply migrations to your database
bun run db:migrate
```

### 5. Start Development Server

```bash
bun run dev
```

Your API will be available at:
- **API**: http://localhost:3000
- **Documentation**: http://localhost:3000/doc

## 🔧 Customization

### Update Package Information
1. Edit `package.json` to update:
   - `name`: Your project name
   - `description`: Your project description
   - `version`: Your starting version
   - `repository`: Your repository URL (if applicable)

### Customize the API
1. **Routes**: Check `src/routes/` for example routes (auth and examples)
2. **Database Schema**: Edit `src/db/schema.ts` to define your tables
3. **Environment**: Add new environment variables in `src/env.ts`

### Remove Template Files (Optional)
Once you're set up, you can delete:
- `TEMPLATE_SETUP.md` (this file)
- Modify `README.md` to describe your specific project

## 📚 Next Steps

1. **Authentication**: The template includes Supabase auth - customize as needed
2. **Database Schema**: Define your tables in `src/db/schema.ts`
3. **API Routes**: Add your business logic in `src/routes/`
4. **Testing**: Write tests using the examples in `*.test.ts` files
5. **Deployment**: Choose your deployment platform (Vercel, Railway, etc.)

## 🆘 Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Look at the example routes in `src/routes/examples/` and `src/routes/auth/`
- Visit the [Hono documentation](https://hono.dev/)
- Check [Drizzle ORM docs](https://orm.drizzle.team/) for database operations

Happy coding! 🎉 