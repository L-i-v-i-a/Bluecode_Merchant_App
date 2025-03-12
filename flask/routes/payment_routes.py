import requests
import uuid
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from datetime import datetime
from requests.auth import HTTPBasicAuth
from bson import ObjectId

# Configure logging (here, logging to console)
logging.basicConfig(level=logging.INFO)

# Flask Blueprint for Payment Routes
payment_bp = Blueprint("payment", __name__)

# MongoDB Connection
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)
db = client["Bluecode"]

# Collections
branches_collection = db["branches"]
payments_collection = db["payments"]
receipts_collection = db["receipts"]
users_collection = db["users"]
merchants_collection = db["merchants"]

# Bluecode Payment API URL and Merchant Token URL
BLUECODE_PAYMENT_URL = "https://merchant-api.acq.int.bluecode.ng/v4/payment"
BLUECODE_MERCHANT_TOKEN_URL = "https://merchant-api.acq.int.bluecode.ng/v4/merchant_token"
BLUECODE_RECEIPT_URL = "https://merchant-api.acq.int.bluecode.ng/v4/receipt"
BLUECODE_STATUS_URL = "https://merchant-api.acq.int.bluecode.ng/v4/status"


# We use the merchant's ext_id as stored in the branch document.
def get_merchant_credentials(merchant_ext_id):
    merchant = merchants_collection.find_one({"ext_id": merchant_ext_id})
    logging.info(f"Merchant Lookup for ID {merchant_ext_id}: {merchant}")
    if merchant and "bluecode_access_id" in merchant and "bluecode_secret_key" in merchant:
        return merchant["bluecode_access_id"], merchant["bluecode_secret_key"]
    return None, None

# ------------------------------------------------------------------
# Endpoint: Create Merchant Token (Merchant-Presented QR Code)
# ------------------------------------------------------------------
@payment_bp.route("/create-merchant-token", methods=["POST"])
@jwt_required()
def create_merchant_token():
    
    data = request.json
    logging.info(f"Received Merchant Token Request Data: {data}")

    # Verify that the user is authenticated & verified.
    user_id = get_jwt_identity()
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    except Exception as e:
        logging.error("Error converting user_id", exc_info=True)
        user = None
    logging.info(f"User Verification Lookup: {user}")
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Look up branch using branch_ext_id from request.
    branch = branches_collection.find_one({"ext_id": data.get("branch_ext_id")})
    logging.info(f"Branch Lookup: {branch}")
    if not branch:
        return jsonify({"error": "Branch not found"}), 404

    merchant_ext_id = branch["merchant_id"]  # merchant's ext_id as stored in branch
    branch_ext_id = branch["ext_id"]

    # Fetch Merchant Credentials using merchant's ext_id.
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build payload for merchant token creation.
    token_payload = {
         "branch_ext_id": data.get("branch_ext_id"),
         "token": data.get("token"),
         "scan_date_time": data.get("scan_date_time"),
         "source": data.get("source", "pos"),
         "terminal": data.get("terminal", "terminal-id"),
         "entry_mode": data.get("entry_mode", "scan")
    }
    logging.info(f"Merchant Token Payload: {token_payload}")

    # Call Bluecode API for merchant token creation.
    response = requests.post(
         BLUECODE_MERCHANT_TOKEN_URL,
         json=token_payload,
         headers={"Content-Type": "application/json"},
         auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )
    logging.info(f"Merchant Token API Response Status: {response.status_code}")
    logging.info(f"Merchant Token API Response Text: {response.text}")

    try:
         token_response = response.json()
    except Exception as e:
         token_response = {"error": "Invalid JSON response", "details": response.text}
    
    # Save token request and response to MongoDB (if desired)
    payments_collection.insert_one({
         "merchant_ext_id": merchant_ext_id,
         "branch_ext_id": branch_ext_id,
         "merchant_token_request": token_payload,
         "merchant_token_response": token_response,
         "created_at": datetime.utcnow()
    })
    
    return jsonify(token_response), response.status_code

