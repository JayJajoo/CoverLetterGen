FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

WORKDIR /app

# Install xvfb and dependencies for headful browser
RUN apt-get update && apt-get install -y xvfb

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps

COPY . .

EXPOSE 8000

# Start Xvfb and then run your app
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 & DISPLAY=:99 gunicorn app:app --bind 0.0.0.0:8000 --workers 1 --timeout 120"]
