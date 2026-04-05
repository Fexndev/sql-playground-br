/* ══════════════════════════════════════
   APP.JS — PGlite Engine + UI Logic
   ══════════════════════════════════════ */

(async function () {
    'use strict';

    // ── DOM refs ──
    const loadingEl = document.getElementById('loading');
    const appEl = document.getElementById('app');
    const editorEl = document.getElementById('editor');
    const btnRun = document.getElementById('btnRun');
    const resultsEl = document.getElementById('results');
    const timeEl = document.getElementById('queryTime');
    const progressEl = document.getElementById('progressCount');
    const challengeDetail = document.getElementById('challengeDetail');
    const toastEl = document.getElementById('toast');

    let db = null;
    let activeChallenge = null;

    // ── Init PGlite ──
    try {
        const { PGlite } = await import('@electric-sql/pglite');
        db = new PGlite();

        // Run schema
        await db.exec(SEED_SCHEMA);

        // Run seed data (batch for performance)
        const lines = SEED_DATA.split('\n').filter(l => l.trim());
        const batchSize = 100;
        for (let i = 0; i < lines.length; i += batchSize) {
            const batch = lines.slice(i, i + batchSize).join('\n');
            await db.exec(batch);
        }

        loadingEl.style.display = 'none';
        appEl.classList.add('ready');
        renderSchema();
        renderChallenges();
        updateProgress();

    } catch (err) {
        loadingEl.innerHTML = `
            <div style="color:#f87171;font-size:.85rem;max-width:500px;text-align:center;">
                <p style="font-size:1.2rem;margin-bottom:.8rem;">Erro ao inicializar</p>
                <p style="color:var(--g2)">${err.message}</p>
                <p style="color:var(--g3);margin-top:1rem;font-size:.72rem;">
                    PGlite requer um browser moderno com suporte a WebAssembly.<br>
                    Tente Chrome, Firefox ou Edge na versão mais recente.
                </p>
            </div>`;
        return;
    }

    // ── Schema Explorer ──
    const SCHEMA_INFO = [
        {
            name: 'gastos_governo', count: 600,
            cols: [
                ['id', 'SERIAL PK'], ['orgao', 'VARCHAR'], ['funcao', 'VARCHAR'],
                ['subfuncao', 'VARCHAR'], ['programa', 'VARCHAR'], ['acao', 'VARCHAR'],
                ['valor_empenhado', 'NUMERIC'], ['valor_liquidado', 'NUMERIC'],
                ['valor_pago', 'NUMERIC'], ['ano', 'INTEGER'], ['mes', 'INTEGER']
            ]
        },
        {
            name: 'servidores', count: 800,
            cols: [
                ['id', 'SERIAL PK'], ['nome', 'VARCHAR'], ['orgao', 'VARCHAR'],
                ['cargo', 'VARCHAR'], ['funcao', 'VARCHAR'],
                ['remuneracao_basica', 'NUMERIC'], ['gratificacao', 'NUMERIC'],
                ['total_bruto', 'NUMERIC'], ['desconto', 'NUMERIC'],
                ['total_liquido', 'NUMERIC'], ['uf', 'CHAR(2)']
            ]
        },
        {
            name: 'transferencias', count: 700,
            cols: [
                ['id', 'SERIAL PK'], ['uf', 'CHAR(2)'], ['municipio', 'VARCHAR'],
                ['tipo_transferencia', 'VARCHAR'], ['programa', 'VARCHAR'],
                ['valor', 'NUMERIC'], ['ano', 'INTEGER'], ['mes', 'INTEGER']
            ]
        },
        {
            name: 'emendas', count: 500,
            cols: [
                ['id', 'SERIAL PK'], ['autor', 'VARCHAR'], ['partido', 'VARCHAR'],
                ['uf', 'CHAR(2)'], ['tipo_emenda', 'VARCHAR'], ['area', 'VARCHAR'],
                ['valor_empenhado', 'NUMERIC'], ['valor_pago', 'NUMERIC'],
                ['ano', 'INTEGER']
            ]
        }
    ];

    function renderSchema() {
        const container = document.getElementById('schemaList');
        container.innerHTML = SCHEMA_INFO.map(t => `
            <div class="pg-table-item">
                <div class="pg-table-header" onclick="this.parentElement.classList.toggle('open')">
                    <span class="pg-table-name">${t.name}</span>
                    <span class="pg-table-count">${t.count} rows</span>
                    <span class="pg-table-arrow">▶</span>
                </div>
                <div class="pg-table-cols">
                    ${t.cols.map(c => `${c[0]} <span class="pg-col-type">${c[1]}</span>`).join('<br>')}
                </div>
            </div>
        `).join('');
    }

    // ── Challenges ──
    function renderChallenges() {
        const container = document.getElementById('challengeList');
        container.innerHTML = CHALLENGES.map(ch => `
            <div class="pg-challenge ${isSolved(ch.id) ? 'solved' : ''}"
                 data-id="${ch.id}" onclick="window._selectChallenge(${ch.id})">
                <div class="pg-challenge-top">
                    <span class="pg-challenge-num">#${String(ch.id).padStart(2, '0')}</span>
                    <span class="pg-level ${ch.level}">${ch.level}</span>
                </div>
                <div class="pg-challenge-title">
                    ${isSolved(ch.id) ? '<span class="pg-solved-check">✓ </span>' : ''}${ch.title}
                </div>
            </div>
        `).join('');
    }

    window._selectChallenge = function (id) {
        const ch = CHALLENGES.find(c => c.id === id);
        if (!ch) return;
        activeChallenge = ch;

        // Highlight sidebar
        document.querySelectorAll('.pg-challenge').forEach(el => {
            el.classList.toggle('active', +el.dataset.id === id);
        });

        // Show detail
        challengeDetail.classList.add('visible');
        challengeDetail.innerHTML = `
            <h3>#${String(ch.id).padStart(2, '0')} — ${ch.title}</h3>
            <p class="pg-challenge-question">${ch.question}</p>
            <div>
                <button class="pg-toggle-btn" onclick="this.nextElementSibling.classList.toggle('visible')">Dica</button>
                <div class="pg-hint">${ch.hint}</div>
            </div>
            <div style="margin-top:.5rem">
                <button class="pg-toggle-btn" onclick="this.nextElementSibling.classList.toggle('visible')">Ver solução</button>
                <div class="pg-solution">${ch.solution}</div>
            </div>
        `;

        editorEl.placeholder = `-- ${ch.title}\n-- Escreva sua query aqui...`;
        editorEl.focus();
    };

    function updateProgress() {
        progressEl.textContent = `${getSolvedCount()}/${CHALLENGES.length}`;
    }

    // ── Execute Query ──
    async function runQuery() {
        const sql = editorEl.value.trim();
        if (!sql) return;

        btnRun.disabled = true;
        timeEl.textContent = '';
        resultsEl.innerHTML = '<div class="pg-empty"><div class="pg-spinner"></div><p>Executando...</p></div>';

        const t0 = performance.now();
        try {
            // Use query() for SELECT statements, exec() for others
            const isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);
            let rows = [];
            let colNames = [];

            if (isSelect) {
                const result = await db.query(sql);
                rows = result.rows || [];
                if (rows.length > 0) {
                    colNames = Object.keys(rows[0]);
                }
            } else {
                await db.exec(sql);
            }

            const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
            timeEl.textContent = `${elapsed}s`;

            if (!isSelect) {
                resultsEl.innerHTML = `
                    <div class="pg-results-info">Query executada com sucesso. <strong>Nenhum resultado retornado.</strong></div>`;
                btnRun.disabled = false;
                return;
            }

            if (rows.length === 0) {
                resultsEl.innerHTML = `
                    <div class="pg-results-info">Query executada. <strong>0 linhas</strong> retornadas em ${elapsed}s.</div>`;
                btnRun.disabled = false;
                return;
            }

            let html = `<div class="pg-results-info"><strong>${rows.length}</strong> linha${rows.length > 1 ? 's' : ''} retornada${rows.length > 1 ? 's' : ''} em ${elapsed}s</div>`;
            html += '<table class="pg-result-table"><thead><tr>';
            colNames.forEach(c => { html += `<th>${c}</th>`; });
            html += '</tr></thead><tbody>';

            rows.forEach(row => {
                html += '<tr>';
                colNames.forEach(c => {
                    let val = row[c];
                    if (val === null || val === undefined) val = '<span style="color:var(--g3)">NULL</span>';
                    else if (typeof val === 'number') val = val.toLocaleString('pt-BR');
                    html += `<td>${val}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            resultsEl.innerHTML = html;

            // Check if solved a challenge
            if (activeChallenge && !isSolved(activeChallenge.id) && rows.length > 0) {
                markSolved(activeChallenge.id);
                updateProgress();
                renderChallenges();
                document.querySelectorAll('.pg-challenge').forEach(el => {
                    el.classList.toggle('active', +el.dataset.id === activeChallenge.id);
                });
                showToast(`Desafio #${String(activeChallenge.id).padStart(2, '0')} resolvido!`);
            }

        } catch (err) {
            const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
            timeEl.textContent = `${elapsed}s`;
            resultsEl.innerHTML = `<div class="pg-error">${err.message}</div>`;
        }

        btnRun.disabled = false;
    }

    btnRun.addEventListener('click', runQuery);

    editorEl.addEventListener('keydown', (e) => {
        // Ctrl+Enter / Cmd+Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runQuery();
        }
        // Tab to indent
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editorEl.selectionStart;
            editorEl.value = editorEl.value.substring(0, start) + '  ' + editorEl.value.substring(editorEl.selectionEnd);
            editorEl.selectionStart = editorEl.selectionEnd = start + 2;
        }
    });

    // ── Toast ──
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

})();
