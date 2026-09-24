#!/usr/bin/env bash
# Roda o analisador lexico em todos os exemplos.
# Validos devem sair com codigo 0; invalidos, com codigo 1.
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PASSOU=0
FALHOU=0

testar_um() {
    arquivo="$1"
    esperado="$2"

    python src/lexico.py "$arquivo" >/dev/null 2>&1
    obtido=$?

    if [ "$obtido" -eq "$esperado" ]; then
        echo "OK      $arquivo"
        PASSOU=$((PASSOU + 1))
    else
        echo "FALHOU  $arquivo (esperado codigo $esperado, obtido $obtido)"
        FALHOU=$((FALHOU + 1))
    fi
}

for arquivo in exemplos/*.circ; do
    testar_um "$arquivo" 0
done

for arquivo in exemplos/invalidos/*.circ; do
    testar_um "$arquivo" 1
done

TOTAL=$((PASSOU + FALHOU))
echo
echo "$PASSOU/$TOTAL testes passaram"

if [ "$FALHOU" -ne 0 ]; then
    exit 1
fi
exit 0
