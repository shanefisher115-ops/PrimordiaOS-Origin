import re, pathlib, json, urllib.request
path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('token missing')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

for url in [
    'https://api.cloudflare.com/client/v4/accounts',
    'https://api.cloudflare.com/client/v4/user/tokens/verify'
]:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        print(url)
        print(r.status)
        data = json.load(r)
        print(json.dumps(data, indent=2)[:300])
