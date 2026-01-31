
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateWorkoutPlan(userInfo: any) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const prompt = `
    You are an expert fitness trainer AI. Create a detailed weekly workout plan for a user with the following profile:
    ${JSON.stringify(userInfo, null, 2)}

    Output must be a valid JSON object matching this structure:
    {
      "split": "string (e.g., '3_day_split', '4_day_split')",
      "name": "string (Plan Name)",
      "description": "string (Plan Description)",
      "schedule": {
        "mon": "string (focus area or 'rest')",
        "tue": "string",
        "wed": "string",
        "thu": "string",
        "fri": "string",
        "sat": "string",
        "sun": "string"
      },
      "routines": {
        "focus_area_key": [ 
          { "exercise": "string", "sets": number, "reps": "string" } 
        ]
      }
    }
    
    Ensure the routines keys match the values in the schedule (except 'rest').
    Do not include markdown formatting (```json), just the raw JSON string.
  `;

  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    return JSON.parse(generatedText);
  } catch (error) {
    console.error('Failed to generate workout plan:', error);
    throw error;
  }
}
