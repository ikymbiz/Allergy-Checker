// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { imageBase64, myDiet, lang } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Vercelの管理パネルで設定する変数

  const prompt = `
    System: Professional Dietary Compliance Officer.
    Task: Analyze food label for: "${myDiet}".
    Respond ONLY in language: "${lang}".
    JSON only: {"status": "safe|warning|critical|unsure|info", "product_name": "string", "suitability_note": "explanation", "translated_ingredients": "full list", "matches": ["item1"]}
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
    const resultText = data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "");
    res.status(200).json(JSON.parse(resultText));
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
}