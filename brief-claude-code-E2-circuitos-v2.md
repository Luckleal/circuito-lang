# Brief para o Claude Code — Projeto E2: linguagem para circuitos lógicos (v2)

> **Nota para o grupo (não é instrução para o Claude Code):** antes de começar, confirmem com o professor que o domínio "circuitos lógicos" foi aprovado. Ele não está na tabela do enunciado, e a reserva de domínio é por ordem de comunicação.

---

## 1. O que vamos construir

Uma **linguagem própria para descrever circuitos lógicos combinacionais**, chamada `Circuito`. Um programa declara as entradas e as saídas de um circuito e escreve as equações booleanas que ligam os sinais por portas lógicas (E, OU, NAO, XOR...).

Esta entrega (E2) cobre **apenas** a especificação da linguagem e o **analisador léxico**. O analisador lê um programa, lista os tokens e aponta erros léxicos com linha e coluna.

## 2. Escopo: o que NÃO fazer

Esta é só a E2. **Não** crie:
- regras de parser (regras com nome em minúsculas);
- analisador sintático, árvore sintática, análise semântica;
- avaliação ou simulação do circuito, tabela-verdade.

Essas partes pertencem à E3 e à E4. Se sentir necessidade de uma regra de parser, pare: não é desta etapa.

## 3. Como trabalhar: por etapas, uma por sessão

O professor avalia o **histórico de commits distribuído ao longo dos dias** e o **diário de bordo escrito pelo grupo**. Por isso:

- Execute **somente a etapa que eu pedir** na sessão atual (ver seção 11) e pare ao terminar.
- Faça commits pequenos, com mensagens claras em português.
- **Não escreva entradas no `DIARIO.md`.** Crie o arquivo apenas com o modelo da seção 9. O diário é escrito pelo grupo.
- Ao fim de cada etapa, me entregue um **resumo curto** com o que foi feito, as decisões tomadas e os problemas encontrados (conflitos entre regras, erros do ANTLR etc.). O grupo usará esse resumo para escrever o diário.

## 4. Stack e versões

- Python 3 + ANTLR4 gerando código Python (`-Dlanguage=Python3`).
- Instalação: `pip install antlr4-tools antlr4-python3-runtime`.
- **A versão do gerador ANTLR e a do `antlr4-python3-runtime` precisam ser a mesma.** Verifique a versão do runtime instalado (`pip show antlr4-python3-runtime`) e fixe o gerador na mesma versão, usando a opção de versão do `antlr4` (`antlr4 -v X.Y.Z`). Registre as duas versões no README.

## 5. Estrutura do repositório

```
circuito-lang/
├── README.md
├── .gitignore
├── gerar.sh
├── testar.sh
├── gramatica/
│   └── Circuito.g4
├── src/
│   └── lexico.py
├── exemplos/
│   ├── meio_somador.circ
│   ├── detector.circ
│   ├── barramento.circ
│   └── invalidos/
│       ├── caractere_invalido.circ
│       ├── texto_sem_fechar.circ
│       └── numero_malformado.circ
└── docs/
    ├── especificacao.md
    └── DIARIO.md
```

O código gerado pelo ANTLR vai para `gerado/`, que **não** é versionado.

## 6. A gramática (`gramatica/Circuito.g4`)

Use **`lexer grammar`**, e não `grammar`. Uma gramática combinada (`grammar`) sem nenhuma regra de parser tende a falhar no ANTLR4 com `error(99): grammar ... has no rules`. Com `lexer grammar`, o ANTLR gera `CircuitoLexer.py`, e o arquivo contém apenas regras de lexer, como o enunciado exige.

