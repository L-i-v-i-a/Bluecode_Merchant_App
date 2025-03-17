import requests
import base64

# API Credentials
ACQUIBASE_ACCESS_ID = "fc1f9f72-02c9-47e2-99ea-bc33ba2906d4"
ACQUIBASE_SECRET_KEY = "da1616ef-caad-4c7b-b7af-e9b98fb97960"
AQUIBASE_BASE_URL = "https://acquibase-api.acq.int.bluecode.ng/v2"

# Merchant, Branch, and Bluescan App Details
merchant_id = "67d4073781c62f4ad699bb19"
ext_id = "1888a06a-0bee-4ade-85e6-3d93e8d5f318"  # Branch external ID
bluescan_app_id = "1fb884a8-0d8f-474a-beb1-deb087533334"

# Generate Basic Auth Header
auth_string = f"{ACQUIBASE_ACCESS_ID}:{ACQUIBASE_SECRET_KEY}"
encoded_auth = base64.b64encode(auth_string.encode()).decode()

headers = {
    "Authorization": f"Basic {encoded_auth}",
    "Content-Type": "application/json"
}

# Construct the URL
url = f"{AQUIBASE_BASE_URL}/bluescan_apps/{bluescan_app_id}/activate"
print(f"🔗 API URL: {url}")

# Make the API request
response = requests.get(url, headers=headers)

# Print Response
print("🔍 Response Status Code:", response.status_code)
print("🔍 Response Text:", response.text)

# Handle Empty Response
if response.status_code == 200 and response.text.strip():
    try:
        json_response = response.json()
        print("✅ Bluescan App Details:", json_response)
    except requests.exceptions.JSONDecodeError as e:
        print("❌ JSON Decode Error:", str(e))
else:
    print("⚠️ No valid JSON content received from the API.")
