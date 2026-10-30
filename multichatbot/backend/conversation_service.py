"""Conversation and message management service."""

from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from backend.extensions import db
from backend.models import Conversation, Message, UserMemory


class ConversationService:
    @staticmethod
    def create_conversation(
        title: str = "New Conversation", mode: str = "friend"
    ) -> Conversation:
        conversation = Conversation(
            title=title.strip() or "New Conversation",
            mode=mode or "friend",
        )
        db.session.add(conversation)
        db.session.commit()
        return conversation

    @staticmethod
    def list_conversations(
        search: Optional[str] = None,
        saved_only: bool = False,
        mode: Optional[str] = None,
        limit: int = 50,
    ) -> List[Conversation]:
        query = Conversation.query

        if saved_only:
            query = query.filter(Conversation.is_saved.is_(True))

        if mode:
            query = query.filter(Conversation.mode == mode)

        if search:
            search_term = f"%{search.strip()}%"
            # Match either conversation title or message content
            matching_ids = (
                db.session.query(Message.conversation_id)
                .filter(Message.content.ilike(search_term))
                .distinct()
            )
            query = query.filter(
                (Conversation.title.ilike(search_term))
                | (Conversation.id.in_(matching_ids))
            )

        # Sort pinned first, then by most recently updated
        query = query.order_by(
            Conversation.is_pinned.desc(), Conversation.updated_at.desc()
        )
        return query.limit(limit).all()

    @staticmethod
    def get_conversation(conversation_id: str) -> Optional[Conversation]:
        return Conversation.query.filter_by(id=conversation_id).first()

    @staticmethod
    def add_message(
        conversation_id: str,
        sender: str,
        content: str,
        mode: Optional[str] = None,
        tokens_estimated: int = 0,
    ) -> Message:
        conversation = ConversationService.get_conversation(conversation_id)
        if not conversation:
            # Auto-create if conversation doesn't exist
            conversation = Conversation(id=conversation_id, mode=mode or "friend")
            db.session.add(conversation)

        # If it's the first user message and title is default, generate a friendly title
        if sender == "user" and conversation.title in ("New Conversation", "Untitled"):
            # Clean first 40 chars
            clean_title = content.strip().split("\n")[0][:45]
            if clean_title:
                conversation.title = clean_title

        if mode:
            conversation.mode = mode

        conversation.updated_at = datetime.now(timezone.utc)

        msg = Message(
            conversation_id=conversation.id,
            sender=sender,
            content=content,
            mode=mode or conversation.mode,
            tokens_estimated=tokens_estimated,
        )
        db.session.add(msg)
        db.session.commit()
        return msg

    @staticmethod
    def get_messages(
        conversation_id: str, limit: int = 100
    ) -> List[Message]:
        return (
            Message.query.filter_by(conversation_id=conversation_id)
            .order_by(Message.timestamp.asc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def rename_conversation(conversation_id: str, new_title: str) -> Optional[Conversation]:
        conv = ConversationService.get_conversation(conversation_id)
        if conv:
            conv.title = new_title.strip() or "Untitled"
            conv.updated_at = datetime.now(timezone.utc)
            db.session.commit()
        return conv

    @staticmethod
    def toggle_saved(conversation_id: str) -> Optional[Conversation]:
        conv = ConversationService.get_conversation(conversation_id)
        if conv:
            conv.is_saved = not conv.is_saved
            db.session.commit()
        return conv

    @staticmethod
    def toggle_pinned(conversation_id: str) -> Optional[Conversation]:
        conv = ConversationService.get_conversation(conversation_id)
        if conv:
            conv.is_pinned = not conv.is_pinned
            db.session.commit()
        return conv

    @staticmethod
    def delete_conversation(conversation_id: str) -> bool:
        conv = ConversationService.get_conversation(conversation_id)
        if conv:
            db.session.delete(conv)
            db.session.commit()
            return True
        return False

    @staticmethod
    def clear_messages(conversation_id: str) -> bool:
        conv = ConversationService.get_conversation(conversation_id)
        if conv:
            Message.query.filter_by(conversation_id=conversation_id).delete()
            conv.updated_at = datetime.now(timezone.utc)
            db.session.commit()
            return True
        return False

    @staticmethod
    def export_conversation(conversation_id: str, format_type: str = "markdown") -> str:
        conv = ConversationService.get_conversation(conversation_id)
        if not conv:
            return ""

        messages = conv.messages.all()

        if format_type.lower() == "json":
            import json
            return json.dumps(conv.to_dict(include_messages=True), indent=2)

        # Markdown export
        lines = [
            f"# {conv.title}",
            f"**Mode:** {conv.mode.capitalize()}  ",
            f"**Date:** {conv.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if conv.created_at else 'N/A'}  ",
            "---\n",
        ]
        for m in messages:
            speaker = "You" if m.sender == "user" else "MultiChatbot"
            lines.append(f"### {speaker}")
            lines.append(m.content)
            lines.append("")
        return "\n".join(lines)

    # Memory helpers
    @staticmethod
    def get_all_memory() -> Dict[str, str]:
        memories = UserMemory.query.all()
        return {m.key: m.value for m in memories}

    @staticmethod
    def set_memory(key: str, value: str) -> UserMemory:
        mem = UserMemory.query.filter_by(key=key).first()
        if mem:
            mem.value = value
            mem.updated_at = datetime.now(timezone.utc)
        else:
            mem = UserMemory(key=key, value=value)
            db.session.add(mem)
        db.session.commit()
        return mem

    @staticmethod
    def delete_memory(key: str) -> bool:
        mem = UserMemory.query.filter_by(key=key).first()
        if mem:
            db.session.delete(mem)
            db.session.commit()
            return True
        return False
