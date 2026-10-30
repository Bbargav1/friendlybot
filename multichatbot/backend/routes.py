"""Flask API routes and endpoints for MultiChatbot."""

import os
import json
import base64
from flask import (
    Blueprint,
    request,
    jsonify,
    Response,
    stream_with_context,
    render_template,
    current_app,
)
from werkzeug.utils import secure_filename

from backend.models import Conversation, Message
from backend.conversation_service import ConversationService
from backend.ai_service import AIService

api_bp = Blueprint("api", __name__)
main_bp = Blueprint("main", __name__)


def get_ai_service() -> AIService:
    config = current_app.config
    return AIService(config)


# ------------------------------------------------------------------------------
# Frontend Entry Point
# ------------------------------------------------------------------------------
@main_bp.route("/")
def index():
    """Renders the main MultiChatbot web app."""
    return render_template("index.html")


# ------------------------------------------------------------------------------
# System & Status
# ------------------------------------------------------------------------------
@api_bp.route("/status", methods=["GET"])
def get_status():
    """Return backend status and AI engine diagnostics."""
    ai_service = get_ai_service()
    status = ai_service.get_provider_status()
    return jsonify({
        "status": "online",
        "app_name": "MultiChatbot",
        "tagline": "Your AI Friend. Always Within Reach.",
        "ai": status,
    })


