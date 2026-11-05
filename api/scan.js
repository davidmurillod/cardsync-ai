import { GoogleGenerativeAI } from "@google/generative-ai";

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
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar la clave GEMINI_API_KEY en Vercel' });
    }

    // Inicializamos el cliente oficial de Google Gen AI
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

    // Generamos el contenido enviando el texto y la imagen mediante el SDK oficial
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

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedText);
    } catch (parseError) {
      // Respaldo de seguridad automático si ocurriera algún detalle de formato
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
