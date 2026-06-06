export default async function handler(req, res) {
    // Enable CORS preflight handling if browser requests it
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.DECART_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Decart API Key configuration missing on host environment.' });
    }

    try {
        const { image, prompt } = req.body;

        // Structured configuration payload mapping for Decart API v1 requirements
        const apiPayload = {
            model: "decart-live-v1",
            input: {
                reference_image: image,
                prompt: prompt || "Apply style from reference image",
                mode: "pose_transfer"
            }
        };

        const response = await fetch('https://api.decart.ai/v1/video/stream/init', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            return res.status(response.status).json({ error: `Decart API Error: ${errorDetails}` });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error("Pipeline Exception:", error);
        return res.status(500).json({ error: `Internal execution breakdown: ${error.message}` });
    }
}

