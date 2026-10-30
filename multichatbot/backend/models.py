import uuid
from datetime import datetime, timezone
from backend.extensions import db


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Conversation(db.Model):
    """Represents a chat thread between the user and MultiChatbot."""

    __tablename__ = "conversations"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=False, default="New Conversation")
    mode = db.Column(db.String(50), nullable=False, default="friend")
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    is_saved = db.Column(db.Boolean, default=False, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False, nullable=False)

    messages = db.relationship(
        "Message",
        backref="conversation",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="Message.timestamp.asc()",
    )

    def to_dict(self, include_messages: bool = False):
        data = {
            "id": self.id,
            "title": self.title,
            "mode": self.mode,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_saved": self.is_saved,
            "is_pinned": self.is_pinned,
            "message_count": self.messages.count(),
        }
        if include_messages:
            data["messages"] = [msg.to_dict() for msg in self.messages]
        return data


class Message(db.Model):
    """Represents an individual message in a conversation."""

    __tablename__ = "messages"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    conversation_id = db.Column(
        db.String(36),
        db.ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender = db.Column(db.String(10), nullable=False)  # 'user' or 'ai'
    content = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(50), nullable=True, default="friend")
    timestamp = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    tokens_estimated = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender": self.sender,
            "content": self.content,
            "mode": self.mode,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "tokens_estimated": self.tokens_estimated,
        }


class UserMemory(db.Model):
    """Stores persistent user preferences or memory notes."""

    __tablename__ = "user_memory"

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
