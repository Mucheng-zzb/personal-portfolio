"""运行时配置。

规矩（ADR-010）：**所有配置都从环境变量读**，代码里不写任何真实值，
仓库里只放 `api/.env.example` 这张说明表。

这里刻意不做「模块级单例」：`load_settings()` 每次调用都重新读环境变量，
`create_app()` 再把结果交给这个 app 实例。测试因此可以起两个配置不同的 app
（例如把 CONTENT_DIR 指到临时目录），互不干扰。
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

#: 仓库根目录。config.py 在 api/app/core/ 下，往上数三层就是仓库根。
#: 用它算默认 CONTENT_DIR，这样不管从哪个目录起服务，默认值都对
#: （从 api/ 起就是 ../web/content，从仓库根起也一样）。
REPO_ROOT = Path(__file__).resolve().parents[3]

#: 默认内容目录 = 仓库根的 web/content。前端构建期读的也是这一份，
#: 两边共用同一份内容，是「前后端说同一套话」的前提（D26）。
DEFAULT_CONTENT_DIR = REPO_ROOT / "web" / "content"

#: 默认 CORS 白名单。localhost 那几个是前端 `npm run dev` / `npm run preview`
#: 的地址（Vite 默认 5173，preview 默认 4173）；最后一个是线上 GitHub Pages。
#: 注意 origin 只有「协议 + 域名 + 端口」，**不含路径**，所以这里不带仓库名。
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://mucheng-zzb.github.io",
)

APP_VERSION = "0.5.0"


def _split_csv(value: str) -> tuple[str, ...]:
    """`a,b , c` → `('a', 'b', 'c')`，空项丢掉。"""
    return tuple(part.strip() for part in value.split(",") if part.strip())


@dataclass(frozen=True)
class Settings:
    """一次解析结果。frozen 是为了能安全地被多个请求线程共享。"""

    env: str
    content_dir: Path
    cors_origins: tuple[str, ...]
    app_version: str = APP_VERSION

    @property
    def is_local(self) -> bool:
        return self.env in ("local", "dev", "test")


def load_settings() -> Settings:
    """从环境变量拼出 Settings。**每次调用都重新读**，不缓存。"""
    content_dir = os.environ.get("CONTENT_DIR", "").strip()
    cors = os.environ.get("CORS_ORIGINS", "").strip()

    return Settings(
        env=os.environ.get("ENV", "local").strip() or "local",
        content_dir=Path(content_dir).expanduser().resolve() if content_dir else DEFAULT_CONTENT_DIR,
        cors_origins=_split_csv(cors) if cors else DEFAULT_CORS_ORIGINS,
    )
