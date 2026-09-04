#!/usr/bin/env bash
set -euo pipefail

echo "==> Instalando redis-server..."
if ! command -v redis-server >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server
fi

echo "==> Habilitando redis como servicio..."
systemctl enable redis-server || true
systemctl start redis-server || service redis-server start || true

echo "==> Verificando redis..."
redis-cli ping

echo "==> Creando usuario y base de datos de PostgreSQL..."
if ! psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='bluelock'" | grep -q 1; then
  su - postgres -c "psql -c \"CREATE USER bluelock WITH PASSWORD 'bluelock123';\""
fi
if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='bluelockstats'\"" | grep -q 1; then
  su - postgres -c "psql -c \"CREATE DATABASE bluelockstats OWNER bluelock;\""
fi

echo "==> Setup nativo completado."
