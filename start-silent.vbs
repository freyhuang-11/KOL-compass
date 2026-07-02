' KOL Compass 静默启动器：隐藏窗口启动后端(8015) + 前端(5175)
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d ""D:\SamsoData\Documents\Kol compass"" && node server.js", 0, False
sh.Run "cmd /c cd /d ""D:\SamsoData\Documents\Kol compass"" && python -m http.server 5175 --bind 127.0.0.1", 0, False
