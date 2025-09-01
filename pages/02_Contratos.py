import streamlit as st
from utils.db import read_sql, quick_check

st.header("📁 Contratos")

try:
    quick_check()
    st.success("Conectado ao MySQL")
except Exception as e:
    st.error(f"Banco indisponível: {e}")
    st.stop()

sql = st.text_area("Consulta (exemplo)", "SELECT * FROM contratos LIMIT 500")
if st.button("Buscar"):
    try:
        df = read_sql(sql)
        st.dataframe(df, use_container_width=True)
    except Exception as e:
        st.error(f"Erro: {e}")
