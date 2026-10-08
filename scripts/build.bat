@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==^> Installing dependencies
call npm install || exit /b 1

echo ==^> Typecheck
call npm run -w app typecheck || exit /b 1

echo ==^> Tests
call npm run -w app test || exit /b 1

echo ==^> Building CLI bundle
call npm run -w app build || exit /b 1

echo ==^> Building agyssyy.exe (best effort)
node scripts\build-exe.mjs
if errorlevel 1 (
  echo !! Native binary build skipped; npm package not assembled.
) else (
  echo ==^> Packing npm package
  node scripts\package-npm.mjs --pack
)

endlocal
