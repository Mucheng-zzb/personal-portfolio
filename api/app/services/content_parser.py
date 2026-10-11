"""内容解析与校验 —— 对 `web/build/content-schema.js` 的 Python 重新实现。

**为什么是「重写」不是「复用」**：另一边是 JS、跑在 Node 进程里，Python import 不了它。
能复用的只有两样东西 —— **规则**与**内容**：
  · 规则照 `web/build/content-schema.js` 的字段表和排序规则一条条抄（本文件）；
  · 内容读的是同一份 `web/content/**`（D26：不生成中间 JSON）。
两者是否真的一致，由 `tests/contract/` 的契约测试拿 Node 跑出来的 fixture 断言。
**不靠自觉**，靠测试。

CSS 里那句「未知字段一律报错，不是 warning」在这里同样是硬的：
拼错的 `sumary:` 必须让接口 503，而不是悄悄少一个字段。
"""

from __future__ import annotations

import json
import re
from datetime import date as _date
from functools import cmp_to_key
from typing import Any

import yaml

# ---------------------------------------------------------------- 常量与词表

PROJECT_STATUS = ("done", "wip", "planned")
NOW_STATUS = ("doing", "planned", "done")

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_HINT = "期望 YYYY-MM-DD，例：2026-10-20"


# ---------------------------------------------------------------- 类型小工具


def _is_object(value: Any) -> bool:
    return isinstance(value, dict)


