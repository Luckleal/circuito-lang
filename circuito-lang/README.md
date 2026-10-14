# Circuito

## 1. Que linguagem é essa

`Circuito` é uma linguagem para descrever **circuitos lógicos combinacionais**: um programa declara entradas, saídas e fios internos, e escreve equações booleanas que ligam esses sinais por portas lógicas (`E`, `OU`, `NAO`, `XOR`, `NE`, `NOU`, `XNOR`).

Exemplo (`exemplos/meio_somador.circ`):

```
// meio somador: soma dois bits
circuito "meio somador";

entrada A, B;
saida soma, vaiUm;

soma = A XOR B;
vaiUm = A E B;
```

Veja a especificação completa em [docs/especificacao.md](docs/especificacao.md).

## 2. Como instalar e rodar

```bash
pip install antlr4-tools antlr4-python3-runtime
bash gerar.sh
python src/lexico.py exemplos/meio_somador.circ
python src/sintatico.py exemplos/meio_somador.circ
```

`gerar.sh` gera o lexer e o parser em `gerado/` a partir de `gramatica/Circuito.g4` (pasta não versionada). `src/lexico.py` lê um arquivo `.circ`, lista os tokens reconhecidos e aponta erros léxicos com linha e coluna. `src/sintatico.py` roda o parser a partir da regra `programa`, imprime a árvore sintática e aponta erros sintáticos com linha e coluna (se houver erro léxico, reporta e não tenta parsear).

## 3. Em que fase o projeto está

**E3: especificação, analisador léxico e analisador sintático (parser).** Ainda não há análise semântica nem simulação — isso é da entrega E4.

## 4. Como rodar os testes

```bash
bash testar.sh
```

O script roda `src/lexico.py` e `src/sintatico.py` em todos os exemplos e confere o código de saída:

- `exemplos/*.circ` (válidos): os dois saem com 0.
- `exemplos/invalidos/*.circ` (erro léxico): os dois saem com 1.
- `exemplos/invalidos_sintaticos/*.circ` (léxico ok, erro sintático): o léxico sai com 0 e o sintático com 1.

Imprime `OK`/`FALHOU` por teste e um resumo (`N/N testes passaram`) no final.

## 5. Versões do ANTLR e do runtime

- `antlr4-python3-runtime`: **4.13.2**
- Gerador ANTLR (`antlr4 -v 4.13.2 ...`, fixado em `gerar.sh`): **4.13.2**

As duas versões precisam ser sempre a mesma.

## 6. Testar a gramática sem gerar código

Agora que a gramática tem regras de parser, o `antlr4-parse` funciona. Para ver a árvore de um arquivo inteiro:

```bash
antlr4-parse gramatica/Circuito.g4 programa -tree exemplos/precedencia.circ
```

O terceiro argumento pode ser qualquer regra, o que permite testar uma regra por vez, por exemplo `expr`:

```bash
echo "NAO A OU B E C" | antlr4-parse gramatica/Circuito.g4 expr -tree
```

Observação: na E2, quando a gramática era só de lexer (`lexer grammar`), esse comando falhava com `ClassCastException` por um bug conhecido do ANTLR 4.13.2 (issue [antlr/antlr4-tools#17](https://github.com/antlr/antlr4-tools/issues/17)). Com a gramática combinada (`grammar Circuito;`) o problema não ocorre.
