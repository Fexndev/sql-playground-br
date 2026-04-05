/* ══════════════════════════════════════
   CHALLENGES — Desafios SQL Progressivos
   ══════════════════════════════════════ */

const CHALLENGES = [
    // ── INICIANTE ──
    {
        id: 1,
        level: 'iniciante',
        title: 'Top 10 Órgãos por Gasto',
        question: 'Quais são os 10 órgãos do governo federal que mais pagaram em 2024? Mostre o órgão e o total pago.',
        hint: 'Use SUM() com GROUP BY e ORDER BY DESC. Filtre pelo ano com WHERE.',
        solution: `SELECT orgao, SUM(valor_pago) AS total_pago
FROM gastos_governo
WHERE ano = 2024
GROUP BY orgao
ORDER BY total_pago DESC
LIMIT 10;`
    },
    {
        id: 2,
        level: 'iniciante',
        title: 'Servidores por Estado',
        question: 'Quantos servidores federais existem em cada UF? Ordene do maior para o menor.',
        hint: 'COUNT(*) com GROUP BY na coluna uf.',
        solution: `SELECT uf, COUNT(*) AS total_servidores
FROM servidores
GROUP BY uf
ORDER BY total_servidores DESC;`
    },
    {
        id: 3,
        level: 'iniciante',
        title: 'Salário Médio por Órgão',
        question: 'Qual o salário líquido médio dos servidores em cada órgão? Mostre os 10 maiores.',
        hint: 'Use AVG() na coluna total_liquido, com GROUP BY orgao.',
        solution: `SELECT orgao, ROUND(AVG(total_liquido), 2) AS salario_medio
FROM servidores
GROUP BY orgao
ORDER BY salario_medio DESC
LIMIT 10;`
    },

    // ── INTERMEDIÁRIO ──
    {
        id: 4,
        level: 'intermediario',
        title: 'Transferências por Estado',
        question: 'Qual o total de transferências recebidas por cada UF em 2024? Mostre UF e valor total, ordenado pelo valor.',
        hint: 'SUM(valor) com GROUP BY uf e WHERE ano = 2024.',
        solution: `SELECT uf, SUM(valor) AS total_recebido
FROM transferencias
WHERE ano = 2024
GROUP BY uf
ORDER BY total_recebido DESC;`
    },
    {
        id: 5,
        level: 'intermediario',
        title: 'Empenho vs Pagamento',
        question: 'Para cada função de governo, qual a porcentagem do valor empenhado que foi efetivamente pago? Ordene pela menor porcentagem (maior "represamento").',
        hint: 'Divida SUM(valor_pago) por SUM(valor_empenhado) e multiplique por 100.',
        solution: `SELECT funcao,
       SUM(valor_empenhado) AS empenhado,
       SUM(valor_pago) AS pago,
       ROUND(SUM(valor_pago) / SUM(valor_empenhado) * 100, 1) AS pct_pago
FROM gastos_governo
GROUP BY funcao
ORDER BY pct_pago ASC;`
    },
    {
        id: 6,
        level: 'intermediario',
        title: 'Emendas para Saúde por Partido',
        question: 'Quais partidos mais destinaram emendas para a área de Saúde? Mostre partido, quantidade de emendas e valor total pago.',
        hint: 'Filtre WHERE area = \'Saúde\' e agrupe por partido.',
        solution: `SELECT partido,
       COUNT(*) AS qtd_emendas,
       SUM(valor_pago) AS total_pago
FROM emendas
WHERE area = 'Saúde'
GROUP BY partido
ORDER BY total_pago DESC;`
    },
    {
        id: 7,
        level: 'intermediario',
        title: 'Municípios que Mais Recebem',
        question: 'Quais os 15 municípios que mais receberam transferências no total (todos os anos)? Mostre UF, município e valor.',
        hint: 'GROUP BY uf, municipio com SUM(valor).',
        solution: `SELECT uf, municipio, SUM(valor) AS total_recebido
FROM transferencias
GROUP BY uf, municipio
ORDER BY total_recebido DESC
LIMIT 15;`
    },

    // ── AVANÇADO ──
    {
        id: 8,
        level: 'avancado',
        title: 'Disparidade Salarial',
        question: 'Quais órgãos têm a maior disparidade salarial entre seus servidores? Calcule o desvio padrão do salário bruto por órgão (mínimo 10 servidores).',
        hint: 'Use STDDEV() ou (MAX - MIN). Filtre com HAVING COUNT(*) >= 10.',
        solution: `SELECT orgao,
       COUNT(*) AS servidores,
       ROUND(MIN(total_bruto), 2) AS menor_salario,
       ROUND(MAX(total_bruto), 2) AS maior_salario,
       ROUND(MAX(total_bruto) - MIN(total_bruto), 2) AS diferenca,
       ROUND(STDDEV(total_bruto)::numeric, 2) AS desvio_padrao
FROM servidores
GROUP BY orgao
HAVING COUNT(*) >= 10
ORDER BY desvio_padrao DESC;`
    },
    {
        id: 9,
        level: 'avancado',
        title: 'Sazonalidade de Gastos',
        question: 'Qual a evolução mensal dos gastos pagos em 2024 por função? Identifique se existe concentração de pagamentos no final do ano.',
        hint: 'GROUP BY funcao, mes. Ordene por funcao e mes para ver a evolução.',
        solution: `SELECT funcao, mes,
       SUM(valor_pago) AS total_pago
FROM gastos_governo
WHERE ano = 2024
GROUP BY funcao, mes
ORDER BY funcao, mes;`
    },
    {
        id: 10,
        level: 'avancado',
        title: 'Concentração de Emendas',
        question: 'Quais parlamentares direcionaram mais de 70% das suas emendas (em valor pago) para um único estado? Mostre autor, UF principal e a porcentagem.',
        hint: 'Use uma subquery ou CTE: calcule o total por autor, depois o total por autor+UF, e divida. Filtre > 70%.',
        solution: `WITH total_autor AS (
    SELECT autor, SUM(valor_pago) AS total
    FROM emendas GROUP BY autor
),
por_uf AS (
    SELECT autor, uf, SUM(valor_pago) AS valor_uf
    FROM emendas GROUP BY autor, uf
)
SELECT p.autor, p.uf, p.valor_uf,
       ROUND(p.valor_uf / t.total * 100, 1) AS pct
FROM por_uf p
JOIN total_autor t ON t.autor = p.autor
WHERE t.total > 0
  AND p.valor_uf / t.total > 0.7
ORDER BY pct DESC;`
    }
];

// ── Progresso (localStorage) ──
function getProgress() {
    try {
        return JSON.parse(localStorage.getItem('sql_playground_progress') || '{}');
    } catch { return {}; }
}

function markSolved(id) {
    const p = getProgress();
    p[id] = true;
    localStorage.setItem('sql_playground_progress', JSON.stringify(p));
}

function isSolved(id) {
    return !!getProgress()[id];
}

function getSolvedCount() {
    return Object.keys(getProgress()).length;
}
