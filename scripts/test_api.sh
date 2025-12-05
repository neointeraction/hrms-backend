#!/bin/bash

BASE_URL="http://localhost:5001/api"

echo "1. Registering User..."
curl -v -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "employeeId": "EMP001", "department": "IT"}'
echo -e "\n"

echo "2. Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')
echo "Token: $TOKEN"
echo -e "\n"

echo "3. Get Me..."
curl -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "4. Access Own Profile (Allowed)..."
curl -X GET $BASE_URL/hr/profile/self \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "5. Access All Employees (Should be Forbidden for default employee)..."
curl -X GET $BASE_URL/hr/employees \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"
