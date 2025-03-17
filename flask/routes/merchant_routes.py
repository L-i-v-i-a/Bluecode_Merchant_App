import os
import json
import requests
from flask import Flask, request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from requests.auth import HTTPBasicAuth
from bson import ObjectId
from pymongo import MongoClient
import re
import uuid
import datetime
from bson import ObjectId
from apscheduler.schedulers.background import BackgroundScheduler

# Bluecode API Configuration
AQUIBASE_BASE_URL = "https://acquibase-api.acq.int.bluecode.ng/v2"
AQUIBASE_USERNAME = "fc1f9f72-02c9-47e2-99ea-bc33ba2906d4"
AQUIBASE_PASSWORD = "da1616ef-caad-4c7b-b7af-e9b98fb97960"
DEFAULT_MEMBER_ID = "NGA0000187" 

# MongoDB Setup
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)
db = client.get_database("Bluecode")
bluescan_apps_collection = db.bluescan_apps

# Create Blueprint
merchant_bp = Blueprint("merchant", __name__)


# ---------------------- 🔹 Bluecode API Request ----------------------
def register_merchant_with_bluecode(merchant_data):
    """Registers a merchant with Bluecode API."""
    url = f"{AQUIBASE_BASE_URL}/merchants"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, json=merchant_data, headers=headers, auth=auth)
        print(f"🔹 Bluecode API Response ({response.status_code}):", response.text)  # Debugging

        if response.status_code == 201:
            return response.json()
        else:
            return {"error": "Bluecode API Error", "status_code": response.status_code, "details": response.text}
    except requests.exceptions.RequestException as e:
        return {"error": "Request failed", "details": str(e)}

def get_merchant_info_from_bluecode(ext_id):
    """Fetches merchant information using Bluecode API."""
    url = f"{AQUIBASE_BASE_URL}/merchants/{ext_id}"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.get(url, headers=headers, auth=auth)

        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Bluecode API returned {response.status_code}: {response.text}"}

    except requests.exceptions.RequestException as e:
        return {"error": "Failed to connect to Bluecode API", "details": str(e)}

def get_all_merchants():
    """Fetches the list of all merchants from Bluecode API."""
    url = f"{AQUIBASE_BASE_URL}/merchants"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers, auth=auth)
    return response.json() if response.status_code == 200 else {"error": response.text}
