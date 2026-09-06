FROM python:3.12-slim

WORKDIR /app

COPY scoring_engine/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY scoring_engine ./scoring_engine

EXPOSE 10000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 2 --timeout 60 scoring_engine.api:app"]
