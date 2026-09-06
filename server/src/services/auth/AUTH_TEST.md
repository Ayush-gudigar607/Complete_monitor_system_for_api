# AUTH SERVICE – TEST CASES

## Base URL

```text
http://localhost:5000
```

> If running through Docker with the configured host port, use the host port exposed by Docker.

## Authentication Flow

```text
1. Onboard first Super Admin
        ↓
2. Login
        ↓
3. Receive JWT token
        ↓
4. Access Profile
        ↓
5. Logout
        ↓
6. Verify protected endpoints reject the old/invalid authentication
```

---

# 1. GET Auth Service

### Endpoint

```http
GET /api/auth
```

### Purpose

Verify that the Auth service/router is available.

### Headers

```http
Content-Type: application/json
```

### Expected

```text
HTTP 200 OK
```

---

# 2. Onboard Super Admin

## Test 2.1 – Create First Super Admin

### Endpoint

```http
POST /api/auth/onboard-super-admin
```

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "name": "System Admin",
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 201 Created
```

### Verify

- Super Admin is created.
- Password is not returned as plain text.
- User has `SUPER_ADMIN` role.
- Response contains the created-user information.

---

## Test 2.2 – Try to Onboard Another Super Admin

### Endpoint

```http
POST /api/auth/onboard-super-admin
```

### Body

```json
{
  "name": "Second Admin",
  "email": "admin2@example.com",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 409 Conflict
```

### Verify

Only the initial Super Admin can be bootstrapped.

---

## Test 2.3 – Invalid Email

### Body

```json
{
  "name": "System Admin",
  "email": "invalid-email",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

## Test 2.4 – Missing Password

### Body

```json
{
  "name": "System Admin",
  "email": "admin3@example.com"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

## Test 2.5 – Duplicate Email

### Body

```json
{
  "name": "System Admin",
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 409 Conflict
```

---

# 3. Register

## Test 3.1 – Valid Registration

### Endpoint

```http
POST /api/auth/register
```

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "User@12345"
}
```

### Expected

```text
HTTP 201 Created
```

### Verify

- User is created.
- Password is not returned in plain text.
- User receives the appropriate non-Super-Admin role according to the application's registration logic.

---

## Test 3.2 – Duplicate Registration

### Body

```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "User@12345"
}
```

### Expected

```text
HTTP 409 Conflict
```

---

## Test 3.3 – Missing Name

### Body

```json
{
  "email": "user2@example.com",
  "password": "User@12345"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

## Test 3.4 – Invalid Email

### Body

```json
{
  "name": "Test User",
  "email": "wrong-email",
  "password": "User@12345"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

## Test 3.5 – Weak Password

### Body

```json
{
  "name": "Test User",
  "email": "user3@example.com",
  "password": "123"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

# 4. Login

## Test 4.1 – Valid Login

### Endpoint

```http
POST /api/auth/login
```

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 200 OK
```

### Verify

Response should contain authentication information such as:

```json
{
  "token": "<JWT_TOKEN>"
}
```

Save the JWT token in Postman.

### Postman Variable

```text
authToken = <JWT_TOKEN>
```

---

## Test 4.2 – Wrong Password

### Body

```json
{
  "email": "admin@example.com",
  "password": "WrongPassword@123"
}
```

### Expected

```text
HTTP 401 Unauthorized
```

---

## Test 4.3 – Non-existing User

### Body

```json
{
  "email": "doesnotexist@example.com",
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 401 Unauthorized
```

---

## Test 4.4 – Missing Email

### Body

```json
{
  "password": "Admin@12345"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

## Test 4.5 – Missing Password

### Body

```json
{
  "email": "admin@example.com"
}
```

### Expected

```text
HTTP 400 Bad Request
```

---

# 5. Profile

## Test 5.1 – Get Profile With Valid JWT

### Endpoint

```http
GET /api/auth/profile
```

### Headers

```http
Authorization: Bearer {{authToken}}
```

### Expected

```text
HTTP 200 OK
```

### Verify

- Authenticated user information is returned.
- Password should not be exposed.
- User role should be available if included by the service.

---

## Test 5.2 – Profile Without Token

### Endpoint

```http
GET /api/auth/profile
```

### Headers

```http
Content-Type: application/json
```

### Expected

```text
HTTP 401 Unauthorized
```

---

## Test 5.3 – Profile With Invalid Token

### Headers

```http
Authorization: Bearer invalid-token
```

### Expected

```text
HTTP 401 Unauthorized
```

---

## Test 5.4 – Profile With Malformed Authorization Header

### Headers

```http
Authorization: invalid-token
```

### Expected

```text
HTTP 401 Unauthorized
```

---

# 6. Logout

## Test 6.1 – Logout With Valid Authentication

### Endpoint

```http
POST /api/auth/logout
```

### Headers

```http
Authorization: Bearer {{authToken}}
```

### Expected

```text
HTTP 200 OK
```

### Verify

- Logout operation succeeds.
- Authentication/session state is cleared according to the application's implementation.

---

## Test 6.2 – Logout Without Token

### Endpoint

```http
POST /api/auth/logout
```

### Expected

```text
HTTP 401 Unauthorized
```

---

## Test 6.3 – Logout With Invalid Token

### Headers

```http
Authorization: Bearer invalid-token
```

### Expected

```text
HTTP 401 Unauthorized
```

---

# 7. Authentication Security Tests

## Test 7.1 – Password Must Not Be Returned

Check the response from:

```text
Register
Onboard Super Admin
Login
Profile
```

### Expected

The response must not expose:

```json
{
  "password": "..."
}
```

---

## Test 7.2 – JWT Required For Protected Routes

Try:

```http
GET /api/auth/profile
```

without:

```http
Authorization: Bearer <token>
```

### Expected

```text
401 Unauthorized
```

---

## Test 7.3 – Invalid JWT

Use:

```http
Authorization: Bearer abc.def.xyz
```

### Expected

```text
401 Unauthorized
```

---

## Test 7.4 – Expired JWT

Use an expired JWT.

### Expected

```text
401 Unauthorized
```

---

# 8. Role / Authorization Tests

The Auth service should not allow an unauthenticated user to perform protected administrative operations.

## Test 8.1 – Unauthenticated Admin Operation

Call a protected admin endpoint without JWT.

### Expected

```text
401 Unauthorized
```

---

## Test 8.2 – Non-admin User Access

Login as a non-admin user and use the JWT against an endpoint requiring administrative privileges.

### Expected

```text
403 Forbidden
```

---

# 9. End-to-End Auth Test

Run the following sequence:

```text
┌──────────────────────────────┐
│ GET /api/auth                │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ POST /onboard-super-admin    │
└──────────────┬───────────────┘
               ↓
        Super Admin Created
               ↓
┌──────────────────────────────┐
│ POST /login                  │
└──────────────┬───────────────┘
               ↓
            JWT Token
               ↓
┌──────────────────────────────┐
│ GET /profile                 │
│ Authorization: Bearer JWT    │
└──────────────┬───────────────┘
               ↓
        Profile Returned
               ↓
┌──────────────────────────────┐
│ POST /logout                 │
└──────────────────────────────┘
```

---

# 10. Test Result Checklist

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Auth health/info | 200 | ⬜ |
| 2 | First Super Admin onboarding | 201 | ⬜ |
| 3 | Second Super Admin onboarding | 409 | ⬜ |
| 4 | Valid registration | 201 | ⬜ |
| 5 | Duplicate registration | 409 | ⬜ |
| 6 | Valid login | 200 | ⬜ |
| 7 | Wrong password | 401 | ⬜ |
| 8 | Unknown user | 401 | ⬜ |
| 9 | Profile with JWT | 200 | ⬜ |
| 10 | Profile without JWT | 401 | ⬜ |
| 11 | Profile with invalid JWT | 401 | ⬜ |
| 12 | Logout with JWT | 200 | ⬜ |
| 13 | Logout without JWT | 401 | ⬜ |
| 14 | Password not exposed | Pass | ⬜ |
| 15 | Non-admin protected access | 403 | ⬜ |

---

# 11. Recommended Auth Logic

```text
Initial installation
        │
        ▼
onboard-super-admin
        │
        ▼
First SUPER_ADMIN
        │
        ▼
Login
        │
        ▼
JWT
        │
        ├──────────────► Profile
        │
        ├──────────────► Protected Admin Operations
        │
        └──────────────► Logout
```

### Important Rule

`onboard-super-admin` should be a bootstrap operation.

After the first Super Admin exists:

```text
POST /api/auth/onboard-super-admin
                ↓
        Super Admin exists?
                ↓
              YES
                ↓
        409 Conflict
```

`logout` does **not** determine whether another Super Admin can be onboarded. Logout only ends the current authentication/session flow.

If `/register` currently accepts `SUPER_ADMIN` as a user-supplied role, test that separately because it would allow Super Admin creation outside the bootstrap flow. Ideally, public registration should not allow a client to choose `SUPER_ADMIN`.

---

# 12. Test Environment

From the current project configuration:

```text
NODE_ENV=production
API_PORT=5000
JWT_EXPIRATION=24h
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

The Docker configuration exposes the application through the configured host port while the application listens on the container's port.

---

# Final Auth Test Flow

```text
AUTH SERVICE
     │
     ├── GET /api/auth
     │
     ├── POST /api/auth/onboard-super-admin
     │       └── First Super Admin only
     │
     ├── POST /api/auth/register
     │       └── Normal user registration
     │
     ├── POST /api/auth/login
     │       └── JWT generated
     │
     ├── GET /api/auth/profile
     │       └── JWT required
     │
     └── POST /api/auth/logout
             └── JWT required
```