# ---------------------- 🔹 Register Merchant ----------------------
@merchant_bp.route("/register-merchant", methods=["POST"])
@jwt_required()
def register_merchant():
    """Registers a merchant, stores data in the database, and syncs with Bluecode."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("is_merchant"):
        return jsonify({"error": "User is already a merchant"}), 400

    existing_merchant = db.merchants.find_one({"user_id": str(user_id)})
    if existing_merchant:
        return jsonify({"error": "Merchant already exists"}), 400

    data = request.get_json()

    required_fields = ["name", "category_code", "address"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required merchant fields"}), 400

    transaction_settings = data.get("transaction_settings", {})

    # ✅ Generate Unique `group_id`
    existing_merchant = db.merchants.find_one({"name": data["name"]})
    group_id = existing_merchant["group_id"] if existing_merchant else str(random.randint(1000, 9999))
    # ✅ Generate `ext_id` for Bluecode API
    ext_id = str(ObjectId())

    # ✅ Prepare Merchant Data for Bluecode API
    merchant_data = {
        "merchant": {
            "user_id": str(user_id),
            "name": data["name"],
            "type": data.get("type", "INDIVIDUAL"),
            "registration_number": data.get("registration_number", ""),
            "vat_number": data.get("vat_number", ""),
            "category_code": data["category_code"],
            "address": {
                "city": data["address"].get("city", ""),
                "country": data["address"].get("country", ""),
                "zip": data["address"].get("zip", ""),
                "line_1": data["address"].get("line_1", ""),
            },
            "contact": {
                "name": data.get("contact", {}).get("name", ""),
                "emails": data.get("contact", {}).get("emails", []),
                "phone": data.get("contact", {}).get("phone", ""),
                "gender": data.get("contact", {}).get("gender", ""),
            },
            "state": "ACTIVE",
            "group_id": group_id,
            "ext_id": ext_id,
            "transaction_settings": {
                "booking_reference_prefix": transaction_settings.get("booking_reference_prefix", ""),
                "default_source": transaction_settings.get("default_source", "ECOMMERCE"),
                "bluecode": {"member_id": DEFAULT_MEMBER_ID},
                "instant": transaction_settings.get("instant", {}),
                "alipay": transaction_settings.get("alipay", {}),
                "wechat": transaction_settings.get("wechat", {})
            },
            "fees": data.get("fees", {}),
            "settlement": data.get("settlement", {}),
            "billing": data.get("billing", {}),
            "loyalty_in_callback": data.get("loyalty_in_callback", True),
            "meta": data.get("meta", {}),
            "bluecode_listing_id": data.get("bluecode_listing_id", ""),
        }
    }

    # ✅ Debug: Print Merchant Data before sending to Bluecode
    print("🔹 Merchant Data (Before Sending to Bluecode):", json.dumps(merchant_data, indent=2))

    # ✅ Send Data to Bluecode
    bluecode_response = register_merchant_with_bluecode(merchant_data)

    # ✅ Handle Bluecode Response
    if "error" in bluecode_response:
        return jsonify({"error": "Failed to register merchant with Bluecode", "details": bluecode_response}), 500

    bluecode_data = bluecode_response.get("data", {})
    assigned_ext_id = bluecode_data.get("ext_id", ext_id)
    assigned_access_id = bluecode_data.get("access_id", "")
    assigned_bluecode_secret_key = bluecode_data.get("access_secret_key", "")
    verification_status = bluecode_data.get("state", "pending")

    # ✅ Store Merchant in Database
    merchant_data["merchant"].update({
        "ext_id": assigned_ext_id,
        "group_id": bluecode_data.get("group_id", group_id),
        "bluecode_access_id": assigned_access_id,
        "bluecode_secret_key": assigned_bluecode_secret_key,
        "verification_status": verification_status,
    })

    try:
        # ✅ Store in MongoDB using a transaction
        with db.client.start_session() as session:
            with session.start_transaction():
                merchant_id = db.merchants.insert_one(merchant_data["merchant"], session=session).inserted_id

                # ✅ Automatically Create Wallet After Merchant is Registered
                db.wallets.insert_one({
                    "merchant_id": str(merchant_id),
                    "user_id":str(user_id),
                    "balance": 0,
                    "currency": "EUR",
                    "created_at": datetime.datetime.utcnow()
                }, session=session)

                # ✅ Mark User as Merchant
                db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_merchant": True}}, session=session)

        return jsonify({
            "message": "Merchant registered successfully!",
            "merchant_id": str(merchant_id),
            "ext_id": assigned_ext_id,
            "verification_status": verification_status
        }), 201

    except Exception as e:
        return jsonify({"error": "Database transaction failed", "details": str(e)}), 500

# ---------------------- 🔹 Fetch Merchant Information ----------------------
@merchant_bp.route("/merchant/<ext_id>", methods=["GET"])
@jwt_required()
def get_merchant_info(ext_id):
    """Fetches merchant information from Bluecode API."""
    try:
        # Fetch merchant data from Bluecode using ext_id
        bluecode_response = get_merchant_info_from_bluecode(ext_id)

        # Handle possible errors in response
        if "error" in bluecode_response:
            return jsonify({
                "error": "Failed to fetch merchant information",
                "details": bluecode_response["error"]
            }), 500

        return jsonify(bluecode_response), 200

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Request to Bluecode API failed",
            "details": str(e)
        }), 500

# ---------------------- 🔹 Update Merchant Information ----------------------
@merchant_bp.route("/merchants/<ext_id>", methods=["PUT"])
@jwt_required()
def update_merchant(ext_id):
    """Updates an existing merchant with new data."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("is_merchant"):
        return jsonify({"error": "User is not a merchant"}), 400

    # Find the existing merchant by `ext_id`
    existing_merchant = db.merchants.find_one({"ext_id": ext_id})
    if not existing_merchant:
        return jsonify({"error": "Merchant not found"}), 404

    data = request.get_json()

    # Validate required fields, excluding immutable ones
    required_fields = ["name", "category_code", "address"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required merchant fields"}), 400

    # Ensure that the transaction_settings is a dictionary
    transaction_settings = data.get("transaction_settings", {})
    if not isinstance(transaction_settings, dict):
        return jsonify({"error": "Invalid transaction_settings format"}), 400

    # Ensure the `group_id` remains unchanged
    group_id = existing_merchant["group_id"]  # Ensure group_id remains the same

    # ✅ Updated Merchant Data Structure
    updated_merchant_data = {
        "merchant": {
            "name": data["name"],
            "type": data.get("type", existing_merchant["type"]),
            "registration_number": data.get("registration_number", existing_merchant.get("registration_number", "")),
            "vat_number": data.get("vat_number", existing_merchant.get("vat_number", "")),
            "category_code": data["category_code"],
            "address": {
                "city": data["address"].get("city", existing_merchant["address"]["city"]),
                "country": data["address"].get("country", existing_merchant["address"]["country"]),
                "zip": data["address"].get("zip", existing_merchant["address"]["zip"]),
                "line_1": data["address"].get("line_1", existing_merchant["address"]["line_1"]),
            },
            "contact": {
                "name": data.get("contact", {}).get("name", existing_merchant.get("contact", {}).get("name", "")),
                "emails": data.get("contact", {}).get("emails", existing_merchant.get("contact", {}).get("emails", [])),
                "phone": data.get("contact", {}).get("phone", existing_merchant.get("contact", {}).get("phone", "")),
                "gender": data.get("contact", {}).get("gender", existing_merchant.get("contact", {}).get("gender", "")),
            },
            "state": existing_merchant["state"],  # State remains unchanged
            "group_id": group_id,  # Ensure group_id remains the same
            "ext_id": ext_id,  # Immutable
            "bluecode_listing_id": data.get("bluecode_listing_id", existing_merchant.get("bluecode_listing_id", "")),
            "transaction_settings": {
                "booking_reference_prefix": transaction_settings.get("booking_reference_prefix", existing_merchant["transaction_settings"].get("booking_reference_prefix", "")),
                "default_source": transaction_settings.get("default_source", existing_merchant["transaction_settings"].get("default_source", "ECOMMERCE")),
                "bluecode": {"member_id": DEFAULT_MEMBER_ID},
                "instant": transaction_settings.get("instant", existing_merchant["transaction_settings"].get("instant", {})),
                "alipay": transaction_settings.get("alipay", existing_merchant["transaction_settings"].get("alipay", {})),
                "wechat": transaction_settings.get("wechat", existing_merchant["transaction_settings"].get("wechat", {}))
            },
            "fees": data.get("fees", existing_merchant.get("fees", {})),
            "settlement": data.get("settlement", existing_merchant.get("settlement", {})),
            "billing": data.get("billing", existing_merchant.get("billing", {})),
            "loyalty_in_callback": data.get("loyalty_in_callback", existing_merchant.get("loyalty_in_callback", True)),
            "meta": data.get("meta", existing_merchant.get("meta", {})),
        }
    }

    # Save the updated data in the database
    db.merchants.update_one({"ext_id": ext_id}, {"$set": updated_merchant_data["merchant"]})

    # Return success response
    return jsonify({"message": "Merchant updated successfully!"}), 200

# ---------------------- 🔹 List Merchants Route ----------------------
@merchant_bp.route("/merchant/list-merchants", methods=["GET"])
def list_merchants():
    """Fetches and returns the list of all merchants."""
    merchants_data = get_all_merchants()

    if "error" in merchants_data:
        return jsonify({"error": "Failed to fetch merchants", "details": merchants_data}), 500

    return jsonify({"merchants": merchants_data}), 200

# ----------------------  Create Branches ----------------------
@merchant_bp.route("/merchant/<ext_id>/branch", methods=["POST"])
@jwt_required()
def create_branch(ext_id):
    """Creates a branch for a merchant."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("is_merchant"):
        return jsonify({"error": "User is not a merchant"}), 400

    # Find merchant by ext_id 
    merchant = db.merchants.find_one({"ext_id": ext_id})
    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    data = request.get_json()
    
    required_fields = ["name", "address"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required branch fields"}), 400

    phone_number = data.get("contact", {}).get("phone", "").strip()
    if phone_number and not re.match(r"^\+\d{7,15}$", phone_number):
        return jsonify({"error": "Invalid phone number format. Use E.164 format (e.g., +15551234567)"}), 400
    
    country = data["address"].get("country", "").strip()
    valid_countries = ["US", "DE", "FR", "GB", "IT", "ES", "CH", "AT"]
    if country.upper() not in valid_countries:
        return jsonify({"error": "Invalid country code", "valid_countries": valid_countries}), 400

   
    branch_ext_id = str(uuid.uuid4())  
    merchant_branch_id = branch_ext_id 

    # Branch Data for Bluecode API
    branch_data = {
        "branch": {
            "ext_id": branch_ext_id,
            "merchant_branch_id": merchant_branch_id,
            "state": data.get("state", "ACTIVE"),
            "name": data["name"],
            "contact": {
                "phone": phone_number,
                "name": data.get("contact", {}).get("name", "").strip(),
                "gender": data.get("contact", {}).get("gender", "").strip(),
                "emails": data.get("contact", {}).get("emails", [])
            },
            "booking_reference_prefix": data.get("booking_reference_prefix", ""),
            "address": {
                "city": data["address"].get("city", "").strip(),
                "line_1": data["address"].get("line_1", "").strip(),
                "zip": data["address"].get("zip", "").strip(),
                "line_2": data["address"].get("line_2", "").strip(),
                "country": country.upper()
            },
            "meta": data.get("meta", {})
        }
    }

    # Send Data to Bluecode API
    url = f"{AQUIBASE_BASE_URL}/merchants/{ext_id}/branches"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    response = requests.post(url, json=branch_data, headers=headers, auth=auth)

  
    print(f"🔹 Full Bluecode response: {response.status_code} - {response.text}")

    if response.status_code not in [200, 201]:
        return jsonify({"error": "Failed to create branch", "details": response.json()}), 500

    try:
        # Save branch to MongoDB
        branch_record = {
            "merchant_id": merchant["ext_id"], 
            "ext_id": branch_ext_id,
            "merchant_branch_id": merchant_branch_id,
            "state": data.get("state", "ACTIVE"),
            "name": data["name"],
            "contact": branch_data["branch"]["contact"],
            "booking_reference_prefix": data.get("booking_reference_prefix", ""),
            "address": branch_data["branch"]["address"],
            "meta": data.get("meta", {})
        }
        db.branches.insert_one(branch_record)
        print("✅ Branch successfully saved to the database!")
    except Exception as e:
        print(f"❌ MongoDB insertion failed: {e}")
        return jsonify({"error": "Database error", "details": str(e)}), 500

    return jsonify({
        "message": "Branch created successfully!",
        "ext_id": branch_ext_id,
        "merchant_branch_id": merchant_branch_id
    }), 201

# ---------------------- Fetch Branch Info ----------------------
@merchant_bp.route("/merchants/<merchant_ext_id>/branches", methods=["GET"])
@jwt_required()
def get_merchant_branches(merchant_ext_id):
    """Fetches all branches for a given merchant from Bluecode API."""
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_ext_id}/branches"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers, auth=auth)
    print(f"🔹 Fetching branches from Bluecode API: {response.status_code}")

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch branches", "details": response.json()}), response.status_code

    return jsonify(response.json()), 200

# ---------------------- Update Branch Info ----------------------
@merchant_bp.route("/merchants/<merchant_id>/branches/<ext_id>", methods=["PUT"])
@jwt_required()
def update_branch(merchant_id, ext_id):
    """Updates an existing branch with new data."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("is_merchant"):
        return jsonify({"error": "User is not a merchant"}), 400
    
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})
    if not merchant or merchant["ext_id"] != merchant_id:
           return jsonify({"error": "Unauthorized"}), 403


    # Log the merchant_id and ext_id for debugging
    print(f"🔹 Checking branch with merchant_id: {merchant_id}, ext_id: {ext_id}")

    # Find the existing branch
    existing_branch = db.branches.find_one({"merchant_id": merchant_id, "ext_id": ext_id})
    if not existing_branch:
        print("❌ Branch not found in database!")
        return jsonify({"error": "Branch not found"}), 404

    print(f"🔹 Existing Branch Data: {json.dumps(existing_branch, default=str, indent=2)}")
    data = request.get_json()

    # Validate required fields
    required_fields = ["name", "address"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required branch fields"}), 400
    
    state = existing_branch["state"]  

    # ✅ Updated Branch Data Structure
    updated_branch_data = {
        "ext_id": ext_id,
        "merchant_branch_id": existing_branch["merchant_branch_id"],
        "name": data.get("name", existing_branch["name"]),
        "state": state,
        "address": {
            "city": data.get("address", {}).get("city", existing_branch["address"].get("city", "")),
            "country": data.get("address", {}).get("country", existing_branch["address"].get("country", "")),
            "zip": data.get("address", {}).get("zip", existing_branch["address"].get("zip", "")),
            "line_1": data.get("address", {}).get("line_1", existing_branch["address"].get("line_1", "")),
            "line_2": data.get("address", {}).get("line_2", existing_branch["address"].get("line_2", "")),
        },
        "contact": {
            "name": data.get("contact", {}).get("name", existing_branch.get("contact", {}).get("name", "")),
            "emails": data.get("contact", {}).get("emails", existing_branch.get("contact", {}).get("emails", [])),
            "phone": data.get("contact", {}).get("phone", existing_branch.get("contact", {}).get("phone", "")),
            "gender": data.get("contact", {}).get("gender", existing_branch.get("contact", {}).get("gender", "")),
        },
        "booking_reference_prefix": data.get("booking_reference_prefix", existing_branch.get("booking_reference_prefix", "")),
        "meta": data.get("meta", existing_branch.get("meta", {}))
    }

    # Save the updated branch in the database
    db.branches.update_one({"merchant_id": merchant_id, "ext_id": ext_id}, {"$set": updated_branch_data})

    # ✅ Log the payload for debugging
    print(f"🔹 Updated Branch Data: {json.dumps(updated_branch_data, indent=2)}")

    # ✅ Send update request to Bluecode API
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches/{ext_id}"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)

    # Log API request details
    print(f"🔹 Sending PUT Request to: {url}")
    print(f"🔹 Headers: {headers}")

    response = requests.put(url, json={"branch": updated_branch_data}, headers=headers, auth=auth)

    # ✅ Log the API response
    print(f"🔹 Bluecode API Response: {response.status_code} - {response.text}")

    try:
        response_data = response.json()
    except requests.exceptions.JSONDecodeError:
        response_data = {"error": "Invalid response from Bluecode API", "raw_response": response.text}

    if response.status_code != 200:
        return jsonify({"error": "Failed to update branch", "details": response_data}), response.status_code

    return jsonify({"message": "Branch updated successfully!"}), 200

# ---------------------- Fetch all Branches ----------------------
@merchant_bp.route("/merchants/<merchant_id>/branches", methods=["GET"])
@jwt_required()
def get_branches(merchant_id):
    """Retrieves all branches of a merchant from Bluecode."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("is_merchant"):
        return jsonify({"error": "User is not a merchant"}), 400
    
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    
    response = requests.get(url, headers=headers, auth=auth)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve branches", "details": response.json()}), response.status_code
    
    branches = response.json()
    
    # Save/update branches in the database
    for branch in branches.get("branches", []):
        db.branches.update_one(
            {"merchant_id": merchant_id, "ext_id": branch["ext_id"]},
            {"$set": branch},
            upsert=True
        )
    
    return jsonify(branches), 200

@merchant_bp.route("/create-bluescan-app", methods=["POST"])
@jwt_required()
def create_bluescan_app():
    """Creates a BlueScan App and stores it in the database."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    # ✅ Extract required values
    merchant_id = data.get("merchant_id")  # Corrected from merchant_ext_id
    branch_ext_id = data.get("ext_id")  # Corrected from branch_ext_id
    bluescan_app_data = data.get("bluescan_app", {})

    # ✅ Required Fields Validation
    if not all([merchant_id, branch_ext_id, bluescan_app_data.get("name")]):
        return jsonify({"error": "merchant_id, ext_id, and bluescan_app.name are required"}), 400

    # ✅ BlueScan App Payload
    bluescan_app_payload = {
        "bluescan_app": {
            "name": bluescan_app_data["name"],
            "type": bluescan_app_data.get("type", "admin"),
            "sdk_host": bluescan_app_data.get("sdk_host", "BLUECODE")
        }
    }

    # 🔹 Debug Logs
    print(f"🔹 Merchant ID: {merchant_id}")
    print(f"🔹 Branch Ext ID: {branch_ext_id}")
    print(f"🔹 BlueScan App Payload: {bluescan_app_payload}")

    # 🔹 Send Request to Bluecode API
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches/{branch_ext_id}/bluescan_apps"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)

    response = requests.post(url, json=bluescan_app_payload, auth=auth, headers=headers)

    try:
        bluecode_response = response.json()
    except ValueError:
        bluecode_response = {"error": "Invalid JSON response from Bluecode"}

    # 🔹 Debug Response
    print(f"🔹 Bluecode API Response: {bluecode_response}")

    if response.status_code not in [200, 201]:  
        return jsonify({"error": "Failed to create BlueScan App", "details": bluecode_response}), response.status_code

    # ✅ Extract BlueScan App Data from Response
    response_data = bluecode_response.get("data", {})

    bluescan_app_id = response_data.get("id", "")
    reference = response_data.get("reference", "")
    state = response_data.get("state", "NEW")
    merchant_sdk_launcher_url = response_data.get("merchant_sdk_launcher_url", "")
    onboarding_url = response_data.get("onboarding_url", "")
    
    # 🔹 Debug: Print extracted values
    print(f"🔹 Assigned Bluescan App ID: {bluescan_app_id}")
    print(f"🔹 Assigned Reference: {reference}")
    print(f"🔹 Assigned State: {state}")
    print(f"🔹 Assigned Merchant SDK Launcher URL: {merchant_sdk_launcher_url}")
    print(f"🔹 Assigned Onboarding URL: {onboarding_url}")

    # ✅ Store BlueScan App Data in MongoDB
    bluescan_app_entry = {
        "merchant_id": merchant_id,  # Updated field
        "ext_id": branch_ext_id,  # Updated field
        "bluescan_app_id": bluescan_app_id,
        "reference": reference,
        "name": response_data.get("name"),
        "type": response_data.get("type"),
        "sdk_host": response_data.get("sdk_host"),
        "state": state,
        "merchant_sdk_launcher_url": merchant_sdk_launcher_url,
        "onboarding_url": onboarding_url,
        "inserted_at": response_data.get("inserted_at"),
        "updated_at": response_data.get("updated_at"),
        "created_at": datetime.datetime.utcnow()
    }
    
    db.bluescan_apps.insert_one(bluescan_app_entry)

    return jsonify({
        "message": "BlueScan App created successfully!",
        "bluescan_app_id": bluescan_app_id,
        "reference": reference,
        "state": state,
        "merchant_sdk_launcher_url": merchant_sdk_launcher_url,
        "onboarding_url": onboarding_url
    }), 201
    
@merchant_bp.route("/get-bluescan-app/<merchant_id>/<ext_id>/<bluescan_app_id>", methods=["GET"])
@jwt_required()
def get_bluescan_app(merchant_id, ext_id, bluescan_app_id):
    """Retrieves a specific BlueScan App."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Construct URL
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches/{ext_id}/bluescan_apps/{bluescan_app_id}"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    
    # Send GET request
    response = requests.get(url, auth=auth, headers=headers)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve BlueScan App", "details": response.json()}), response.status_code
    
    bluecode_response = response.json()
    
    return jsonify({
        "message": "BlueScan App retrieved successfully!",
        "data": bluecode_response.get("data", {})
    }), 200

@merchant_bp.route("/list-bluescan-apps/<merchant_id>/<ext_id>", methods=["GET"])
@jwt_required()
def list_bluescan_apps(merchant_id, ext_id):
    """Lists all BlueScan Apps for a merchant's branch."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    # 🔹 Ensure required parameters exist
    if not all([merchant_id, ext_id]):
        return jsonify({"error": "merchant_id and ext_id are required"}), 400

    # 🔹 Send Request to Bluecode
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches/{ext_id}/bluescan_apps"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)

    response = requests.get(url, auth=auth, headers=headers)
    bluecode_response = response.json() if response.status_code == 200 else {}

    print(f"🔹 Full Bluecode Response: {bluecode_response}")

    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch BlueScan Apps", "details": bluecode_response}), response.status_code

    return jsonify(bluecode_response), 200

@merchant_bp.route("/update-bluescan-app/<merchant_id>/branches/<ext_id>/bluescan_apps/<bluescan_app_id>", methods=["PUT"])
@jwt_required()
def update_bluescan_app(merchant_id, ext_id, bluescan_app_id):
    """Updates an existing BlueScan App with new data."""
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("is_merchant"):
        return jsonify({"error": "User is not a merchant"}), 400

    # Log for debugging
    print(f"🔹 Checking BlueScan App with merchant_id: {merchant_id}, ext_id: {ext_id}, bluescan_app_id: {bluescan_app_id}")

    # Find the existing BlueScan App
    existing_app = db.bluescan_apps.find_one({
        "merchant_id": merchant_id,
        "ext_id": ext_id,
        "bluescan_app_id": bluescan_app_id
    })
    
    if not existing_app:
        print("❌ BlueScan App not found in database!")
        return jsonify({"error": "BlueScan App not found"}), 404

    print(f"🔹 Existing BlueScan App Data: {json.dumps(existing_app, default=str, indent=2)}")
    data = request.get_json()

    # Validate input data
    if not data:
        return jsonify({"error": "No update data provided"}), 400

    # ✅ Prepare updated data
    updated_app_data = {
        "name": data.get("name", existing_app["name"]),
        "sdk_host": data.get("sdk_host", existing_app.get("sdk_host", "")),
        "type": data.get("type", existing_app.get("type", ""))
    }

    # Save the updated BlueScan App in the database
    db.bluescan_apps.update_one(
        {"merchant_id": merchant_id, "ext_id": ext_id, "bluescan_app_id": bluescan_app_id},
        {"$set": updated_app_data}
    )

    # ✅ Log the updated data
    print(f"🔹 Updated BlueScan App Data: {json.dumps(updated_app_data, indent=2)}")

    # ✅ Send update request to Bluecode API
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/branches/{ext_id}/bluescan_apps/{bluescan_app_id}"
    headers = {"Content-Type": "application/json"}
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)

    print(f"🔹 Sending PUT Request to: {url}")
    response = requests.put(url, json={"bluescan_app": updated_app_data}, headers=headers, auth=auth)
    
    # ✅ Log the API response
    print(f"🔹 Bluecode API Response: {response.status_code} - {response.text}")

    try:
        response_data = response.json()
    except requests.exceptions.JSONDecodeError:
        response_data = {"error": "Invalid response from Bluecode API", "raw_response": response.text}

    if response.status_code != 200:
        return jsonify({"error": "Failed to update BlueScan App", "details": response_data}), response.status_code

    return jsonify({"message": "BlueScan App updated successfully", "updated_data": updated_app_data}), 200

