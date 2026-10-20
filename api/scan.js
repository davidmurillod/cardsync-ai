export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key not configured' });
  }

  try {
    const { base64Image, mimeType } = req.body;

    const promptText = `Extrae los datos de esta tarjeta de presentación y responde estrictamente en formato JSON válido con las siguientes claves: 
    firstName, lastName, organization, jobTitle, countryCode, workPhone, extension, mobilePhone, email, website, address. 
    Regla especial para countryCode: Si el teléfono tiene código de país explícito (ej: +506, +1, (506), +34), colócalo en countryCode. Si no incluye código explícito, déjalo como '' para no sobrescribir el valor predeterminado.
    Si algún otro campo no existe, déjalo como cadena vacía ''.`;

    // Actualizado al modelo recomendado por la API de Google
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }]
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.error("Gemini returned an error:", result.error);
      return res.status(500).json({ error: result.error.message || 'Gemini API Error' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Catch error in serverless function:", err);
    return res.status(500).json({ error: 'Error processing image with Gemini' });
  }
}
