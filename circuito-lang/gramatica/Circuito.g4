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