@merchant_bp.route("/bluescan-app/status/<merchant_id>/<bluescan_app_id>", methods=["GET"])
@jwt_required()
def check_bluescan_app_status(merchant_id, bluescan_app_id):
    """Fetches and saves the status of a BlueScan App in the database"""
    url = f"{AQUIBASE_BASE_URL}/merchants/{merchant_id}/bluescan_apps/{bluescan_app_id}"
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    headers = {"Content-Type": "application/json"}

    response = requests.get(url, headers=headers, auth=auth)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch BlueScan App status", "details": response.json()}), response.status_code

    bluescan_app_data = response.json()

   
    bluescan_apps_collection.update_one(
        {"bluescan_app_id": bluescan_app_id},  
        {"$set": {
            "merchant_id": merchant_id,
            "bluescan_app_id": bluescan_app_id,
            "status": bluescan_app_data.get("status", "UNKNOWN"), 
            "last_checked": bluescan_app_data.get("updated_at")
        }},
        upsert=True  
    )

    return jsonify(bluescan_app_data), 200

#walllet fuctionaliies
@merchant_bp.route("/wallet/create", methods=["POST"])
@jwt_required()
def create_wallet():
    """Creates a wallet for a merchant."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])

    # Check if wallet already exists
    existing_wallet = db.wallets.find_one({"merchant_id": merchant_id})
    if existing_wallet:
        return jsonify({"error": "Wallet already exists"}), 400

    # Create Wallet
    wallet = {
        "merchant_id": merchant_id,
        "balance": 0,  
        "currency": "EUR",
        "linked_bank_accounts": [],
        "created_at": datetime.datetime.utcnow()
    }

    wallet_id = db.wallets.insert_one(wallet).inserted_id

    return jsonify({
        "message": "Wallet created successfully!",
        "wallet_id": str(wallet_id),
        "balance": 0
    }), 201

@merchant_bp.route("/wallet/balance", methods=["GET"])
@jwt_required()
def get_wallet_balance():
    """Fetches the wallet balance for a merchant."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    wallet = db.wallets.find_one({"merchant_id": str(merchant["_id"])})
    
    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    return jsonify({"balance": wallet["balance"], "currency": wallet["currency"]}), 200

