import pathlib
import re
import json
import urllib.request
import socket

config_path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = config_path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('OAuth token missing in default.toml')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
account_id = '28d10ac896bd4dbbd4e279e5bc749b5c'
project_name = 'primordiaos'

req = urllib.request.Request(
    f'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/domains',
    headers=headers,
)
with urllib.request.urlopen(req, timeout=20) as r:
    data = json.load(r)
print('=== Pages domains list ===')
print(json.dumps(data, indent=2))

for domain in ['primordiaorigin.com', 'www.primordiaorigin.com']:
    print(f'=== DNS resolution for {domain} ===')
    try:
        addrs = socket.getaddrinfo(domain, 443)
        uniq = sorted({ai[4][0] for ai in addrs})
        print(domain, '->', uniq)
    except Exception as e:
        print(domain, 'resolution failed:', e)
