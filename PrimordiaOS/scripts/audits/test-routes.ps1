Invoke-WebRequest http://127.0.0.1:8787/ | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/session/create | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/auth/login | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/automation/run | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/ipc/kernel | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/logs/write | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8787/webhooks/test | Select-Object -ExpandProperty Content
