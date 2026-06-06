export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.DECART_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Decart API Key is missing on the server configuration.' });
    }

    try {
        const { image, prompt } = req.body;

        // This communicates securely with Decart's low-latency inference endpoints
        const response = await fetch('https://api.decart.ai/v1/video/stream/init', {
            method: 'POST',
            headers: {
                'Authorization': Bearer ${apiKey},
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reference_image: image,
                prompt: prompt,
                mode: "pose_transfer"
            })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to communicate with Decart AI infrastructure.' });
    }
}
