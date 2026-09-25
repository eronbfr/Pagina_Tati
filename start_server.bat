@echo off
echo.
echo ====================================
echo    Tati Portela Fitness - Servidor
echo ====================================
echo.

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Python nao esta instalado!
    echo.
    echo Instale o Python: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Verifica se Flask está instalado
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Instalando Flask e dependencias...
    pip install flask flask-cors
    echo.
)

echo.
echo Iniciando servidor Flask com banco de dados...
echo Os dados dos alunos serao salvos em: data\usuarios.json
echo.
echo Acesse: http://localhost:5000/app.html
echo.

python server.py

echo.
echo Servidor parado.
pause