@merchant_bp.route("/wallet/credit", methods=["POST"])
@jwt_required()
def credit_wallet():
    """Credits the wallet when a payment is successful."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")

    if not merchant_id or not amount:
        return jsonify({"error": "Merchant ID and amount are required"}), 400

    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    
    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    new_balance = wallet["balance"] + amount

    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

    return jsonify({"message": "Wallet credited successfully", "new_balance": new_balance}), 200

@merchant_bp.route("/wallet/debit", methods=["POST"])
@jwt_required()
def debit_wallet():
    """Debits the wallet for a payment or transfer."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")

    if not merchant_id or not amount:
        return jsonify({"error": "Merchant ID and amount are required"}), 400

    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    
    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404

    if wallet["balance"] < amount:
        return jsonify({"error": "Insufficient balance"}), 400

    new_balance = wallet["balance"] - amount

    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

    return jsonify({"message": "Wallet debited successfully", "new_balance": new_balance}), 200

@merchant_bp.route("/wallet/generate-qr", methods=["POST"])
@jwt_required()
def generate_qr_code():
    """Generates a QR code for wallet payments using Bluecode API."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")

    if not merchant_id or not amount:
        return jsonify({"error": "Merchant ID and amount are required"}), 400

    url = f"{AQUIBASE_BASE_URL}/qr/generate"
    payload = {
        "merchant_id": merchant_id,
        "amount": amount,
        "currency": "EUR"
    }
    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)
    
    response = requests.post(url, json=payload, auth=auth)
    qr_data = response.json()

    return jsonify({"qr_code_url": qr_data.get("qr_code_url")}), 200

@merchant_bp.route("/wallet/withdraw", methods=["POST"])
@jwt_required()
def withdraw_funds():
    """Withdraw funds from wallet to bank account."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")
    bank_account = data.get("bank_account")

    if not all([merchant_id, amount, bank_account]):
        return jsonify({"error": "Merchant ID, amount, and bank account are required"}), 400

    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    
    if not wallet or wallet["balance"] < amount:
        return jsonify({"error": "Insufficient balance"}), 400

    new_balance = wallet["balance"] - amount

    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

    return jsonify({"message": "Withdrawal successful", "new_balance": new_balance}), 200

