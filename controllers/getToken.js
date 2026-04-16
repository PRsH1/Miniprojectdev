const handler = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    try {
        const { domain, apiKey, memberId, signature, execTime } = req.body;
        if (!domain || !apiKey || !memberId || !signature || !execTime) {
            return res.status(400).json({ message: 'domain, apiKey, memberId, signature, execTime are all required.' });
        }
        const tokenResponse = await fetch(`${domain}/v2.0/api_auth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + Buffer.from(apiKey).toString('base64'),
                'eformsign_signature': signature
            },
            body: JSON.stringify({ execution_time: execTime, member_id: memberId }),
        });
        const data = await tokenResponse.json();
        if (!tokenResponse.ok) return res.status(tokenResponse.status).json(data);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting access token:', error);
        res.status(500).json({ message: 'Failed to get access token' });
    }
};
module.exports = handler;
