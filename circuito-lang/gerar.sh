#!/usr/bin/env bash
# Regenera o lexer a partir da gramatica.
# -Xexact-output-dir evita que o ANTLR crie gerado/gramatica/... em vez de gerado/
antlr4 -v 4.13.2 -Dlanguage=Python3 -Xexact-output-dir -o gerado gramatica/Circuito.g4