# ------------------------------------------------------------------
# Endpoint: Make Payment (Supports multiple modes: QR, Barcode, Shortcode)
# ------------------------------------------------------------------
@payment_bp.route("/make-payment", methods=["POST"])
@jwt_required()
def make_payment():
    data = request.json
    logging.info(f"📩 Received Payment Request: {data}")

    # Verify user authentication and check if verified
    user_id = get_jwt_identity()
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    except Exception as e:
        logging.error("❌ Error converting user_id", exc_info=True)
        user = None
    
    logging.info(f"✅ User Verification: {user}")
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Fetch branch details
    branch = branches_collection.find_one({"ext_id": data.get("branch_ext_id")})
    logging.info(f"🏢 Branch Lookup: {branch}")

    if not branch:
        return jsonify({"error": "Branch not found"}), 404

    merchant_ext_id = branch["merchant_id"]
    branch_ext_id = branch["ext_id"]

    # Fetch merchant credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Generate merchant transaction ID
    merchant_tx_id = f"mtx_{uuid.uuid4().hex[:12]}"

    # Determine payment mode (QR, Barcode, Shortcode)
    mode = data.get("mode", "qr").lower()
    payment_payload = {
        "branch_ext_id": branch_ext_id,
        "merchant_tx_id": merchant_tx_id,
        "scheme": "AUTO",
        "requested_amount": data.get("requested_amount", 1000),
        "currency": data.get("currency", "EUR"),
        "slip": data.get("slip", "Thanks for shopping with us!")
    }

    if mode == "barcode":
        payment_payload["barcode"] = data.get("barcode")
    elif mode == "shortcode":
        payment_payload["shortcode"] = data.get("shortcode")
    else:  # Default to QR mode
        payment_payload["token"] = data.get("token")

    logging.info(f"📤 Payment Payload: {payment_payload}")

    headers = {"Content-Type": "application/json"}
    logging.info(f"🛠 Payment Headers: {headers}")

    # Send Payment Request
    response = requests.post(
        BLUECODE_PAYMENT_URL,
        json=payment_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )
    logging.info(f"📡 Payment API Response Status: {response.status_code}")
    logging.info(f"📡 Payment API Response Text: {response.text}")

    if response.status_code in [200, 201]:
        try:
            payment_data = response.json()
            logging.info(f"✅ Payment Success Data: {payment_data}")
        except requests.exceptions.JSONDecodeError:
            return jsonify({"error": "Invalid JSON response from Bluecode"}), 502

        # Extract acquirer_tx_id from response
        acquirer_tx_id = payment_data.get("payment", {}).get("acquirer_tx_id")
        
        # If missing, check the payments collection
        if not acquirer_tx_id:
            logging.warning("⚠ No acquirer_tx_id returned! Checking database.")
            payment_record = payments_collection.find_one(
                {"bluecode_response.payment.merchant_tx_id": merchant_tx_id}
            )
            if payment_record:
                acquirer_tx_id = payment_record.get("bluecode_response", {}).get("payment", {}).get("acquirer_tx_id")
                logging.info(f"✅ Retrieved acquirer_tx_id from DB: {acquirer_tx_id}")

        # Save the Bluecode response to MongoDB
        payment_record = {
            "merchant_ext_id": merchant_ext_id,
            "branch_ext_id": branch_ext_id,
            "merchant_tx_id": merchant_tx_id,
            "acquirer_tx_id": acquirer_tx_id,
            "payment_request": payment_payload,
            "bluecode_response": payment_data,
            "created_at": datetime.utcnow()
        }
        payments_collection.insert_one(payment_record)
        logging.info(f"📌 Payment Record Inserted: {payment_record}")

        return jsonify(payment_data), 200
    else:
        try:
            error_details = response.json()
        except requests.exceptions.JSONDecodeError:
            error_details = {"message": "Bluecode API returned an invalid or empty response"}
        
        logging.error(f"❌ Payment Failure Data: {error_details}")
        return jsonify({"error": "Payment failed", "details": error_details}), response.status_code

