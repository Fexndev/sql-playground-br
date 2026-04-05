/* ══════════════════════════════════════
   SEED — Portal da Transparência BR
   Dados realistas baseados na estrutura
   do Portal da Transparência Federal
   ══════════════════════════════════════ */

const SEED_SCHEMA = `

-- ════════════════════════════════════
-- GASTOS DO GOVERNO FEDERAL
-- ════════════════════════════════════
CREATE TABLE gastos_governo (
    id SERIAL PRIMARY KEY,
    orgao VARCHAR(120) NOT NULL,
    funcao VARCHAR(60) NOT NULL,
    subfuncao VARCHAR(80),
    programa VARCHAR(120),
    acao VARCHAR(150),
    valor_empenhado NUMERIC(15,2) NOT NULL,
    valor_liquidado NUMERIC(15,2) NOT NULL,
    valor_pago NUMERIC(15,2) NOT NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL
);

-- ════════════════════════════════════
-- SERVIDORES PÚBLICOS FEDERAIS
-- ════════════════════════════════════
CREATE TABLE servidores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    orgao VARCHAR(120) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    funcao VARCHAR(100),
    remuneracao_basica NUMERIC(10,2) NOT NULL,
    gratificacao NUMERIC(10,2) DEFAULT 0,
    total_bruto NUMERIC(10,2) NOT NULL,
    desconto NUMERIC(10,2) DEFAULT 0,
    total_liquido NUMERIC(10,2) NOT NULL,
    uf CHAR(2) NOT NULL
);

-- ════════════════════════════════════
-- TRANSFERÊNCIAS A MUNICÍPIOS
-- ════════════════════════════════════
CREATE TABLE transferencias (
    id SERIAL PRIMARY KEY,
    uf CHAR(2) NOT NULL,
    municipio VARCHAR(80) NOT NULL,
    tipo_transferencia VARCHAR(60) NOT NULL,
    programa VARCHAR(120),
    valor NUMERIC(15,2) NOT NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL
);

-- ════════════════════════════════════
-- EMENDAS PARLAMENTARES
-- ════════════════════════════════════
CREATE TABLE emendas (
    id SERIAL PRIMARY KEY,
    autor VARCHAR(80) NOT NULL,
    partido VARCHAR(20) NOT NULL,
    uf CHAR(2) NOT NULL,
    tipo_emenda VARCHAR(40) NOT NULL,
    area VARCHAR(60) NOT NULL,
    valor_empenhado NUMERIC(15,2) NOT NULL,
    valor_pago NUMERIC(15,2) NOT NULL,
    ano INTEGER NOT NULL
);
`;

