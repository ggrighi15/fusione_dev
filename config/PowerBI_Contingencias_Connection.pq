// Arquivo de Conexão Power BI para Banco de Contingências
// Salve este arquivo como .pq e importe no Power BI

let
    // Caminho do banco de dados SQLite
    DatabasePath = "G:\Meu Drive\fusione\historico_contencioso.db",
    
    // Conectar ao banco SQLite
    Source = Sqlite.Database(File.Contents(DatabasePath)),
    
    // Tabela principal de contingências
    fato_contingencias = Source{[Schema="",Item="fato_contingencias"]}[Data],
    
    // Transformações de tipo de dados
    #"Tipo Alterado" = Table.TransformColumnTypes(fato_contingencias,{
        {"pasta", type text},
        {"situacao", type text},
        {"categoria", type text},
        {"polo", type text},
        {"risco", type text},
        {"valor_analisado", type number},
        {"valor_analisado_atualizado", type number},
        {"competencia", type text},
        {"objeto", type text},
        {"data_criacao", type date},
        {"data_encerramento", type date},
        {"data_acordo", type date},
        {"data_atualizacao", type date},
        {"advogado", type text},
        {"tribunal", type text},
        {"instancia", type text},
        {"fase_processual", type text}
    }),
    
    // Adicionar coluna de ano/mês para análises temporais
    #"Coluna Ano-Mês Adicionada" = Table.AddColumn(#"Tipo Alterado", "AnoMes", each Date.From(#"Tipo Alterado"[competencia] & "-01"), type date),
    
    // Filtrar apenas registros dos últimos 24 meses para performance
    DataLimite = Date.AddMonths(Date.From(DateTime.LocalNow()), -24),
    #"Linhas Filtradas" = Table.SelectRows(#"Coluna Ano-Mês Adicionada", each [AnoMes] >= DataLimite)
in
    #"Linhas Filtradas"