@payment_bp.route("/create-receipt", methods=["POST"])
@jwt_required()
def create_receipt():
    """Handles receipt creation after a successful payment."""

    data = request.json
    logging.info(f"📩 Received Receipt Request: {data}")

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    branch_ext_id = data.get("branch_ext_id")
    merchant_tx_id = data.get("merchant_tx_id")  # Merchant transaction ID from the request

    if not branch_ext_id or not merchant_tx_id:
        return jsonify({"error": "branch_ext_id and merchant_tx_id are required"}), 400

    # Fetch `acquirer_tx_id` from `payments` collection
    payment = payments_collection.find_one({"merchant_tx_id": merchant_tx_id})
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    acquirer_tx_id = payment["bluecode_response"]["payment"]["acquirer_tx_id"]

    # Get merchant credentials
    merchant_ext_id = payment["merchant_ext_id"]
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Construct Receipt Payload
    receipt_payload = {
        "branch_ext_id": branch_ext_id,
        "acquirer_tx_id": acquirer_tx_id,  
        "receipt": data["receipt"]  
    }

    logging.info(f"📤 Sending Receipt Payload: {receipt_payload}")

    headers = {"Content-Type": "application/json"}
    
    # Send request to Bluecode
    response = requests.post(
        BLUECODE_RECEIPT_URL,
        json=receipt_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Receipt API Response: {response.status_code} - {response.text}")

    try:
        receipt_response = response.json()
    except requests.exceptions.JSONDecodeError:
        receipt_response = {"error": "Invalid response from Bluecode", "raw": response.text}

    # Save receipt data to MongoDB
    receipt_record = {
        "merchant_ext_id": merchant_ext_id,
        "branch_ext_id": branch_ext_id,
        "acquirer_tx_id": acquirer_tx_id,
        "receipt_request": receipt_payload,
        "bluecode_response": receipt_response,
        "created_at": datetime.utcnow()
    }
    receipts_collection.insert_one(receipt_record)

    return jsonify(receipt_response), response.status_code

@payment_bp.route("/check-status", methods=["POST"])
@jwt_required()
def check_transaction_status():
    """ Check the status of a Bluecode transaction. """
    data = request.json
    logging.info(f"Received Status Check Request: {data}")
    
    merchant_tx_id = data.get("merchant_tx_id")
    if not merchant_tx_id:
        return jsonify({"error": "merchant_tx_id is required"}), 400
    
    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401
    
    # Retrieve payment record from MongoDB
    payment_record = payments_collection.find_one({"merchant_tx_id": merchant_tx_id})
    if not payment_record:
        return jsonify({"error": "Transaction not found"}), 404
    
    merchant_ext_id = payment_record.get("merchant_ext_id")
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401
    
    # Build Status Check Payload
    status_payload = {"merchant_tx_id": merchant_tx_id}
    logging.info(f"Status Check Payload: {status_payload}")
    
    headers = {"Content-Type": "application/json"}
    logging.info(f"Status Check Headers: {headers}")
    
    # Send Status Check Request
    response = requests.post(
        BLUECODE_STATUS_URL,
        json=status_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )
    logging.info(f"Status API Response: {response.status_code} - {response.text}")
    
    try:
        status_response = response.json()
    except requests.exceptions.JSONDecodeError:
        status_response = {"error": "Invalid JSON response from Bluecode"}
    
    # Store the status response in MongoDB
    payments_collection.update_one(
        {"merchant_tx_id": merchant_tx_id},
        {"$set": {"status_response": status_response}}
    )
    logging.info(f"📌 Updated Payment Status in DB: {status_response}")
    
    return jsonify(status_response), response.status_code