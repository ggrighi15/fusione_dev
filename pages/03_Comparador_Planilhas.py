import streamlit as st
import pandas as pd
from io import BytesIO

st.header("🔍 Comparador de Planilhas (Excel)")
st.caption("Foco em campos: Pasta, Situação, Valor analisado (e outros que você escolher).")

up_old = st.file_uploader("Base Anterior (.xlsx)", type=["xlsx"], key="old")
up_new = st.file_uploader("Base Nova (.xlsx)", type=["xlsx"], key="new")

def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    cols = [c.strip() for c in df.columns]
    df.columns = cols
    ren = {
        "SituacaoProcesso":"Situação",
        "Valor analisado":"Valor analisado",
        "Valor analisado atualizado":"Valor_Atualizado",
    }
    df = df.rename(columns=ren)
    if "Pasta" in df.columns:
        df["Pasta"] = df["Pasta"].astype(str).str.strip()
    return df

if st.button("Comparar", type="primary") and up_old and up_new:
    try:
        df_old = clean_df(pd.read_excel(up_old))
        df_new = clean_df(pd.read_excel(up_new))

        key_cols = ["Pasta"]
        check_cols = [c for c in ["Situação", "Valor analisado", "Valor_Atualizado"] if c in df_new.columns]

        merged = df_old.merge(df_new, on="Pasta", how="outer", suffixes=("_old","_new"), indicator=True)

        def status_row(r):
            if r["_merge"] == "left_only":
                return "❌ Removida da Base Nova"
            if r["_merge"] == "right_only":
                return "🆕 Inserida na Base Nova"
            diffs = []
            for c in check_cols:
                a = r.get(f"{c}_old")
                b = r.get(f"{c}_new")
                if pd.isna(a) and pd.isna(b):
                    continue
                if a != b:
                    diffs.append(f"{c}: {a} ➜ {b}")
            if diffs:
                return "🔁 Alterado | " + " | ".join(diffs)
            return "✅ Sem alteração"

        merged["Status"] = merged.apply(status_row, axis=1)
        out_cols = ["Pasta","Status"] + [f"{c}_old" for c in check_cols] + [f"{c}_new" for c in check_cols]
        result = merged[out_cols].sort_values("Pasta")

        st.success("Comparativo gerado")
        st.dataframe(result, use_container_width=True)

        bio = BytesIO()
        result.to_excel(bio, index=False)
        st.download_button("Baixar Resultado (.xlsx)", data=bio.getvalue(), file_name="comparativo.xlsx")
    except Exception as e:
        st.error(f"Falhou: {e}")
else:
    st.info("Envie as duas planilhas e clique em Comparar.")
