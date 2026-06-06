const https = require('https');

module.exports = function (req, res) {
    // 1. Handle browser preflight checks
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const apiKey = process.env.DECART_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Missing DECART_API_KEY on host' });
        return;
    }

    // 2. Request an ephemeral token from Decart's authentication system
    const options = {
        hostname: 'api.decart.ai',
        port: 443,
        path: '/v1/tokens',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + apiKey.trim(),
            'Content-Type': 'application/json'
        }
    };

    const tokenReq = https.request(options, function (tokenRes) {
        let rawData = '';
        tokenRes.on('data', function (chunk) { rawData += chunk; });
        tokenRes.on('end', function () {
            if (tokenRes.statusCode < 200 || tokenRes.statusCode >= 300) {
                res.status(tokenRes.statusCode).json({ error: 'Decart auth failed: ' + rawData });
                return;
            }
            try {
                // Return the temporary client access key to the user's browser
                res.status(200).json(JSON.parse(rawData));
            } catch (err) {
                res.status(500).json({ error: 'Token parsing error' });
            }
        });
    });

    tokenReq.on('error', function (e) {
        res.status(500).json({ error: 'Network error: ' + e.message });
    });

    tokenReq.end();
};