# ------------------------------------------------------------------------------
# Chat & Real-Time Streaming
# ------------------------------------------------------------------------------
@api_bp.route("/chat/stream", methods=["POST"])
def chat_stream():
    """
    Server-Sent Events (SSE) streaming endpoint for real-time AI responses.
    Expects JSON: {
        conversation_id: str,
        message: str,
        mode: str (optional, defaults to conversation.mode or 'friend'),
        attachment_text: str (optional),
        image_base64: str (optional)
    }
    """
    data = request.get_json(silent=True) or {}
    user_content = (data.get("message") or "").strip()
    conversation_id = data.get("conversation_id")
    mode = data.get("mode") or "friend"
    attachment_text = data.get("attachment_text") or ""
    image_base64 = data.get("image_base64")

    if not user_content and not image_base64:
        return jsonify({"error": "Message content or image is required"}), 400

    # Ensure conversation exists or create one
    if not conversation_id:
        conversation = ConversationService.create_conversation(mode=mode)
        conversation_id = conversation.id
    else:
        conversation = ConversationService.get_conversation(conversation_id)
        if not conversation:
            conversation = ConversationService.create_conversation(mode=mode)
            conversation_id = conversation.id

    # Save user message to database
    user_msg = ConversationService.add_message(
        conversation_id=conversation_id,
        sender="user",
        content=user_content or "[Attached Image]",
        mode=mode,
    )

    # Gather recent conversation history for context
    history_records = ConversationService.get_messages(conversation_id, limit=12)
    history = [
        {"sender": m.sender, "content": m.content}
        for m in history_records
        if m.id != user_msg.id
    ]

    # Retrieve persistent user memory
    memory_dict = ConversationService.get_all_memory()
    memory_str = "\n".join([f"- {k}: {v}" for k, v in memory_dict.items()])

    ai_service = get_ai_service()

    def generate_events():
        full_response = []
        try:
            # Yield initial metadata
            initial_event = {
                "type": "start",
                "conversation_id": conversation_id,
                "user_message_id": user_msg.id,
                "mode": mode,
            }
            yield f"data: {json.dumps(initial_event)}\n\n"

            # Stream chunks from AI engine
            for chunk_data in ai_service.generate_stream(
                user_message=user_content,
                conversation_history=history,
                mode=mode,
                user_memory=memory_str,
                attachment_text=attachment_text,
                image_base64=image_base64,
            ):
                if chunk_data.get("type") == "chunk":
                    full_response.append(chunk_data.get("text", ""))
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                elif chunk_data.get("type") == "done":
                    # Finished stream
                    complete_text = "".join(full_response)
                    # Persist AI message to database
                    with current_app.app_context():
                        ai_msg = ConversationService.add_message(
                            conversation_id=conversation_id,
                            sender="ai",
                            content=complete_text,
                            mode=mode,
                        )
                        done_event = {
                            "type": "done",
                            "message_id": ai_msg.id,
                            "conversation_id": conversation_id,
                            "timestamp": ai_msg.timestamp.isoformat() if ai_msg.timestamp else None,
                        }
                        yield f"data: {json.dumps(done_event)}\n\n"
        except Exception as e:
            current_app.logger.error(f"Error in chat stream: {str(e)}")
            error_event = {
                "type": "error",
                "error": f"Stream interrupted: {str(e)}",
            }
            yield f"data: {json.dumps(error_event)}\n\n"

    return Response(
        stream_with_context(generate_events()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@api_bp.route("/chat", methods=["POST"])
def chat_standard():
    """Non-streaming fallback chat endpoint."""
    data = request.get_json(silent=True) or {}
    user_content = (data.get("message") or "").strip()
    conversation_id = data.get("conversation_id")
    mode = data.get("mode") or "friend"
    attachment_text = data.get("attachment_text") or ""
    image_base64 = data.get("image_base64")

    if not user_content and not image_base64:
        return jsonify({"error": "Message content or image is required"}), 400

    if not conversation_id:
        conversation = ConversationService.create_conversation(mode=mode)
        conversation_id = conversation.id
    else:
        conversation = ConversationService.get_conversation(conversation_id)
        if not conversation:
            conversation = ConversationService.create_conversation(mode=mode)
            conversation_id = conversation.id

    user_msg = ConversationService.add_message(
        conversation_id=conversation_id,
        sender="user",
        content=user_content or "[Attached Image]",
        mode=mode,
    )

    history_records = ConversationService.get_messages(conversation_id, limit=12)
    history = [
        {"sender": m.sender, "content": m.content}
        for m in history_records
        if m.id != user_msg.id
    ]

    memory_dict = ConversationService.get_all_memory()
    memory_str = "\n".join([f"- {k}: {v}" for k, v in memory_dict.items()])

    ai_service = get_ai_service()
    ai_text = ai_service.generate_response(
        user_message=user_content,
        conversation_history=history,
        mode=mode,
        user_memory=memory_str,
        attachment_text=attachment_text,
        image_base64=image_base64,
    )

    ai_msg = ConversationService.add_message(
        conversation_id=conversation_id,
        sender="ai",
        content=ai_text,
        mode=mode,
    )

    return jsonify({
        "conversation_id": conversation_id,
        "user_message": user_msg.to_dict(),
        "ai_message": ai_msg.to_dict(),
        "mode": mode,
    })


# ------------------------------------------------------------------------------
# Conversations CRUD
# ------------------------------------------------------------------------------
@api_bp.route("/conversations", methods=["GET"])
def list_conversations():
    """List recent and saved conversations with search."""
    search = request.args.get("search", "").strip()
    saved = request.args.get("saved", "").lower() in ("true", "1")
    mode = request.args.get("mode", "").strip() or None

    convs = ConversationService.list_conversations(
        search=search, saved_only=saved, mode=mode, limit=100
    )
    return jsonify([c.to_dict(include_messages=False) for c in convs])


@api_bp.route("/conversations", methods=["POST"])
def create_conversation():
    """Create a new conversation thread."""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "New Conversation")
    mode = data.get("mode", "friend")
    conv = ConversationService.create_conversation(title=title, mode=mode)
    return jsonify(conv.to_dict(include_messages=True)), 201


@api_bp.route("/conversations/<conversation_id>", methods=["GET"])
def get_conversation(conversation_id):
    """Retrieve conversation details and messages."""
    conv = ConversationService.get_conversation(conversation_id)
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
    return jsonify(conv.to_dict(include_messages=True))


@api_bp.route("/conversations/<conversation_id>", methods=["PATCH"])
def update_conversation(conversation_id):
    """Update conversation title, pinned status, or saved status."""
    conv = ConversationService.get_conversation(conversation_id)
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404

    data = request.get_json(silent=True) or {}
    if "title" in data:
        ConversationService.rename_conversation(conversation_id, data["title"])
    if "is_saved" in data:
        conv.is_saved = bool(data["is_saved"])
    if "is_pinned" in data:
        conv.is_pinned = bool(data["is_pinned"])
    if "mode" in data:
        conv.mode = data["mode"]

    from backend.extensions import db
    db.session.commit()

    return jsonify(conv.to_dict(include_messages=False))


@api_bp.route("/conversations/<conversation_id>", methods=["DELETE"])
def delete_conversation(conversation_id):
    """Delete a conversation and all its messages."""
    success = ConversationService.delete_conversation(conversation_id)
    if not success:
        return jsonify({"error": "Conversation not found"}), 404
    return jsonify({"success": True, "message": "Conversation deleted"})


@api_bp.route("/conversations/<conversation_id>/clear", methods=["POST"])
def clear_conversation(conversation_id):
    """Clear all messages inside a conversation."""
    success = ConversationService.clear_messages(conversation_id)
    if not success:
        return jsonify({"error": "Conversation not found"}), 404
    return jsonify({"success": True, "message": "Conversation history cleared"})


@api_bp.route("/conversations/<conversation_id>/export", methods=["GET"])
def export_conversation(conversation_id):
    """Export conversation in markdown or json format."""
    format_type = request.args.get("format", "markdown")
    content = ConversationService.export_conversation(conversation_id, format_type)
    if not content:
        return jsonify({"error": "Conversation not found or empty"}), 404

    mimetype = "application/json" if format_type == "json" else "text/markdown"
    filename = f"conversation_{conversation_id[:8]}.{'json' if format_type == 'json' else 'md'}"
    return Response(
        content,
        mimetype=mimetype,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ------------------------------------------------------------------------------
# User Memory / Preferences
# ------------------------------------------------------------------------------
@api_bp.route("/memory", methods=["GET"])
def get_memory():
    """Retrieve all user memory key-value pairs."""
    return jsonify(ConversationService.get_all_memory())


@api_bp.route("/memory", methods=["POST"])
def set_memory():
    """Add or update a user memory record."""
    data = request.get_json(silent=True) or {}
    key = (data.get("key") or "").strip()
    value = (data.get("value") or "").strip()
    if not key or not value:
        return jsonify({"error": "Both key and value are required"}), 400

    mem = ConversationService.set_memory(key, value)
    return jsonify(mem.to_dict()), 201


@api_bp.route("/memory/<key>", methods=["DELETE"])
def delete_memory(key):
    """Delete a user memory record."""
    success = ConversationService.delete_memory(key)
    return jsonify({"success": success})


# ------------------------------------------------------------------------------
# Settings & Provider Configuration
# ------------------------------------------------------------------------------
@api_bp.route("/settings/provider", methods=["POST"])
def update_provider_settings():
    """Update AI API keys or provider preference at runtime."""
    data = request.get_json(silent=True) or {}
    if "gemini_key" in data:
        current_app.config["GEMINI_API_KEY"] = data["gemini_key"].strip()
    if "openai_key" in data:
        current_app.config["OPENAI_API_KEY"] = data["openai_key"].strip()
    if "openai_base_url" in data:
        current_app.config["OPENAI_BASE_URL"] = data["openai_base_url"].strip()
    if "openai_model" in data:
        current_app.config["OPENAI_MODEL"] = data["openai_model"].strip()
    if "provider" in data:
        current_app.config["AI_PROVIDER"] = data["provider"].lower()

    ai_service = get_ai_service()
    return jsonify({
        "success": True,
        "message": "AI settings updated successfully",
        "status": ai_service.get_provider_status(),
    })


# ------------------------------------------------------------------------------
# File Upload & Document Parsing
# ------------------------------------------------------------------------------
@api_bp.route("/upload", methods=["POST"])
def upload_file():
    """
    Handles uploaded documents (txt, md, py, js, json, csv, etc.) or images.
    Extracts text for prompt attachment or base64 for vision.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    text_extensions = {
        "txt", "md", "py", "js", "ts", "json", "csv", "html", "css",
        "java", "c", "cpp", "go", "rs", "sql", "sh", "yaml", "yml", "xml"
    }
    image_extensions = {"png", "jpg", "jpeg", "webp", "gif"}

    if ext in text_extensions:
        try:
            content = file.read().decode("utf-8", errors="replace")
            # Truncate if exceptionally huge to prevent token blowout
            if len(content) > 30000:
                content = content[:30000] + "\n\n...[Content truncated for length]..."
            return jsonify({
                "type": "text",
                "filename": filename,
                "text": content,
                "size": len(content),
            })
        except Exception as e:
            return jsonify({"error": f"Could not read text file: {str(e)}"}), 400

    elif ext in image_extensions:
        try:
            bytes_data = file.read()
            b64_str = base64.b64encode(bytes_data).decode("utf-8")
            mime = f"image/{ext if ext != 'jpg' else 'jpeg'}"
            data_uri = f"data:{mime};base64,{b64_str}"
            return jsonify({
                "type": "image",
                "filename": filename,
                "image_data": data_uri,
                "size": len(bytes_data),
            })
        except Exception as e:
            return jsonify({"error": f"Could not process image: {str(e)}"}), 400

    else:
        return jsonify({
            "error": f"Unsupported file type (.{ext}). Please upload text/code documents or images."
        }), 400