// ── Helper para gerar dados ──
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _rand(min, max) { return +(min + Math.random() * (max - min)).toFixed(2); }
function _randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function _esc(str) { return str.replace(/'/g, "''"); }

function generateSeedData() {
    const statements = [];

    // ── Lookups ──
    const orgaos = [
        'Ministério da Saúde', 'Ministério da Educação', 'Ministério da Defesa',
        'Ministério da Fazenda', 'Ministério da Justiça', 'Ministério dos Transportes',
        'Ministério da Ciência e Tecnologia', 'Ministério do Trabalho',
        'Ministério do Meio Ambiente', 'Ministério da Agricultura',
        'Ministério das Comunicações', 'Ministério do Desenvolvimento Social',
        'Ministério de Minas e Energia', 'Ministério das Relações Exteriores',
        'Ministério do Planejamento', 'Ministério do Turismo',
        'Ministério da Cultura', 'Ministério do Esporte',
        'Controladoria-Geral da União', 'Advocacia-Geral da União'
    ];

    const funcoes = [
        'Saúde', 'Educação', 'Defesa Nacional', 'Previdência Social',
        'Assistência Social', 'Transporte', 'Segurança Pública',
        'Ciência e Tecnologia', 'Agricultura', 'Energia',
        'Meio Ambiente', 'Cultura', 'Trabalho', 'Comunicações'
    ];

    const subfuncoes = {
        'Saúde': ['Atenção Básica', 'Vigilância Epidemiológica', 'Assistência Hospitalar', 'Saúde da Família'],
        'Educação': ['Ensino Fundamental', 'Ensino Superior', 'Educação Infantil', 'Educação Profissional'],
        'Defesa Nacional': ['Operações Militares', 'Tecnologia de Defesa', 'Pessoal Militar'],
        'Previdência Social': ['Benefícios INSS', 'Aposentadorias', 'Pensões'],
        'Assistência Social': ['Bolsa Família', 'BPC', 'SUAS'],
        'Transporte': ['Rodovias', 'Ferrovias', 'Portos', 'Aeroportos'],
        'Segurança Pública': ['Polícia Federal', 'Polícia Rodoviária', 'Sistema Penitenciário'],
        'Ciência e Tecnologia': ['Pesquisa Científica', 'Inovação', 'Bolsas de Estudo'],
        'Agricultura': ['Crédito Rural', 'Defesa Agropecuária', 'Reforma Agrária'],
        'Energia': ['Eletricidade', 'Petróleo e Gás', 'Energias Renováveis'],
        'Meio Ambiente': ['Conservação', 'Fiscalização Ambiental', 'Recursos Hídricos'],
        'Cultura': ['Patrimônio Cultural', 'Artes', 'Audiovisual'],
        'Trabalho': ['Seguro-Desemprego', 'Qualificação Profissional', 'Fiscalização'],
        'Comunicações': ['Telecomunicações', 'Radiodifusão', 'Inclusão Digital']
    };

    const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

    const municipios = {
        'SP': ['São Paulo','Campinas','Santos','Ribeirão Preto','Sorocaba','São José dos Campos','Osasco','Guarulhos'],
        'RJ': ['Rio de Janeiro','Niterói','Petrópolis','Nova Iguaçu','Duque de Caxias','São Gonçalo','Volta Redonda'],
        'MG': ['Belo Horizonte','Uberlândia','Juiz de Fora','Contagem','Betim','Montes Claros','Uberaba'],
        'BA': ['Salvador','Feira de Santana','Vitória da Conquista','Camaçari','Ilhéus','Itabuna'],
        'RS': ['Porto Alegre','Caxias do Sul','Pelotas','Canoas','Santa Maria','Novo Hamburgo'],
        'PR': ['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel','Foz do Iguaçu'],
        'PE': ['Recife','Jaboatão dos Guararapes','Olinda','Caruaru','Petrolina'],
        'CE': ['Fortaleza','Caucaia','Juazeiro do Norte','Maracanaú','Sobral'],
        'PA': ['Belém','Ananindeua','Santarém','Marabá','Parauapebas'],
        'GO': ['Goiânia','Aparecida de Goiânia','Anápolis','Rio Verde'],
        'MA': ['São Luís','Imperatriz','Caxias','Timon'],
        'SC': ['Florianópolis','Joinville','Blumenau','Chapecó','Criciúma'],
        'AM': ['Manaus','Parintins','Itacoatiara','Manacapuru'],
        'ES': ['Vitória','Vila Velha','Serra','Cariacica'],
        'PB': ['João Pessoa','Campina Grande','Santa Rita'],
        'RN': ['Natal','Mossoró','Parnamirim'],
        'AL': ['Maceió','Arapiraca','Rio Largo'],
        'PI': ['Teresina','Parnaíba','Picos'],
        'SE': ['Aracaju','Nossa Senhora do Socorro','Lagarto'],
        'MT': ['Cuiabá','Várzea Grande','Rondonópolis','Sinop'],
        'MS': ['Campo Grande','Dourados','Três Lagoas'],
        'DF': ['Brasília','Taguatinga','Ceilândia'],
        'RO': ['Porto Velho','Ji-Paraná','Ariquemes'],
        'TO': ['Palmas','Araguaína','Gurupi'],
        'AC': ['Rio Branco','Cruzeiro do Sul'],
        'AP': ['Macapá','Santana'],
        'RR': ['Boa Vista','Rorainópolis']
    };

    const cargos = [
        'Analista Administrativo', 'Técnico Administrativo', 'Auditor Federal',
        'Analista de Finanças', 'Engenheiro', 'Médico Federal',
        'Professor do Magistério Superior', 'Técnico em Assuntos Educacionais',
        'Analista Judiciário', 'Agente Administrativo', 'Assistente Social',
        'Economista', 'Contador', 'Analista de Sistemas', 'Bibliotecário',
        'Nutricionista', 'Enfermeiro', 'Farmacêutico', 'Psicólogo',
        'Técnico de Laboratório', 'Arquiteto', 'Geólogo'
    ];

    const nomes_prefixo = ['Ana','Bruno','Carlos','Daniela','Eduardo','Fernanda','Gabriel','Helena','Igor','Juliana','Lucas','Mariana','Nelson','Olivia','Paulo','Raquel','Sérgio','Tatiana','Victor','Yasmin'];
    const nomes_sufixo = ['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Almeida','Ferreira','Rodrigues','Nascimento','Araújo','Carvalho','Ribeiro','Gomes','Martins','Barbosa','Rocha','Moreira','Cardoso'];

    const partidos = ['PT','PL','PP','MDB','UNIÃO','PSD','PSDB','PDT','PSB','REPUBLICANOS','PSOL','PODE','NOVO','PCdoB','PV','REDE','SOLIDARIEDADE','AVANTE','CIDADANIA'];

    const tipos_transferencia = ['Constitucional', 'Legal', 'Voluntária', 'Especial'];
    const programas_transf = ['FPM', 'FPE', 'SUS', 'FUNDEB', 'FNAS', 'Programa Nacional de Alimentação Escolar', 'Bolsa Família', 'PAC', 'PDDE', 'Brasil sem Miséria'];

    const tipos_emenda = ['Individual', 'Bancada', 'Comissão', 'Relator'];
    const areas_emenda = ['Saúde', 'Educação', 'Infraestrutura', 'Assistência Social', 'Agricultura', 'Segurança Pública', 'Cultura', 'Esporte', 'Ciência e Tecnologia', 'Meio Ambiente'];

    const anos = [2023, 2024, 2025];

    // ── GASTOS_GOVERNO (600 linhas) ──
    for (let i = 0; i < 600; i++) {
        const funcao = _pick(funcoes);
        const subs = subfuncoes[funcao] || ['Geral'];
        const emp = _rand(100000, 50000000);
        const liq = +(emp * _rand(0.7, 1.0)).toFixed(2);
        const pago = +(liq * _rand(0.6, 1.0)).toFixed(2);
        const sub = _pick(subs);
        statements.push(`INSERT INTO gastos_governo (orgao,funcao,subfuncao,programa,acao,valor_empenhado,valor_liquidado,valor_pago,ano,mes) VALUES ('${_esc(_pick(orgaos))}','${_esc(funcao)}','${_esc(sub)}','${_esc('Programa de ' + funcao)}','${_esc('Ação de ' + sub)}',${emp},${liq},${pago},${_pick(anos)},${_randInt(1,12)});`);
    }

    // ── SERVIDORES (800 linhas) ──
    for (let i = 0; i < 800; i++) {
        const nome = _pick(nomes_prefixo) + ' ' + _pick(nomes_sufixo) + ' ' + _pick(nomes_sufixo);
        const rem = _rand(3000, 28000);
        const grat = _rand(500, 8000);
        const bruto = +(rem + grat).toFixed(2);
        const desc = +(bruto * _rand(0.15, 0.35)).toFixed(2);
        const liq = +(bruto - desc).toFixed(2);
        const cargo = _pick(cargos);
        statements.push(`INSERT INTO servidores (nome,orgao,cargo,funcao,remuneracao_basica,gratificacao,total_bruto,desconto,total_liquido,uf) VALUES ('${_esc(nome)}','${_esc(_pick(orgaos))}','${_esc(cargo)}','${_esc(cargo)}',${rem},${grat},${bruto},${desc},${liq},'${_pick(ufs)}');`);
    }

    // ── TRANSFERENCIAS (700 linhas) ──
    for (let i = 0; i < 700; i++) {
        const uf = _pick(ufs);
        const munis = municipios[uf] || ['Capital'];
        statements.push(`INSERT INTO transferencias (uf,municipio,tipo_transferencia,programa,valor,ano,mes) VALUES ('${uf}','${_esc(_pick(munis))}','${_esc(_pick(tipos_transferencia))}','${_esc(_pick(programas_transf))}',${_rand(50000, 20000000)},${_pick(anos)},${_randInt(1,12)});`);
    }

    // ── EMENDAS (500 linhas) ──
    const parlamentares = [];
    for (let i = 0; i < 80; i++) {
        parlamentares.push(_pick(nomes_prefixo) + ' ' + _pick(nomes_sufixo));
    }
    for (let i = 0; i < 500; i++) {
        const emp = _rand(100000, 15000000);
        const pago = +(emp * _rand(0.3, 1.0)).toFixed(2);
        const autor = _pick(parlamentares);
        statements.push(`INSERT INTO emendas (autor,partido,uf,tipo_emenda,area,valor_empenhado,valor_pago,ano) VALUES ('${_esc(autor)}','${_esc(_pick(partidos))}','${_pick(ufs)}','${_esc(_pick(tipos_emenda))}','${_esc(_pick(areas_emenda))}',${emp},${pago},${_pick(anos)});`);
    }

    return statements.join('\n');
}

const SEED_DATA = generateSeedData();
