from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
import uuid
import datetime
import requests
import logging
from bson.objectid import ObjectId
import base64

# Define Blueprint
payment_bp = Blueprint("payment", __name__)

# Database connection
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)
db = client["Bluecode"]
merchants = db["merchants"]  
transactions = db["payment_transactions"]  
users_collection = db["users"]  
branches = db["branches"]  
registered_merchants = db["registered_merchants"]

BLUECODE_API_URL = "https://merchant-api.acq.int.bluecode.ng/v4/payment"  
BLUECODE_STATUS_API_URL = "https://merchant-api.acq.int.bluecode.ng/v4/status"
BLUECODE_REGISTER_URL = "https://merchant-api.acq.int.bluecode.ng/v4/register"
BLUECODE_CANCEL_API_URL = "https://merchant-api.acq.int.bluecode.ng/v4/cancel"

def get_merchant_details(user_id):
    try:
        user_id_str = str(user_id) 
        merchant = merchants.find_one({"user_id": user_id_str})  # Ensure user_id is queried as a string
        logging.info(f"🔍 Merchant Lookup: user_id={user_id_str}, result={merchant}")
        return merchant
    except Exception as e:
        logging.error(f"❌ Error retrieving merchant: {e}", exc_info=True)
        return None

def get_branch_details(merchant_ext_id):
    try:
        branch = branches.find_one({"merchant_id": merchant_ext_id})
        logging.info(f"🏢 Branch Lookup: merchant_ext_id={merchant_ext_id}, result={branch}")
        return branch
    except Exception as e:
        logging.error(f"❌ Error retrieving branch: {e}", exc_info=True)
        return None

def generate_merchant_tx_id():
    return str(uuid.uuid4())  

def get_latest_transaction(merchant_id):
    try:
        transaction = transactions.find_one({"merchant_id": merchant_id}, sort=[("created_at", -1)])
        logging.info(f"🔄 Latest Transaction Lookup: merchant_id={merchant_id}, result={transaction}")
        return transaction
    except Exception as e:
        logging.error(f"❌ Error retrieving latest transaction: {e}", exc_info=True)
        return None


