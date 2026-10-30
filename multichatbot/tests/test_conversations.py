import pytest
from backend import create_app
from backend.extensions import db
from backend.models import Conversation, Message, UserMemory
from backend.conversation_service import ConversationService


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


def test_create_and_get_conversation(app):
    with app.app_context():
        conv = ConversationService.create_conversation(title="Test Chat", mode="coding")
        assert conv.id is not None
        assert conv.title == "Test Chat"
        assert conv.mode == "coding"
        assert conv.is_saved is False

        fetched = ConversationService.get_conversation(conv.id)
        assert fetched is not None
        assert fetched.id == conv.id


def test_add_messages_and_history(app):
    with app.app_context():
        conv = ConversationService.create_conversation(title="Dev Chat", mode="friend")
        user_msg = ConversationService.add_message(
            conversation_id=conv.id,
            sender="user",
            content="Hello MultiChatbot!",
            mode="friend",
        )
        ai_msg = ConversationService.add_message(
            conversation_id=conv.id,
            sender="ai",
            content="Hey there! How can I help you today?",
            mode="friend",
        )

        messages = ConversationService.get_messages(conv.id)
        assert len(messages) == 2
        assert messages[0].sender == "user"
        assert messages[1].sender == "ai"
        assert messages[0].content == "Hello MultiChatbot!"


def test_rename_and_star_conversation(app):
    with app.app_context():
        conv = ConversationService.create_conversation(title="Initial", mode="friend")
        renamed = ConversationService.rename_conversation(conv.id, "Updated Title")
        assert renamed.title == "Updated Title"

        starred = ConversationService.toggle_saved(conv.id)
        assert starred.is_saved is True

        unstarred = ConversationService.toggle_saved(conv.id)
        assert unstarred.is_saved is False


def test_conversation_search(app):
    with app.app_context():
        conv1 = ConversationService.create_conversation(title="Quantum Physics", mode="study")
        conv2 = ConversationService.create_conversation(title="Web Development", mode="coding")

        ConversationService.add_message(conv2.id, "user", "How do I build a Flask app?")

        # Search by title
        results1 = ConversationService.list_conversations(search="Quantum")
        assert len(results1) == 1
        assert results1[0].id == conv1.id

        # Search by message content
        results2 = ConversationService.list_conversations(search="Flask")
        assert len(results2) == 1
        assert results2[0].id == conv2.id


def test_export_conversation(app):
    with app.app_context():
        conv = ConversationService.create_conversation(title="Export Test", mode="coding")
        ConversationService.add_message(conv.id, "user", "Explain recursion.")
        ConversationService.add_message(conv.id, "ai", "Recursion is when a function calls itself.")

        md = ConversationService.export_conversation(conv.id, format_type="markdown")
        assert "# Export Test" in md
        assert "Explain recursion." in md
        assert "Recursion is when a function calls itself." in md

        json_export = ConversationService.export_conversation(conv.id, format_type="json")
        assert '"title": "Export Test"' in json_export


def test_delete_and_clear_conversation(app):
    with app.app_context():
        conv = ConversationService.create_conversation(title="To Delete", mode="friend")
        ConversationService.add_message(conv.id, "user", "Message to delete")

        # Test clear messages
        assert ConversationService.clear_messages(conv.id) is True
        assert len(ConversationService.get_messages(conv.id)) == 0

        # Test delete conversation
        assert ConversationService.delete_conversation(conv.id) is True
        assert ConversationService.get_conversation(conv.id) is None


def test_user_memory_service(app):
    with app.app_context():
        ConversationService.set_memory("user_name", "Alex")
        ConversationService.set_memory("favorite_language", "Python")

        memories = ConversationService.get_all_memory()
        assert memories["user_name"] == "Alex"
        assert memories["favorite_language"] == "Python"

        ConversationService.delete_memory("user_name")
        updated = ConversationService.get_all_memory()
        assert "user_name" not in updated
        assert "favorite_language" in updated
