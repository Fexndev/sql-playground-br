/* ══════════════════════════════════════
   CHALLENGES — Desafios SQL com atitude
   ══════════════════════════════════════ */

const CHALLENGES = [
    {
        id: 1, level: 'iniciante',
        title: 'Cadê o dinheiro?',
        question: 'Quais são os 10 órgãos do governo federal que mais gastaram em 2025? Mostre o órgão e o total pago. Prepare-se pra ver uns números com muitos zeros.',
        hint: 'Use SUM(valor_pago) com GROUP BY orgao. Filtre WHERE ano = 2025 e ORDER BY DESC com LIMIT 10.',
        solution: `SELECT orgao, SUM(valor_pago) AS total_pago\nFROM gastos_governo\nWHERE ano = 2025\nGROUP BY orgao\nORDER BY total_pago DESC\nLIMIT 10;`
    },
    {
        id: 2, level: 'iniciante',
        title: 'O Brasil de verdade',
        question: 'Quantos servidores federais existem em cada estado? Será que o DF ganha disparado? Descubra.',
        hint: 'COUNT(*) com GROUP BY uf, ordene DESC.',
        solution: `SELECT uf, COUNT(*) AS total_servidores\nFROM servidores\nGROUP BY uf\nORDER BY total_servidores DESC;`
    },
    {
        id: 3, level: 'iniciante',
        title: 'Servidor público ganha bem?',
        question: 'Qual o salário líquido médio por órgão? Top 10. Spoiler: alguns vão te surpreender.',
        hint: 'AVG(total_liquido) com GROUP BY orgao. Use ROUND() pra ficar bonito.',
        solution: `SELECT orgao, ROUND(AVG(total_liquido), 2) AS salario_medio\nFROM servidores\nGROUP BY orgao\nORDER BY salario_medio DESC\nLIMIT 10;`
    },
    {
        id: 4, level: 'intermediario',
        title: 'Quem recebe mais da União?',
        question: 'Qual o total de transferências por UF em 2025? Descubra quais estados são os queridinhos do governo federal.',
        hint: 'SUM(valor) com GROUP BY uf, filtre por ano = 2025.',
        solution: `SELECT uf, SUM(valor) AS total_recebido\nFROM transferencias\nWHERE ano = 2025\nGROUP BY uf\nORDER BY total_recebido DESC;`
    },
    {
        id: 5, level: 'intermediario',
        title: 'Promessa vs Realidade',
        question: 'Para cada função de governo, quanto do dinheiro empenhado foi efetivamente pago? Calcule a porcentagem. Prepare-se pra ver que "empenhar" e "pagar" são coisas bem diferentes.',
        hint: 'SUM(valor_pago) / SUM(valor_empenhado) * 100. GROUP BY funcao.',
        solution: `SELECT funcao,\n       SUM(valor_empenhado) AS empenhado,\n       SUM(valor_pago) AS pago,\n       ROUND(SUM(valor_pago) / SUM(valor_empenhado) * 100, 1) AS pct_pago\nFROM gastos_governo\nGROUP BY funcao\nORDER BY pct_pago ASC;`
    },
    {
        id: 6, level: 'intermediario',
        title: 'Emenda é saúde (literalmente)',
        question: 'Quais partidos mais destinaram emendas para a área de Saúde? Mostre partido, quantidade e valor total pago. Todo mundo ama a saúde na hora de emendar.',
        hint: 'WHERE area = \'Saúde\', GROUP BY partido. COUNT(*) e SUM(valor_pago).',
        solution: `SELECT partido,\n       COUNT(*) AS qtd_emendas,\n       SUM(valor_pago) AS total_pago\nFROM emendas\nWHERE area = 'Saúde'\nGROUP BY partido\nORDER BY total_pago DESC;`
    },
    {
        id: 7, level: 'intermediario',
        title: 'Onde o bicho pega',
        question: 'Top 15 municípios que mais recebem transferências federais. Será que é proporcional à necessidade ou à influência política?',
        hint: 'GROUP BY uf, municipio com SUM(valor). ORDER DESC, LIMIT 15.',
        solution: `SELECT uf, municipio, SUM(valor) AS total_recebido\nFROM transferencias\nGROUP BY uf, municipio\nORDER BY total_recebido DESC\nLIMIT 15;`
    },
    {
        id: 8, level: 'avancado',
        title: 'Desigualdade federal',
        question: 'Quais órgãos têm a maior disparidade salarial entre seus servidores? Use desvio padrão do salário bruto. Só considere órgãos com 10+ servidores. <em style="color:var(--g3);font-size:.75rem">(STDDEV requer PostgreSQL; no SQLite use MAX-MIN)</em>',
        hint: 'STDDEV(total_bruto) com GROUP BY orgao. HAVING COUNT(*) >= 10.',
        solution: `SELECT orgao,\n       COUNT(*) AS servidores,\n       ROUND(MIN(total_bruto), 2) AS menor,\n       ROUND(MAX(total_bruto), 2) AS maior,\n       ROUND(STDDEV(total_bruto)::numeric, 2) AS desvio_padrao\nFROM servidores\nGROUP BY orgao\nHAVING COUNT(*) >= 10\nORDER BY desvio_padrao DESC;`
    },
    {
        id: 9, level: 'avancado',
        title: 'Natal do governo',
        question: 'Evolução mensal dos gastos pagos em 2025 por função. Dezembro é quando o governo abre a torneira? Descubra os picos sazonais.',
        hint: 'GROUP BY funcao, mes. Ordene por funcao, mes.',
        solution: `SELECT funcao, mes,\n       SUM(valor_pago) AS total_pago\nFROM gastos_governo\nWHERE ano = 2025\nGROUP BY funcao, mes\nORDER BY funcao, mes;`
    },
    {
        id: 10, level: 'avancado',
        title: 'Puxadinho parlamentar',
        question: 'Quais parlamentares concentram mais de 70% das suas emendas (em valor pago) em um único estado? Use CTEs. Esses aí não disfarçam muito.',
        hint: 'CTE 1: total por autor. CTE 2: total por autor+uf. Divida e filtre > 0.7.',
        solution: `WITH total_autor AS (\n    SELECT autor, SUM(valor_pago) AS total\n    FROM emendas GROUP BY autor\n),\npor_uf AS (\n    SELECT autor, uf, SUM(valor_pago) AS valor_uf\n    FROM emendas GROUP BY autor, uf\n)\nSELECT p.autor, p.uf, p.valor_uf,\n       ROUND(p.valor_uf / t.total * 100, 1) AS pct\nFROM por_uf p\nJOIN total_autor t ON t.autor = p.autor\nWHERE t.total > 0\n  AND p.valor_uf / t.total > 0.7\nORDER BY pct DESC;`
    }
];

const QUICK_EXAMPLES = [
    { label: 'Quanto gastamos em Saúde?', query: "SELECT SUM(valor_pago) AS total_saude FROM gastos_governo WHERE funcao = 'Saúde' AND ano = 2025;" },
    { label: 'Servidores mais bem pagos', query: "SELECT nome, cargo, orgao, total_bruto FROM servidores ORDER BY total_bruto DESC LIMIT 20;" },
    { label: 'Pra onde vão as emendas?', query: "SELECT area, COUNT(*) AS qtd, SUM(valor_pago) AS total FROM emendas GROUP BY area ORDER BY total DESC;" },
    { label: 'Transferências por estado', query: "SELECT uf, COUNT(*) AS qtd, SUM(valor) AS total FROM transferencias GROUP BY uf ORDER BY total DESC;" },
];

// ── Progresso (localStorage) ──
function getProgress() {
    try { return JSON.parse(localStorage.getItem('sql_playground_progress') || '{}'); }
    catch { return {}; }
}
function markSolved(id) {
    const p = getProgress(); p[id] = true;
    localStorage.setItem('sql_playground_progress', JSON.stringify(p));
}
function isSolved(id) { return !!getProgress()[id]; }
function getSolvedCount() { return Object.keys(getProgress()).length; }
