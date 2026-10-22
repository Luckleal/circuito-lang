grammar Circuit;

// ##################### PARSER RULES / REGRAS DE PARSER #####################
// Parser rules start with a lowercase letter; lexer rules (tokens) with an uppercase one.
// Regras de parser começam com letra minúscula; regras de lexer (tokens) com maiúscula.

program     : header statement* EOF ;

// A single expression on its own (used by the interactive analyzer); EOF makes the
// whole input be consumed, so trailing text is reported instead of silently ignored.
// Uma expressão isolada (usada pelo analisador interativo); o EOF faz a entrada inteira
// ser consumida, então texto sobrando é reportado em vez de ignorado em silêncio.
expression  : expr EOF ;

header      : CIRCUIT STRING SEMI ;

statement   : declaration
            | assignment
            ;

declaration : (INPUT | OUTPUT | WIRE) signal (COMMA signal)* SEMI ;

assignment  : signal ASSIGN expr annotation? SEMI ;

annotation  : AT DELAY REAL ;

// plain name or bus position (data[0]); in a declaration, the bus width (data[4])
// nome simples ou posição de barramento (data[0]); na declaração, a largura (data[4])
signal      : IDENT (LBRACKET INT RBRACKET)? ;

// Alternative order defines precedence: an alternative declared earlier binds tighter.
// Binary operators are left-associative (ANTLR default).
// A ordem das alternativas define a precedência: a declarada antes liga mais forte.
// Operadores binários associam à esquerda (padrão do ANTLR).
expr        : NOT expr                              // strongest / mais forte
            | expr (AND | NAND) expr
            | expr (OR | NOR | XOR | XNOR) expr     // weakest / mais fraco
            | LPAREN expr RPAREN
            | signal
            | INT                                   // constants 0 and 1 (checked in semantic analysis) / constantes 0 e 1 (verificadas na análise semântica)
            ;

// ##################### LEXER RULES / REGRAS DE LEXER #####################

// ================= KEYWORDS / PALAVRAS-CHAVE =================
// Must come BEFORE IDENT: on a length tie, the rule defined first wins.
// Precisam vir ANTES de IDENT: em empate de tamanho, vence a regra definida primeiro.
CIRCUIT : 'circuit' ;
INPUT   : 'input' ;
OUTPUT  : 'output' ;
WIRE    : 'wire' ;
DELAY   : 'delay' ;

// ================= LOGIC GATES / PORTAS LÓGICAS =================
XNOR : 'XNOR' ;
NOR  : 'NOR' ;
NAND : 'NAND' ;
XOR  : 'XOR' ;
NOT  : 'NOT' ;
OR   : 'OR' ;
AND  : 'AND' ;

// ================= LITERALS / LITERAIS =================
REAL   : [0-9]+ '.' [0-9]+ ;     // delay in ns, e.g. 2.5 / atraso em ns, ex.: 2.5
INT    : [0-9]+ ;                // bus width, indices, constants 0 and 1 / largura de barramento, índices, constantes 0 e 1
STRING : '"' ~["\r\n]* '"' ;     // circuit name / nome do circuito

// ================= IDENTIFIERS / IDENTIFICADORES =================
IDENT : [a-zA-Z_] [a-zA-Z_0-9]* ;

// ================= SYMBOLS / SÍMBOLOS =================
ASSIGN   : '=' ;
AT       : '@' ;
LPAREN   : '(' ;
RPAREN   : ')' ;
LBRACKET : '[' ;
RBRACKET : ']' ;
COMMA    : ',' ;
SEMI     : ';' ;

// ================= DISCARDED / DESCARTADOS =================
COMMENT : '//' ~[\r\n]* -> skip ;
WS      : [ \t\r\n]+ -> skip ;

// ================= ERROR TOKENS / TOKENS DE ERRO =================
// They catch common mistakes to give specific messages.
// They do not conflict with the correct rules: ANTLR picks the longest match.
// "2.5" matches REAL (3 chars) and not MALFORMED_REAL (2); "2." only matches MALFORMED_REAL.
// A closed "abc" matches STRING (longer); without the final quote only UNCLOSED_STRING matches.
//
// Capturam erros comuns para dar mensagens específicas.
// Não conflitam com as regras corretas: o ANTLR escolhe o casamento mais longo.
// "2.5" casa REAL (3 caracteres) e não MALFORMED_REAL (2); já "2." só casa MALFORMED_REAL.
// "abc" fechado casa STRING (mais longo); sem a aspa final, só UNCLOSED_STRING casa.
MALFORMED_REAL  : [0-9]+ '.' ;
UNCLOSED_STRING : '"' ~["\r\n]* ;
