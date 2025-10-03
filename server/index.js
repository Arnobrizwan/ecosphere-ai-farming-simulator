const express = require('express');
const { v3 } = require('@google-cloud/translate');

const app = express();
const translationClient = new v3.TranslationServiceClient();

const PORT = process.env.PORT || 8080;
const DEFAULT_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

app.use(express.json());

const grpcCodeToHttpStatus = (code) => {
  switch (code) {
    case 3: // INVALID_ARGUMENT
      return 400;
    case 7: // PERMISSION_DENIED
    case 16: // UNAUTHENTICATED
      return 401;
    case 5: // NOT_FOUND
      return 404;
    case 8: // RESOURCE_EXHAUSTED
      return 429;
    case 13: // INTERNAL
      return 500;
    case 14: // UNAVAILABLE
      return 503;
    default:
      return 500;
  }
};

app.post('/translate/en-to-bn', async (req, res) => {
  const text = req.body?.text;

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request body must include a non-empty "text" string.'
      }
    });
  }

  try {
    const projectId = await translationClient.getProjectId();

    const request = {
      parent: `projects/${projectId}/locations/${DEFAULT_LOCATION}`,
      contents: [text],
      targetLanguageCode: 'bn',
      sourceLanguageCode: 'en',
      mimeType: 'text/plain'
    };

    const [response] = await translationClient.translateText(request);
    const translated = response?.translations?.[0]?.translatedText;

    if (!translated) {
      throw new Error('Translation service returned no translated text.');
    }

    return res.json({ translated });
  } catch (error) {
    console.error('Translation failed:', error);

    const status = grpcCodeToHttpStatus(error.code);

    return res.status(status).json({
      error: {
        code: error.code ?? 'TRANSLATE_ERROR',
        message: error.message || 'Translation request failed.'
      }
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    }
  });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Translation service listening on port ${PORT}`);
});
