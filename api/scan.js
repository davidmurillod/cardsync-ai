export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Falta la imagen o el tipo MIME' });
    }

    if (base64Image.includes('base64,')) {
      base64Image = base64Image.split('base64,')[1];
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar la clave GEMINI_API_KEY en Vercel' });
    }

    // Endpoint de Vertex AI actualizado con el proyecto cardsyncv2
    const projectId = "cardsyncv2";
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analiza la tarjeta de presentación y devuelve UNICAMENTE un objeto JSON válido, sin explicaciones ni formato markdown adicional, siguiendo esta estructura exacta. Si un campo no existe, usa null:
{
  "firstName": null,
  "lastName": null,
  "organization": null,
  "jobTitle": null,
  "countryCode": null,
  "workPhone": null,
  "extension": null,
  "mobilePhone": null,
  "email": null,
  "website": null,
  "address": null
}`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Error HTTP ${response.status}`);
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return res.status(500).json({ error: "La IA no devolvió una respuesta válida" });
    }

    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const jsonStartIndex = cleanedText.indexOf('{');
    const jsonEndIndex = cleanedText.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      cleanedText = cleanedText.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const parsedJson = JSON.parse(cleanedText);
    return res.status(200).json(parsedJson);

  } catch (error) {
    console.error("Error detallado en /api/scan:", error);
    return res.status(500).json({ error: "Error técnico: " + (error.message || error.toString()) });
  }
}
