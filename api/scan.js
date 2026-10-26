export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Falta la imagen o el tipo MIME' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Extrae los datos de esta tarjeta de presentación en este JSON exacto. Si un campo no existe, usa null:
{"firstName":null,"lastName":null,"organization":null,"jobTitle":null,"countryCode":null,"workPhone":null,"extension":null,"mobilePhone":null,"email":null,"website":null,"address":null}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 800, // Aumentado para evitar cortes de texto
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Error al comunicarse con la API de Gemini";
      return res.status(response.status).json({ error: errorMsg });
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return res.status(500).json({ error: "La IA no devolvió una respuesta válida" });
    }

    // Limpiamos cualquier bloque de código markdown si estuviera presente
    let cleanedText = textResponse.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json/, "").replace(/```\$/, "").trim();
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsedJson = JSON.parse(cleanedText);
    return res.status(200).json(parsedJson);

  } catch (error) {
    console.error("Error en /api/scan:", error);
    return res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
}
