# Fusione — Render (Auto Deploy + Preview)

Este repo sobe o Fusione no Render com deploy automático e Preview por PR.
Stack: Streamlit + MySQL (via SQLAlchemy).

## Uso rápido
1. Crie um repo no GitHub e suba estes arquivos.
2. Tenha um MySQL gerenciado (ex.: PlanetScale) e pegue a connection string.
3. No Render: New -> Blueprint (aponta pro repo). Deixe Auto Deploy e Preview ativos.
4. Em Environment, defina MYSQL_URI.
5. Push = deploy. Pull Request = Preview isolado.

## Variáveis
- MYSQL_URI — ex.: mysql+pymysql://user:pass@host/db?ssl=true
- PYTHON_VERSION — opcional (padrão 3.11)

## Pastas
- app.py — shell da aplicação, roteia páginas e define layout.
- pages/ — módulos do Fusione:
  - 01_Contingencias.py
  - 02_Contratos.py
  - 03_Comparador_Planilhas.py
  - 99_Admin_DB.py
- utils/db.py — conexão SQLAlchemy + helpers.
- .streamlit/config.toml — tema (cores Vipal).
