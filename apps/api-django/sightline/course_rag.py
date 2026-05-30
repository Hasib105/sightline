import hashlib
import math
import os
import sqlite3
from pathlib import Path
from typing import Iterable

from django.conf import settings
from django.db import connection
from django.utils import timezone

from .models import Course, CourseChatMessage, CourseChatThread, CourseMaterial, CourseUnit


VECTOR_DIMENSIONS = 128


def _tokenize(text: str) -> list[str]:
    return [part.lower() for part in "".join(char if char.isalnum() else " " for char in text).split()]


def _embed_text(text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    for token in _tokenize(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % VECTOR_DIMENSIONS
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _chunk_text(text: str, size: int = 900, overlap: int = 140) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    chunks = []
    start = 0
    while start < len(cleaned):
        chunk = cleaned[start : start + size].strip()
        if chunk:
            chunks.append(chunk)
        start += max(size - overlap, 1)
    return chunks


def _chroma_collection():
    try:
        import chromadb
    except Exception:
        return None

    path = Path(settings.BASE_DIR) / "chroma"
    path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(path))
    return client.get_or_create_collection(name="sightline_course_content")


def _material_text(material: CourseMaterial) -> str:
    parts = [
        material.title,
        material.description,
        material.content_text,
        material.uri if material.kind in {CourseMaterial.KIND_URL, CourseMaterial.KIND_EMBED} else "",
    ]
    return "\n".join(part for part in parts if part)


def index_material(material: CourseMaterial) -> int:
    collection = _chroma_collection()
    text = _material_text(material)
    chunks = _chunk_text(text)
    if not chunks:
        return 0

    if collection is None:
        material.indexed_at = timezone.now()
        material.save(update_fields=["indexed_at", "updated_at"])
        return 0

    ids = [f"material-{material.id}-{index}" for index, _chunk in enumerate(chunks)]
    metadatas = [
        {
            "course_id": str(material.course_id),
            "unit_id": str(material.unit_id or ""),
            "material_id": str(material.id),
            "title": material.title,
            "kind": material.kind,
            "uri": material.uri,
        }
        for _chunk in chunks
    ]
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=[_embed_text(chunk) for chunk in chunks],
        metadatas=metadatas,
    )
    material.indexed_at = timezone.now()
    material.save(update_fields=["indexed_at", "updated_at"])
    return len(chunks)


def index_course(course: Course) -> int:
    count = 0
    for material in course.materials.select_related("unit").all():
        count += index_material(material)
    return count


def retrieve_course_context(course: Course, question: str, unit: CourseUnit | None = None, limit: int = 5) -> list[dict]:
    collection = _chroma_collection()
    if collection is not None:
        where = {"course_id": str(course.id)}
        if unit:
            where = {"$and": [where, {"unit_id": str(unit.id)}]}
        result = collection.query(
            query_embeddings=[_embed_text(question)],
            n_results=limit,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        if documents:
            return [
                {
                    "text": document,
                    "score": float(distance),
                    "metadata": metadata,
                }
                for document, metadata, distance in zip(documents, metadatas, distances)
            ]

    query_terms = set(_tokenize(question))
    materials = course.materials.select_related("unit").all()
    if unit:
        materials = materials.filter(unit=unit)
    scored = []
    for material in materials:
        text = _material_text(material)
        score = len(query_terms & set(_tokenize(text)))
        if text:
            scored.append((score, material, text))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "text": text[:900],
            "score": float(score),
            "metadata": {
                "course_id": str(course.id),
                "unit_id": str(material.unit_id or ""),
                "material_id": str(material.id),
                "title": material.title,
                "kind": material.kind,
                "uri": material.uri,
            },
        }
        for score, material, text in scored[:limit]
    ]


def ensure_checkpointer_storage():
    if connection.vendor == "postgresql":
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return "postgres-config-missing"
        try:
            from langgraph.checkpoint.postgres import PostgresSaver

            with PostgresSaver.from_conn_string(database_url) as checkpointer:
                checkpointer.setup()
            return "postgres"
        except Exception:
            return "django-postgres"

    path = Path(settings.BASE_DIR) / "course_chat_checkpoints.sqlite3"
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver

        conn = sqlite3.connect(str(path), check_same_thread=False)
        checkpointer = SqliteSaver(conn)
        checkpointer.setup()
        conn.close()
        return "sqlite"
    except Exception:
        sqlite3.connect(str(path)).close()
        return "django-sqlite"


def answer_course_question(thread: CourseChatThread, question: str) -> CourseChatMessage:
    ensure_checkpointer_storage()
    contexts = retrieve_course_context(thread.course, question, thread.unit)
    CourseChatMessage.objects.create(thread=thread, role=CourseChatMessage.ROLE_USER, content=question)

    history = list(thread.messages.order_by("-created_at")[:6])
    source_lines = []
    citations = []
    for index, item in enumerate(contexts, start=1):
        metadata = item["metadata"]
        label = metadata.get("title") or f"Material {metadata.get('material_id')}"
        source_lines.append(f"{index}. {label}: {item['text']}")
        citations.append(metadata)

    if source_lines:
        answer = (
            "Based on the unit material, here is the most relevant answer:\n\n"
            f"{source_lines[0].split(': ', 1)[1][:900]}"
        )
        if len(source_lines) > 1:
            answer += "\n\nOther useful references:\n" + "\n".join(
                line.split(": ", 1)[0] + ". " + (line.split(": ", 1)[1][:180]) for line in source_lines[1:3]
            )
    else:
        answer = (
            "I do not have indexed material for this question yet. Add text, slide notes, PDF/doc text, "
            "or an embedded URL to this unit, then re-index the course content."
        )

    if history:
        answer += "\n\nI kept this inside the same thread, so follow-up questions can refer back to the earlier exchange."

    return CourseChatMessage.objects.create(
        thread=thread,
        role=CourseChatMessage.ROLE_ASSISTANT,
        content=answer,
        citations=citations,
    )
