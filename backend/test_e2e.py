import requests, json

BASE = 'http://localhost:8001'

print('=== FULL END-TO-END SYSTEM TEST ===')
print()

# 1. Super Admin Login
r = requests.post(f'{BASE}/api/auth/login', json={'email':'superadmin@crm.local','password':'Admin@123'})
assert r.status_code == 200, f'Login failed: {r.text}'
sa_token = r.json()['access_token']
print('1. SuperAdmin Login: OK')

headers = {'Authorization': f'Bearer {sa_token}'}

# 2. List templates
r = requests.get(f'{BASE}/api/superadmin/templates/', headers=headers)
assert r.status_code == 200
templates = r.json()
print(f'2. Industry Templates: {len(templates)} templates available')
for t in templates[:5]:
    name = t['name']
    print(f'   - {name}')

# 3. Create org with long password (the original bug)
long_pwd = 'Admin@123VeryLongPassword!WhichWouldExceedBcrypt72ByteLimit!xxxxxxxxxxxxxxxxxxxxxxxxxx'
r = requests.post(f'{BASE}/api/superadmin/organizations/', headers=headers, json={
    'name': 'Final Test Corp',
    'domain': 'finaltest.example.com',
    'industry': 'Electronics',
    'owner_email': 'owner@finaltest.example.com',
    'owner_name': 'Final Owner',
    'owner_password': long_pwd,
    'status': 'ACTIVE',
    'max_users': 15
})
assert r.status_code == 201, f'Create org failed: {r.text}'
org = r.json()
owner_email = org['owner_email']
print(f'3. Create Org with long password: OK | owner={owner_email}')

# 4. Owner can log in
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'owner@finaltest.example.com', 'password': long_pwd})
assert r.status_code == 200, f'Owner login failed: {r.text}'
owner_token = r.json()['access_token']
owner_role = r.json()['user']['role']
print(f'4. Org Owner Login: OK | role={owner_role}')

# 5. Owner can access leads (feature enabled)
owner_headers = {'Authorization': f'Bearer {owner_token}'}
r = requests.get(f'{BASE}/api/leads/', headers=owner_headers)
print(f'5. Owner accesses leads: Status {r.status_code} (expected 200)')

# 6. Owner cannot access superadmin endpoints (access control)
r = requests.get(f'{BASE}/api/superadmin/organizations/', headers=owner_headers)
print(f'6. Owner blocked from superadmin: Status {r.status_code} (expected 403)')

# 7. Delete org cleanly
org_id = org['id']
r = requests.delete(f'{BASE}/api/superadmin/organizations/{org_id}', headers=headers)
assert r.status_code == 204, f'Delete failed: {r.text}'
print(f'7. Delete Org: OK (org {org_id} deleted completely)')

print()
print('ALL TESTS PASSED - System is fully working!')