def _is_filled(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _describe(value: Any) -> str:
    """把值描述成报错里要用的中文，例如 字符串「Python」。与 JS 侧逐条对应。"""
    if isinstance(value, list):
        return "数组"
    if value is None:
        return "null"
    if isinstance(value, bool):
        return f"布尔值 {value}"
    if isinstance(value, str):
        return f"字符串「{value}」"
    if isinstance(value, (int, float)):
        return f"数字 {value}"
    return type(value).__name__


def _is_real_date(value: Any) -> bool:
    """格式对、但日子不真实（2026-02-30）也算错。"""
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    year, month, day = (int(part) for part in value.split("-"))
    try:
        _date(year, month, day)
    except ValueError:
        return False
    return True


def _is_non_empty_string_list(value: Any) -> bool:
    return isinstance(value, list) and len(value) > 0 and all(_is_filled(item) for item in value)


def _is_http_url(value: Any) -> bool:
    return _is_filled(value) and value.startswith(("http://", "https://"))


# ---------------------------------------------------------------- 字段检查词表
#
# 每条告诉校验器两件事：怎么算合法、报错时该写「期望什么」。
# JS 侧是 checkField(value, spec)，这里换成 (kind, 额外参数) → 报错文案或 None。


def _check_field(value: Any, spec: dict[str, Any]) -> str | None:
    kind = spec["kind"]
    expected = spec.get("expected")

    if kind == "enum":
        values = spec["values"]
        if isinstance(value, str) and value in values:
            return None
        return f"非法值「{value}」（允许：{' | '.join(values)}）"

    if kind == "date":
        if _is_real_date(value):
            return None
        if isinstance(value, str) and DATE_RE.match(value):
            return f"不是真实存在的日期「{value}」（{DATE_HINT}）"
        return f"日期格式错误「{value}」（{DATE_HINT}）"

    if kind == "nonEmptyStringArray":
        if _is_non_empty_string_list(value):
            return None
        if isinstance(value, list):
            bad = next((i for i, item in enumerate(value) if not _is_filled(item)), -1)
            where = "数组不能为空" if bad == -1 else f"第 {bad + 1} 项不是非空字符串"
            return f"期望非空字符串数组，实际{where}"
        return f"期望非空字符串数组，实际是{_describe(value)}"

    if kind == "nonEmptyString":
        if _is_filled(value):
            return None
        if value is None:
            return f"缺少必填字段（期望：{expected or '非空字符串'}）"
        return f"期望{expected or '非空字符串'}，实际是{_describe(value)}"

    if kind == "email":
        if _is_filled(value) and "@" in value:
            return None
        if value is None:
            return "缺少必填字段（期望：含 @ 的非空字符串）"
        if not _is_filled(value):
            return f"期望含 @ 的非空字符串，实际是{_describe(value)}"
        return f"期望含 @ 的非空字符串，实际是{_describe(value)}（缺少 @）"

    if kind == "httpsString":
        if _is_filled(value) and value.startswith("https://"):
            return None
        if value is None:
            return "缺少必填字段（期望：以 https:// 开头的字符串）"
        return f"期望以 https:// 开头的字符串，实际是{_describe(value)}"

    if kind == "number":
        # bool 在 Python 里是 int 的子类，要显式排除，否则 true 会被当成 1 放过去。
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return None
        return f"期望数字，实际是{_describe(value)}"

    if kind == "boolean":
        if isinstance(value, bool):
            return None
        return f"期望布尔值 true / false，实际是{_describe(value)}"

    if kind == "httpUrl":
        # 行为与 JS 的 isHttpUrl 一致（http 与 https 都收）；
        # JS 那边这条的文案写的是「以 https:// 开头」，与它的实际判断对不上，
        # 是 JS 侧的一个文案瑕疵。这里按**实际行为**对齐，文案写准。
        if _is_http_url(value):
            return None
        return f"期望以 http:// 或 https:// 开头的链接，实际是{_describe(value)}"

    if kind == "coverPath":
        if _is_filled(value) and value.startswith("/"):
            return None
        return f"期望以 / 开头的站内路径（例：/images/cover.webp），实际是{_describe(value)}"

    return None


def _expected_of(spec: dict[str, Any]) -> str:
    """某个 kind 在「必填但没写」时该提示「期望什么」。"""
    kind = spec["kind"]
    if spec.get("expected"):
        return spec["expected"]
    if kind == "date":
        return DATE_HINT
    if kind == "enum":
        return " | ".join(spec["values"])
    return {
        "number": "数字",
        "boolean": "布尔值 true / false",
        "nonEmptyStringArray": "非空字符串数组",
        "httpUrl": "链接",
        "coverPath": "以 / 开头的站内路径",
    }.get(kind, "值")


def _check_fields(obj: dict[str, Any], fields: dict[str, Any], messages: list[str]) -> None:
    """通用字段块校验：未知字段报错；必填缺失报错；可选给了就要合法。

    注：**报错文案与 JS 侧同义但不同字**。JS 那边把「字段没写」交给各自的 kind
    去描述，于是同一种错会给出「日期格式错误「undefined」」这类话；这里统一成
    「缺少必填字段（期望：…）」。契约测试比对的是**数据**，不含文案 ——
    文案漂移不会让前端出问题，数据漂移才会。
    """
    required: dict[str, dict[str, Any]] = fields.get("required", {})
    optional: dict[str, dict[str, Any]] = fields.get("optional", {})
    known = list(required) + list(optional)

    # ① 未知字段（拼错字段名在这里被抓住）
    for key in obj:
        if key not in known:
            messages.append(f"{key}: 未知字段（本项目允许的字段：{' / '.join(known)}）")

    # ② 必填。按键是否存在判断，而不是看值是不是 None ——
    #    YAML 里写 `title:`（空值）得到的是 None，那是「给了个空值」，
    #    和「压根没写这个键」是两回事，报错该分开。
    for key, spec in required.items():
        if key not in obj:
            messages.append(f"{key}: 缺少必填字段（期望：{_expected_of(spec)}）")
            continue
        msg = _check_field(obj[key], spec)
        if msg:
            messages.append(f"{key}: {msg}")

    # ③ 可选（缺省直接跳过；给了就得合法）
    for key, spec in optional.items():
        if key not in obj:
            continue
        msg = _check_field(obj[key], spec)
        if msg:
            messages.append(f"{key}: {msg}")


# ---------------------------------------------------------------- front-matter

_FRONT_MATTER_FIELDS = ("title", "date", "tags", "summary", "order", "status")


class _FrontMatterLoader(yaml.SafeLoader):
    """SafeLoader，但**摘掉 timestamp 解析器**。

    PyYAML 默认按 YAML 1.1 解析，会把 `date: 2026-10-11` 直接变成 `datetime.date`
    对象 —— 于是它进 JSON 就换了形状，还可能带上时区。JS 侧为此专门弃用了
    gray-matter（它走 js-yaml 的 1.1），理由一模一样。
    YAML 1.2 的 core schema 里根本没有 timestamp 这个类型，日期就是字符串，
    所以这里把解析器摘掉，把行为对齐到 1.2。
    """


_FrontMatterLoader.yaml_implicit_resolvers = {
    key: [(tag, regexp) for tag, regexp in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for key, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def parse_front_matter(text: str) -> tuple[dict[str, Any] | None, str, str | None]:
    """`---` 包裹的 front-matter + 正文。

    返回 `(data, body, error)`；error 非空时 data 一定是 None。
    去 BOM、把 CRLF / 孤立 CR 统一成 LF —— 和 JS 侧同样的理由：
    不统一的话，front-matter 的最后一行会带着 `\\r` 进标量，
    `draft: false` 会变成字符串 `"false\\r"` 而不是布尔值。
    Windows 上写出来的文件里这是常态，不是异常输入。
    """
    src = text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")

    if not src.startswith("---"):
        return None, "", "文件必须以 --- 开头（front-matter 分隔符）"

    after_open = src.find("\n")
    if after_open == -1:
        return None, "", "只有开头的 --- ，找不到结束的 ---"

    lines = src[after_open + 1 :].split("\n")
    end_index = next((i for i, line in enumerate(lines) if line.strip() == "---"), -1)
    if end_index == -1:
        return None, "", "找不到结束的 ---（front-matter 没有闭合）"

    yaml_text = "\n".join(lines[:end_index])
    body = "\n".join(lines[end_index + 1 :]).strip()

    try:
        data = yaml.load(yaml_text, Loader=_FrontMatterLoader)
    except yaml.YAMLError as err:
        return None, body, f"front-matter YAML 解析失败：{_format_yaml_error(err)}"

    if not _is_object(data):
        return None, body, "front-matter 必须是一组 key: value，不能是标量或列表"

    return data, body, None


def _format_yaml_error(err: yaml.YAMLError) -> str:
    mark = getattr(err, "problem_mark", None)
    problem = getattr(err, "problem", None) or str(err).split("\n")[0]
    if mark is None:
        return str(problem).strip()
    # YAML 的行号是相对 front-matter 内容的；文件里第一行是 ---，所以 +2
    # （mark.line 从 0 数，正文里那行本身也是第 2 行）。
    return f"第 {mark.line + 2} 行第 {mark.column + 1} 列 —— {str(problem).strip()}"


def slug_from_filename(filename: str) -> str:
    """文件名 / 相对路径 → slug。

    `data-toolkit.md` → `data-toolkit`
    `web/content/notes/data-toolkit.md` → `data-toolkit`

    一定要先丢掉目录部分：slug 是**路由用的标识**（`#/notes/<slug>`），
    带着 `web/content/notes/` 前缀的话 URL 会变成
    `#/notes/web/content/notes/x`，前端 router 切成 5 段匹配不上任何路由。
    """
    base = str(filename).rsplit("/", 1)[-1]
    return re.sub(r"\.md$", "", base, flags=re.IGNORECASE)


# ---------------------------------------------------------------- 集合声明表
#
# 加一个内容集合（比如以后的 notes/）就在这里加一项，
# 校验引擎本身不用动；draft 之类的排除逻辑走同一张表上的 filter 钩子。

PROJECT_FIELDS = {
    "required": {
        "title": {"kind": "nonEmptyString", "expected": "非空字符串"},
        "status": {"kind": "enum", "values": PROJECT_STATUS},
        "date": {"kind": "date"},
        "tags": {"kind": "nonEmptyStringArray"},
        "summary": {"kind": "nonEmptyString", "expected": "非空字符串"},
        "order": {"kind": "number"},
    },
    "optional": {
        "repo": {"kind": "httpUrl"},
        "live": {"kind": "httpUrl"},
        "cover": {"kind": "coverPath"},
        "featured": {"kind": "boolean"},
    },
}

NOTES_FIELDS = {
    "required": {
        "title": {"kind": "nonEmptyString", "expected": "非空字符串"},
        "date": {"kind": "date"},
        "tags": {"kind": "nonEmptyStringArray"},
        "summary": {"kind": "nonEmptyString", "expected": "非空字符串"},
    },
    "optional": {
        "draft": {"kind": "boolean"},
    },
}


def _cmp_title(left: str, right: str) -> int:
    """标题升序兜底。

    ⚠️ **已知差异（唯一一处）**：JS 用的是 `localeCompare(other, 'zh')`，
    即 ICU 的**拼音**排序；Python 标准库没有拼音，这里用的是**码点**序。
    例：「本站笔记合集」拼音是 ben…、「数据小工具」是 shu…，
    ICU 判前者在前，码点（本 U+672C > 数 U+6570）判后者在前。

    它只在**前两个键打平**时才起作用（projects 同 order 同 date / notes 同 date），
    当前内容不触发。不引入 pypinyin 之类的新依赖去「差不多地」模拟拼音 ——
    一个可能错的拼音实现比一个明确的差异更糟。已记进 HANDOFF 待架构师定夺。
    """
    if left == right:
        return 0
    return -1 if left < right else 1


def _cmp_projects(left: dict[str, Any], right: dict[str, Any]) -> int:
    """order 升序 → date 降序 → title 升序。对应 JS 里的 `a.order - b.order || ...`"""
    if left["order"] != right["order"]:
        return -1 if left["order"] < right["order"] else 1
    if left["date"] != right["date"]:
        return -1 if left["date"] > right["date"] else 1
    return _cmp_title(left["title"], right["title"])


def _cmp_notes(left: dict[str, Any], right: dict[str, Any]) -> int:
    """date 降序（新的在前）→ title 升序兜底。"""
    if left["date"] != right["date"]:
        return -1 if left["date"] > right["date"] else 1
    return _cmp_title(left["title"], right["title"])


MD_COLLECTIONS: dict[str, dict[str, Any]] = {
    "projects": {
        "dir": "web/content/projects",
        "fields": PROJECT_FIELDS,
        "sort_key": cmp_to_key(_cmp_projects),
        "with_body": False,
        # 草稿永远不进产物/接口；排除在校验【之前】执行，
        # 所以草稿里的字段拼错不会报错 —— 这是有意的，草稿不该受约束。
        "exclude": None,
    },
    "notes": {
        "dir": "web/content/notes",
        "fields": NOTES_FIELDS,
        # 笔记详情要正文（/notes/{slug}），所以这一集合把 body 带到结果里；
        # projects 不带，负载因此逐字节与 JS 侧一致。
        "with_body": True,
        "sort_key": cmp_to_key(_cmp_notes),
        "exclude": lambda fm: fm.get("draft") is True,
    },
}


# ---------------------------------------------------------------- 各集合的校验


def validate_markdown(
    collection: dict[str, Any], rel_path: str, filename: str, data: dict[str, Any]
) -> list[str]:
    messages: list[str] = []
    if not KEBAB_RE.match(slug_from_filename(filename)):
        messages.append(
            f"文件名: 必须是 kebab-case（小写字母、数字、连字符），实际是「{filename}」"
        )
    _check_fields(data, collection["fields"], messages)
    return messages


PROFILE_REQUIRED: dict[str, dict[str, Any]] = {
    "name": {"kind": "nonEmptyString", "expected": "非空字符串"},
    "tagline": {"kind": "nonEmptyString", "expected": "非空字符串"},
    "email": {"kind": "email", "expected": "含 @ 的非空字符串"},
    "github": {"kind": "httpsString", "expected": "以 https:// 开头的字符串"},
    "heroChips": {"kind": "nonEmptyStringArray"},
    "about": {"kind": "nonEmptyStringArray"},
    "learning": {"kind": "nonEmptyStringArray"},
    "skills": {"kind": "skills"},
}

PROFILE_OPTIONAL: dict[str, dict[str, Any]] = {
    "location": {"kind": "plainString"},
    "resume": {"kind": "plainString"},
    "contactNote": {"kind": "nonEmptyString", "expected": "非空字符串"},
    "footerNote": {"kind": "nonEmptyString", "expected": "非空字符串"},
    "education": {"kind": "nonEmptyString", "expected": "非空字符串"},
}


def validate_profile(root: Any) -> list[str]:
    messages: list[str] = []
    if not _is_object(root):
        return [f"顶层: 期望一个 JSON 对象，实际是{_describe(root)}"]

    known = list(PROFILE_REQUIRED) + list(PROFILE_OPTIONAL)
    for key in root:
        if key not in known:
            messages.append(f"{key}: 未知字段（本项目允许的字段：{' / '.join(known)}）")

    for key, spec in PROFILE_REQUIRED.items():
        if key == "skills":
            continue  # 单独处理
        if key not in root:
            messages.append(f"{key}: 缺少必填字段（期望：{spec.get('expected', '非空字符串')}）")
            continue
        msg = _check_field(root[key], spec)
        if msg:
            messages.append(f"{key}: {msg}")

    # learning 空数组时给专门的提示语（告诉他删掉这个字段，而不是留个空壳）
    if isinstance(root.get("learning"), list) and len(root["learning"]) == 0:
        special = "learning: 期望非空字符串数组；暂时没有在学的内容请删除该字段"
        replaced = False
        for index, existing in enumerate(messages):
            if existing.startswith("learning:"):
                messages[index] = special
                replaced = True
                break
        if not replaced:
            messages.append(special)

    # skills: [{ title, items[] }]
    skills = root.get("skills")
    if "skills" not in root:
        messages.append("skills: 缺少必填字段（期望：数组，每项 { title, items }）")
    elif not isinstance(skills, list) or len(skills) == 0:
        messages.append(f"skills: 期望非空数组，实际是{_describe(skills)}")
    else:
        for index, group in enumerate(skills):
            at = f"skills[{index}]"
            if not _is_object(group):
                messages.append(f"{at}: 期望 {{ title, items }}，实际是{_describe(group)}")
                continue
            for extra in group:
                if extra not in ("title", "items"):
                    messages.append(f"{at}.{extra}: 未知字段（只允许 title / items）")
            if not _is_filled(group.get("title")):
                messages.append(f"{at}.title: 期望非空字符串，实际是{_describe(group.get('title'))}")
            if not _is_non_empty_string_list(group.get("items")):
                messages.append(f"{at}.items: 期望非空字符串数组，实际是{_describe(group.get('items'))}")

    for key in PROFILE_OPTIONAL:
        if key not in root:
            continue
        if not isinstance(root[key], str):
            messages.append(f"{key}: 期望字符串，实际是{_describe(root[key])}")

    return messages


def validate_now(root: Any) -> list[str]:
    messages: list[str] = []
    if not isinstance(root, list):
        return [f"顶层: 期望一个数组，实际是{_describe(root)}"]

    for index, item in enumerate(root):
        if not _is_object(item):
            messages.append(f"[{index}]: 期望 {{ text, date, status }}，实际是{_describe(item)}")
            continue
        for key in item:
            if key not in ("text", "date", "status"):
                messages.append(f"[{index}].{key}: 未知字段（只允许 text / date / status）")

        if "text" not in item:
            messages.append(f"[{index}].text: 缺少必填字段（期望：非空字符串）")
        elif not _is_filled(item["text"]):
            messages.append(f"[{index}].text: 期望非空字符串，实际是{_describe(item['text'])}")

        if "date" not in item:
            messages.append(f"[{index}].date: 缺少必填字段（期望：{DATE_HINT}）")
        else:
            msg = _check_field(item["date"], {"kind": "date"})
            if msg:
                messages.append(f"[{index}].date: {msg}")

        if "status" not in item:
            messages.append(f"[{index}].status: 缺少必填字段（期望：doing | planned | done）")
        else:
            msg = _check_field(item["status"], {"kind": "enum", "values": NOW_STATUS})
            if msg:
                messages.append(f"[{index}].status: {msg}")

    return messages


# ---------------------------------------------------------------- JSON 解析


def parse_json_file(text: str) -> tuple[Any, str | None]:
    """JSON 解析，语法错误尽量带行列号。BOM 要先去掉。"""
    src = text.lstrip("\ufeff") if text.startswith("\ufeff") else text
    try:
        return json.loads(src), None
    except json.JSONDecodeError as err:
        return None, f"JSON 解析失败：第 {err.lineno} 行第 {err.colno} 列 —— {err.msg}"


def format_errors(errors: list[tuple[str, list[str]]]) -> str:
    """把校验错误拼成人能照着改的文本（与 JS 的 formatContentErrors 同构）。"""
    head = f"[content] 内容校验失败，共 {len(errors)} 处问题："
    body = "\n".join(
        "\n".join([f"  ✗ {path}"] + [f"      · {msg}" for msg in messages])
        for path, messages in errors
    )
    return f"{head}\n{body}"


__all__ = [
    "MD_COLLECTIONS",
    "PROJECT_STATUS",
    "NOW_STATUS",
    "format_errors",
    "parse_front_matter",
    "parse_json_file",
    "slug_from_filename",
    "validate_markdown",
    "validate_now",
    "validate_profile",
]
