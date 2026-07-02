' 静默启动看门狗：用 wscript 隐藏窗口拉起 powershell，避免每 3 分钟闪黑框
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\SamsoData\Documents\Kol compass\watchdog.ps1""", 0, False
