@echo off
setlocal
cd /d "C:\fusionecore-suite"

echo ==========================================
echo      LIMPEZA DO FUSIONCORE SUITE
echo ==========================================

echo.
echo [1/3] Removendo pastas de lixo identificadas...

if exist "backups\modules-20251227-124605" (
    rmdir /s /q "backups\modules-20251227-124605"
    echo  - Removido: backups\modules-20251227-124605
)

if exist "apps\dev\extracted_20250928_161022" (
    rmdir /s /q "apps\dev\extracted_20250928_161022"
    echo  - Removido: apps\dev\extracted_20250928_161022
)

if exist "projeto_instagram_congelado" (
    rmdir /s /q "projeto_instagram_congelado"
    echo  - Removido: projeto_instagram_congelado
)

if exist "_outros_scripts" (
    rmdir /s /q "_outros_scripts"
    echo  - Removido: _outros_scripts
)

echo.
echo [2/3] Limpando caches Python (__pycache__)...
for /d /r . %%d in (__pycache__) do @if exist "%%d" (
    echo  - Limpando: %%d
    rmdir /s /q "%%d"
)

echo.
echo [3/3] Limpando arquivos temporarios...
if exist "outputs\temp" (
    del /q "outputs\temp\*.*"
    echo  - Limpo: outputs\temp
)

echo.
echo ==========================================
echo      LIMPEZA CONCLUIDA!
echo ==========================================

