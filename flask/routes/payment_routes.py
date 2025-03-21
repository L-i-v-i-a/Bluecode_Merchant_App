from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
import uuid
import datetime
import requests
import logging
from bson.objectid import ObjectId
import base64
import time
import json


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
        merchant = merchants.find_one({"user_id": user_id_str})  
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


def get_branch_ext_id(user_id):
    """
    Retrieves the correct branch_ext_id for a given merchant user_id.
    """
    merchant = merchants.find_one({"user_id": user_id})
    if not merchant:
        return None, None

    merchant_ext_id = merchant.get("ext_id")
    
    branch = branches.find_one({"merchant_id": merchant_ext_id})  

    if not branch:
        return merchant, None

    return merchant, branch["ext_id"]

@payment_bp.route("/make-payment", methods=["POST"])
@jwt_required()
def process_payment():
    """
    Processes a payment using the Bluecode API.
    """
    data = request.json
    logging.info(f"📥 Received Payment Request: {data}")

    # Get authenticated user ID from JWT
    user_id = get_jwt_identity()

    # Retrieve merchant and branch information
    merchant, branch_ext_id = get_branch_ext_id(user_id)
    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404
    if not branch_ext_id:
        return jsonify({"error": "Branch ID not found"}), 404

    logging.info(f"✅ Merchant Found: {merchant}")
    logging.info(f"✅ Branch ext_id: {branch_ext_id}")

    # Fetch Bluecode credentials from merchant record
    bluecode_access_key = merchant.get("bluecode_access_id")
    bluecode_secret_key = merchant.get("bluecode_secret_key")

    if not bluecode_access_key or not bluecode_secret_key:
        return jsonify({"error": "Bluecode credentials missing for this merchant"}), 403

    # Validate required input fields
    barcode = data.get("barcode")
    if not barcode:
        return jsonify({"error": "Barcode is required"}), 400

    total_amount = data.get("total_amount")
    requested_amount = data.get("requested_amount")

    if total_amount is None or requested_amount is None:
        return jsonify({"error": "Total amount and requested amount are required"}), 400

    # Generate a unique merchant transaction ID
    merchant_tx_id = generate_merchant_tx_id()

    # Prepare the payment request payload
    payload = {
        "branch_ext_id": branch_ext_id,
        "merchant_tx_id": merchant_tx_id,
        "scheme": data.get("scheme", "AUTO"),
        "barcode": barcode,
        "total_amount": total_amount,
        "requested_amount": requested_amount,
        "consumer_tip_amount": data.get("consumer_tip_amount", 0),
        "currency": data.get("currency", "NGN"),
        "slip": data.get("slip")
    }
    logging.info(f"📤 Sending Payment Request to Bluecode: {payload}")

    # Encode credentials for Basic Authentication
    credentials = f"{bluecode_access_key}:{bluecode_secret_key}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }

    # Make request to Bluecode API
    try:
        response = requests.post(BLUECODE_API_URL, json=payload, headers=headers)
        logging.info(f"📩 Bluecode Response: {response.status_code}, {response.text}")
    except requests.RequestException as e:
        logging.error(f"❌ Bluecode API Request Failed: {e}")
        return jsonify({"error": "Failed to communicate with Bluecode API"}), 500

    # Parse Bluecode API response
    try:
        bluecode_response = response.json()
    except ValueError:
        return jsonify({"error": "Invalid Bluecode response"}), 500

    # Extract payment state and transaction ID
    payment_info = bluecode_response.get("payment", {})
    payment_state = payment_info.get("state")
    bluecode_tx_id = payment_info.get("merchant_tx_id", merchant_tx_id)  

    logging.info(f"✅ Final merchant_tx_id used: {bluecode_tx_id}")
    logging.info(f"✅ Payment state: {payment_state}")

    # Save transaction details in MongoDB
    transaction_data = {
        "user_id":user_id,
        "merchant_tx_id": bluecode_tx_id,
        "merchant_id": merchant["_id"],
        "scheme": payload["scheme"],
        "barcode": barcode,
        "total_amount": total_amount,
        "requested_amount": requested_amount,
        "consumer_tip_amount": payload["consumer_tip_amount"],
        "currency": payload["currency"],
        "slip": payload["slip"],
        "status": payment_state,
        "bluecode_response": bluecode_response,
        "created_at": datetime.datetime.utcnow().isoformat()
    }

    transactions.insert_one(transaction_data)
    logging.info(f"✅ Transaction Saved: {transaction_data}")

    # Return response with full Bluecode response
    return jsonify({
        "merchant_tx_id": bluecode_tx_id,
        "barcode": barcode,
        "status": payment_state,
        "message": merchant.get("transaction_settings", {}).get("booking_reference_prefix", "Payment successful"),
        "bluecode_response": bluecode_response  # ✅ Ensuring Bluecode response is included
    }), 200


