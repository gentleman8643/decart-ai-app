export default async function handler(req, res) {
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

        if (!image) {
            return res.status(400).json({ error: 'Missing reference image payload.' });
        }

        // FIX: Strip out the browser "data:image..." prefix so Decart gets pure base64
        const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;

        const apiPayload = {
            model: "decart-live-v1",
            input: {
                reference_image: cleanBase64,
                prompt: prompt || "Apply style from reference image",
                mode: "pose_transfer"
            }
        };

        const response = await fetch('https://api.decart.ai/v1/live/stream', {
            method: 'POST',
            headers: {
                'Authorization': Bearer ${apiKey.trim()},
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: Decart API Error: ${responseText} });
        }

        const data = JSON.parse(responseText);
        
        // FIX: Explicitly bundle keys so index.html finds sessionData.streamUrl instantly
        return res.status(200).json({
            streamUrl: data.stream_url  data.url  data.streamUrl || null,
            sessionId: data.session_id  data.id  null
        });

    } catch (error) {
        console.error("Pipeline Exception:", error);
        return res.status(500).json({ error: Internal execution breakdown: ${error.message} });
    }
}
