"""Configuração do benchmark: modelos, preços e controles.

Preços em USD por 1M tokens (lista oficial, verificada em 2026-11-09).
``extra`` são os parâmetros de controle de raciocínio/temperatura aceitos
pelo modelo no endpoint OpenAI-compat.
"""
from __future__ import annotations

MAX_TOKENS = 1200
SEED = 42
REPETICOES_DETERMINISMO = 5
NOTAS_DETERMINISMO = 5

ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# preço por 1M tokens: (input, output)
PRECOS: dict[str, tuple[float, float]] = {
    "claude-haiku-5-5": (0.10, 0.50),
    "gpt-6-luna": (0.10, 0.50),
    "gpt-5.6-luna": (0.20, 1.20),
    "deepseek-v4.1-flash": (0.15, 0.60),
    "qwen3.8-flash": (0.15, 0.47),
    "qwen3.8-max": (2.00, 6.00),
    # locais: sem custo por token (eletricidade não contabilizada)
    "gemma-4-12b-qat": (0.0, 0.0),
    "gemma-4-31b-q3": (0.0, 0.0),
    # fora do estudo (Google removido por falta de comparável na faixa):
    "gemini-3.8-flash": (0.75, 3.75),
    "gemini-4-argon": (2.00, 10.00),
}

MODELOS = [
    {
        "id": "claude-haiku-5-5",
        "empresa": "Anthropic",
        "tier": "nucleo",
        "temperatura": False,
        "extra": {"reasoning_effort": "none"},
    },
    {
        "id": "gpt-6-luna",
        "empresa": "OpenAI",
        "tier": "nucleo",
        "temperatura": False,
        "extra": {"reasoning_effort": "none"},
    },
    {
        "id": "deepseek-v4.1-flash",
        "empresa": "DeepSeek",
        "tier": "nucleo",
        "temperatura": True,
        "extra": {"thinking": {"type": "disabled"}},
    },
    {
        "id": "qwen3.8-flash",
        "empresa": "Alibaba",
        "tier": "nucleo",
        "temperatura": True,
        "extra": {"thinking": {"type": "disabled"}},
    },
    {
        "id": "qwen3.8-max",
        "empresa": "Alibaba",
        "tier": "premium",
        "temperatura": True,
        "extra": {"thinking": {"type": "disabled"}},
    },
    # --- modelos locais (llama.cpp, OpenCode não participa; custo = 0) ---
    {
        "id": "gemma-4-12b-qat",
        "empresa": "Google (local)",
        "tier": "local",
        "temperatura": True,
        "extra": {"chat_template_kwargs": {"enable_thinking": False}},
    },
    {
        "id": "gemma-4-31b-q3",
        "empresa": "Google (local)",
        "tier": "local",
        "temperatura": True,
        "extra": {"chat_template_kwargs": {"enable_thinking": False}},
    },
]

MODELOS_POR_ID = {m["id"]: m for m in MODELOS}
