const https = require('https');

module.exports = async function handler(req, res) {
    // Handle CORS preflight routing
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

        // Clean off the data:image prefix string safely
        const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;

        const apiPayload = JSON.stringify({
            model: "decart-live-v1",
            input: {
                reference_image: cleanBase64,
                prompt: prompt || "Apply style from reference image",
                mode: "pose_transfer"
            }
        });

        // Use built-in HTTPS to prevent module bundle failures on Vercel runtime
        const options = {
            hostname: 'api.decart.ai',
            port: 443,
            path: '/v1/live/stream',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey.trim(),
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(apiPayload)
            }
        };

        const decartRequest = () => {
            return new Promise((resolve, reject) => {
                const request = https.request(options, (response) => {
                    let data = '';
                    response.on('data', (chunk) => { data += chunk; });
                    response.on('end', () => {
                        resolve({ status: response.statusCode, body: data });
                    });
                });

                request.on('error', (err) => reject(err));
                request.write(apiPayload);
                request.end();
            });
        };

        const result = await decartRequest();

        if (result.status < 200 || result.status >= 300) {
            return res.status(result.status).json({ error: 'Decart Engine Rejected Frame: ' + result.body });
        }

        const dataParsed = JSON.parse(result.body);

        // Map paths directly back to the front-end layout elements
        return res.status(200).json({
            streamUrl: dataParsed.stream_url  dataParsed.url  dataParsed.streamUrl || null,
            sessionId: dataParsed.session_id  dataParsed.id  null
        });

    } catch (error) {
        console.error("Pipeline Exception:", error);
        return res.status(500).json({ error: 'Internal execution breakdown: ' + error.message });
    }
};
