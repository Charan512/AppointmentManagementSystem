#!/bin/bash

# Queue Management System - Comprehensive API Test Script

BASE_URL="http://localhost:5001"
echo "🧪 Testing Queue Management System API"
echo "========================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/api/health" | jq .
echo ""

# Test 2: Root Endpoint
echo "2️⃣  Testing Root Endpoint..."
curl -s "$BASE_URL/" | jq .
echo ""

# Test 3: Register User
echo "3️⃣  Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "Test@123",
    "role": "user"
  }')
echo "$REGISTER_RESPONSE" | jq .
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')
echo ""

# Test 4: Login User
echo "4️⃣  Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123"
  }')
echo "$LOGIN_RESPONSE" | jq .
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
fi
echo ""

# Test 5: Create Organization (if token exists)
if [ -n "$TOKEN" ]; then
  echo "5️⃣  Testing Create Organization..."
  ORG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/organizations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "name": "Test Clinic",
      "type": "healthcare",
      "address": "123 Main St",
      "phone": "1234567890",
      "email": "clinic@example.com"
    }')
  echo "$ORG_RESPONSE" | jq .
  ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '.organization._id // empty')
  echo ""

  # Test 6: Get Organizations
  echo "6️⃣  Testing Get Organizations..."
  curl -s -X GET "$BASE_URL/api/organizations" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""

  # Test 7: Create Appointment (if org exists)
  if [ -n "$ORG_ID" ]; then
    echo "7️⃣  Testing Create Appointment..."
    curl -s -X POST "$BASE_URL/api/appointments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"organizationId\": \"$ORG_ID\",
        \"serviceType\": \"consultation\",
        \"preferredDate\": \"2025-12-30\",
        \"preferredTime\": \"10:00\",
        \"notes\": \"Test appointment\"
      }" | jq .
    echo ""

    # Test 8: Get Appointments
    echo "8️⃣  Testing Get Appointments..."
    curl -s -X GET "$BASE_URL/api/appointments" \
      -H "Authorization: Bearer $TOKEN" | jq .
    echo ""
  fi
else
  echo "⚠️  Skipping authenticated tests (no token)"
fi

echo "✅ Test suite completed!"