import random
import datetime

@merchant_bp.route("/wallet/virtual-card/create", methods=["POST"])
@jwt_required()
def create_virtual_card():
    """Creates a virtual card for the merchant's wallet."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    
    # Check if a virtual card already exists
    existing_card = db.virtual_cards.find_one({"merchant_id": merchant_id, "status": "active"})
    if existing_card:
        return jsonify({"error": "A virtual card already exists"}), 400

    # Generate Card Details
    card_number = "".join([str(random.randint(0, 9)) for _ in range(16)])
    cvv = "".join([str(random.randint(0, 9)) for _ in range(3)])
    expiry_date = (datetime.datetime.utcnow() + datetime.timedelta(days=365 * 3)).strftime("%m/%Y")

    # Save in Database
    virtual_card = {
        "merchant_id": merchant_id,
        "card_number": card_number,
        "cvv": cvv,
        "expiry_date": expiry_date,
        "status": "active",
        "created_at": datetime.datetime.utcnow()
    }
    
    db.virtual_cards.insert_one(virtual_card)

    return jsonify({
        "message": "Virtual card created successfully",
        "card_number": f"**** **** **** {card_number[-4:]}",  
        "expiry_date": expiry_date,
        "cvv": "***" 
    }), 201
    
@merchant_bp.route("/wallet/virtual-card/details", methods=["GET"])
@jwt_required()
def get_virtual_card_details():
    """Fetches the virtual card details for a merchant."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])

    card = db.virtual_cards.find_one({"merchant_id": merchant_id, "status": "active"})
    
    if not card:
        return jsonify({"error": "No active virtual card found"}), 404

    return jsonify({
        "card_number": f"**** **** **** {card['card_number'][-4:]}",
        "expiry_date": card["expiry_date"],
        "cvv": "***",  # Mask CVV
        "status": card["status"]
    }), 200


