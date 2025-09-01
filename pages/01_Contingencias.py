import streamlit as st
import pandas as pd
import plotly.express as px
from utils.db import read_sql, quick_check

st.header("📊 Contingências")

try:
    quick_check()
    st.success("Conectado ao MySQL")
except Exception as e:
    st.error(f"Banco indisponível: {e}")
    st.stop()

sql = st.text_area("Consulta (ajuste ao seu schema)", "SELECT * FROM contingencias LIMIT 500")
if st.button("Rodar"):
    try:
        df = read_sql(sql)
        st.dataframe(df, use_container_width=True)
        if not df.empty and set(['Situacao','Categoria','Valor_Atualizado']).issubset(df.columns):
            agg = df.groupby(['Situacao','Categoria'], dropna=False)['Valor_Atualizado'].sum().reset_index()
            fig = px.treemap(agg, path=['Situacao','Categoria'], values='Valor_Atualizado', title="Mapa de Contingências")
            st.plotly_chart(fig, use_container_width=True)
    except Exception as e:
        st.error(f"Erro: {e}")
