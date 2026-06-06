const https = require('https');

module.exports = function (req, res) {
    // Handle CORS preflight routing safely
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = process.env.DECART_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Missing API Key configuration on host environment' });
        return;
    }

    const image = req.body.image;
    if (!image) {
        res.status(400).json({ error: 'Missing image payload' });
        return;
    }

    // Safely strip out the data URI prefix if it exists in the incoming string
    let cleanBase64 = image;
    if (image.indexOf(',') !== -1) {
        cleanBase64 = image.split(',')[1];
    }

    const payloadString = JSON.stringify({
        model: "decart-live-v1",
        input: {
            reference_image: cleanBase64,
            prompt: req.body.prompt || "Apply style from reference image",
            mode: "pose_transfer"
        }
    });

    const options = {
        hostname: 'api.decart.ai',
        port: 443,
        path: '/v1/live/stream',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey.trim(),
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadString)
        }
    };

    const decartReq = https.request(options, function (decartRes) {
        let rawData = '';
        
        decartRes.on('data', function (chunk) {
            rawData += chunk;
        });

        decartRes.on('end', function () {
            if (decartRes.statusCode < 200 || decartRes.statusCode >= 300) {
                res.status(decartRes.statusCode).json({ error: 'Decart rejected request: ' + rawData });
                return;
            }

            try {
                const dataParsed = JSON.parse(rawData);
                
                // Safely find the streaming URL across potential API variation responses
                let finalUrl = null;
                if (dataParsed.stream_url) {
                    finalUrl = dataParsed.stream_url;
                } else if (dataParsed.url) {
                    finalUrl = dataParsed.url;
                } else if (dataParsed.streamUrl) {
                    finalUrl = dataParsed.streamUrl;
                }

                let finalSession = null;
                if (dataParsed.session_id) {
                    finalSession = dataParsed.session_id;
                } else if (dataParsed.id) {
                    finalSession = dataParsed.id;
                }

                res.status(200).json({
                    streamUrl: finalUrl,
                    sessionId: finalSession
                });
            } catch (err) {
                res.status(500).json({ error: 'Failed to parse JSON response from stream gateway' });
            }
        });
    });

    decartReq.on('error', function (e) {
        res.status(500).json({ error: 'Network communication breakdown: ' + e.message });
    });

    decartReq.write(payloadString);
    decartReq.end();
};
