import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = Constants.expoConfig?.extra?.geminiModel || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Gemini AI Service for Farming Conversations
 * Powers character dialogues with AI-generated questions and validation
 */
export class GeminiService {
  /**
   * Generate farming question from Grandpa Jack
   */
  async generateFarmingQuestion(context = {}) {
    const { topic = 'general farming', difficulty = 'beginner', character = 'Grandpa Jack' } = context;

    const prompt = `You are ${character}, an experienced farmer teaching a beginner about farming.

Context: ${topic}
Difficulty: ${difficulty}

Generate ONE simple, practical farming question that tests basic knowledge.

Requirements:
- Keep it conversational and friendly
- Make it relevant to real farming
- Use simple language
- Focus on practical skills
- Should have a clear right answer

Format your response as JSON:
{
  "question": "Your question here",
  "expectedAnswer": "Brief description of correct answer",
  "hints": ["Hint 1", "Hint 2"]
}`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from Gemini');
      }

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if parsing fails
      return {
        question: text.split('\n')[0] || 'What is the best time to plant wheat?',
        expectedAnswer: 'Early spring or fall when temperatures are moderate',
        hints: ['Think about temperature', 'Avoid extreme heat or cold'],
      };
    } catch (error) {
      console.error('[Gemini] Error generating question:', error);
      // Fallback question
      return {
        question: 'What are the three main things plants need to grow?',
        expectedAnswer: 'Water, sunlight, and nutrients from soil',
        hints: ['Think about what you water plants with', 'Plants need light from the sun'],
      };
    }
  }

  /**
   * Validate user's answer using AI
   */
  async validateAnswer(question, userAnswer, expectedAnswer) {
    const prompt = `You are an agricultural teacher grading a student's answer.

Question: ${question}
Expected Answer: ${expectedAnswer}
Student's Answer: ${userAnswer}

Evaluate if the student's answer is correct, partially correct, or incorrect.
Be lenient - accept answers that show understanding even if not perfectly worded.

Respond with JSON:
{
  "isCorrect": true or false,
  "score": 0-100,
  "feedback": "Brief encouraging feedback",
  "encouragement": "Positive message"
}`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent grading
            maxOutputTokens: 300,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from Gemini');
      }

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isCorrect: result.isCorrect || result.score >= 60,
          score: result.score || (result.isCorrect ? 100 : 0),
          feedback: result.feedback || 'Good try!',
          encouragement: result.encouragement || 'Keep learning!',
        };
      }

      // Fallback: simple keyword matching
      const keywords = expectedAnswer.toLowerCase().split(/\s+/);
      const userWords = userAnswer.toLowerCase().split(/\s+/);
      const matches = keywords.filter((word) => userWords.includes(word)).length;
      const score = Math.min(100, (matches / keywords.length) * 100);

      return {
        isCorrect: score >= 40,
        score,
        feedback: score >= 60 ? 'Great answer!' : score >= 40 ? 'Close! You got the main idea.' : 'Not quite, but keep trying!',
        encouragement: 'Farming takes practice!',
      };
    } catch (error) {
      console.error('[Gemini] Error validating answer:', error);
      // Fallback validation
      const similarity = this.calculateSimilarity(userAnswer.toLowerCase(), expectedAnswer.toLowerCase());
      return {
        isCorrect: similarity > 0.3,
        score: Math.min(100, similarity * 100),
        feedback: similarity > 0.5 ? 'Good answer!' : 'Keep learning!',
        encouragement: 'Practice makes perfect!',
      };
    }
  }

  /**
   * Generate follow-up dialogue based on answer
   */
  async generateFollowUp(question, userAnswer, isCorrect, character = 'Grandpa Jack') {
    const prompt = `You are ${character}, responding to a student's answer about farming.

Question: ${question}
Student's Answer: ${userAnswer}
Answer was: ${isCorrect ? 'Correct' : 'Incorrect'}

Generate a brief, encouraging response (1-2 sentences) that:
${
  isCorrect
    ? '- Praises the student\n- Adds a small farming tip related to the answer'
    : '- Gently corrects them\n- Explains the right answer simply\n- Encourages them to keep trying'
}

Keep it warm, grandfather-like, and under 40 words.`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 150,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return (
        text?.trim() ||
        (isCorrect
          ? "That's right! You're learning fast, just like I did at your age."
          : "Not quite, but don't worry - farming wisdom comes with time and practice.")
      );
    } catch (error) {
      console.error('[Gemini] Error generating follow-up:', error);
      return isCorrect
        ? "Excellent! You've got the farming spirit in you!"
        : "That's okay - even I made mistakes when I was learning. Keep at it!";
    }
  }

  /**
   * Simple similarity calculation (fallback)
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
}

export default new GeminiService();
