# 后端镜像（v0.5-A 写就；v0.5-B 起放在**仓库根**，见 D35）
#
# ⚠️ **构建上下文必须是【仓库根】**，容器里要有 web/content/
#    —— 后端直接读它（D26），不生成中间 JSON。
#
# 为什么这个文件在仓库根、而不是 api/ 里（D35）：
#   SnapDeploy 的 Root Directory 语义是「**Dockerfile 所在目录**」，
#   设成 api/ 就等于把构建上下文缩到 api/ —— 那样 COPY web/content 会失败，
#   镜像里没有内容，起来就 503（官方文档原话：根目录之外的共享文件对构建不可见）。
#   放在根目录后，Root Directory 留空即可，而下面的 COPY 路径也不用改。
#
# 本地：
#   docker build -t portfolio-api .          # 上下文是当前目录（仓库根）
#   docker run --rm -p 8000:8000 portfolio-api
#
# SnapDeploy 上（v0.5-B 用）：Root Directory 留空、构建方式选 Dockerfile。
#
# 未验证：写这份文件的机器上没有 Docker，**从没跑过 docker build**。
# 已核对的是它引用的路径在仓库里都存在（api/app、api/requirements.txt、web/content）。
# 第一次真正的构建发生在 SnapDeploy 上。

FROM python:3.12-slim

# 1) 不写 .pyc；2) 日志不缓冲 —— 容器里日志要能立刻看见，
#    否则出问题时看到的最后一行可能是十分钟前的。
#
# ⚠️ **一行一个 ENV，不要用行尾 `\` 续行**（D37）：
#    SnapDeploy 从 Dockerfile 检测环境变量时，把续行符连同它前面的空格
#    一起当成了值的一部分 —— 实测检测到的是
#    `PYTHONDONTWRITEBYTECODE=1\` 与 `CONTENT_DIR=/app/web/content \`。
#    而**平台检测到的值会覆盖镜像里的值**：CONTENT_DIR 带了个尾巴，
#    容器就去找一个名叫「/app/web/content \」的目录 → 启动即 503
#    （部署当天最容易被误判成「代码坏了」的那种失败）。
#    一行一个就没有续行符可吃，任何朴素的解析器都不会踩到。
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 先只拷依赖清单再装：内容变了不会让这一层缓存失效，
# 重建时省下重装依赖的时间。
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

COPY api/app /app/api/app
COPY web/contents /app/web/content

# 镜像里内容在哪儿，就在这儿显式写死：
# 代码里的默认值（仓库根/web/content）在容器里不成立。
# 同样一行一个（D37，原因见上面 ENV 那一大段注释）。
ENV CONTENT_DIR=/app/web/content
ENV ENV=production

# 端口：EXPOSE 只是**声明**（本地默认仍是 8000，docker run -p 8000:8000 照旧），
# 真正的端口由启动命令决定（见下面的 CMD）。
EXPOSE 8000

WORKDIR /app/api

# 跟随平台注入的 $PORT（D35）：
#   · SnapDeploy 的 PORT 是**平台托管且锁定**的，写死 8000 会出现
#     「构建成功但路由不通」——镜像能跑，平台却连不上；
#   · ${PORT:-8000} 让本地（不设 PORT）保持 8000 不变。
# 用 sh -c 是因为 exec 形式（JSON 数组）不做变量展开。
#
# 不加 --reload：那是本地开发用的，线上开着会多耗内存与句柄。
# 不加 --no-access-log：访问日志由 app 自己的中间件产出（logging.py 顶掉了 uvicorn 那份）。
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
