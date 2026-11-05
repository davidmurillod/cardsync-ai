import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // Inicialización del cliente con la clave (acepta tanto AIzaSy como AQ.)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 1500,
      }
    });

    const prompt = `Analiza la tarjeta de presentación y devuelve UNICAMENTE un objeto JSON válido, sin explicaciones ni formato markdown adicional, siguiendo esta estructura exacta. Si un campo no existe, usa null:
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

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text();
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
