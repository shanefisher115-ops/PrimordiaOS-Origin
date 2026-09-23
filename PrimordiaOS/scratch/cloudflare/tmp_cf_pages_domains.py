import re, pathlib, json, urllib.request
path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('token missing')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
account_id = '28d10ac896bd4dbbd4e279e5bc749b5c'
project_name = 'primordiaos'
urls = [
    f'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/domains',
]
for url in urls:
    print('===', url)
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
        print(json.dumps(data, indent=2)[:6000])
