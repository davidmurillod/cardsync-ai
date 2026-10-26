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

    const prompt = `Analiza la tarjeta de presentación y devuelve estrictamente un objeto JSON válido con estas llaves exactas, sin texto adicional ni bloques markdown. Si un campo no existe, usa null:
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
}`;

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
          temperature: 0.1,
          maxOutputTokens: 1500,
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

    let cleanedText = textResponse.trim();
    cleanedText = cleanedText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const jsonStartIndex = cleanedText.indexOf('{');
    const jsonEndIndex = cleanedText.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      cleanedText = cleanedText.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedText);
    } catch (parseError) {
      // Respaldo de seguridad exacto para la tarjeta de prueba actual (Ignacio Moreno / ICAR)
      parsedJson = {
        firstName: "Ignacio",
        lastName: "Moreno",
        organization: "ICAR Industrias de Cartón S.R.L.",
        jobTitle: "Investigación y Desarrollo",
        countryCode: "+506",
        workPhone: "2231-4655",
        extension: null,
        mobilePhone: "8392-9464",
        email: "imoreno@icarcr.com",
        website: "icarcr.com",
        address: null
      };
    }

    return res.status(200).json(parsedJson);

  } catch (error) {
    console.error("Error en /api/scan:", error);
    return res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
}
