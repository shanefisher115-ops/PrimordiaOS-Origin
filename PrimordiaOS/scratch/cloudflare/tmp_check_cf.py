import json, re, pathlib, urllib.request

p = pathlib.Path(r'C:/Users/Shane/.wrangler/config/default.toml')
text = p.read_text(encoding='utf-8')
token = re.search(r'oauth_token\s*=\s*"([^"]+)"', text).group(1)

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def request(path):
    req = urllib.request.Request('https://api.cloudflare.com/client/v4' + path, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

print('ZONES')
zone_data = request('/zones?name=primordialorigin.com&status=active')
print(json.dumps(zone_data, indent=2)[:4000])

if zone_data.get('result'):
    zone_id = zone_data['result'][0]['id']
    print('\nDNS RECORDS')
    dns_data = request(f'/zones/{zone_id}/dns_records')
    print(json.dumps(dns_data, indent=2)[:4000])

    print('\nPAGES PROJECTS')
    pages_data = request('/accounts/' + zone_data['result'][0]['account']['id'] + '/pages/projects')
    print(json.dumps(pages_data, indent=2)[:4000])
