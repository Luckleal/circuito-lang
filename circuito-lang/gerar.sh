#!/usr/bin/env bash
# Regenera o lexer e o parser a partir da gramatica.
# -Xexact-output-dir evita que o ANTLR crie gerado/gramatica/... em vez de gerado/
# -visitor gera tambem CircuitoVisitor.py (so tem efeito porque agora ha regras de parser)
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
rm -rf gerado
antlr4 -v 4.13.2 -Dlanguage=Python3 -visitor -Xexact-output-dir -o gerado gramatica/Circuito.g4
