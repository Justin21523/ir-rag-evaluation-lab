import json
import time
import urllib.error
import urllib.request

from ir_rag_eval.config import settings


class LlmUnavailable(RuntimeError):
    pass


class InvalidLlmOutput(RuntimeError):
    pass


class LlamaCppServerAdapter:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: float | None = None, temperature: float | None = None):
        self.base_url = (base_url or settings.llm_base_url).rstrip("/")
        self.model = model or settings.llm_model
        self.timeout = timeout or settings.llm_timeout_seconds
        self.temperature = settings.llm_temperature if temperature is None else temperature

    def status(self) -> dict:
        started = time.perf_counter()
        try:
            payload = self._request("GET", "/models", timeout=min(self.timeout, 1.0))
            latency_ms = (time.perf_counter() - started) * 1000
            models = payload.get("data", []) if isinstance(payload, dict) else []
            model_name = models[0].get("id") if models and isinstance(models[0], dict) else self.model
            return {
                "provider": "llama_cpp_server",
                "connected": True,
                "status": "connected",
                "base_url": self.base_url,
                "model": model_name,
                "context_size": None,
                "tokens_per_second": None,
                "last_latency_ms": latency_ms,
                "assistive_signal": True,
            }
        except Exception as exc:
            return {
                "provider": "llama_cpp_server",
                "connected": False,
                "status": "disconnected",
                "base_url": self.base_url,
                "model": self.model,
                "context_size": None,
                "tokens_per_second": None,
                "last_latency_ms": None,
                "error": str(exc),
                "assistive_signal": True,
            }

    def chat_json(self, system_prompt: str, user_payload: dict) -> dict:
        body = {
            "model": self.model,
            "temperature": self.temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
        }
        started = time.perf_counter()
        try:
            response = self._request("POST", "/chat/completions", body)
            content = response["choices"][0]["message"]["content"]
        except Exception as exc:
            raise LlmUnavailable(str(exc)) from exc
        parsed = parse_json_object(content)
        parsed.setdefault("assistive_signal", True)
        parsed.setdefault("llm_status", "ok")
        parsed.setdefault("latency_ms", (time.perf_counter() - started) * 1000)
        return parsed

    def _request(self, method: str, path: str, body: dict | None = None, timeout: float | None = None) -> dict:
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={"content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout or self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise LlmUnavailable(str(exc)) from exc


def parse_json_object(text: str) -> dict:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end >= start:
        stripped = stripped[start : end + 1]
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise InvalidLlmOutput(str(exc)) from exc
    if not isinstance(parsed, dict):
        raise InvalidLlmOutput("LLM output must be a JSON object")
    return parsed


def offline_payload(error: str, payload: dict | None = None) -> dict:
    return {
        "assistive_signal": True,
        "llm_status": "disconnected",
        "error": error,
        **(payload or {}),
    }
