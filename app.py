import streamlit as st

st.set_page_config(page_title="Fusione", page_icon="🧭", layout="wide")

with st.sidebar:
    st.image("https://placehold.co/240x80?text=Fusione", use_column_width=True)
    st.markdown("**Ambiente:** Render • Auto Deploy OK • Previews OK")
    st.caption("Ajuste as cores em `.streamlit/config.toml`.")

st.title("Fusione")
st.caption("Painel jurídico/negócios — Streamlit + MySQL")

st.info("Use o menu Pages (barra lateral) para navegar: Contingências, Contratos, Comparador, Admin DB.")
st.divider()
st.write("Pronto para conectar seus dados e gráficos padrão.")
