import uuid
from starlette.testclient import TestClient

def test_login_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "asel@teamweave.demo", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "roles" in data

def test_login_invalid_credentials(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "asel@teamweave.demo", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_register_and_get_me(client: TestClient):
    unique_id = uuid.uuid4().hex[:8]
    email = f"test_{unique_id}@example.com"
    username = f"user_{unique_id}"
    
    # Register
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": username,
            "password": "StrongPassword123!",
            "full_name": "Test Runner",
            "role": "participant"
        }
    )
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == email
    assert user_data["username"] == username
    assert "password_hash" not in user_data  # Security check: never leak hash

    # Login
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": email, "password": "StrongPassword123!"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Access /auth/me
    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email

def test_unauthorized_access(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