@payment_bp.route("/make-payment", methods=["POST"])
@jwt_required()
def process_payment():
    data = request.json
    logging.info(f"📩 Received Payment Request: {data}")

    # Verify user authentication and check if verified
    user_id = get_jwt_identity()
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
        logging.info(f"✅ User Found: {user}")
    except Exception as e:
        logging.error("❌ Error converting user_id", exc_info=True)
        user = None
    
    if not user:
        return jsonify({"error": "User not verified"}), 401

    merchant = get_merchant_details(user_id)
    if not merchant:
        return jsonify({"error": "Merchant not found for this user"}), 404
    
    merchant_ext_id = merchant.get("ext_id")
    branch = branches.find_one({"merchant_id": merchant_ext_id})
    logging.info(f"🏢 Branch Lookup: merchant_ext_id={merchant_ext_id}, result={branch}")
    
    if not branch:
        return jsonify({"error": "Branch not found for this merchant"}), 404
    
    branch_ext_id = branch.get("ext_id")
    logging.info(f"🏢 Branch Retrieved: ext_id={branch_ext_id}")

    # Retrieve Bluecode access key and secret key
    bluecode_access_key = merchant.get("bluecode_access_id", "")
    bluecode_secret_key = merchant.get("bluecode_secret_key", "")

    if not bluecode_access_key or not bluecode_secret_key:
        return jsonify({"error": "Bluecode credentials missing for this merchant"}), 403

    # Ensure barcode is provided by user
    barcode = data.get("barcode")
    if not barcode:
        return jsonify({"error": "Barcode is required"}), 400
    
    # Generate a unique transaction ID
    merchant_tx_id = generate_merchant_tx_id()
    
    payload = {
        "branch_ext_id": branch_ext_id,
        "merchant_tx_id": merchant_tx_id,
        "scheme": data.get("scheme", "AUTO"),
        "barcode": barcode,
        "total_amount": data.get("total_amount"),
        "requested_amount": data.get("requested_amount"),
        "consumer_tip_amount": data.get("consumer_tip_amount", 0),
        "currency": data.get("currency", "NGN"),
        "slip": data.get("slip")
    }
    logging.info(f"📤 Sending Payment Request: {payload}")
    
    # Encode Bluecode access key and secret key for Basic Auth
    credentials = f"{bluecode_access_key}:{bluecode_secret_key}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    # Send request to Bluecode API
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"  # Using Bluecode access key and secret key for authentication
    }
    response = requests.post(BLUECODE_API_URL, json=payload, headers=headers)
    logging.info(f"📥 Bluecode Response: {response.status_code}, {response.text}")
    
    bluecode_response = response.json()
    payment_state = bluecode_response.get("payment", {}).get("state")

    if payment_state == "APPROVED":
        transaction_data = {
            "merchant_tx_id": merchant_tx_id,
            "merchant_id": merchant["_id"],
            "scheme": payload["scheme"],
            "barcode": barcode,
            "total_amount": payload["total_amount"],
            "requested_amount": payload["requested_amount"],
            "consumer_tip_amount": payload["consumer_tip_amount"],
            "currency": payload["currency"],
            "slip": payload["slip"],
            "status": payment_state,
            "bluecode_response": bluecode_response,
            "created_at": datetime.datetime.utcnow()
        }

        transactions.insert_one(transaction_data)  # Save transaction
        logging.info(f"✅ Transaction Saved: {transaction_data}")

        return jsonify({
            "merchant_tx_id": merchant_tx_id,
            "barcode": barcode,
            "status": payment_state,
            "message": merchant["transaction_settings"].get("booking_reference_prefix", "Payment successful")
        }), 200

    return jsonify({"error": "Failed to process payment with Bluecode", "details": bluecode_response}), response.status_code

@payment_bp.route("/status", methods=["GET"])
@jwt_required()
def get_payment_status():
    merchant_tx_id = request.args.get("merchant_tx_id")
    print(f"🛠 Checking transaction for merchant_tx_id: {merchant_tx_id}")
    
    if not merchant_tx_id:
        return jsonify({"error": "merchant_tx_id is required"}), 400

    transaction = transactions.find_one({"merchant_tx_id": merchant_tx_id})
    print(f"🛠 Transaction Lookup Result: {transaction}")

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    merchant = merchants.find_one({"_id": transaction["merchant_id"]})
    if not merchant:
        return jsonify({"error": "Merchant details not found"}), 404

    bluecode_access_key = merchant.get("meta", {}).get("bluecode_access_id", "")
    bluecode_secret_key = merchant.get("meta", {}).get("bluecode_secret_key", "")
    
    if not bluecode_access_key or not bluecode_secret_key:
        return jsonify({"error": "Bluecode credentials missing"}), 403

    # Request status from Bluecode API
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {base64.b64encode(f'{bluecode_access_key}:{bluecode_secret_key}'.encode()).decode()}"
    }
    response = requests.get(f"{BLUECODE_STATUS_API_URL}?merchant_tx_id={merchant_tx_id}", headers=headers)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch status from Bluecode", "details": response.json()}), response.status_code
    
    bluecode_response = response.json()
    return jsonify({"merchant_tx_id": merchant_tx_id, "status": bluecode_response.get("status", "UNKNOWN"), "bluecode_response": bluecode_response}), 200

