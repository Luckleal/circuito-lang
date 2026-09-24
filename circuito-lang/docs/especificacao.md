# Especificação da linguagem Circuito

## 1. Para que serve

A linguagem Circuito descreve circuitos lógicos combinacionais: declara entradas, saídas e as equações booleanas que ligam os sinais por portas lógicas. Serve para especificar um circuito de forma textual e verificável, como base para simulá-lo depois.

## 2. Programa de exemplo comentado linha a linha

```
// meio somador: soma dois bits
circuito "meio somador";

entrada A, B;
saida soma, vaiUm;

soma = A XOR B;
vaiUm = A E B;
```

- `// meio somador: soma dois bits` — comentário de linha, descartado pelo analisador; documenta o propósito do circuito.
- `circuito "meio somador";` — dá nome ao circuito; o nome é um literal de texto.
- (linha vazia, ignorada)
- `entrada A, B;` — declara os sinais externos de entrada `A` e `B`, cada um um bit.
- `saida soma, vaiUm;` — declara os sinais externos de saída `soma` e `vaiUm`.
- (linha vazia, ignorada)
- `soma = A XOR B;` — liga o sinal `soma` à saída da porta XOR entre `A` e `B` (soma sem considerar o vai-um).
- `vaiUm = A E B;` — liga o sinal `vaiUm` à saída da porta E entre `A` e `B` (vai-um da soma).

## 3. Tipos de dado

- `bit`: valor lógico, 0 ou 1.
- `barramento`: vetor de bits, declarado com a largura entre colchetes (`dados[4]`) e acessado por índice (`dados[0]`).
- Literais de apoio: inteiro (largura e índice de barramento, constantes 0 e 1), real (atraso de propagação em nanossegundos, na anotação `@atraso`) e texto (nome do circuito).

## 4. Comandos

Toda instrução termina com `;`.

- `circuito "nome";` dá nome ao circuito.
- `entrada a, b;` e `saida s;` declaram sinais externos.
- `fio t;` declara um sinal interno.
- `sinal = expressao;` liga um sinal a uma expressão de portas.
- `@atraso <real>` é uma anotação opcional, colocada antes do `;`.

## 5. Operadores e precedência

Da maior para a menor:

1. `NAO` (unário)
2. `E`, `NE`
3. `OU`, `NOU`, `XOR`, `XNOR`

Os binários associam à esquerda, e parênteses alteram a ordem. Outros símbolos: `=` (ligação), `[ ]` (índice de barramento), `@` (anotação), `,` (separador de lista), `;` (fim de instrução).

Observação: nesta etapa a precedência é uma decisão de projeto; ela será aplicada pelo parser na E3.

## 6. Comentários

De linha, começando com `//` e indo até o fim da linha. São descartados pelo analisador.

## 7. Três coisas que a linguagem deliberadamente não faz

- Não descreve circuitos sequenciais: não há memória, flip-flops, clock nem estado, apenas lógica combinacional.
- Não permite usar nomes de portas ou palavras-chave (`E`, `OU`, `NAO`, `entrada`...) como nomes de sinais, pois são reservados.
- Não tem laços, condicionais, sub-rotinas nem aritmética. Ela descreve um circuito estático, não é uma linguagem de propósito geral.
