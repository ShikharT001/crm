import requests, json

# Test org creation
login_resp = requests.post('http://localhost:8001/api/auth/login', json={'email':'superadmin@crm.local','password':'Admin@123'})
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Create test org
org_resp = requests.post('http://localhost:8001/api/superadmin/organizations/', headers=headers, json={
    'name': 'Test Clothes Co',
    'domain': 'testclothes.com',
    'industry': 'Clothing',
    'owner_email': 'owner@testclothes.com',
    'owner_name': 'Jane Owner',
    'owner_password': 'Admin@123',
    'status': 'ACTIVE',
    'max_users': 10
})
print('Create Org Status:', org_resp.status_code)
if org_resp.status_code == 201:
    org = org_resp.json()
    print('Created:', org['name'], '| Owner:', org['owner_email'])
else:
    print('Error:', org_resp.text[:500])

# List orgs
list_resp = requests.get('http://localhost:8001/api/superadmin/organizations/', headers=headers)
print('List Orgs:', list_resp.status_code, '- Count:', len(list_resp.json()))
for o in list_resp.json():
    name = o['name']
    owner = o['owner_email']
    plan = o['subscription_plan_name']
    print(f"  - {name} | owner={owner} | plan={plan}")