@payment_bp.route("/status", methods=["POST"])
@jwt_required()
def check_payment_status():
    data = request.json
    merchant_tx_id = data.get("merchant_tx_id")

    if not merchant_tx_id:
        return jsonify({"error": "merchant_tx_id is required"}), 400

    # Get the authenticated user
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    logging.info(f"✅ User Found: {user}")

    # Get the merchant associated with the user
    merchant = merchants.find_one({"user_id": str(user_id)})
    if not merchant:
        return jsonify({"error": "Merchant not found"}), 404
    merchant_id = merchant["_id"]
    logging.info(f"🔍 Merchant Found: {merchant}")

    # Find the transaction in the database
    transaction = transactions.find_one({"merchant_tx_id": merchant_tx_id, "merchant_id": merchant_id})
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
    logging.info(f"✅ Transaction Found: {transaction}")

    # Prepare authorization header
    credentials = f"{merchant['bluecode_access_id']}:{merchant['bluecode_secret_key']}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }

    # Send request to Bluecode
    status_url = f"{BLUECODE_STATUS_API_URL}?merchant_tx_id={merchant_tx_id}"
    logging.info(f"📤 Sending Status Request to Bluecode: {status_url}")

    try:
        response = requests.get(status_url, headers=headers, timeout=10)
        response_data = response.json()
        logging.info(f"📥 Bluecode Response: {response.status_code}, {response_data}")

        if response.status_code == 200:
            return jsonify(response_data), 200
    except requests.exceptions.RequestException as e:
        logging.error(f"❌ Bluecode Request Failed: {str(e)}")

    # If Bluecode fails, return status from the database
    logging.info("❌ Bluecode transaction not found, returning database status")
    return jsonify({
        "message": "Transaction status retrieved from database",
        "merchant_tx_id": transaction["merchant_tx_id"],
        "status": transaction["status"],
        "total_amount": transaction["total_amount"],
        "requested_amount": transaction["requested_amount"],
        "currency": transaction["currency"],
        "created_at": transaction["created_at"]
    }), 200
    
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


    bluecode_access_key = merchant.get("bluecode_access_id", "")
    bluecode_secret_key = merchant.get("bluecode_secret_key", "")
    
    if not bluecode_access_key or not bluecode_secret_key:
        return jsonify({"error": "Bluecode credentials missing"}), 403

    cancel_payload = {"merchant_tx_id": merchant_tx_id}
    credentials = f"{bluecode_access_key}:{bluecode_secret_key}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }

    cancel_url = f"https://merchant-api.acq.int.bluecode.ng/v4/cancel"
    logging.info(f"📤 Sending Cancel Request to Bluecode: {cancel_payload}")

    response = requests.post(cancel_url, json=cancel_payload, headers=headers)
    logging.info(f"📥 Bluecode Cancel Response: {response.status_code}, {response.text}")

    if response.status_code == 200:
        transactions.update_one(
            {"merchant_tx_id": merchant_tx_id},
            {"$set": {"status": "CANCELLED", "cancelled_at": datetime.datetime.utcnow()}}
        )
        return jsonify({"message": "Payment cancelled successfully", "merchant_tx_id": merchant_tx_id, "status": "CANCELLED"}), 200

  
    logging.info("❌ Bluecode cancel request failed, returning database status")
    return jsonify({
        "message": "Failed to cancel on Bluecode, returning database status",
        "merchant_tx_id": transaction["merchant_tx_id"],
        "status": transaction["status"],
        "total_amount": transaction["total_amount"],
        "requested_amount": transaction["requested_amount"],
        "currency": transaction["currency"],
        "created_at": transaction["created_at"]
    }), response.status_code


import json

