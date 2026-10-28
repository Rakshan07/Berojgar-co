import pytest
from fastapi import HTTPException
from backend.app.core.security import valid_new_password, hash_password, verify_password
from backend.app.live.auth import Registration, register
from backend.app.live.password_reset import ResetPassword, reset

@pytest.mark.parametrize('password',['short','alllowercase1!','ALLUPPERCASE1!','NoNumbers!','NoSpecial123','Spaces Only 123','Ab1!'+('x'*125)])
def test_rejects_missing_requirements(password):
    assert not valid_new_password(password)

@pytest.mark.parametrize('password',['ValidPass1!','Aa1!abcd','Longer password 42!'])
def test_accepts_valid_password(password):
    assert valid_new_password(password)

@pytest.mark.parametrize('password',['alllowercase1!','ALLUPPERCASE1!','NoNumbers!','NoSpecial123','Spaces Only 123'])
def test_signup_and_reset_enforce_policy_before_database_access(password):
    with pytest.raises(HTTPException) as error:
        register(Registration(email='test@example.com',full_name='Test user',password=password),db=None)
    assert error.value.status_code==422
    with pytest.raises(HTTPException) as error:
        reset(ResetPassword(token='x'*64,password=password),db=None)
    assert error.value.status_code==422

def test_existing_password_verification_is_unchanged():
    assert verify_password('oldpassword',hash_password('oldpassword'))
