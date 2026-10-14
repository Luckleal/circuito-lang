#!/usr/bin/env bash
# Roda os analisadores lexico e sintatico nos exemplos e confere o codigo de saida.
#   exemplos/*.circ                     -> validos: lexico 0 e sintatico 0
#   exemplos/invalidos/*.circ           -> erro lexico: lexico 1 e sintatico 1
#   exemplos/invalidos_sintaticos/*.circ -> lexicamente validos (lexico 0), erro sintatico (sintatico 1)
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PASSOU=0
FALHOU=0

testar_um() {
    programa="$1"
    arquivo="$2"
    esperado="$3"

    python "src/$programa.py" "$arquivo" >/dev/null 2>&1
    obtido=$?

    if [ "$obtido" -eq "$esperado" ]; then
        echo "OK      $programa $arquivo"
        PASSOU=$((PASSOU + 1))
    else
        echo "FALHOU  $programa $arquivo (esperado codigo $esperado, obtido $obtido)"
        FALHOU=$((FALHOU + 1))
    fi
}

for arquivo in exemplos/*.circ; do
    testar_um lexico "$arquivo" 0
    testar_um sintatico "$arquivo" 0
done

for arquivo in exemplos/invalidos/*.circ; do
    testar_um lexico "$arquivo" 1
    testar_um sintatico "$arquivo" 1
done

for arquivo in exemplos/invalidos_sintaticos/*.circ; do
    testar_um lexico "$arquivo" 0
    testar_um sintatico "$arquivo" 1
done

TOTAL=$((PASSOU + FALHOU))
echo
echo "$PASSOU/$TOTAL testes passaram"

if [ "$FALHOU" -ne 0 ]; then
    exit 1
fi
exit 0
