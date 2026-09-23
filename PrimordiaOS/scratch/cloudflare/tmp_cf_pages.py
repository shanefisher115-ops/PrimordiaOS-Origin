import re, pathlib, json, urllib.request, urllib.error
path = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = path.read_text()
match = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
if not match:
    raise SystemExit('token missing')
token = match.group(1)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

account_req = urllib.request.Request('https://api.cloudflare.com/client/v4/accounts', headers=headers)
with urllib.request.urlopen(account_req, timeout=20) as r:
    accounts = json.load(r)
print(json.dumps(accounts, indent=2)[:2000])

if not accounts.get('result'):
    raise SystemExit('no accounts')
account_id = accounts['result'][0]['id']

for endpoint in [
    f'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects',
    f'https://api.cloudflare.com/client/v4/zones?name=primordialorigin.com',
    f'https://api.cloudflare.com/client/v4/zones?name=www.primordialorigin.com'
]:
    print('\n===', endpoint)
    req = urllib.request.Request(endpoint, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
            print(json.dumps(data, indent=2)[:4000])
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.reason)
        print(e.read().decode()[:4000])