```antlr
lexer grammar Circuito;

// ================= PALAVRAS-CHAVE =================
// Precisam vir ANTES de IDENT: em empate de tamanho, vence a regra definida primeiro.
CIRCUITO : 'circuito' ;
ENTRADA  : 'entrada' ;
SAIDA    : 'saida' ;
FIO      : 'fio' ;
ATRASO   : 'atraso' ;

// ================= PORTAS LOGICAS =================
XNOR : 'XNOR' ;
NOU  : 'NOU' ;   // NOR
NE   : 'NE' ;    // NAND
XOR  : 'XOR' ;
NAO  : 'NAO' ;
OU   : 'OU' ;
E    : 'E' ;

// ================= LITERAIS =================
REAL  : [0-9]+ '.' [0-9]+ ;      // atraso em ns, ex.: 2.5
INT   : [0-9]+ ;                 // largura de barramento, indices, constantes 0 e 1
TEXTO : '"' ~["\r\n]* '"' ;      // nome do circuito

// ================= IDENTIFICADORES =================
IDENT : [a-zA-Z_] [a-zA-Z_0-9]* ;

// ================= SIMBOLOS =================
ATRIB     : '=' ;
ARROBA    : '@' ;
APAR      : '(' ;
FPAR      : ')' ;
ACOL      : '[' ;
FCOL      : ']' ;
VIRGULA   : ',' ;
PONTOVIRG : ';' ;

// ================= DESCARTADOS =================
COMENT : '//' ~[\r\n]* -> skip ;
ESPACO : [ \t\r\n]+ -> skip ;

// ================= TOKENS DE ERRO =================
// Capturam erros comuns para dar mensagens especificas.
// Nao conflitam com as regras corretas: o ANTLR escolhe o casamento mais longo.
// "2.5" casa REAL (3 caracteres) e nao REAL_MALFORMADO (2); ja "2." so casa REAL_MALFORMADO.
// "abc" fechado casa TEXTO (mais longo); sem a aspa final, so TEXTO_ABERTO casa.
REAL_MALFORMADO : [0-9]+ '.' ;
TEXTO_ABERTO    : '"' ~["\r\n]* ;
```

## 7. `gerar.sh`

```bash
#!/usr/bin/env bash
# Regenera o lexer a partir da gramatica.
# -Xexact-output-dir evita que o ANTLR crie gerado/gramatica/... em vez de gerado/
antlr4 -v X.Y.Z -Dlanguage=Python3 -Xexact-output-dir -o gerado gramatica/Circuito.g4
```

Substitua `X.Y.Z` pela versão do runtime (seção 4). Depois de rodar, **confirme** que `gerado/CircuitoLexer.py` existe exatamente nesse caminho.

O `gerar.sh` do enunciado usa `-visitor`, mas essa opção só tem efeito com regras de parser, então não é necessária numa gramática só de lexer. Mencione isso no resumo da etapa.

## 8. `src/lexico.py`

**Uso:** `python src/lexico.py caminho/do/arquivo.circ`

**Requisitos:**
1. Importar o `CircuitoLexer` da pasta `gerado/`, resolvendo o caminho a partir da localização do próprio `lexico.py`, e não do diretório atual. Assim ele funciona de qualquer lugar.
2. Para cada token válido, imprimir no formato do enunciado:
   `NOME_DO_TOKEN 'lexema' linha N`
   O nome vem de `CircuitoLexer.symbolicNames[token.type]`. Não imprima o EOF.
3. Ao final, imprimir `N tokens reconhecidos`.
4. Tratar três tipos de erro léxico, sempre com **linha e coluna**. A coluna deve ser mostrada **a partir de 1**; o ANTLR conta a partir de 0, então some 1.
   - **Caractere inválido:** remova o listener padrão do lexer e registre um `ErrorListener` próprio, sobrescrevendo `syntaxError`. Mensagem: `Erro léxico na linha L, coluna C: caractere inválido '&'`
   - **Token `REAL_MALFORMADO`:** `Erro léxico na linha L, coluna C: número real malformado '2.' (falta dígito depois do ponto)`
   - **Token `TEXTO_ABERTO`:** `Erro léxico na linha L, coluna C: texto sem aspas de fechamento`
