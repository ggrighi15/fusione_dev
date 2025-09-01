# Relatorio de Qualidade dos Dados Historicos
## Gerado em: 2025-08-31 21:18:05

## STATUS GERAL DA QUALIDADE [ATENCAO]

- **Status**: REGULAR
- **Score de Qualidade**: 1.54%
- **Banco analisado**: G:\Meu Drive\fusione\sql\historico_contencioso.db
- **Periodo**: 2021-01 a 2024-12
- **Tabelas analisadas**: 44
- **Registros estimados**: 56.778

## METRICAS DE QUALIDADE

| Metrica | Valor | Status |
|---------|-------|--------|
| Tabelas Processadas | 44 | OK |
| Registros Estimados | 56.778 | ATENCAO |
| Padroes Validos | 283.892 | OK |
| Problemas Detectados | 18.144.827 | ATENCAO |
| Valores Nulos | 0 | OK |
| Score Geral | 1.54% | ERRO |

## PROBLEMAS DE ESTRUTURA (2)

- Coluna 'valor_analisado' nao encontrada em algumas tabelas
- Coluna 'valor_analisado_atualizado' nao encontrada em algumas tabelas

## PROBLEMAS TEMPORAIS (4)

- Lacuna temporal: 11_2022
- Lacuna temporal: 02_2023
- Lacuna temporal: 03_2024
- Lacuna temporal: 04_2024

## RECOMENDACOES

1. **Priorizar correcao** dos problemas identificados
2. **Implementar processo ETL** robusto
3. **Validar dados** antes da consolidacao
4. **Recuperar dados** dos periodos faltantes

## PROXIMOS PASSOS

1. **Executar script ETL** para consolidacao
2. **Implementar validacoes** no processo de carga
3. **Criar alertas** para problemas de qualidade
4. **Estabelecer metricas** de monitoramento
5. **Documentar padroes** de qualidade esperados

## COMANDOS DE VALIDACAO

### Verificar dados consolidados
sqlite3 ./historico_consolidado_2021_2024.db
SELECT COUNT(*) as total_registros FROM fato_contingencias_consolidado;

### Verificar qualidade por competencia
sqlite3 ./historico_consolidado_2021_2024.db
SELECT competencia, COUNT(*) as registros, COUNT(DISTINCT pasta) as pastas_unicas FROM fato_contingencias_consolidado GROUP BY competencia ORDER BY competencia;