import requests
from requests.auth import HTTPBasicAuth

@merchant_bp.route("/wallet/virtual-card/pay", methods=["POST"])
@jwt_required()
def pay_with_virtual_card():
    """Processes a payment using the virtual card via Bluecode API."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")
    currency = data.get("currency", "EUR")
    merchant_reference = f"TXN-{uuid.uuid4().hex[:12]}"

    if not merchant_id or not amount:
        return jsonify({"error": "Merchant ID and amount are required"}), 400

    merchant = db.merchants.find_one({"_id": ObjectId(merchant_id)})
    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    if not wallet or wallet["balance"] < amount:
        return jsonify({"error": "Insufficient wallet balance"}), 400

    virtual_card = db.virtual_cards.find_one({"merchant_id": merchant_id, "status": "active"})
    if not virtual_card:
        return jsonify({"error": "No active virtual card found"}), 404

    # Bluecode Payment API URL (Replace with actual API endpoint)
    BLUECODE_PAYMENT_URL = "https://merchant-api.acq.int.bluecode.ng/v4/transactions"

    payload = {
        "merchant_id": merchant_id,
        "amount": amount,
        "currency": currency,
        "virtual_card_number": virtual_card["card_number"],
        "cvv": virtual_card["cvv"],
        "expiry_date": virtual_card["expiry_date"],
        "merchant_reference": merchant_reference
    }

    auth = HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD)

    # Send payment request to Bluecode
    response = requests.post(BLUECODE_PAYMENT_URL, json=payload, auth=auth)
    
    if response.status_code == 200:
        # Deduct amount from wallet
        new_balance = wallet["balance"] - amount
        db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

        # Log the transaction
        transaction = {
            "merchant_id": merchant_id,
            "amount": amount,
            "currency": currency,
            "transaction_id": merchant_reference,
            "status": "completed",
            "created_at": datetime.datetime.utcnow()
        }
        db.transactions.insert_one(transaction)

        return jsonify({
            "message": "Payment successful",
            "new_balance": new_balance,
            "transaction_id": merchant_reference
        }), 200
    else:
        return jsonify({"error": "Payment failed", "details": response.json()}), 400

@merchant_bp.route("/wallet/virtual-card/freeze", methods=["POST"])
@jwt_required()
def freeze_virtual_card():
    """Freezes or deactivates the virtual card."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    card = db.virtual_cards.find_one({"merchant_id": merchant_id, "status": "active"})

    if not card:
        return jsonify({"error": "No active virtual card found"}), 404

    db.virtual_cards.update_one({"merchant_id": merchant_id}, {"$set": {"status": "frozen"}})

    return jsonify({"message": "Virtual card frozen"}), 200

