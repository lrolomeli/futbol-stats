#!/bin/sh
echo "Verificando base de datos..."
npx prisma db push --skip-generate
echo "Base de datos lista. Iniciando servidor..."
npm start
