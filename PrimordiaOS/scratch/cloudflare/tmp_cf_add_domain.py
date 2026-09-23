import re, pathlib, json, urllib.request, urllib.error
path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('token missing')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
account_id = '28d10ac896bd4dbbd4e279e5bc749b5c'
project_name = 'primordiaos'
body = json.dumps({'name': 'primordiaorigin.com'}).encode('utf-8')
req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/domains', data=body, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.reason)
    print(e.read().decode())
