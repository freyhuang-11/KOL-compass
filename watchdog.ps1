# KOL Compass 看门狗：每次运行检查 5175/8015，掉了就静默(无窗口)拉回
$dir = 'D:\SamsoData\Documents\Kol compass'
function Up($p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }
$sh = New-Object -ComObject WScript.Shell
if (-not (Up 8015)) { [void]$sh.Run("cmd /c cd /d `"$dir`" && node server.js", 0, $false) }
if (-not (Up 5175)) { [void]$sh.Run("cmd /c cd /d `"$dir`" && python -m http.server 5175 --bind 127.0.0.1", 0, $false) }
