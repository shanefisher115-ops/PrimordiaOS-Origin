import pathlib
import re
import json
import urllib.request

config_path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = config_path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('OAuth token missing in default.toml')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
account_id = '28d10ac896bd4dbbd4e279e5bc749b5c'

zone_name = 'primordiaorigin.com'
req = urllib.request.Request(
    f'https://api.cloudflare.com/client/v4/zones?name={zone_name}', headers=headers)
with urllib.request.urlopen(req, timeout=20) as r:
    data = json.load(r)
print('=== Zone lookup ===')
print(json.dumps(data, indent=2))
if data['success'] and data['result']:
    zone_id = data['result'][0]['id']
    print('Zone ID:', zone_id)
    req = urllib.request.Request(
        f'https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?per_page=100',
        headers=headers
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        dns_data = json.load(r)
    print('=== DNS records ===')
    print(json.dumps(dns_data, indent=2))
else:
    print('Zone lookup failed or no zone found')
