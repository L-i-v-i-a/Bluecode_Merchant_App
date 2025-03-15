import requests
import uuid
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
from datetime import datetime, timedelta
from requests.auth import HTTPBasicAuth
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)

# Flask Blueprint for DMS Endpoints
dms_bp = Blueprint("dms", __name__)

# MongoDB Connection
MONGO_URI = "mongodb+srv://oliviaoguelina:olivia@bluecode.17a3e.mongodb.net/?retryWrites=true&w=majority&appName=Bluecode"
client = MongoClient(MONGO_URI)
db = client["Bluecode"]

# Collections
branches_collection = db["branches"]
users_collection = db["users"]
merchants_collection = db["merchants"]
payments_collection = db["payments"]
authorizations_collection = db["authorization"]
bluescan_apps_collection = db["bluescan_apps"]

# Bluecode DMS API Base URL
DMS_BASE_URL = "https://merchant-api.acq.int.bluecode.ng/v4/dms"

# Function to Fetch Merchant Credentials
def get_merchant_credentials(merchant_id):
    merchant = merchants_collection.find_one({"ext_id": merchant_id})
    if merchant and "bluecode_access_id" in merchant and "bluecode_secret_key" in merchant:
        return merchant["bluecode_access_id"], merchant["bluecode_secret_key"]
    return None, None

