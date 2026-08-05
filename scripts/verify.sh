#!/usr/bin/env bash
#
# Gate de verificación único del proyecto (skill `verify-gate`).
# Ninguna tarea de código se cierra con este comando en rojo.
#
#   ./scripts/verify.sh          # gate completo
#   BASE_REF=main ./scripts/verify.sh
#
# Pasos: formato → lint → escalas de diseño → datos de tienda → codegen → build.
# Los tres del medio corren solo sobre las LÍNEAS NUEVAS: la deuda del fork no
# bloquea, pero nada nuevo entra.
#
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

step "1/6 Formato (prettier)"
npm run format:check

step "2/6 Lint (lineas nuevas)"
# El fork arrastra ~159 errores preexistentes. Se lintea solo lo que agrega o
# modifica el cambio: el codigo nuevo entra limpio y la deuda no bloquea.
# Para ver la deuda completa: npm run lint
BASE_REF="${BASE_REF:-origin/main}"
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  BASE_REF="main"
fi

node scripts/lint-changed-lines.mjs "$BASE_REF"

step "3/6 Escalas de diseno (lineas nuevas)"
# El CSS acumulo 51 tamanos de fuente, 26 radios y 134 espaciados distintos
# eligiendo valores a ojo. Eso es lo que se percibe como interfaz fragil.
# Las escalas estan en DESIGN.md; esto las hace cumplir en lo nuevo.
node scripts/check-design-tokens.mjs

step "4/6 Datos de tienda (lineas nuevas)"
# El fork dejo su tienda escrita a mano y ningun caso fallaba ruidosamente:
# la busqueda devolvia "sin resultados" en vez de un error, y los <title>
# decian PowerB2X sin que nadie mirara la pestaña. Son datos validos, solo que
# de otra tienda: ni el build ni el lint los ven.
node scripts/check-template-leaks.mjs

step "5/6 Codegen"
# El codegen se corre APARTE del build y se le mira la salida, no solo el
# codigo de retorno.
#
# Por que: cuando el plugin de codegen falla por dentro —pasa, por ejemplo, con
# una interpolacion `${...}` dentro de un fragment, que el plugin lee de forma
# estatica y no sabe resolver— imprime "Error: ... This might be a bug in
# @shopify/graphql-codegen" y **sale 0**. Verificado en los dos comandos:
# `npm run codegen` y `shopify hydrogen build --codegen` devuelven exit 0 con el
# error en pantalla. El build termina bien, el gate se pinta verde, y los
# `*.generated.d.ts` se quedan viejos sin que nadie se entere — justo lo que
# AGENTS.md pide garantizar despues de tocar una query.
#
# Los errores de validacion de GraphQL si devuelven exit != 0; el grep esta por
# el otro camino.
codegen_log="$(mktemp)"
trap 'rm -f "$codegen_log"' EXIT

if ! npm run codegen >"$codegen_log" 2>&1; then
  cat "$codegen_log"
  exit 1
fi

if grep -qE '^Error:|Document Validation failed' "$codegen_log"; then
  cat "$codegen_log"
  printf '\n\033[31m✖ codegen imprimio errores y salio 0: los tipos NO se regeneraron.\033[0m\n'
  exit 1
fi

step "6/6 Build"
npm run build

printf '\n\033[32m✔ Gate verde\033[0m\n'
