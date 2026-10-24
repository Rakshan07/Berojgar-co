from starlette.testclient import TestClient

def test_analyze_and_apply_profile_evidence(client: TestClient):
    user_id = "a0000000-0000-0000-0000-000000000001"
    headers = {"X-User-Id": user_id}

    # 1. Analyze profile evidence
    resume_sample = """
    Jordan Rivera - Senior Full Stack Engineer
    Built high-throughput backend microservices using Python and FastAPI serving 10M daily requests.
    Designed responsive frontend dashboards with React and TypeScript using Tailwind CSS.
    Led sprint planning, architecture reviews, and cross-functional teams in agile environment.
    Configured PostgreSQL database schemas, indexing, and connection pooling.
    """

    res = client.post(
        "/api/v1/profiles/analyze-evidence",
        json={
            "content": resume_sample,
            "source_type": "resume",
            "candidate_name": "Jordan Rivera"
        },
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "extracted_skills" in data
    assert len(data["extracted_skills"]) >= 2
    assert any("Python" in s["skill_name"] or "React" in s["skill_name"] for s in data["extracted_skills"])

    # 2. Apply extracted evidence to profile
    apply_res = client.post(
        "/api/v1/profiles/apply-evidence",
        json={
            "extracted_skills": data["extracted_skills"],
            "bio": data["summary"],
            "preferred_roles": data["preferred_roles"],
            "interests": data["interests"]
        },
        headers=headers
    )
    assert apply_res.status_code == 200
    profile_data = apply_res.json()
    assert len(profile_data["skills"]) >= 1
    assert profile_data["bio"] is not None

def test_upload_file_evidence(client: TestClient):
    user_id = "a0000000-0000-0000-0000-000000000001"
    headers = {"X-User-Id": user_id}

    # Upload text / markdown resume file
    file_content = b"Jordan Rivera - Senior Full Stack Engineer. Python, FastAPI, React, PostgreSQL."
    res = client.post(
        "/api/v1/profiles/upload-evidence",
        files={"file": ("resume.txt", file_content, "text/plain")},
        data={"source_type": "resume"},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["extracted_skills"]) >= 1
    assert any("Python" in s["skill_name"] or "React" in s["skill_name"] for s in data["extracted_skills"])

    # Upload image resume file (simulated PNG bytes)
    img_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    img_res = client.post(
        "/api/v1/profiles/upload-evidence",
        files={"file": ("resume_screenshot.png", img_bytes, "image/png")},
        data={"source_type": "resume"},
        headers=headers
    )
    assert img_res.status_code == 200
    img_data = img_res.json()
    assert "extracted_skills" in img_data
    assert len(img_data["extracted_skills"]) >= 1

