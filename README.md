🌍 A-Z Globe India — Multi-Services Platform

A full-stack multi-services marketplace starter built with Next.js + Express + Prisma + PostgreSQL + Docker.

It’s designed for launching a platform like A-Z Globe in India — where customers can quickly find, book, and pay for trusted service providers across categories (home services, transport, events, and more).

✨ Features

🔑 Auth: Phone number login (OTP mock → 123456) with JWT sessions

🛠 Services: Category + provider listings with price ranges

📅 Bookings: Customers can book services & view their dashboard

💳 Payments: Razorpay integration stub (ready to wire with live keys)

📦 Backend: Express.js API + Prisma ORM + PostgreSQL

🎨 Frontend: Next.js 14 (App Router) + TailwindCSS

🐳 Dockerized: PostgreSQL + backend + frontend in one command

🌱 Seed Data: Demo users, suppliers, categories & services

📂 Project Structure
az-globe-india/
├── backend/       # Express API + Prisma + PostgreSQL
├── frontend/      # Next.js + Tailwind frontend
├── docker-compose.yml
└── README.md

🚀 Getting Started
Prerequisites

Node.js
 18+

pnpm
 (or npm/yarn)

Docker
 (optional but recommended)

Option 1 — Run locally

Backend

cd backend
cp .env.example .env   # update if needed
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev               # http://localhost:4000


Frontend

cd frontend
pnpm install
pnpm dev               # http://localhost:3000

Option 2 — Run with Docker 🐳
docker compose up --build


Frontend → http://localhost:3000

Backend → http://localhost:4000

Postgres → localhost:5432

🔑 Test Flow

Login with any phone number → use OTP: 123456

Browse Services → select one → Book it

Open Dashboard → My Bookings to view your order

🛠 Tech Stack

Frontend: Next.js 14, TailwindCSS

Backend: Express.js, Prisma ORM

Database: PostgreSQL

Auth: Phone OTP (mock), JWT

Payments: Razorpay (test mode)

Infra: Docker Compose

📌 Roadmap

 Real OTP (Twilio, MSG91, or WhatsApp Business API)

 Live Razorpay Checkout + UPI support

 Supplier dashboard (KYC, manage services, accept bookings)

 Multi-language (English / Hindi)

🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to add.

📜 License

MIT
 — free to use and modify.
