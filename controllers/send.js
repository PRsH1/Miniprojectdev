const nodemailer = require('nodemailer');
// URLSearchParams는 Node.js 내장이므로 require 없어도 되지만 명시적으로 추가해도 됨
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(req, res, ['POST']);
    }

    const logBuffer = []; 
    
    try {
        // req.body가 이미 JSON 객체라면 URLSearchParams를 쓸 필요가 없을 수도 있습니다.
        // 하지만 기존 로직 유지를 위해 그대로 둡니다.
        const params = new URLSearchParams(req.body);
        const host = params.get('host');
        const port = parseInt(params.get('port'), 10);
        const authRequired = params.get('authRequired') === 'true';
        const user = params.get('user');
        const pass = params.get('pass');
        const from = params.get('from');
        const to = params.get('to');
        const security = params.get('security');

        if (!host || !port || !from || !to) {
            return respondError(req, res, 400, {
                code: 'VALIDATION_FAILED',
                message: '필수값이 비어 있습니다.',
                reason: 'SMTP 테스트에는 Host, Port, From, To 값이 필요합니다.',
                action: '입력값을 모두 채운 뒤 다시 시도하세요.',
            });
        }
        
        const requestInfo = `[REQUEST] Host=${host}, Port=${port}, AuthRequired=${authRequired}, User=${user}, From=${from}, To=${to}, Security=${security}`;
        console.log(requestInfo);
        logBuffer.push(requestInfo);

        const transporterOptions = {
            host: host,
            port: port,
            secure: security === 'ssl',
            requireTLS: security === 'tls',
            auth: authRequired ? { user, pass } : undefined,
            debug: true,
            logger: {
                info: (...args) => logBuffer.push(`[INFO] ${args.join(' ')}`),
                debug: (...args) => logBuffer.push(`[DEBUG] ${args.join(' ')}`),
                warn: (...args) => logBuffer.push(`[WARN] ${args.join(' ')}`),
                error: (...args) => logBuffer.push(`[ERROR] ${args.join(' ')}`),
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'DEFAULT:@SECLEVEL=1'
            }
        };

        const transporter = nodemailer.createTransport(transporterOptions);

        const mailOptions = {
            from: from,
            to: to,
            subject: 'SMTP 발송 테스트 (Node.js Serverless)',
            text: '이 메일은 Vercel 서버리스 함수를 통해 발송된 테스트입니다.',
        };

        const info = await transporter.sendMail(mailOptions);
        
        const successMessage = `[SUCCESS] Mail sent: ${info.response}`;
        console.log(successMessage);
        logBuffer.push(successMessage);

        res.status(200).json({
            success: true,
            message: `<span style='color:green;'>✅ 메일 발송 성공! 수신자: ${to}</span>`,
            logs: logBuffer
        });

    } catch (error) {
        const errorMessage = `[ERROR] Mail sending failed: ${error.message}`;
        console.error(errorMessage);
        logBuffer.push(errorMessage);

        return respondError(req, res, 502, {
            code: 'UPSTREAM_API_ERROR',
            message: '메일 발송 테스트에 실패했습니다.',
            reason: 'SMTP 서버가 요청을 처리하지 못했거나 연결 과정에서 오류가 발생했습니다.',
            action: '호스트, 포트, 보안 방식, 인증 정보를 다시 확인하세요.',
            error,
            logMessage: 'SMTP send failed',
        });
    }
};
