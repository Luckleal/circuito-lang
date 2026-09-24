#!/usr/bin/env python3
"""Analisador lexico da linguagem Circuito.

Uso: python src/lexico.py caminho/do/arquivo.circ
"""
import os
import sys

# Forca UTF-8 na saida, independente da codificacao do console/terminal
# (no console do Windows, o padrao pode corromper os acentos das mensagens).
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Resolve o caminho de gerado/ a partir da localizacao deste arquivo,
# e nao do diretorio atual, para funcionar de qualquer lugar.
CAMINHO_SRC = os.path.dirname(os.path.abspath(__file__))
CAMINHO_GERADO = os.path.join(CAMINHO_SRC, "..", "gerado")
sys.path.insert(0, CAMINHO_GERADO)

from antlr4 import FileStream, Token
from antlr4.error.ErrorListener import ErrorListener

# A gramatica e "lexer grammar Circuito;" (gramatica/Circuito.g4). Para uma
# gramatica so de lexer, o ANTLR nomeia a classe gerada igual ao nome da
# gramatica, sem sufixo "Lexer" (gerado/Circuito.py, classe Circuito).
from Circuito import Circuito as CircuitoLexer


class OuvidorDeErros(ErrorListener):
    """Substitui o listener padrao para reportar caracteres invalidos."""

    def __init__(self):
        super().__init__()
        self.erros = 0

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        self.erros += 1
        caractere = msg
        inicio, fim = msg.find("'"), msg.rfind("'")
        if inicio != -1 and fim > inicio:
            caractere = msg[inicio + 1:fim]
        print(
            f"Erro léxico na linha {line}, coluna {column + 1}: "
            f"caractere inválido '{caractere}'",
            file=sys.stderr,
        )


def analisar(caminho):
    try:
        entrada = FileStream(caminho, encoding="utf-8")
    except OSError:
        print(f"Erro: não foi possível abrir o arquivo '{caminho}'.", file=sys.stderr)
        sys.exit(2)

    lexer = CircuitoLexer(entrada)
    ouvidor = OuvidorDeErros()
    lexer.removeErrorListeners()
    lexer.addErrorListener(ouvidor)

    tokens_reconhecidos = 0
    erros_de_token = 0

    while True:
        token = lexer.nextToken()
        if token.type == Token.EOF:
            break

        if token.type == CircuitoLexer.REAL_MALFORMADO:
            erros_de_token += 1
            print(
                f"Erro léxico na linha {token.line}, coluna {token.column + 1}: "
                f"número real malformado '{token.text}' (falta dígito depois do ponto)",
                file=sys.stderr,
            )
            continue

        if token.type == CircuitoLexer.TEXTO_ABERTO:
            erros_de_token += 1
            print(
                f"Erro léxico na linha {token.line}, coluna {token.column + 1}: "
                f"texto sem aspas de fechamento",
                file=sys.stderr,
            )
            continue

        nome = CircuitoLexer.symbolicNames[token.type]
        print(f"{nome} '{token.text}' linha {token.line}")
        tokens_reconhecidos += 1

    print(f"{tokens_reconhecidos} tokens reconhecidos")

    total_erros = ouvidor.erros + erros_de_token
    if total_erros > 0:
        print(f"{total_erros} erros léxicos encontrados", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)


def main():
    if len(sys.argv) != 2:
        print("Uso: python src/lexico.py caminho/do/arquivo.circ", file=sys.stderr)
        sys.exit(2)
    analisar(sys.argv[1])


if __name__ == "__main__":
    main()
