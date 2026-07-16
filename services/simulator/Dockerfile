FROM python:3.12-slim

WORKDIR /service

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY simulator_app ./simulator_app

EXPOSE 8765

CMD ["uvicorn", "simulator_app.main:app", "--host", "0.0.0.0", "--port", "8765"]
