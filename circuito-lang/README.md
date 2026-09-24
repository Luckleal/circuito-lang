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
```

`gerar.sh` gera o lexer em `gerado/` a partir de `gramatica/Circuito.g4` (pasta não versionada). `src/lexico.py` lê um arquivo `.circ`, lista os tokens reconhecidos e aponta erros léxicos com linha e coluna.

## 3. Em que fase o projeto está

**E2: especificação da linguagem e analisador léxico.** Não há, ainda, parser, árvore sintática, análise semântica nem simulação — isso é das entregas E3 e E4.

## 4. Como rodar os testes

```bash
bash testar.sh
```

O script roda `src/lexico.py` em todos os arquivos de `exemplos/` (devem sair com código 0) e de `exemplos/invalidos/` (devem sair com código 1), imprime `OK`/`FALHOU` por arquivo e um resumo (`N/N testes passaram`) no final.

## 5. Versões do ANTLR e do runtime

- `antlr4-python3-runtime`: **4.13.2**
- Gerador ANTLR (`antlr4 -v 4.13.2 ...`, fixado em `gerar.sh`): **4.13.2**

As duas versões precisam ser sempre a mesma.

## 6. Testar a gramática sem gerar código

O comando documentado pelo ANTLR para interpretar uma gramática sem gerar código é:

```bash
antlr4-parse gramatica/Circuito.g4 tokens -tokens exemplos/meio_somador.circ
```

Na prática, esse comando **não funciona** nesta versão (ANTLR 4.13.2) para uma gramática somente de lexer: ele falha com
`ClassCastException: ... IgnoreTokenVocabGrammar cannot be cast to ... LexerGrammar`.
É um bug conhecido e ainda aberto da ferramenta (issue [antlr/antlr4-tools#17](https://github.com/antlr/antlr4-tools/issues/17)), não um erro da gramática `Circuito.g4`.

Por isso, a validação real da gramática nesta etapa é feita gerando o código e testando com os próprios exemplos:

```bash
bash gerar.sh
bash testar.sh
```
