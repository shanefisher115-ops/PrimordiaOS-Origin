Write-Host "[RUN] Launching PrimordiaOS Masterplane..."

npx concurrently `
  -c "cyan,green,yellow,magenta" `
  -n "KERNEL,SERVER,WS,UNREAL" `
  -p "[{name}]" `
  -m kill-others `
  "nodemon dist/kernel/runtime/boot.js" `
  "nodemon dist/server/bootstrap.js" `
  "nodemon dist/server/ws/server.js" `
  "nodemon dist/Primordia-unreal-bridge/index.js"

Write-Host "=== PRIMORDIAOS MEGA-BOOT ONLINE ==="