@payment_bp.route("/register", methods=["POST"])
@jwt_required()
def register_merchant():
    user_id = get_jwt_identity()

    merchant = get_merchant_details(user_id)
    if not merchant:
        return jsonify({"error": "Merchant details not found"}), 404
    logging.info(f"Merchant Data Retrieved: {merchant}")


    bluecode_access_key = merchant.get("bluecode_access_id", "")
    bluecode_secret_key = merchant.get("bluecode_secret_key", "")
    if not bluecode_access_key or not bluecode_secret_key:
        logging.error("Bluecode credentials missing")
        return jsonify({"error": "Bluecode credentials missing"}), 403


    branch = get_branch_details(merchant["ext_id"])
    if not branch:
        return jsonify({"error": "Branch details not found"}), 404
    logging.info(f"Branch Details Retrieved: {branch}")

    transaction = get_latest_transaction(merchant["_id"])
    if not transaction:
        return jsonify({"error": "No transaction found for merchant"}), 404
    logging.info(f"Latest Transaction Found: {transaction}")

 
    payload = {
        "branch_ext_id": branch["ext_id"],
        "merchant_tx_id": transaction["merchant_tx_id"],
        "requested_amount": transaction["total_amount"],
        "currency": transaction["currency"],
        "scheme": transaction["scheme"],
        "merchant_callback_url": "https://www.merchant.com/transaction-callback",
        "return_url_cancel": "https://www.merchant.com/cancel",
        "return_url_failure": "https://www.merchant.com/failure",
        "return_url_success": "https://www.bluecode.com",
        "terminal": branch.get("terminal", "22140PH4"),
        "source": "pos"
    }

    logging.info(f"Sending Registration Request: {json.dumps(payload, indent=4)}")

    credentials = f"{bluecode_access_key}:{bluecode_secret_key}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }

    # 🔗 Send Request to Bluecode API
    response = requests.post(BLUECODE_REGISTER_URL, json=payload, headers=headers)
    logging.info(f"📥 Bluecode Response: {response.status_code}, {response.text}")

    # ❌ Handle API Failure
    if response.status_code != 201:
        return jsonify({
            "error": "Failed to register merchant with Bluecode",
            "details": response.json()
        }), response.status_code

    # ✅ Save Merchant in Database
    bluecode_response = response.json()
    payload["ext_id"] = bluecode_response.get("merchant_ext_id")
    payload["created_at"] = datetime.datetime.utcnow()
    merchants.insert_one(payload)
    registered_merchants.insert_one(payload)

    return jsonify({
        "message": "Merchant registered successfully",
        "merchant_ext_id": payload["ext_id"]
    }), 201


@payment_bp.route("/transaction/<merchant_tx_id>", methods=["GET"])
@jwt_required()  # Protect the route with JWT authentication
def get_transaction_by_merchant_tx_id(merchant_tx_id):
    # Fetch the transaction by merchant_tx_id
    transaction = transactions.find_one({"merchant_tx_id": merchant_tx_id})

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    # Convert ObjectId to string
    transaction['_id'] = str(transaction['_id'])

@payment_bp.route('/merchants/transactions', methods=['POST'])
@jwt_required()
def get_merchant_transactions():
    try:
        # Get user ID from JWT token
        user_id = get_jwt_identity()

        # Check if user exists
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Fetch all transactions related to this user
        transactionMade = list(transactions.find({"user_id": str(user_id)}))  

        if not transactionMade:
            return jsonify({"message": "No transactions found"}), 404

        # Format the transaction data for response
        formatted_transactions = []
        for tx in transactionMade:
            bluecode_response = tx.get("bluecode_response", {}).get("payment", {})

            formatted_transactions.append({
                "username": user.get("username", "Unknown"),
                "amount_paid": bluecode_response.get("total_amount", 0),
                "requested_amount": bluecode_response.get("requested_amount", 0),
                "currency": bluecode_response.get("currency", "NGN"),
                "status": tx.get("status", "UNKNOWN"),
                "merchant_tx_id": bluecode_response.get("merchant_tx_id", "N/A"),
                "acquirer_tx_id": bluecode_response.get("acquirer_tx_id", "N/A"),
                "slip_note": bluecode_response.get("slip_note", ""),
                "created_at": tx.get("created_at", ""),
            })

        return jsonify(formatted_transactions), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
