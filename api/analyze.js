// api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageBase64, myDiet, lang } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. 環境変数のチェック
  if (!apiKey) {
    return res.status(500).json({ error: "VercelのSettingsでGEMINI_API_KEYを設定してください。" });
  }

  const prompt = `Analyze this food label for: "${myDiet}". Respond in ${lang}. JSON only.`;

  try {
    // ユーザー指定の最新エンドポイントを使用
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
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

    // 2. Gemini側からのエラーをキャッチ
    if (data.error) {
      console.error("Gemini API Error:", data.error.message);
      return res.status(data.error.code || 500).json({ error: data.error.message });
    }

    // 3. 応答テキストの解析
    const resultText = data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Server Crash:", error.message);
    res.status(500).json({ error: "内部サーバーエラーが発生しました。", detail: error.message });
  }
}