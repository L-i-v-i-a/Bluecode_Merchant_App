import requests

url = "http://127.0.0.1:4000/payment/status"
params = {
    "merchant_tx_id": "937f60a9-c0f1-4c24-9fa8-1020d08e849a"
}
headers = {
    "Authorization": "Bearer <eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0MjAwOTU4NSwianRpIjoiNTQyNGY0ZGYtYmFjYi00MDhkLThkZWEtOTk1YzJmNTUyMTRjIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjY3ZDQwMTYyNTcyZmFmMmY2Zjg3NDFiMCIsIm5iZiI6MTc0MjAwOTU4NSwiY3NyZiI6IjQ5OWQ2NmQ1LTlhM2QtNGI0Mi04OWNiLTdmYTE4MjNhYzBkZSIsImV4cCI6MTc0MjA5NTk4NX0.iijalNfh6NIksK77CysRWFwS7mCZ6PL_BBtedH7qeEQ>"
}

response = requests.get(url, params=params, headers=headers)

print("Response Status Code:", response.status_code)
print("Response JSON:", response.json())
