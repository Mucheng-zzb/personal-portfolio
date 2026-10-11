# 后端镜像（v0.5-A 起就在仓库里，v0.5-B 部署时直接用）
#
# ⚠️ **构建上下文必须是【仓库根】，不是 api/**。
#    容器里要有 web/content/ —— 后端直接读它（D26），不生成中间 JSON。
#    从 api/ 目录构建的话，镜像里没有内容，起来就 503。
#
# 本地：
#   docker build -f api/Dockerfile -t portfolio-api .
#   docker run --rm -p 8000:8000 portfolio-api
#
# Render 上（v0.5-B 用）：
#   Root Directory    = 仓库根
#   Dockerfile Path   = api/Dockerfile
#
# 未验证：本机没有 Docker，这个文件**没有跑过 docker build**。
# 已核对的是它引用的路径在仓库里都存在（api/app、api/requirements.txt、web/content）。

FROM python:3.12-slim

# 1) 不写 .pyc；2) 日志不缓冲 —— 容器里日志要能立刻看见，
#    否则出问题时看到的最后一行可能是十分钟前的。
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先只拷依赖清单再装：内容变了不会让这一层缓存失效，
# 重建时省下重装依赖的时间。
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

COPY api/app /app/api/app
COPY web/content /app/web/content

# 镜像里内容在哪儿，就在这儿显式写死：
# 代码里的默认值（仓库根/web/content）在容器里不成立。
ENV CONTENT_DIR=/app/web/content \
    ENV=production

EXPOSE 8000

WORKDIR /app/api

# 不加 --reload：那是本地开发用的，线上开着会多耗内存与句柄。
# 不加 --no-access-log：访问日志由 app 自己的中间件产出（logging.py 顶掉了 uvicorn 那份）。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
