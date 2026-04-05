/* ══════════════════════════════════════
   APP.JS — SQL Playground Engine + UI
   Arquitetura: UI primeiro, DB depois
   ══════════════════════════════════════ */

(function () {
    'use strict';

    // ── State ──
    let db = null;
    let dbEngine = null; // 'pglite' or 'sqljs'
    let dbReady = false;
    let activeChallenge = null;

    // ── DOM ──
    const $ = id => document.getElementById(id);
    const loadingEl = $('loading');
    const appEl = $('app');
    const editorEl = $('editor');
    const btnRun = $('btnRun');
    const btnClear = $('btnClear');
    const resultsEl = $('results');
    const timeEl = $('queryTime');
    const progressEl = $('progressCount');
    const challengeDetail = $('challengeDetail');
    const toastEl = $('toast');
    const statusEl = $('dbStatus');

    // ══════════════════════════════════════
    // PHASE 1: Render UI immediately
    // ══════════════════════════════════════

    const SCHEMA_INFO = [
        { name: 'gastos_governo', count: '~600', cols: [
            ['id', 'SERIAL PK'], ['orgao', 'VARCHAR'], ['funcao', 'VARCHAR'],
            ['subfuncao', 'VARCHAR'], ['programa', 'VARCHAR'], ['acao', 'VARCHAR'],
            ['valor_empenhado', 'NUMERIC'], ['valor_liquidado', 'NUMERIC'],
            ['valor_pago', 'NUMERIC'], ['ano', 'INT'], ['mes', 'INT']
        ]},
        { name: 'servidores', count: '~800', cols: [
            ['id', 'SERIAL PK'], ['nome', 'VARCHAR'], ['orgao', 'VARCHAR'],
            ['cargo', 'VARCHAR'], ['funcao', 'VARCHAR'],
            ['remuneracao_basica', 'NUMERIC'], ['gratificacao', 'NUMERIC'],
            ['total_bruto', 'NUMERIC'], ['desconto', 'NUMERIC'],
            ['total_liquido', 'NUMERIC'], ['uf', 'CHAR(2)']
        ]},
        { name: 'transferencias', count: '~700', cols: [
            ['id', 'SERIAL PK'], ['uf', 'CHAR(2)'], ['municipio', 'VARCHAR'],
            ['tipo_transferencia', 'VARCHAR'], ['programa', 'VARCHAR'],
            ['valor', 'NUMERIC'], ['ano', 'INT'], ['mes', 'INT']
        ]},
        { name: 'emendas', count: '~500', cols: [
            ['id', 'SERIAL PK'], ['autor', 'VARCHAR'], ['partido', 'VARCHAR'],
            ['uf', 'CHAR(2)'], ['tipo_emenda', 'VARCHAR'], ['area', 'VARCHAR'],
            ['valor_empenhado', 'NUMERIC'], ['valor_pago', 'NUMERIC'], ['ano', 'INT']
        ]}
    ];

    // Render schema sidebar
    function renderSchema() {
        const el = $('schemaList');
        el.innerHTML = SCHEMA_INFO.map(t => `
            <div class="pg-table-item">
                <div class="pg-table-header" data-table="${t.name}">
                    <span class="pg-table-name">${t.name}</span>
                    <span class="pg-table-count">${t.count}</span>
                    <span class="pg-table-arrow">▶</span>
                </div>
                <div class="pg-table-cols">
                    ${t.cols.map(c => `<span class="pg-col">${c[0]} <span class="pg-col-type">${c[1]}</span></span>`).join('')}
                </div>
            </div>
        `).join('');

        // Click to toggle + insert query
        el.addEventListener('click', (e) => {
            const header = e.target.closest('.pg-table-header');
            if (!header) return;
            const item = header.parentElement;
            item.classList.toggle('open');

            // Double click to insert SELECT
            const tableName = header.dataset.table;
            if (editorEl.value.trim() === '' || editorEl.value.trim() === editorEl.placeholder) {
                editorEl.value = `SELECT * FROM ${tableName} LIMIT 10;`;
            }
        });
    }

    // Render challenges sidebar
    function renderChallenges() {
        const el = $('challengeList');
        el.innerHTML = CHALLENGES.map(ch => `
            <div class="pg-challenge ${isSolved(ch.id) ? 'solved' : ''}" data-id="${ch.id}">
                <div class="pg-challenge-top">
                    <span class="pg-challenge-num">#${String(ch.id).padStart(2, '0')}</span>
                    ${isSolved(ch.id) ? '<span class="pg-solved-check">✓</span>' : ''}
                    <span class="pg-level ${ch.level}">${ch.level}</span>
                </div>
                <div class="pg-challenge-title">${ch.title}</div>
            </div>
        `).join('');

        el.addEventListener('click', (e) => {
            const card = e.target.closest('.pg-challenge');
            if (!card) return;
            selectChallenge(+card.dataset.id);
        });
    }

    function selectChallenge(id) {
        const ch = CHALLENGES.find(c => c.id === id);
        if (!ch) return;
        activeChallenge = ch;

        // Highlight
        document.querySelectorAll('.pg-challenge').forEach(el => {
            el.classList.toggle('active', +el.dataset.id === id);
        });

        challengeDetail.classList.add('visible');
        challengeDetail.innerHTML = `
            <div class="pg-challenge-detail-header">
                <span class="pg-level ${ch.level}">${ch.level}</span>
                <h3>#${String(ch.id).padStart(2, '0')} — ${ch.title}</h3>
            </div>
            <p class="pg-challenge-question">${ch.question}</p>
            <div class="pg-challenge-actions">
                <button class="pg-toggle-btn" data-toggle="hint">💡 Dica</button>
                <button class="pg-toggle-btn" data-toggle="solution">🔑 Ver solução</button>
                <button class="pg-toggle-btn pg-use-solution" data-toggle="use">📋 Usar no editor</button>
            </div>
            <div class="pg-hint" id="hintBox">${ch.hint}</div>
            <div class="pg-solution" id="solutionBox"><pre>${ch.solution}</pre></div>
        `;

        // Toggle buttons
        challengeDetail.querySelectorAll('.pg-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.toggle;
                if (action === 'hint') $('hintBox').classList.toggle('visible');
                if (action === 'solution') $('solutionBox').classList.toggle('visible');
                if (action === 'use') {
                    editorEl.value = ch.solution;
                    editorEl.focus();
                }
            });
        });

        editorEl.placeholder = `-- ${ch.title}\n-- Escreva sua query aqui...`;
    }

    // Render quick examples
    function renderExamples() {
        const el = $('quickExamples');
        if (!el) return;
        el.innerHTML = QUICK_EXAMPLES.map(ex => `
            <button class="pg-example-btn" data-query="${ex.query.replace(/"/g, '&quot;')}">${ex.label}</button>
        `).join('');

        el.addEventListener('click', (e) => {
            const btn = e.target.closest('.pg-example-btn');
            if (!btn) return;
            editorEl.value = btn.dataset.query;
            if (dbReady) runQuery();
        });
    }

    function updateProgress() {
        progressEl.textContent = `${getSolvedCount()}/${CHALLENGES.length}`;
    }

    function setStatus(state, text) {
        statusEl.className = 'pg-status pg-status--' + state;
        statusEl.textContent = text;
    }

    // Render everything immediately
    renderSchema();
    renderChallenges();
    renderExamples();
    updateProgress();

    // Show app, hide loading overlay but show inline status
    loadingEl.style.display = 'none';
    appEl.classList.add('ready');
    setStatus('loading', 'Carregando banco...');
    btnRun.disabled = true;

    // ══════════════════════════════════════
    // PHASE 2: Load DB engine (async)
    // ══════════════════════════════════════

    async function initPGlite() {
        const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js');
        db = new PGlite();
        dbEngine = 'pglite';

        await db.exec(SEED_SCHEMA);
        const lines = SEED_DATA.split('\n').filter(l => l.trim());
        for (let i = 0; i < lines.length; i += 100) {
            await db.exec(lines.slice(i, i + 100).join('\n'));
        }
    }

    async function initSqlJs() {
        const SQL = await window.initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        db = new SQL.Database();
        dbEngine = 'sqljs';

        // SQLite-compatible schema (remove SERIAL, use INTEGER PRIMARY KEY)
        const sqliteSchema = SEED_SCHEMA
            .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/NUMERIC\(\d+,\d+\)/g, 'REAL')
            .replace(/VARCHAR\(\d+\)/g, 'TEXT')
            .replace(/CHAR\(\d+\)/g, 'TEXT')
            .replace(/VARCHAR/g, 'TEXT')
            .replace(/INTEGER NOT NULL/g, 'INTEGER');

        db.run(sqliteSchema);

        const lines = SEED_DATA.split('\n').filter(l => l.trim());
        for (const line of lines) {
            try { db.run(line); } catch(e) { /* skip errors */ }
        }
    }

    async function initDB() {
        // Try PGlite first
        try {
            await initPGlite();
            setStatus('active', 'PostgreSQL ativo');
            btnRun.disabled = false;
            dbReady = true;
            return;
        } catch (err) {
            console.warn('PGlite failed, trying sql.js fallback:', err.message);
        }

        // Fallback: sql.js
        try {
            // Load sql.js script
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://sql.js.org/dist/sql-wasm.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });

            await initSqlJs();
            setStatus('active', 'SQLite ativo (fallback)');
            btnRun.disabled = false;
            dbReady = true;
            return;
        } catch (err) {
            console.error('sql.js also failed:', err.message);
        }

        // Both failed
        setStatus('error', 'Erro ao carregar banco');
        resultsEl.innerHTML = `<div class="pg-error">Não foi possível inicializar o banco de dados.<br>Tente usar Chrome, Firefox ou Edge na versão mais recente.<br><br>Erro: verifique o console do navegador (F12) para mais detalhes.</div>`;
    }

    initDB();

    // ══════════════════════════════════════
    // PHASE 3: Query execution
    // ══════════════════════════════════════

    async function runQuery() {
        const sql = editorEl.value.trim();
        if (!sql || !dbReady) return;

        btnRun.disabled = true;
        timeEl.textContent = '';
        resultsEl.innerHTML = '<div class="pg-empty"><div class="pg-spinner"></div><p>Executando...</p></div>';

        const t0 = performance.now();

        try {
            let rows = [];
            let colNames = [];
            const isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);

            if (dbEngine === 'pglite') {
                if (isSelect) {
                    const result = await db.query(sql);
                    rows = result.rows || [];
                    if (rows.length > 0) colNames = Object.keys(rows[0]);
                } else {
                    await db.exec(sql);
                }
            } else {
                // sql.js
                const result = db.exec(sql);
                if (result.length > 0) {
                    colNames = result[0].columns;
                    rows = result[0].values.map(vals => {
                        const obj = {};
                        colNames.forEach((c, i) => obj[c] = vals[i]);
                        return obj;
                    });
                }
            }

            const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
            timeEl.textContent = `${elapsed}s`;

            if (!isSelect && dbEngine === 'pglite') {
                resultsEl.innerHTML = '<div class="pg-results-info">Query executada com sucesso.</div>';
                btnRun.disabled = false;
                return;
            }

            if (rows.length === 0) {
                resultsEl.innerHTML = `<div class="pg-results-info">0 linhas retornadas em ${elapsed}s.</div>`;
                btnRun.disabled = false;
                return;
            }

            let html = `<div class="pg-results-info"><strong>${rows.length}</strong> linha${rows.length !== 1 ? 's' : ''} em ${elapsed}s</div>`;
            html += '<div class="pg-table-scroll"><table class="pg-result-table"><thead><tr>';
            colNames.forEach(c => html += `<th>${c}</th>`);
            html += '</tr></thead><tbody>';

            rows.forEach(row => {
                html += '<tr>';
                colNames.forEach(c => {
                    let val = row[c];
                    if (val === null || val === undefined) val = '<span class="null-val">NULL</span>';
                    else if (typeof val === 'number') val = val.toLocaleString('pt-BR');
                    html += `<td>${val}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            resultsEl.innerHTML = html;

            // Mark challenge solved
            if (activeChallenge && !isSolved(activeChallenge.id) && rows.length > 0) {
                markSolved(activeChallenge.id);
                updateProgress();
                renderChallenges();
                showToast(`✓ Desafio #${String(activeChallenge.id).padStart(2, '0')} resolvido!`);
            }

        } catch (err) {
            const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
            timeEl.textContent = `${elapsed}s`;
            resultsEl.innerHTML = `<div class="pg-error">${err.message}</div>`;
        }

        btnRun.disabled = false;
    }

    // ── Event Listeners (always active) ──
    btnRun.addEventListener('click', () => {
        if (dbReady) runQuery();
        else showToast('Banco ainda carregando, aguarde...');
    });

    btnClear.addEventListener('click', () => {
        editorEl.value = '';
        editorEl.focus();
    });

    editorEl.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (dbReady) runQuery();
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = editorEl.selectionStart;
            editorEl.value = editorEl.value.substring(0, s) + '  ' + editorEl.value.substring(editorEl.selectionEnd);
            editorEl.selectionStart = editorEl.selectionEnd = s + 2;
        }
    });

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

})();
