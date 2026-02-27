#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
counter=0
while [ $counter -lt 30 ]; do
  if python -c "import psycopg2; psycopg2.connect(host='$DB_HOST', port='${DB_PORT:-5432}', user='$DB_USER', password='$DB_PASSWORD', database='$DB_NAME')" 2>/dev/null; then
    echo "PostgreSQL started"
    break
  fi
  counter=$((counter + 1))
  sleep 1
done

echo "Running migrations..."
python manage.py migrate --noinput

echo "Loading default roles..."
python manage.py setup_roles

echo "Starting application..."
exec "$@"
