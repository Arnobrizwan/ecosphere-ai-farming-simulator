# EcoSphere Translation Service

A lightweight Express server that exposes an endpoint for translating English text to Bangla using Google Cloud Translation API v3.

## Features

- **POST `/translate/en-to-bn`** accepts JSON `{ "text": "Hello" }` and returns `{ "translated": "..." }`.
- Utilizes official `@google-cloud/translate` v3 client with Application Default Credentials.
- Graceful error handling with HTTP-friendly error codes.

## Prerequisites

- Node.js 18+
- Google Cloud project with Cloud Translation API v3 enabled.
- Service account with the `roles/cloudtranslate.user` role (or broader) and credentials available via Application Default Credentials (ADC).

## Setup Steps

- **Install dependencies**

  ```bash
  cd server
  npm install
  ```

- **Configure credentials**

  ADC options:

  - Run on Google Cloud (Cloud Run, GKE, App Engine) where the runtime provides ADC automatically.
  - Locally, set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`.
  - Alternatively, use `gcloud auth application-default login` for testing.

- **Environment variables**

  Optional:

  - `PORT`: Port for Express server (default `8080`).
  - `GOOGLE_CLOUD_LOCATION`: Translation API location (default `global`).

## Run the service

```bash
npm start
```

## Request example

```bash
curl -X POST http://localhost:8080/translate/en-to-bn \
  -H "Content-Type: application/json" \
  -d '{"text":"Welcome to EcoSphere"}'
```

Example success response:

```json
{
  "translated": "ইকোস্ফিয়ারে স্বাগতম"
}
```

Example error response:

```json
{
  "error": {
    "code": 7,
    "message": "Permission denied"
  }
}
```

## Deployment

- **Cloud Run**: Containerize the server and deploy with a service account that has Translation permissions.
- **Cloud Functions (2nd Gen)**: Wrap Express app in an exported handler.

Ensure billing is enabled since Translation API is a paid service.
