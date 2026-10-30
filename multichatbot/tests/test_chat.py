import io
import json
import pytest
from backend import create_app
from backend.extensions import db


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_index_page(client):
    """Test that the index template renders with HTML 200."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"MultiChatbot" in response.data
    assert b"Meet Your New AI Friend." in response.data
    assert b"Start a Conversation" in response.data


def test_api_status(client):
    """Test status endpoint."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "online"
    assert "ai" in data
    assert data["ai"]["builtin_available"] is True


def test_standard_chat_endpoint(client):
    """Test non-streaming fallback chat response."""
    payload = {
        "message": "Hey bro, what's up?",
        "mode": "friend",
    }
    response = client.post(
        "/api/chat",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "conversation_id" in data
    assert "user_message" in data
    assert "ai_message" in data
    assert "content" in data["ai_message"]
    assert "Hey! 😎" in data["ai_message"]["content"]


def test_streaming_chat_endpoint(client):
    """Test Server-Sent Events (SSE) streaming endpoint."""
    payload = {
        "message": "Can you help me build a website?",
        "mode": "friend",
    }
    response = client.post(
        "/api/chat/stream",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.content_type

    # Verify event stream contents
    raw_data = response.get_data(as_text=True)
    assert "data: " in raw_data
    assert '"type": "start"' in raw_data
    assert '"type": "chunk"' in raw_data
    assert '"type": "done"' in raw_data


def test_chat_modes(client):
    """Test that different modes produce tailored answers."""
    modes = ["coding", "study", "career", "creative", "research", "life"]
    for m in modes:
        payload = {"message": f"Explain topic for {m}", "mode": m}
        res = client.post(
            "/api/chat",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert res.status_code == 200
        ai_content = res.get_json()["ai_message"]["content"]
        assert len(ai_content) > 30


def test_empty_message_validation(client):
    """Test validation returns 400 when empty message is sent."""
    payload = {"message": "   "}
    res = client.post(
        "/api/chat",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert res.status_code == 400


def test_file_upload(client):
    """Test document and code upload parsing."""
    test_file_content = b"print('Hello MultiChatbot World!')"
    data = {
        "file": (io.BytesIO(test_file_content), "test_script.py"),
    }
    response = client.post(
        "/api/upload",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    res_json = response.get_json()
    assert res_json["type"] == "text"
    assert res_json["filename"] == "test_script.py"
    assert "Hello MultiChatbot World!" in res_json["text"]
