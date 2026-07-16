FROM python:3.12-slim

WORKDIR /service

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN addgroup --system app && adduser --system --ingroup app app

COPY simulator_app ./simulator_app
RUN chown -R app:app /service

USER app

EXPOSE 8765

CMD ["uvicorn", "simulator_app.main:app", "--host", "0.0.0.0", "--port", "8765"]
