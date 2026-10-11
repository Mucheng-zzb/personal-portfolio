"""结构化日志：一行一条 JSON（ARCHITECTURE §11）。

为什么要 JSON 而不是「好看的文本」：
免费 PaaS 的日志面板只会把 stdout 抓走，不能检索也不能按字段过滤。
一行一个 JSON 对象，就能用字段名去查（`request_id=...` 找出一次请求的全部日志），
而且本地看起来也还是一条一条的，不影响读。

**不吞异常**（禁止清单第 7 条）：500 的堆栈在这里照打，
只是不会出现在给浏览器的响应体里（那是 errors.py 的事）。
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

#: 我们自己的 logger 名字，uvicorn 的日志沿用它们自己的名字。
LOGGER_NAME = "api"

#: 这些字段是 LogRecord 自带的，不能当成「附加字段」重复输出。
_RESERVED = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__.keys()
) | {
    "message",
    "asctime",
    "taskName",
    # uvicorn 自带的富文本版本（含 ANSI 色码），JSON 日志里没人看得见颜色，纯噪音
    "color_message",
}


class JsonFormatter(logging.Formatter):
    """把一条日志渲染成一个 JSON 对象。"""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # 调用方通过 extra={...} 挂上来的字段（request_id / method / status…）
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            # 堆栈留在日志里（排查要有它），但它是多行的：单独一个字段，
            # 前面那行 JSON 仍然是一条完整的记录。
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: int = logging.INFO) -> None:
    """配置根 logger。重复调用是安全的（先清空 handler 再加）。"""
    # Windows 上把 stdout 重定向到文件时，Python 会按**本地编码**（这里是 GBK）写，
    # 日志里的中文就成了乱码 —— 而日志面板按 UTF-8 解，看到的就是一堆问号。
    # 在容器/Linux 上本来就是 UTF-8，这一步是空操作。
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(level)

    # 让 uvicorn 自己的日志也走我们这套 JSON 格式（否则两种格式混在一个面板里）。
    # uvicorn 会在启动时用 dictConfig 给它自己的 logger 装上「彩色文本」handler，
    # 而且那个配置发生在应用 import 之后 —— 所以这件事必须也在 lifespan 里再做一次
    # （见 main.py），只在 import 时做会被它覆盖掉。
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
        if name == "uvicorn.access":
            # 访问日志关掉：中间件里那条是同一个信息，但**带 request_id 与耗时**。
            # 留两份只会让人以为是两次请求。
            uvicorn_logger.disabled = True


def get_logger(name: str = LOGGER_NAME) -> logging.Logger:
    return logging.getLogger(name)