@payment_bp.route("/cancel", methods=["POST"])
@jwt_required()
def cancel_payment():
    data = request.json
    merchant_tx_id = data.get("merchant_tx_id")
    
    if not merchant_tx_id:
        return jsonify({"error": "merchant_tx_id is required"}), 400
    
    transaction = transactions.find_one({"merchant_tx_id": merchant_tx_id})
    
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
    
    if transaction.get("status") != "PENDING":
        return jsonify({"error": "Only pending transactions can be cancelled"}), 400
    
    merchant = merchants.find_one({"_id": transaction["merchant_id"]})
    if not merchant:
        return jsonify({"error": "Merchant details not found"}), 404
    
    bluecode_access_key = merchant.get("meta", {}).get("bluecode_access_id", "")
    bluecode_secret_key = merchant.get("meta", {}).get("bluecode_secret_key", "")
    
    if not bluecode_access_key or not bluecode_secret_key:
        return jsonify({"error": "Bluecode credentials missing"}), 403

    # Send cancel request to Bluecode API
    cancel_payload = {"merchant_tx_id": merchant_tx_id}
    credentials = f"{bluecode_access_key}:{bluecode_secret_key}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }
    
    response = requests.post(BLUECODE_CANCEL_API_URL, json=cancel_payload, headers=headers)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to cancel payment", "details": response.json()}), response.status_code
    
    transactions.update_one(
        {"merchant_tx_id": merchant_tx_id},
        {"$set": {"status": "CANCELLED", "cancelled_at": datetime.datetime.utcnow()}}
    )
    
    return jsonify({"message": "Payment cancelled successfully", "merchant_tx_id": merchant_tx_id, "status": "CANCELLED"}), 200

@payment_bp.route("/register", methods=["POST"])
@jwt_required()
def register_merchant():
    user_id = get_jwt_identity()
    merchant = get_merchant_details(user_id)
    
    if not merchant:
        return jsonify({"error": "Merchant details not found"}), 404
    
    logging.info(f"🔎 Merchant Data Retrieved: {merchant}")
    meta_data = merchant.get("meta", {})
    logging.info(f"🔑 Meta Data Retrieved: {meta_data}")
    
    bluecode_access_key = meta_data.get("bluecode_access_id", "")
    bluecode_secret_key = meta_data.get("bluecode_secret_key", "")
    
    if not bluecode_access_key or not bluecode_secret_key:
        logging.error("❌ Bluecode credentials missing in meta field")
        return jsonify({"error": "Bluecode credentials missing"}), 403
    
    branch = get_branch_details(merchant["ext_id"])
    if not branch:
        return jsonify({"error": "Branch details not found"}), 404
    
    transaction = get_latest_transaction(merchant["_id"])
    if not transaction:
        return jsonify({"error": "No transaction found for merchant"}), 404
    
    # Construct payload for Bluecode API with retrieved data
    payload = {
        "branch_ext_id": branch["ext_id"],
        "merchant_tx_id": transaction["merchant_tx_id"],  # Use existing transaction ID
        "requested_amount": transaction["total_amount"],  # Use transaction amount
        "currency": transaction["currency"],
        "scheme": transaction["scheme"],
        "merchant_callback_url": merchant.get("merchant_callback_url", ""),
        "return_url_cancel": merchant.get("return_url_cancel", ""),
        "return_url_failure": merchant.get("return_url_failure", ""),
        "return_url_success": merchant.get("return_url_success", ""),
        "terminal": branch.get("terminal", ""),
        "source": "pos"
    }
    
    # Send request to Bluecode API
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {base64.b64encode(f'{bluecode_access_key}:{bluecode_secret_key}'.encode()).decode()}"
    }
    response = requests.post(BLUECODE_API_URL, json=payload, headers=headers)
    
    if response.status_code != 201:
        return jsonify({"error": "Failed to register merchant with Bluecode", "details": response.json()}), response.status_code
    
    bluecode_response = response.json()
    payload["ext_id"] = bluecode_response.get("merchant_ext_id")
    payload["created_at"] = datetime.datetime.utcnow()
    merchants.insert_one(payload)
    registered_merchants.insert_one(payload)  
    return jsonify({"message": "Merchant registered successfully", "merchant_ext_id": payload["ext_id"]}), 201
