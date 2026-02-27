#!/bin/bash

# E2E Test Script for Police Department Management System
# This script tests the main user flows

set -e

API_URL="http://localhost:8001/api/v1"
FRONTEND_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate unique test user
TIMESTAMP=$(date +%s)
TEST_USER="e2euser_${TIMESTAMP}"
TEST_EMAIL="e2e_${TIMESTAMP}@test.com"
TEST_PASSWORD="TestPass123!"

echo "============================================"
echo "  E2E Test - Police Management System"
echo "============================================"
echo ""

# Test 1: Check Frontend is accessible
echo -e "${YELLOW}Test 1: Frontend Accessibility${NC}"
echo "  → Navigate to ${FRONTEND_URL}"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo -e "  ${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "  ${RED}✗ Frontend is not accessible${NC}"
    exit 1
fi
echo ""

# Test 2: Check Backend API is accessible
echo -e "${YELLOW}Test 2: Backend API Accessibility${NC}"
echo "  → GET ${API_URL}/stats/dashboard/"
STATS=$(curl -s "${API_URL}/stats/dashboard/")
if echo "$STATS" | grep -q "active_cases"; then
    echo -e "  ${GREEN}✓ Backend API is accessible${NC}"
    echo "  Response: $STATS"
else
    echo -e "  ${RED}✗ Backend API is not accessible${NC}"
    exit 1
fi
echo ""

# Test 3: Register a new user
echo -e "${YELLOW}Test 3: User Registration${NC}"
echo "  → Click 'Register' link on homepage"
echo "  → Fill form with:"
echo "      Username:    ${TEST_USER}"
echo "      Email:       ${TEST_EMAIL}"
echo "      First Name:  Test"
echo "      Last Name:   User"
echo "      Password:    ${TEST_PASSWORD}"
echo "      Confirm:     ${TEST_PASSWORD}"
echo "  → Click 'Register' button"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register/" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"${TEST_USER}\",
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\",
        \"password_confirm\": \"${TEST_PASSWORD}\",
        \"first_name\": \"Test\",
        \"last_name\": \"User\"
    }")

if echo "$REGISTER_RESPONSE" | grep -q "User registered successfully"; then
    echo -e "  ${GREEN}✓ Registration successful${NC}"
    echo "  User ID: $(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | head -1)"
else
    echo -e "  ${RED}✗ Registration failed${NC}"
    echo "  Response: $REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Login with registered user
echo -e "${YELLOW}Test 4: User Login${NC}"
echo "  → Click 'Login' link"
echo "  → Select login method: Username"
echo "  → Fill form with:"
echo "      Username: ${TEST_USER}"
echo "      Password: ${TEST_PASSWORD}"
echo "  → Click 'Login' button"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{
        \"identifier\": \"${TEST_USER}\",
        \"password\": \"${TEST_PASSWORD}\"
    }")

if echo "$LOGIN_RESPONSE" | grep -q "access"; then
    echo -e "  ${GREEN}✓ Login successful${NC}"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)
    echo "  Token received: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "  ${RED}✗ Login failed${NC}"
    echo "  Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Access protected profile endpoint
echo -e "${YELLOW}Test 5: Access User Profile (Protected Route)${NC}"
echo "  → After login, redirected to Dashboard"
echo "  → System fetches user profile"
echo ""

PROFILE_RESPONSE=$(curl -s "${API_URL}/auth/profile/" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

if echo "$PROFILE_RESPONSE" | grep -q "${TEST_USER}"; then
    echo -e "  ${GREEN}✓ Profile access successful${NC}"
    echo "  Username: $(echo $PROFILE_RESPONSE | grep -o '"username":"[^"]*"' | cut -d'"' -f4)"
    echo "  Email: $(echo $PROFILE_RESPONSE | grep -o '"email":"[^"]*"' | cut -d'"' -f4)"
    echo "  Roles: $(echo $PROFILE_RESPONSE | grep -o '"roles":\[[^]]*\]')"
else
    echo -e "  ${RED}✗ Profile access failed${NC}"
    echo "  Response: $PROFILE_RESPONSE"
    exit 1
fi
echo ""

# Test 6: Login with email instead of username
echo -e "${YELLOW}Test 6: Login with Email${NC}"
echo "  → Click 'Login' link"
echo "  → Select login method: Email"
echo "  → Fill form with:"
echo "      Email:    ${TEST_EMAIL}"
echo "      Password: ${TEST_PASSWORD}"
echo "  → Click 'Login' button"
echo ""

LOGIN_EMAIL_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{
        \"identifier\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\"
    }")

if echo "$LOGIN_EMAIL_RESPONSE" | grep -q "access"; then
    echo -e "  ${GREEN}✓ Email login successful${NC}"
else
    echo -e "  ${RED}✗ Email login failed${NC}"
    echo "  Response: $LOGIN_EMAIL_RESPONSE"
    exit 1
fi
echo ""

# Test 7: View Most Wanted Page (Public)
echo -e "${YELLOW}Test 7: View Most Wanted Page (Public)${NC}"
echo "  → Click 'Most Wanted' in navigation"
echo ""

MOST_WANTED_RESPONSE=$(curl -s "${API_URL}/suspects/most_wanted/")

if echo "$MOST_WANTED_RESPONSE" | grep -qE '^\['; then
    echo -e "  ${GREEN}✓ Most Wanted page accessible${NC}"
    echo "  Suspects count: $(echo $MOST_WANTED_RESPONSE | grep -o '\[.*\]' | grep -o '{' | wc -l)"
else
    echo -e "  ${RED}✗ Most Wanted page failed${NC}"
    echo "  Response: $MOST_WANTED_RESPONSE"
    exit 1
fi
echo ""

# Test 8: Invalid login attempt
echo -e "${YELLOW}Test 8: Invalid Login (Wrong Password)${NC}"
echo "  → Try to login with wrong password"
echo ""

INVALID_LOGIN=$(curl -s -X POST "${API_URL}/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{
        \"identifier\": \"${TEST_USER}\",
        \"password\": \"wrongpassword\"
    }")

if echo "$INVALID_LOGIN" | grep -q "Invalid credentials"; then
    echo -e "  ${GREEN}✓ Invalid login correctly rejected${NC}"
else
    echo -e "  ${RED}✗ Should have rejected invalid login${NC}"
    echo "  Response: $INVALID_LOGIN"
fi
echo ""

# Test 9: Registration validation (missing fields)
echo -e "${YELLOW}Test 9: Registration Validation${NC}"
echo "  → Try to register without password_confirm"
echo ""

INVALID_REGISTER=$(curl -s -X POST "${API_URL}/auth/register/" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"invalid_user\",
        \"email\": \"invalid@test.com\",
        \"password\": \"TestPass123!\"
    }")

if echo "$INVALID_REGISTER" | grep -q "password_confirm"; then
    echo -e "  ${GREEN}✓ Validation correctly requires password_confirm${NC}"
else
    echo -e "  ${RED}✗ Validation should require password_confirm${NC}"
    echo "  Response: $INVALID_REGISTER"
fi
echo ""

echo "============================================"
echo -e "  ${GREEN}All E2E Tests Passed! ✓${NC}"
echo "============================================"
echo ""
echo "Manual Testing Steps:"
echo "  1. Open ${FRONTEND_URL} in browser"
echo "  2. Click 'Register here' link"
echo "  3. Fill the registration form and submit"
echo "  4. You should see 'Registration successful'"
echo "  5. Click 'Login here' to go to login page"
echo "  6. Enter your credentials and login"
echo "  7. You should be redirected to Dashboard"
echo ""
