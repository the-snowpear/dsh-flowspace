@echo off
setlocal
chcp 65001 >NUL 2>&1
pushd "%~dp0"

where node >NUL 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js ^>= 24.9.0。
  echo %CMDCMDLINE% | find /i "%~0" >NUL && pause
  popd
  exit /b 1
)

node "%~dp0scripts/launcher.mjs" %*
set "EXIT_CODE=%ERRORLEVEL%"
popd

if not "%EXIT_CODE%"=="0" (
  echo %CMDCMDLINE% | find /i "%~0" >NUL && pause
)
exit /b %EXIT_CODE%
