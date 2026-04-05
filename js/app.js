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
    const MAX_ROWS = 200;

    function fmtNumber(val) {
        if (!Number.isFinite(val)) return val;
        if (Number.isInteger(val)) return val.toLocaleString('pt-BR');
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── DOM ──
    const $ = id => document.getElementById(id);
    const loadingEl = $('loading');
    const appEl = $('app');
    const editorEl = $('editor');
    const btnRun = $('btnRun');
    const btnClear = $('btnClear');
    const btnClearResults = $('btnClearResults');
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
                    <button class="pg-btn-inspect" data-table="${t.name}">👁 Visualizar tabela</button>
                </div>
            </div>
        `).join('');

        // Click header to toggle
        el.addEventListener('click', (e) => {
            const header = e.target.closest('.pg-table-header');
            if (header) {
                header.parentElement.classList.toggle('open');
                return;
            }

            // Click "Visualizar tabela"
            const inspectBtn = e.target.closest('.pg-btn-inspect');
            if (inspectBtn) {
                inspectTable(inspectBtn.dataset.table);
                return;
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

    // ── Inspect Table ──
    async function inspectTable(tableName) {
        const table = SCHEMA_INFO.find(t => t.name === tableName);
        if (!table) return;

        // Build schema view
        let html = `<div class="pg-inspect">`;
        html += `<div class="pg-inspect-header">`;
        html += `<h3>${tableName}</h3>`;
        html += `<span class="pg-inspect-count">${table.count} registros</span>`;
        html += `</div>`;

        // Columns table
        html += `<div class="pg-inspect-section">`;
        html += `<div class="pg-inspect-label">Estrutura</div>`;
        html += `<table class="pg-result-table"><thead><tr><th>Coluna</th><th>Tipo</th></tr></thead><tbody>`;
        table.cols.forEach(c => {
            html += `<tr><td style="color:var(--accent);font-family:var(--mono)">${c[0]}</td><td style="color:var(--g2)">${c[1]}</td></tr>`;
        });
        html += `</tbody></table></div>`;

        // Preview data if DB ready
        if (dbReady) {
            try {
                let rows = [], colNames = [];
                const sql = `SELECT * FROM ${tableName} LIMIT 20`;

                if (dbEngine === 'pglite') {
                    const result = await db.query(sql);
                    rows = result.rows || [];
                    if (rows.length > 0) colNames = Object.keys(rows[0]);
                } else {
                    const result = db.exec(sql);
                    if (result.length > 0) {
                        colNames = result[0].columns;
                        rows = result[0].values.map(vals => {
                            const obj = {};
                            colNames.forEach((col, i) => obj[col] = vals[i]);
                            return obj;
                        });
                    }
                }

                if (rows.length > 0) {
                    html += `<div class="pg-inspect-section">`;
                    html += `<div class="pg-inspect-label">Preview (20 primeiras linhas)</div>`;
                    html += `<div class="pg-table-scroll"><table class="pg-result-table"><thead><tr>`;
                    colNames.forEach(c => html += `<th>${c}</th>`);
                    html += `</tr></thead><tbody>`;
                    rows.forEach(row => {
                        html += '<tr>';
                        colNames.forEach(c => {
                            let val = row[c];
                            if (val === null || val === undefined) val = '<span class="null-val">NULL</span>';
                            else if (typeof val === 'number') val = fmtNumber(val);
                            html += `<td>${val}</td>`;
                        });
                        html += '</tr>';
                    });
                    html += `</tbody></table></div></div>`;
                }
            } catch (err) {
                html += `<div class="pg-error" style="margin-top:.8rem">${err.message}</div>`;
            }
        } else {
            html += `<p style="color:var(--g3);font-size:.78rem;margin-top:.8rem">Banco ainda carregando — preview disponível em breve.</p>`;
        }

        html += `<button class="pg-btn-query-table" data-table="${tableName}">Consultar no editor →</button>`;
        html += `</div>`;

        resultsEl.innerHTML = html;

        // Button to send to editor
        resultsEl.querySelector('.pg-btn-query-table').addEventListener('click', () => {
            editorEl.value = `SELECT * FROM ${tableName} LIMIT 50;`;
            editorEl.focus();
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

            const totalRows = rows.length;
            const truncated = totalRows > MAX_ROWS;
            const displayRows = truncated ? rows.slice(0, MAX_ROWS) : rows;

            let html = `<div class="pg-results-info"><strong>${totalRows}</strong> linha${totalRows !== 1 ? 's' : ''} em ${elapsed}s`;
            if (truncated) html += ` <span class="pg-truncated">— exibindo ${MAX_ROWS} de ${totalRows}</span>`;
            html += `</div>`;
            html += '<div class="pg-table-scroll"><table class="pg-result-table"><thead><tr>';
            colNames.forEach(c => html += `<th>${c}</th>`);
            html += '</tr></thead><tbody>';

            displayRows.forEach(row => {
                html += '<tr>';
                colNames.forEach(c => {
                    let val = row[c];
                    if (val === null || val === undefined) val = '<span class="null-val">NULL</span>';
                    else if (typeof val === 'number') val = fmtNumber(val);
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

    btnClearResults.addEventListener('click', () => {
        resultsEl.innerHTML = '<div class="pg-empty"><div class="pg-empty-icon">🔍</div><p>Resultados limpos</p></div>';
        timeEl.textContent = '';
    });

    editorEl.addEventListener('keydown', (e) => {
        // Autocomplete gets priority
        if (acBox.style.display !== 'none') return;

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

    // ── Autocomplete ──
    const SQL_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS',
        'NULL', 'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
        'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET',
        'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP',
        'ALTER', 'ADD', 'COLUMN', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'STDDEV', 'DISTINCT',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'UNION', 'ALL', 'EXISTS',
        'CAST', 'COALESCE', 'NUMERIC', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN',
        'TRUE', 'FALSE', 'SERIAL', 'AUTOINCREMENT'
    ];
    const TABLE_NAMES = SCHEMA_INFO.map(t => t.name);
    const COL_NAMES = [...new Set(SCHEMA_INFO.flatMap(t => t.cols.map(c => c[0])))];
    // Map table → columns for contextual suggestions
    const TABLE_COLS = {};
    SCHEMA_INFO.forEach(t => { TABLE_COLS[t.name] = t.cols.map(c => c[0]); });

    const acBox = document.createElement('div');
    acBox.className = 'pg-autocomplete';
    acBox.style.display = 'none';
    editorEl.parentElement.style.position = 'relative';
    editorEl.parentElement.appendChild(acBox);

    let acItems = [];
    let acIndex = -1;

    function getWordAtCursor() {
        const pos = editorEl.selectionStart;
        const text = editorEl.value.substring(0, pos);
        const match = text.match(/[\w_]+$/);
        return match ? { word: match[0], start: pos - match[0].length, end: pos } : null;
    }

    // Extract table names from FROM/JOIN clauses in current query
    function getTablesInQuery() {
        const text = editorEl.value.toUpperCase();
        const tables = [];
        const re = /\b(?:FROM|JOIN)\s+([\w_]+)/gi;
        let m;
        while ((m = re.exec(editorEl.value)) !== null) {
            const tname = m[1].toLowerCase();
            if (TABLE_COLS[tname]) tables.push(tname);
        }
        return tables;
    }

    function showAutocomplete() {
        const info = getWordAtCursor();
        if (!info || info.word.length < 2) { acBox.style.display = 'none'; return; }

        const prefix = info.word.toUpperCase();

        // Build contextual word list: prioritize columns from tables in query
        const queryTables = getTablesInQuery();
        const contextCols = [...new Set(queryTables.flatMap(t => TABLE_COLS[t] || []))];
        const otherCols = COL_NAMES.filter(c => !contextCols.includes(c));
        const allWords = [...contextCols, ...TABLE_NAMES, ...SQL_KEYWORDS, ...otherCols];

        acItems = allWords.filter(w => w.toUpperCase().startsWith(prefix) && w.toUpperCase() !== prefix).slice(0, 8);

        if (acItems.length === 0) { acBox.style.display = 'none'; return; }

        acIndex = 0;
        acBox.innerHTML = acItems.map((item, i) => {
            const isSql = SQL_KEYWORDS.includes(item.toUpperCase());
            const isTable = TABLE_NAMES.includes(item);
            const tag = isSql ? 'keyword' : isTable ? 'table' : 'column';
            return `<div class="pg-ac-item ${i === 0 ? 'active' : ''}" data-index="${i}">
                <span class="pg-ac-tag pg-ac-${tag}">${tag}</span> ${item}
            </div>`;
        }).join('');
        acBox.style.display = 'block';
    }

    function applyAutocomplete(index) {
        const info = getWordAtCursor();
        if (!info || !acItems[index]) return;
        const word = acItems[index];
        editorEl.value = editorEl.value.substring(0, info.start) + word + editorEl.value.substring(info.end);
        editorEl.selectionStart = editorEl.selectionEnd = info.start + word.length;
        acBox.style.display = 'none';
        editorEl.focus();
    }

    acBox.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const item = e.target.closest('.pg-ac-item');
        if (item) applyAutocomplete(+item.dataset.index);
    });

    editorEl.addEventListener('input', showAutocomplete);

    editorEl.addEventListener('keydown', (e) => {
        if (acBox.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            acIndex = Math.min(acIndex + 1, acItems.length - 1);
            acBox.querySelectorAll('.pg-ac-item').forEach((el, i) => el.classList.toggle('active', i === acIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            acIndex = Math.max(acIndex - 1, 0);
            acBox.querySelectorAll('.pg-ac-item').forEach((el, i) => el.classList.toggle('active', i === acIndex));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            if (acItems.length > 0 && acIndex >= 0) {
                e.preventDefault();
                applyAutocomplete(acIndex);
            }
        } else if (e.key === 'Escape') {
            acBox.style.display = 'none';
        }
    });

    editorEl.addEventListener('blur', () => {
        setTimeout(() => { acBox.style.display = 'none'; }, 150);
    });

    // ── Theme Toggle ──
    const themeToggle = $('themeToggle');
    const savedTheme = localStorage.getItem('sql_pg_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
    }
    themeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.textContent = '🌙';
            localStorage.setItem('sql_pg_theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '☀️';
            localStorage.setItem('sql_pg_theme', 'light');
        }
    });

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

})();