@merchant_bp.route("/wallet/virtual-card/delete", methods=["DELETE"])
@jwt_required()
def delete_virtual_card():
    """Deletes the virtual card for the merchant."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    card = db.virtual_cards.find_one({"merchant_id": merchant_id})

    if not card:
        return jsonify({"error": "No virtual card found"}), 404

    db.virtual_cards.delete_one({"merchant_id": merchant_id})

    return jsonify({"message": "Virtual card deleted successfully"}), 200

@merchant_bp.route("/wallet/transactions", methods=["GET"])
@jwt_required()
def get_wallet_transactions():
    """Retrieves the transaction history of the merchant's wallet."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])

    transactions = list(db.transactions.find({"merchant_id": merchant_id}, {"_id": 0}))

    return jsonify({"transactions": transactions}), 200

@merchant_bp.route("/wallet/refund", methods=["POST"])
@jwt_required()
def process_refund():
    """Refunds a payment via Bluecode and updates the wallet balance."""
    data = request.json
    transaction_id = data.get("transaction_id")
    amount = data.get("amount")

    if not transaction_id or not amount:
        return jsonify({"error": "Transaction ID and amount are required"}), 400

    # Fetch the transaction details
    transaction = db.transactions.find_one({"transaction_id": transaction_id})

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    merchant_id = transaction["merchant_id"]
    wallet = db.wallets.find_one({"merchant_id": merchant_id})

    if not wallet or wallet["balance"] < amount:
        return jsonify({"error": "Insufficient balance for refund"}), 400

    # Call Bluecode Refund API
    BLUECODE_REFUND_URL = "https://merchant-api.acq.int.bluecode.ng/v4/refunds"
    payload = {
        "transaction_id": transaction_id,
        "amount": amount
    }
    response = requests.post(BLUECODE_REFUND_URL, json=payload, auth=HTTPBasicAuth(AQUIBASE_USERNAME, AQUIBASE_PASSWORD))

    if response.status_code == 200:
        new_balance = wallet["balance"] - amount
        db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})
        return jsonify({"message": "Refund processed successfully", "new_balance": new_balance}), 200
    else:
        return jsonify({"error": "Refund failed", "details": response.json()}), 400

TRANSACTION_FEE_PERCENTAGE = 1.5  # 1.5% transaction fee

@merchant_bp.route("/wallet/pay", methods=["POST"])
@jwt_required()
def pay_with_wallet():
    """Processes a payment and deducts transaction fees automatically."""
    data = request.json
    merchant_id = data.get("merchant_id")
    amount = data.get("amount")

    if not merchant_id or not amount:
        return jsonify({"error": "Merchant ID and amount are required"}), 400

    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    if not wallet or wallet["balance"] < amount:
        return jsonify({"error": "Insufficient wallet balance"}), 400

    # Calculate transaction fee
    transaction_fee = (amount * TRANSACTION_FEE_PERCENTAGE) / 100
    total_deduction = amount + transaction_fee

    if wallet["balance"] < total_deduction:
        return jsonify({"error": "Insufficient balance after fee deduction"}), 400

    # Deduct amount + transaction fee
    new_balance = wallet["balance"] - total_deduction
    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

    # Store transaction record
    db.transactions.insert_one({
        "merchant_id": merchant_id,
        "amount": amount,
        "transaction_fee": transaction_fee,
        "total_deduction": total_deduction,
        "status": "completed",
        "created_at": datetime.datetime.utcnow()
    })

    return jsonify({"message": "Payment successful", "new_balance": new_balance, "transaction_fee": transaction_fee}), 200

SUBSCRIPTION_PLANS = {
    "basic": {"price": 10, "currency": "EUR"},
    "pro": {"price": 30, "currency": "EUR"},
    "enterprise": {"price": 100, "currency": "EUR"}
}

@merchant_bp.route("/merchants/subscribe", methods=["POST"])
@jwt_required()
def subscribe_to_plan():
    """Allows a merchant to subscribe to a plan and deducts the fee from their wallet."""
    data = request.json
    plan = data.get("plan")
    
    if plan not in SUBSCRIPTION_PLANS:
        return jsonify({"error": "Invalid subscription plan"}), 400

    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})
    
    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    wallet = db.wallets.find_one({"merchant_id": merchant_id})

    plan_price = SUBSCRIPTION_PLANS[plan]["price"]
    
    if wallet["balance"] < plan_price:
        return jsonify({"error": "Insufficient balance for subscription"}), 400

    # Deduct subscription fee
    new_balance = wallet["balance"] - plan_price
    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})
    
    # Store subscription record
    db.subscriptions.insert_one({
        "merchant_id": merchant_id,
        "plan": plan,
        "amount": plan_price,
        "status": "active",
        "created_at": datetime.datetime.utcnow(),
        "expires_at": datetime.datetime.utcnow() + datetime.timedelta(days=30)
    })

    return jsonify({"message": f"Subscribed to {plan} plan successfully", "new_balance": new_balance}), 200

