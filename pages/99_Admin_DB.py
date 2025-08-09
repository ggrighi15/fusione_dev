import streamlit as st
from utils.db import quick_check

st.header("🛠️ Admin • Banco e Ambiente")

try:
    quick_check()
    st.success("Conexão OK (MYSQL_URI)")
except Exception as e:
    st.error(f"Falha na conexão: {e}")
    st.stop()

st.markdown(
    "- MYSQL_URI deve estar definido no Render > Environment.\n"
    "- Ajuste cores em `.streamlit/config.toml`.\n"
    "- Preview por PR já vem habilitado no render.yaml."
)
