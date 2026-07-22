FROM python:3.12-slim

WORKDIR /app

COPY scoring_engine/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY scoring_engine ./scoring_engine

EXPOSE 5001

CMD ["python", "-m", "scoring_engine.api"]