SUBSCRIPTION_PLANS = {
    "basic": {"price": 10, "currency": "EUR"},
    "pro": {"price": 30, "currency": "EUR"},
    "enterprise": {"price": 100, "currency": "EUR"}
}

def auto_renew_subscriptions():
    """Automatically renews merchant subscriptions if balance is sufficient."""
    today = datetime.datetime.utcnow()

    # Fetch all subscriptions that expire today
    expiring_subscriptions = db.subscriptions.find({"expires_at": {"$lte": today}, "status": "active"})

    for sub in expiring_subscriptions:
        merchant_id = sub["merchant_id"]
        plan = sub["plan"]
        plan_price = SUBSCRIPTION_PLANS[plan]["price"]

        wallet = db.wallets.find_one({"merchant_id": merchant_id})
        
        if wallet and wallet["balance"] >= plan_price:
            # Deduct the renewal fee
            new_balance = wallet["balance"] - plan_price
            db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

            # Extend the subscription by 30 days
            new_expiry_date = today + datetime.timedelta(days=30)
            db.subscriptions.update_one({"merchant_id": merchant_id}, {"$set": {"expires_at": new_expiry_date}})

            print(f"✅ Subscription renewed for Merchant {merchant_id}. New Expiry: {new_expiry_date}")
        else:
            # Cancel the subscription due to insufficient balance
            db.subscriptions.update_one({"merchant_id": merchant_id}, {"$set": {"status": "canceled"}})
            print(f"❌ Subscription canceled for Merchant {merchant_id} due to insufficient funds.")

# Set up APScheduler to run the job daily
scheduler = BackgroundScheduler()
scheduler.add_job(auto_renew_subscriptions, "interval", days=1)
scheduler.start()

@merchant_bp.route("/merchantss/manual-renew", methods=["POST"])
@jwt_required()
def manual_renew_subscription():
    """Allows a merchant to manually renew their subscription before expiry."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    subscription = db.subscriptions.find_one({"merchant_id": merchant_id, "status": "active"})

    if not subscription:
        return jsonify({"error": "No active subscription found"}), 404

    plan = subscription["plan"]
    plan_price = SUBSCRIPTION_PLANS[plan]["price"]
    
    wallet = db.wallets.find_one({"merchant_id": merchant_id})
    if wallet["balance"] < plan_price:
        return jsonify({"error": "Insufficient balance for renewal"}), 400

    # Deduct subscription fee
    new_balance = wallet["balance"] - plan_price
    db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})
    
    # Extend subscription for another 30 days
    new_expiry_date = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    db.subscriptions.update_one({"merchant_id": merchant_id}, {"$set": {"expires_at": new_expiry_date}})

    return jsonify({"message": f"Subscription renewed successfully!", "new_balance": new_balance}), 200

#notificatioms
def auto_renew_subscriptions():
    """Automatically renews merchant subscriptions and notifies merchants of expiry."""
    today = datetime.datetime.utcnow()
    three_days_from_now = today + datetime.timedelta(days=3)

    # Check for expiring subscriptions (3 days left)
    expiring_subscriptions = db.subscriptions.find({"expires_at": {"$lte": three_days_from_now}, "status": "active"})

    for sub in expiring_subscriptions:
        merchant_id = sub["merchant_id"]
        existing_notification = db.notifications.find_one({"merchant_id": merchant_id, "type": "subscription_expiry"})

        # Avoid duplicate notifications
        if not existing_notification:
            db.notifications.insert_one({
                "merchant_id": merchant_id,
                "message": "Your subscription is expiring in 3 days.",
                "type": "subscription_expiry",
                "is_read": False,
                "created_at": today
            })

    # Check subscriptions expiring today and attempt renewal
    expiring_today = db.subscriptions.find({"expires_at": {"$lte": today}, "status": "active"})

    for sub in expiring_today:
        merchant_id = sub["merchant_id"]
        plan = sub["plan"]
        plan_price = SUBSCRIPTION_PLANS[plan]["price"]
        wallet = db.wallets.find_one({"merchant_id": merchant_id})

        if wallet and wallet["balance"] >= plan_price:
            # Deduct renewal fee
            new_balance = wallet["balance"] - plan_price
            db.wallets.update_one({"merchant_id": merchant_id}, {"$set": {"balance": new_balance}})

            # Extend subscription by 30 days
            new_expiry_date = today + datetime.timedelta(days=30)
            db.subscriptions.update_one({"merchant_id": merchant_id}, {"$set": {"expires_at": new_expiry_date}})

            # Send renewal notification
            db.notifications.insert_one({
                "merchant_id": merchant_id,
                "message": "Your subscription has been renewed successfully!",
                "type": "subscription_renewed",
                "is_read": False,
                "created_at": today
            })
        else:
            # Cancel subscription due to insufficient balance
            db.subscriptions.update_one({"merchant_id": merchant_id}, {"$set": {"status": "canceled"}})

            # Send cancellation notification
            db.notifications.insert_one({
                "merchant_id": merchant_id,
                "message": "Your subscription was canceled due to insufficient balance.",
                "type": "subscription_canceled",
                "is_read": False,
                "created_at": today
            })

@merchant_bp.route("/merchants/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    """Fetch unread notifications for the merchant."""
    user_id = get_jwt_identity()
    merchant = db.merchants.find_one({"user_id": str(user_id)})

    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404

    merchant_id = str(merchant["_id"])
    notifications = list(db.notifications.find({"merchant_id": merchant_id, "is_read": False}, {"_id": 0}))

    return jsonify({"notifications": notifications}), 200

@merchant_bp.route("/merchants/notifications/read", methods=["POST"])
@jwt_required()
def mark_notification_as_read():
    """Marks a notification as read for the merchant."""
    data = request.json
    notification_id = data.get("notification_id")

    if not notification_id:
        return jsonify({"error": "Notification ID is required"}), 400

    db.notifications.update_one({"_id": ObjectId(notification_id)}, {"$set": {"is_read": True}})
    
    return jsonify({"message": "Notification marked as read"}), 200
