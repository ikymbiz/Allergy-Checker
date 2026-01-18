// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageBase64, myDiet, lang } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key missing in Vercel settings." });

  const prompt = `
    System: Professional Dietary Compliance Officer.
    Task: Analyze the provided food label for these restrictions: "${myDiet}".
    
    Process:
    1. OCR: Transcribe all visible ingredients from the image accurately.
    2. Deep Analysis: Compare ingredients against "${myDiet}". 
       - Include common synonyms, derivatives, and hidden sources.
       - If "${myDiet}" is "Vegan", flag animal-derived items like 'Casein' or 'Gelatin'.
    3. Final Verdict:
       - "critical": Restricted ingredient clearly found.
       - "warning": Potential risk or vague ingredients.
       - "info": No ingredients list found, only the product front is visible.
       - "safe": None of the restricted items found.

    Response Language: "${lang}"
    Response Format (JSON only):
    {
      "status": "safe|warning|critical|unsure|info",
      "product_name": "string",
      "suitability_note": "Explanation in ${lang}.",
      "translated_ingredients": "Full transcribed ingredients list.",
      "matches": ["problematic items found"]
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", detail: error.message });
  }
}