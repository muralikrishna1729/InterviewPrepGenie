"""
Normalized exception for all AI provider failures. Every wrapper in
app/modules/ai/ catches provider-specific exceptions and re-raises this,
so call sites (chains, WebSocket handlers, Celery tasks) handle one
error shape regardless of which provider or SDK is involved.
"""


class AIServiceError(Exception):
    def __init__(
        self,
        provider: str,
        message: str,
        status_code: int | None = None,
        retryable: bool = False,
    ):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        super().__init__(f"[{provider}] {message}")
