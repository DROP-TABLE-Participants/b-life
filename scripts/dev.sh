#!/bin/bash
# B-Live - Development environment startup script

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

echo "🩸 B-Live Development Environment"
echo "=================================="

# Backend
echo ""
echo "📦 Setting up backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

echo "  Activating virtual environment..."
source venv/bin/activate

echo "  Installing dependencies..."
pip install -q -r requirements.txt

if [ ! -f "blive.db" ]; then
    echo "  Seeding database..."
    python seed.py
else
    echo "  Database already exists. Skipping seed. (Delete blive.db to reseed)"
fi

echo "  Starting FastAPI backend on http://localhost:8000 ..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Frontend
echo ""
echo "🎨 Setting up frontend..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
fi

if [ ! -f ".env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
    echo "  Created .env.local"
fi

echo "  Starting Next.js frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ B-Live is running!"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "Demo accounts:"
echo "   Institution Admin: admin@sofiabc.bg / admin123"
echo "   Campaign Operator: operator@sofiabc.bg / operator123"
echo "   Donor (O-):        donor1@example.com / donor123"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