5. Os tokens de erro **não** entram na contagem de tokens reconhecidos.
6. O analisador **continua após um erro** e reporta todos os erros do arquivo. No fim, se houve erro, imprimir também `N erros léxicos encontrados`.
7. **Código de saída:** 0 sem erros, 1 com erros. O `testar.sh` depende disso.
8. Arquivo inexistente: mensagem amigável e código de saída 2, sem stack trace.

## 9. Conteúdo dos exemplos

**Toda instrução termina com `;`.** Como as quebras de linha são descartadas, o `;` é o que separa uma instrução da seguinte. Isso será essencial para o parser na E3.

### Válidos

`exemplos/meio_somador.circ`
```
// meio somador: soma dois bits
circuito "meio somador";

entrada A, B;
saida soma, vaiUm;

soma = A XOR B;
vaiUm = A E B;
```

Saída esperada (início e fim):
```
CIRCUITO 'circuito' linha 2
TEXTO '"meio somador"' linha 2
PONTOVIRG ';' linha 2
ENTRADA 'entrada' linha 4
IDENT 'A' linha 4
VIRGULA ',' linha 4
IDENT 'B' linha 4
PONTOVIRG ';' linha 4
...
IDENT 'B' linha 8
PONTOVIRG ';' linha 8
25 tokens reconhecidos
```

`exemplos/detector.circ`
```
// combina tres entradas usando um fio intermediario
circuito "detector";

entrada A, B, C;
fio t1;
saida S;

t1 = A E B;
S = t1 OU NAO C @atraso 3.0;
```

`exemplos/barramento.circ`
```
// usa barramento, indices e parenteses
circuito "monitor de barramento";

entrada dados[4];
saida ativo;

ativo = (dados[0] OU dados[1]) E NAO dados[3];
```

### Inválidos

Estas são as linhas e colunas esperadas, contando a partir de 1.

`exemplos/invalidos/caractere_invalido.circ`: o `&` não existe na linguagem. Esperado: **linha 4, coluna 7**.
```
circuito "teste";
entrada A, B;
saida S;
S = A & B;
```

`exemplos/invalidos/texto_sem_fechar.circ`: falta a aspa final. Esperado: **linha 1, coluna 10**.
```
circuito "meio somador;
entrada A, B;
saida S;
S = A E B;
```

`exemplos/invalidos/numero_malformado.circ`: `2.` sem dígito depois do ponto. Esperado: **linha 4, coluna 19**.
```
circuito "atraso ruim";
entrada A, B;
saida S;
S = A E B @atraso 2.;
```

Confira a contagem de tokens e as posições executando o analisador. Se algum número divergir, verifique manualmente e me avise no resumo em vez de ajustar só o texto.

## 10. Arquivos de apoio

`.gitignore`
```
gerado/
*.tokens
*.interp
__pycache__/
```

`testar.sh`: roda o analisador em todos os exemplos. Os válidos devem sair com código 0 e os inválidos com código 1. Para cada arquivo, imprime `OK` ou `FALHOU` e, no fim, um resumo (por exemplo, `6/6 testes passaram`). O script sai com código diferente de 0 se algum teste falhar.

`README.md`, respondendo nesta ordem (exigência do enunciado):
1. Que linguagem é essa, com um exemplo curto.
2. Como instalar e rodar (`pip install ...`, `bash gerar.sh`, `python src/lexico.py ...`).
3. Em que fase o projeto está (E2: especificação + analisador léxico).
4. Como rodar os testes (`bash testar.sh`).
5. As versões do ANTLR e do runtime usadas.
6. O comando para testar a gramática sem gerar código (ver etapa 2 da seção 11).

`docs/DIARIO.md`: **apenas o modelo abaixo, sem entradas.**
```
# Diário de bordo

Uma entrada por sessão de trabalho: data, o que foi tentado, o que aconteceu.

## DD/MM
(o que tentamos / o que deu errado / o que decidimos)
```

## 11. Etapas (uma por sessão)

