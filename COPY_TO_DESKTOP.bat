@echo off
echo.
echo ================================================
echo  Копирование на рабочий стол...
echo ================================================
echo.

REM Создаем папку на рабочем столе
mkdir "%USERPROFILE%\Desktop\BudgetApp_GitHub" 2>nul

REM Копируем все файлы
xcopy /E /I /Y "%~dp0*" "%USERPROFILE%\Desktop\BudgetApp_GitHub"

echo.
echo ================================================
echo  ГОТОВО!
echo ================================================
echo.
echo Папка скопирована на рабочий стол:
echo %USERPROFILE%\Desktop\BudgetApp_GitHub
echo.
echo Размер: ~0.67 MB (БЕЗ node_modules!)
echo.
echo Откройте файл GITHUB_UPLOAD_INSTRUCTIONS.md
echo для пошаговой инструкции загрузки на GitHub
echo.
pause
