"""LLM chat with optional streaming over retrieved context."""

from __future__ import annotations

from collections.abc import AsyncGenerator, Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings


class ChatEngine:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for chat")
        self._settings = settings

    def _build_messages(
        self,
        query: str,
        retrieved_chunks: Sequence[str],
        chat_history: Sequence[tuple[str, str]],
    ) -> list[BaseMessage]:
        context_lines: list[str] = []
        for i, chunk in enumerate(retrieved_chunks, start=1):
            context_lines.append(f"--- Source segment {i} ---\n{chunk}")
        context_block = "\n\n".join(context_lines).strip()

        system = (
            "You are PagePilot, a production-grade document intelligence assistant. "
            "Answer using the retrieved context when it is relevant. "
            "If the context is insufficient, say what is missing and answer generally only when safe. "
            "Cite sources by referring to segment numbers when appropriate."
        )

        messages: list[BaseMessage] = [SystemMessage(content=system)]
        if context_block:
            messages.append(
                HumanMessage(
                    content=(
                        "Use the following retrieved context (with optional structured markers) "
                        "to ground your answer:\n\n"
                        f"{context_block}"
                    ),
                ),
            )

        for role, content in chat_history:
            r = role.lower().strip()
            if r == "user":
                messages.append(HumanMessage(content=content))
            elif r == "assistant":
                messages.append(AIMessage(content=content))
            elif r == "system":
                messages.append(SystemMessage(content=content))

        messages.append(HumanMessage(content=query))
        return messages

    async def generate_response(
        self,
        query: str,
        retrieved_chunks: Sequence[str],
        chat_history: Sequence[tuple[str, str]],
    ) -> AsyncGenerator[str, None]:
        llm = ChatOpenAI(
            model=self._settings.LLM_MODEL,
            temperature=self._settings.LLM_TEMPERATURE,
            api_key=self._settings.OPENAI_API_KEY,
            streaming=True,
        )
        messages = self._build_messages(query, retrieved_chunks, chat_history)
        async for chunk in llm.astream(messages):
            text = getattr(chunk, "content", None)
            if text:
                yield text

    async def generate_full_response(
        self,
        query: str,
        retrieved_chunks: Sequence[str],
        chat_history: Sequence[tuple[str, str]],
    ) -> str:
        llm = ChatOpenAI(
            model=self._settings.LLM_MODEL,
            temperature=self._settings.LLM_TEMPERATURE,
            api_key=self._settings.OPENAI_API_KEY,
            streaming=False,
        )
        messages = self._build_messages(query, retrieved_chunks, chat_history)
        result = await llm.ainvoke(messages)
        return str(result.content or "")