**Etapa 1: esqueleto e especificação.** Crie a estrutura de pastas, o `.gitignore`, o `DIARIO.md` com o modelo e o `docs/especificacao.md` a partir da seção 12. O enunciado diz que a especificação vem antes do código. Pare aqui para o grupo revisar.

**Etapa 2: gramática.** Crie o `Circuito.g4` e o `gerar.sh`. Rode o `gerar.sh` e confirme onde os arquivos foram gerados. Valide a gramática com `antlr4-parse`. Numa gramática só de lexer não existe regra `programa`, então descubra o comando que funciona (por exemplo, usando `tokens` como regra inicial: `antlr4-parse gramatica/Circuito.g4 tokens -tokens arquivo.circ`) e registre o comando que funcionou no resumo.

**Etapa 3: analisador.** Crie o `src/lexico.py` conforme a seção 8 e teste com o `meio_somador.circ`.

**Etapa 4: exemplos e testes.** Crie os seis exemplos e o `testar.sh`. Confira as posições dos erros.

**Etapa 5: README.** Escreva o README conforme a seção 10 e revise a consistência geral: a especificação precisa bater com a gramática e com os exemplos.

## 12. Conteúdo da especificação (`docs/especificacao.md`)

Responda os 7 itens **nesta ordem**.

1. **Para que serve (duas frases).** A linguagem Circuito descreve circuitos lógicos combinacionais: declara entradas, saídas e as equações booleanas que ligam os sinais por portas lógicas. Serve para especificar um circuito de forma textual e verificável, como base para simulá-lo depois.

2. **Programa de exemplo comentado linha a linha.** Use o `meio_somador.circ` e explique cada linha.

3. **Tipos de dado.**
   - `bit`: valor lógico, 0 ou 1.
   - `barramento`: vetor de bits, declarado com a largura entre colchetes (`dados[4]`) e acessado por índice (`dados[0]`).
   - Literais de apoio: inteiro (largura e índice de barramento, constantes 0 e 1), real (atraso de propagação em nanossegundos, na anotação `@atraso`) e texto (nome do circuito).

4. **Comandos.** Toda instrução termina com `;`.
   - `circuito "nome";` dá nome ao circuito.
   - `entrada a, b;` e `saida s;` declaram sinais externos.
   - `fio t;` declara um sinal interno.
   - `sinal = expressao;` liga um sinal a uma expressão de portas.
   - `@atraso <real>` é uma anotação opcional, colocada antes do `;`.

5. **Operadores e precedência**, da maior para a menor:
   1. `NAO` (unário)
   2. `E`, `NE`
   3. `OU`, `NOU`, `XOR`, `XNOR`

   Os binários associam à esquerda, e parênteses alteram a ordem. Outros símbolos: `=` (ligação), `[ ]` (índice de barramento), `@` (anotação), `,` (separador de lista), `;` (fim de instrução). Observação: nesta etapa a precedência é uma decisão de projeto; ela será aplicada pelo parser na E3.

6. **Comentários.** De linha, começando com `//` e indo até o fim da linha. São descartados pelo analisador.

7. **Três coisas que a linguagem deliberadamente não faz.**
   - Não descreve circuitos sequenciais: não há memória, flip-flops, clock nem estado, apenas lógica combinacional.
   - Não permite usar nomes de portas ou palavras-chave (`E`, `OU`, `NAO`, `entrada`...) como nomes de sinais, pois são reservados.
   - Não tem laços, condicionais, sub-rotinas nem aritmética. Ela descreve um circuito estático, não é uma linguagem de propósito geral.

## 13. Critérios de aceite

- `bash gerar.sh` gera `gerado/CircuitoLexer.py` sem erros.
- `python src/lexico.py exemplos/meio_somador.circ` lista 25 tokens no formato exigido.
- Cada inválido é apontado com a mensagem específica e a linha e coluna corretas, sem stack trace.
- `bash testar.sh` mostra `6/6 testes passaram`.
- A especificação responde os 7 itens na ordem e é coerente com a gramática e os exemplos.
- `gerado/` não é versionado, e o `DIARIO.md` contém apenas o modelo.
