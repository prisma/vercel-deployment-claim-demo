# Todo List App

A full-stack todo application built with Next.js 15, Prisma ORM, and PostgreSQL database.

## Features

- ✅ Create, read, update, and delete todos
- 🔄 Drag and drop reordering
- 📱 Responsive design with Tailwind CSS
- 🗄️ PostgreSQL database with Prisma ORM
- 🚀 Deployed on Vercel with integrated database

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via [Prisma Postgres](https://www.prisma.io/postgres)
- **ORM**: Prisma with client generation
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your database:
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed the database (optional)
npm run db:seed
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database

This project uses [Prisma Postgres](https://www.prisma.io/postgres), a fully managed PostgreSQL database service that integrates seamlessly with Prisma ORM. The database schema includes:

- **Todo**: Main todo items with title, completion status, and ordering
- **SeedHistory**: Tracks database seeding operations

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Prisma Documentation](https://www.prisma.io/docs) - Learn about Prisma ORM
- [Prisma Postgres](https://www.prisma.io/postgres) - Managed PostgreSQL database service
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
