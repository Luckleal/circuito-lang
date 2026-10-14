#!/usr/bin/env python3
"""Analisador sintatico da linguagem Circuito.

Uso: python src/sintatico.py caminho/do/arquivo.circ

Primeiro roda o lexer; se houver erro lexico, reporta e para (sem tentar
parsear, para nao gerar erros em cascata). Sem erro lexico, roda o parser a
partir da regra "programa" e imprime a arvore sintatica indentada.
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

CAMINHO_SRC = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(CAMINHO_SRC, "..", "gerado"))

from antlr4 import CommonTokenStream, FileStream
from antlr4.error.ErrorListener import ErrorListener
from antlr4.tree.Tree import TerminalNode

from CircuitoLexer import CircuitoLexer
from CircuitoParser import CircuitoParser


class OuvidorLexico(ErrorListener):
    def __init__(self):
        super().__init__()
        self.erros = 0

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        self.erros += 1
        inicio, fim = msg.find("'"), msg.rfind("'")
        caractere = msg[inicio + 1:fim] if inicio != -1 and fim > inicio else msg
        print(
            f"Erro léxico na linha {line}, coluna {column + 1}: caractere inválido '{caractere}'",
            file=sys.stderr,
        )


class OuvidorSintatico(ErrorListener):
    def __init__(self):
        super().__init__()
        self.erros = 0

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        self.erros += 1
        print(
            f"Erro sintático na linha {line}, coluna {column + 1}: {traduzir(msg)}",
            file=sys.stderr,
        )


def traduzir(msg):
    msg = msg.replace("'<EOF>'", "fim do arquivo").replace("<EOF>", "fim do arquivo")
    m = re.match(r"mismatched input (.+) expecting (.+)$", msg)
    if m:
        return f"encontrado {m.group(1)}, esperado {m.group(2)}"
    m = re.match(r"extraneous input (.+) expecting (.+)$", msg)
    if m:
        return f"símbolo inesperado {m.group(1)}, esperado {m.group(2)}"
    m = re.match(r"missing (.+) at (.+)$", msg)
    if m:
        return f"faltando {m.group(1)} antes de {m.group(2)}"
    m = re.match(r"no viable alternative at input (.+)$", msg)
    if m:
        return f"construção inválida perto de {m.group(1)}"
    return msg


def imprimir_arvore(no, parser, nivel=0):
    recuo = "  " * nivel
    if isinstance(no, TerminalNode):
        token = no.symbol
        if token.type == -1:
            return
        nome = CircuitoLexer.symbolicNames[token.type]
        print(f"{recuo}{nome} '{token.text}'")
        return
    print(f"{recuo}{parser.ruleNames[no.getRuleIndex()]}")
    for filho in no.getChildren():
        imprimir_arvore(filho, parser, nivel + 1)


def analisar(caminho):
    try:
        entrada = FileStream(caminho, encoding="utf-8")
    except OSError:
        print(f"Erro: não foi possível abrir o arquivo '{caminho}'.", file=sys.stderr)
        sys.exit(2)

    lexer = CircuitoLexer(entrada)
    ouvido_lexico = OuvidorLexico()
    lexer.removeErrorListeners()
    lexer.addErrorListener(ouvido_lexico)
    fluxo = CommonTokenStream(lexer)
    fluxo.fill()

    erros_lexicos = ouvido_lexico.erros
    for token in fluxo.tokens:
        if token.type == CircuitoLexer.REAL_MALFORMADO:
            erros_lexicos += 1
            print(
                f"Erro léxico na linha {token.line}, coluna {token.column + 1}: "
                f"número real malformado '{token.text}' (falta dígito depois do ponto)",
                file=sys.stderr,
            )
        elif token.type == CircuitoLexer.TEXTO_ABERTO:
            erros_lexicos += 1
            print(
                f"Erro léxico na linha {token.line}, coluna {token.column + 1}: "
                f"texto sem aspas de fechamento",
                file=sys.stderr,
            )

    if erros_lexicos > 0:
        print(f"{erros_lexicos} erros léxicos encontrados (análise sintática não executada)", file=sys.stderr)
        sys.exit(1)

    parser = CircuitoParser(fluxo)
    ouvido_sintatico = OuvidorSintatico()
    parser.removeErrorListeners()
    parser.addErrorListener(ouvido_sintatico)
    arvore = parser.programa()

    if ouvido_sintatico.erros > 0:
        print(f"{ouvido_sintatico.erros} erros sintáticos encontrados", file=sys.stderr)
        sys.exit(1)

    imprimir_arvore(arvore, parser)
    print("Análise sintática concluída sem erros")
    sys.exit(0)


def main():
    if len(sys.argv) != 2:
        print("Uso: python src/sintatico.py caminho/do/arquivo.circ", file=sys.stderr)
        sys.exit(2)
    analisar(sys.argv[1])


if __name__ == "__main__":
    main()
