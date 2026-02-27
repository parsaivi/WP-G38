#!/bin/bash

# Police Department Management System - Startup Script
# This script builds and runs the entire application stack with Docker Compose

set -e

echo "============================================================================"
echo "Police Department Management System - Docker Startup"
echo "============================================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✓ Docker found: $(docker --version)"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker Compose found: $(docker-compose --version)"
echo ""

# Copy .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.docker .env
    echo "✓ .env file created from .env.docker"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Starting services..."
echo "  - PostgreSQL Database (port 5432)"
echo "  - Redis Cache (port 6379)"
echo "  - Django Backend API (port 8001)"
echo "  - React Frontend (port 3001)"
echo ""

# Stop any existing containers
echo "Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start services
echo "Building and starting services (this may take a few minutes)..."
docker-compose up -d --build

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "============================================================================"
echo "Service Status:"
echo "============================================================================"

echo ""
echo "Checking database..."
if docker-compose exec -T db pg_isready -U police_user > /dev/null 2>&1; then
    echo "✓ PostgreSQL is ready"
else
    echo "⏳ PostgreSQL is starting..."
fi

echo ""
echo "Checking backend..."
if docker-compose exec -T backend python manage.py check > /dev/null 2>&1; then
    echo "✓ Django backend is ready"
    echo ""
    echo "Setting up default roles..."
    docker-compose exec -T backend python manage.py setup_roles
    echo "✓ Default roles loaded"
else
    echo "⏳ Django backend is starting..."
fi

echo ""
echo "Checking frontend..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✓ React frontend is ready"
else
    echo "⏳ React frontend is starting..."
fi

echo ""
echo "============================================================================"
echo "Application URLs:"
echo "============================================================================"
echo ""
echo "Frontend:        http://localhost:3001"
echo "Backend API:     http://localhost:8001"
echo "API Docs:        http://localhost:8001/api/schema/swagger/"
echo "Admin Panel:     http://localhost:8001/admin/"
echo "Database:        localhost:5432"
echo "Redis:           localhost:6379"
echo ""

echo "============================================================================"
echo "Test Credentials:"
echo "============================================================================"
echo ""
echo "Username: admin"
echo "Password: admin123456"
echo ""
echo "Note: Create additional users via the admin panel"
echo ""

echo "============================================================================"
echo "Useful Commands:"
echo "============================================================================"
echo ""
echo "View logs:              docker-compose logs -f"
echo "View backend logs:      docker-compose logs -f backend"
echo "View frontend logs:     docker-compose logs -f frontend"
echo "Stop services:          docker-compose down"
echo "Restart services:       docker-compose restart"
echo "Run migrations:         docker-compose exec backend python manage.py migrate"
echo "Setup roles:            docker-compose exec backend python manage.py setup_roles"
echo "Create superuser:       docker-compose exec backend python manage.py createsuperuser"
echo "Run tests (backend):    docker-compose exec backend python manage.py test"
echo "Run tests (frontend):   docker-compose exec frontend npm test"
echo ""

echo "============================================================================"
echo "Setup Complete! 🎉"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Login with the test credentials above"
echo "3. Explore the application"
echo ""
echo "For more information, see README.md or SETUP_GUIDE.md"
echo ""
