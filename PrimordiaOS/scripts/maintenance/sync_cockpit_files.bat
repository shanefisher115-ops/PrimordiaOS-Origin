@echo off
copy /y "%~dp0MoneyPlugHub\index.html" "%~dp0MoneyPlugHub\preview.html" >nul
copy /y "%~dp0MoneyPlugHub\index.html" "%~dp0index.html" >nul
copy /y "%~dp0MoneyPlugHub\index.html" "%~dp0dashboard.html" >nul
copy /y "%~dp0MoneyPlugHub\index.html" "%~dp0PrimordiaOS\interfaces\dashboard.html" >nul
copy /y "%~dp0MoneyPlugHub\index.html" "%~dp0MoneyPlugHub\dist\client\index.html" >nul
echo All cockpit entrypoints successfully synchronized.
