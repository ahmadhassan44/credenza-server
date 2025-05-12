import requests

# Endpoint to register creators
url = "http://localhost:3000/api/v1/auth/register"

# Common password and role
password = "123456"
role = "CREATOR"

# Number of creators to create
start = 1
end = 20

for i in range(start, end + 1):
    email = f"testcreator{i}@gmail.com"
    payload = {
        "email": email,
        "password": password,
        "role": role
    }

    try:
        response = requests.post(url, json=payload)
        if response.status_code == 201:
            print(f"[✓] Created: {email}")
        else:
            print(f"[!] Failed to create {email}: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[!] Exception for {email}: {e}")
