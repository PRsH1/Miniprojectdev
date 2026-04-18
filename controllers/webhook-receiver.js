const Pusher = require('pusher');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

module.exports = async function handler(req, res) {
    if (req.method === 'POST') {
        const eventPayload = { 
            headers: req.headers,
            body: req.body,
            receivedAt: new Date().toISOString() 
        };

        try {
            const companyId = req.body.company_id;

            if (!companyId) {
                console.log('Webhook received without a company ID. Ignoring.');
                return res.status(200).json({ message: 'Webhook ignored: No company ID' });
            }

            const companyChannelName = `company-${companyId}`;

            await pusher.trigger(companyChannelName, "new-event", eventPayload);
            
            res.status(200).json({ message: `Webhook received and forwarded to channel: ${companyChannelName}` });

        } catch (error) {
            console.error('Pusher trigger error:', error);
            return respondError(req, res, 502, {
                code: 'UPSTREAM_API_ERROR',
                message: '웹훅 이벤트를 실시간 채널로 전달하지 못했습니다.',
                reason: 'Pusher 연동 처리 중 오류가 발생했습니다.',
                action: '잠시 후 다시 시도하거나 실시간 연동 설정을 확인하세요.',
                error,
                logMessage: 'Pusher trigger failed',
            });
        }
    } else {
        return methodNotAllowed(req, res, ['POST']);
    }
};
