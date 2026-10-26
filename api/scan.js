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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    // PROMPT ULTRA CORTO Y DIRECTO
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
        // CONFIGURACIÓN DE GENERACIÓN RÁPIDA
        generationConfig: {
          responseMimeType: "application/json", // Fuerza respuesta JSON pura sin Markdown
          temperature: 0.1,                     // Baja creatividad = respuesta más rápida y precisa
          maxOutputTokens: 300,                 // Limite estricto de longitud de respuesta
        },
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error en /api/scan:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
