# SQL Playground — Dados Públicos BR

Ambiente interativo para praticar SQL com dados reais do Portal da Transparência do governo federal brasileiro. PostgreSQL roda direto no browser via PGlite — zero instalação.

**[Acessar o Playground](https://fexndev.github.io/sql-playground-br/)**

## Funcionalidades

- **Editor SQL** com execução via Ctrl+Enter e feedback de tempo de query
- **Tabelas com dados reais** do Portal da Transparência (gastos do governo federal)
- **10 desafios progressivos** para praticar consultas SQL do básico ao avançado
- **Explorador de schema** — clique nas tabelas na sidebar para ver a estrutura
- **Tema claro/escuro** alternável
- **100% client-side** — o banco PostgreSQL roda no browser com PGlite, sem backend

## Como funciona

O projeto utiliza [PGlite](https://pglite.dev/) para executar um banco PostgreSQL completo diretamente no navegador. Os dados são carregados automaticamente ao abrir a página, permitindo executar queries SQL reais sem necessidade de servidor ou instalação.

## Tecnologias

- HTML, CSS, JavaScript (sem frameworks)
- PGlite (PostgreSQL no browser via WebAssembly)
- GitHub Pages (hospedagem)

## Fontes de dados

| Fonte | Dados |
|---|---|
| [Portal da Transparência](https://portaldatransparencia.gov.br/) | Gastos do governo federal |