@dms_bp.route("/authorization/register", methods=["POST"])
@jwt_required()
def register_authorization():
    """Registers a new Bluecode authorization request."""
    data = request.json
    logging.info(f"📩 Received Authorization Request: {data}")

    # Generate a unique merchant authorization ID
    merchant_authorization_id = f"auth_{uuid.uuid4().hex[:12]}"
    
    # Ensure required fields exist
    branch_ext_id = data.get("branch_ext_id")
    requested_amount = data.get("requested_amount")
    currency = data.get("currency", "EUR")
    valid_until = (datetime.utcnow() + timedelta(hours=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    if not branch_ext_id or not requested_amount:
        return jsonify({"error": "Missing required fields"}), 400

    # Fetch merchant credentials
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    branch = branches_collection.find_one({"ext_id": branch_ext_id})
    if not branch:
        return jsonify({"error": "Branch not found"}), 404

    merchant_ext_id = branch["merchant_id"]
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401
    
   # Fetch the BlueScan App ID for the correct merchant
    bluescan_app = bluescan_apps_collection.find_one({
    "merchant_id": merchant_ext_id  # Ensure we get the right merchant
})

    if not bluescan_app or "bluescan_app_id" not in bluescan_app:
        return jsonify({"error": "BlueScan App not found for this merchant"}), 404  # ✅ Fixed Indentation

    bluescan_app_id = bluescan_app["bluescan_app_id"]

    # Build Authorization Request Payload
    auth_payload = {
        "branch_ext_id": branch_ext_id,
        "terminal": data.get("terminal", "POS-001"),
        "operator": data.get("operator", "Cashier-1"),
        "source": data.get("source", "pos"),
        "merchant_authorization_id": merchant_authorization_id,
        "requested_amount": requested_amount,
        "currency": currency,
        "valid_until": valid_until,
        "timeout": data.get("timeout", 1000000),
        "merchant_callback_url": "http://localhost:4000/dms/bluecode-webhook",
        "return_url_success": "http://localhost:3000/payment-success",
        "return_url_failure": "http://localhost:3000/payment-failed",
        "return_url_cancel": "http://localhost:3000/cart",
        "bluescan_app_id": bluescan_app_id 
    }

    logging.info(f"📤 Authorization Payload: {auth_payload}")

    headers = {"Content-Type": "application/json"}
    response = requests.post(
        f"{DMS_BASE_URL}/authorization/register",
        json=auth_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Authorization API Response: {response.status_code} - {response.text}")

    try:
        auth_response = response.json()
    except requests.exceptions.JSONDecodeError:
        auth_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the authorization request & response in MongoDB
    authorization_record = {
        "merchant_ext_id": merchant_ext_id,
        "branch_ext_id": branch_ext_id,
        "merchant_authorization_id": merchant_authorization_id,
        "authorization_request": auth_payload,
        "bluecode_response": auth_response,
        "created_at": datetime.utcnow()
    }
    authorizations_collection.insert_one(authorization_record)

    return jsonify(auth_response), response.status_code

@dms_bp.route("/authorization/status", methods=["POST"])
@jwt_required()
def check_authorization_status():
    """ Check the status of a registered authorization """
    data = request.json
    logging.info(f"📩 Received Authorization Status Check Request: {data}")

    # Ensure required field
    merchant_authorization_id = data.get("merchant_authorization_id")
    if not merchant_authorization_id:
        return jsonify({"error": "merchant_authorization_id is required"}), 400

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve authorization record from MongoDB
    authorization_record = authorizations_collection.find_one({"merchant_authorization_id": merchant_authorization_id})
    if not authorization_record:
        return jsonify({"error": "Authorization not found"}), 404

    merchant_ext_id = authorization_record.get("merchant_ext_id")
    
    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Status Check Payload
    status_payload = {"merchant_authorization_id": merchant_authorization_id}
    logging.info(f"📤 Authorization Status Check Payload: {status_payload}")

    headers = {"Content-Type": "application/json"}
    
    # Send Status Check Request
    response = requests.post(
        f"{DMS_BASE_URL}/authorization/status",
        json=status_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Authorization Status API Response: {response.status_code} - {response.text}")

    try:
        status_response = response.json()
    except requests.exceptions.JSONDecodeError:
        status_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the updated status in MongoDB
    authorizations_collection.update_one(
        {"merchant_authorization_id": merchant_authorization_id},
        {"$set": {"authorization_status": status_response}}
    )

    logging.info(f"📌 Updated Authorization Status in DB: {status_response}")

    return jsonify(status_response), response.status_code


@dms_bp.route("/capture", methods=["POST"])
@jwt_required()
def capture_transaction():
    """ Capture a previously authorized transaction """
    data = request.json
    logging.info(f"📩 Received Capture Request: {data}")
    
    # Ensure required fields are provided in the request
    required_fields = [
        "merchant_authorization_id", "acquirer_authorization_id", "slip", "slip_date_time"
    ]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Generate unique merchant_capture_id
    merchant_capture_id = f"capture_{uuid.uuid4().hex[:12]}"

    # Verify user authentication (make sure the user is verified)
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve the authorization record from MongoDB based on the provided IDs
    authorization_record = authorizations_collection.find_one({
        "merchant_authorization_id": data.get("merchant_authorization_id"),
        "authorization_status.authorization.acquirer_authorization_id": data["acquirer_authorization_id"]
    })
    if not authorization_record:
        return jsonify({"error": "Authorization not found"}), 404

    # Collect the necessary values from the authorization_record
    terminal = authorization_record.get("authorization_request", {}).get("terminal", "POS-Terminal-001")
    operator = authorization_record.get("authorization_request", {}).get("operator", "Cashier-1")
    requested_amount = authorization_record.get("authorization_request", {}).get("requested_amount")
    currency = authorization_record.get("authorization_request", {}).get("currency")

    # Ensure all required values were retrieved
    if not all([terminal, operator, requested_amount, currency]):
        return jsonify({"error": "Missing required information in authorization record"}), 400

    # Fetch Merchant Credentials
    merchant_ext_id = authorization_record.get("merchant_ext_id")
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Capture Payload
    capture_payload = {
        "terminal": terminal,
        "operator": operator,
        "merchant_capture_id": merchant_capture_id,
        "requested_amount": requested_amount,
        "currency": currency,
        "slip": data["slip"],
        "slip_date_time": data["slip_date_time"],
        "acquirer_authorization_id": data["acquirer_authorization_id"]
    }
    logging.info(f"📤 Capture Payload: {capture_payload}")

    # Set headers for the request
    headers = {"Content-Type": "application/json"}

    # Send Capture Request to Bluecode DMS API
    response = requests.post(
        f"{DMS_BASE_URL}/capture",
        json=capture_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Capture API Response: {response.status_code} - {response.text}")

    # Handle JSON response from Bluecode API
    try:
        capture_response = response.json()
    except requests.exceptions.JSONDecodeError:
        capture_response = {"error": "Invalid JSON response from Bluecode"}

    # If the response is OK, store the capture details in MongoDB
    if response.status_code == 200 and capture_response.get("result") == "OK":
        # Update authorization record with the capture details
        authorizations_collection.update_one(
            {"authorization.acquirer_authorization_id": data["acquirer_authorization_id"]},
            {"$set": {"capture_details": capture_response}}
        )
        logging.info(f"📌 Updated Capture Status in DB: {capture_response}")

    return jsonify(capture_response), response.status_code

@dms_bp.route("/capture/status", methods=["POST"])
@jwt_required()
def check_capture_status():
    """ Check the status of a captured transaction """
    data = request.json
    logging.info(f"📩 Received Capture Status Request: {data}")

    # Ensure required field is provided
    merchant_capture_id = data.get("merchant_capture_id")
    if not merchant_capture_id:
        return jsonify({"error": "merchant_capture_id is required"}), 400

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve capture record from MongoDB
    capture_record = authorizations_collection.find_one({"capture_details.capture.merchant_capture_id": merchant_capture_id})
    if not capture_record:
        return jsonify({"error": "Capture record not found"}), 404

    merchant_ext_id = capture_record.get("merchant_ext_id")

    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Capture Status Payload
    status_payload = {"merchant_capture_id": merchant_capture_id}
    logging.info(f"📤 Capture Status Payload: {status_payload}")

    headers = {"Content-Type": "application/json"}

    # Send Capture Status Request
    response = requests.post(
        f"{DMS_BASE_URL}/capture/status",
        json=status_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Capture Status API Response: {response.status_code} - {response.text}")

    try:
        status_response = response.json()
    except requests.exceptions.JSONDecodeError:
        status_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the capture status response in MongoDB
    authorizations_collection.update_one(
        {"capture_details.capture.merchant_capture_id": merchant_capture_id},
        {"$set": {"capture_status": status_response}}
    )

    logging.info(f"📌 Updated Capture Status in DB: {status_response}")

    return jsonify(status_response), response.status_code

@dms_bp.route("/release", methods=["POST"])
@jwt_required()
def release_authorization():
    """ Release an authorized transaction """
    data = request.json
    logging.info(f"📩 Received Release Authorization Request: {data}")

    # Ensure required field is provided
    merchant_authorization_id = data.get("merchant_authorization_id")
    if not merchant_authorization_id:
        return jsonify({"error": "merchant_authorization_id is required"}), 400

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve authorization record from MongoDB
    authorization_record = authorizations_collection.find_one(
        {"merchant_authorization_id": merchant_authorization_id}
    )
    if not authorization_record:
        return jsonify({"error": "Authorization record not found"}), 404

    merchant_ext_id = authorization_record.get("merchant_ext_id")

    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Release Payload
    release_payload = {"merchant_authorization_id": merchant_authorization_id}
    logging.info(f"📤 Release Payload: {release_payload}")

    headers = {"Content-Type": "application/json"}

    # Send Release Request
    response = requests.post(
        f"{DMS_BASE_URL}/release",
        json=release_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Release API Response: {response.status_code} - {response.text}")

    try:
        release_response = response.json()
    except requests.exceptions.JSONDecodeError:
        release_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the release response in MongoDB
    authorizations_collection.update_one(
        {"merchant_authorization_id": merchant_authorization_id},
        {"$set": {"release_status": release_response}}
    )

    logging.info(f"📌 Updated Release Status in DB: {release_response}")

    return jsonify(release_response), response.status_code

@dms_bp.route("/release/status", methods=["POST"])
@jwt_required()
def check_release_status():
    """ Check the status of a released authorization """
    data = request.json
    logging.info(f"📩 Received Release Status Request: {data}")

    # Ensure required field is provided
    merchant_authorization_id = data.get("merchant_authorization_id")
    if not merchant_authorization_id:
        return jsonify({"error": "merchant_authorization_id is required"}), 400

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve authorization record from MongoDB
    authorization_record = authorizations_collection.find_one(
        {"merchant_authorization_id": merchant_authorization_id}
    )
    if not authorization_record:
        return jsonify({"error": "Authorization record not found"}), 404

    merchant_ext_id = authorization_record.get("merchant_ext_id")

    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Release Status Check Payload
    status_payload = {"merchant_authorization_id": merchant_authorization_id}
    logging.info(f"📤 Release Status Check Payload: {status_payload}")

    headers = {"Content-Type": "application/json"}

    # Send Release Status Request
    response = requests.post(
        f"{DMS_BASE_URL}/release/status",
        json=status_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Release Status API Response: {response.status_code} - {response.text}")

    try:
        status_response = response.json()
    except requests.exceptions.JSONDecodeError:
        status_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the release status response in MongoDB
    authorizations_collection.update_one(
        {"merchant_authorization_id": merchant_authorization_id},
        {"$set": {"release_status_check": status_response}}
    )

    logging.info(f"📌 Updated Release Status in DB: {status_response}")

    return jsonify(status_response), response.status_code

@dms_bp.route("/refund", methods=["POST"])
@jwt_required()
def process_refund():
    """ Process a refund for a previously captured transaction """
    data = request.json
    logging.info(f"📩 Received Refund Request: {data}")

    # Ensure required fields are provided
    acquirer_authorization_id = data.get("acquirer_authorization_id")
    amount = data.get("amount")
    reason = data.get("reason", "")

    if not acquirer_authorization_id:
        return jsonify({"error": "acquirer_authorization_id is required"}), 400

    # Generate a unique merchant_refund_id using UUID
    merchant_refund_id = f"refund_{uuid.uuid4().hex[:12]}"
    logging.info(f"Generated merchant_refund_id: {merchant_refund_id}")

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve capture record from MongoDB
    capture_record = authorizations_collection.find_one(
        {"capture_details.capture.acquirer_authorization_id": acquirer_authorization_id}
    )
    if not capture_record:
        return jsonify({"error": "Capture record not found"}), 404

    merchant_ext_id = capture_record.get("merchant_ext_id")

    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Refund Request Payload
    refund_payload = {
        "merchant_refund_id": merchant_refund_id,
        "acquirer_authorization_id": acquirer_authorization_id,
        "amount": amount,
        "reason": reason
    }
    logging.info(f"📤 Refund Payload: {refund_payload}")

    headers = {"Content-Type": "application/json"}

    # Send Refund Request
    response = requests.post(
        f"{DMS_BASE_URL}/refund",
        json=refund_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Refund API Response: {response.status_code} - {response.text}")

    try:
        refund_response = response.json()
    except requests.exceptions.JSONDecodeError:
        refund_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the refund response in MongoDB
    authorizations_collection.update_one(
        {"capture_details.capture.acquirer_authorization_id": acquirer_authorization_id},
        {"$set": {"refund_details": refund_response}}
    )

    logging.info(f"📌 Stored Refund Response in DB: {refund_response}")

    return jsonify(refund_response), response.status_code

@dms_bp.route("/refund/status", methods=["POST"])
@jwt_required()
def check_refund_status():
    """ Check the status of a refund """
    data = request.json
    logging.info(f"📩 Received Refund Status Request: {data}")

    # Ensure required fields are provided
    merchant_refund_id = data.get("merchant_refund_id")
    if not merchant_refund_id:
        return jsonify({"error": "merchant_refund_id is required"}), 400

    # Verify user authentication
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": ObjectId(user_id), "verified": True})
    if not user:
        return jsonify({"error": "User not verified"}), 401

    # Retrieve refund record from MongoDB
    refund_record = authorizations_collection.find_one({"refund_details.refund.merchant_refund_id": merchant_refund_id})
    if not refund_record:
        return jsonify({"error": "Refund record not found"}), 404

    merchant_ext_id = refund_record.get("merchant_ext_id")

    # Fetch Merchant Credentials
    bluecode_access_id, bluecode_secret_key = get_merchant_credentials(merchant_ext_id)
    if not bluecode_access_id or not bluecode_secret_key:
        return jsonify({"error": "Merchant credentials not found"}), 401

    # Build Refund Status Check Payload
    status_payload = {"merchant_refund_id": merchant_refund_id}
    logging.info(f"📤 Refund Status Payload: {status_payload}")

    headers = {"Content-Type": "application/json"}

    # Send Refund Status Check Request
    response = requests.post(
        f"{DMS_BASE_URL}/refund/status",
        json=status_payload,
        headers=headers,
        auth=HTTPBasicAuth(bluecode_access_id, bluecode_secret_key)
    )

    logging.info(f"📡 Refund Status API Response: {response.status_code} - {response.text}")

    try:
        status_response = response.json()
    except requests.exceptions.JSONDecodeError:
        status_response = {"error": "Invalid JSON response from Bluecode"}

    # Store the refund status response in MongoDB
    authorizations_collection.update_one(
        {"refund_details.refund.merchant_refund_id": merchant_refund_id},
        {"$set": {"refund_status": status_response}}
    )

    logging.info(f"📌 Updated Refund Status in DB: {status_response}")

    return jsonify(status_response), response.status_code

@dms_bp.route("/bluecode-webhook", methods=["POST"])
def bluecode_webhook():
    """Handles Bluecode transaction updates."""
    data = request.json
    logging.info(f"🔔 Received Bluecode Webhook: {data}")

    if not data:
        return jsonify({"error": "Invalid data received"}), 400

    # Extract relevant transaction details
    merchant_tx_id = data.get("merchant_tx_id")
    status = data.get("payment", {}).get("state", "UNKNOWN")
    acquirer_tx_id = data.get("payment", {}).get("acquirer_tx_id")

    # Find the transaction in DB and update its status
    result = payments_collection.update_one(
        {"merchant_tx_id": merchant_tx_id},
        {"$set": {"status": status, "acquirer_tx_id": acquirer_tx_id, "webhook_data": data}}
    )

    if result.modified_count == 0:
        logging.warning(f"⚠️ No transaction found for merchant_tx_id: {merchant_tx_id}")

    return jsonify({"message": "Webhook received", "status": status}), 200

