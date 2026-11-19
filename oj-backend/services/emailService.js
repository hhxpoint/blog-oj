/**
 * Email Service
 * 邮件发送服务
 */

const nodemailer = require('nodemailer');
const config = require('../config');

// 创建邮件传输器
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
    }
});

/**
 * 发送密码重置邮件
 * @param {string} to - 收件人邮箱
 * @param {string} resetToken - 重置token
 * @param {string} username - 用户名
 */
async function sendPasswordResetEmail(to, resetToken, username) {
    try {
        // 检查邮件配置是否完整
        if (!config.email.auth.user || !config.email.auth.pass) {
            console.warn('邮件配置不完整，跳过发送密码重置邮件');
            return {
                success: false,
                message: '邮件服务未配置'
            };
        }

        // 构建重置链接
        const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
        const resetLink = `${baseUrl}/oj/reset-password.html?token=${resetToken}&username=${username}`;

        const mailOptions = {
            from: config.email.from,
            to: to,
            subject: '【xuanoj】密码重置请求',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4CAF50, #43a047); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">xuanoj</h1>
                        <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">在线编程平台</p>
                    </div>
                    
                    <div style="padding: 30px; background: #fff; border: 1px solid #e0e0e0;">
                        <h2 style="color: #333; margin-top: 0;">密码重置请求</h2>
                        
                        <p style="color: #555; line-height: 1.6;">
                            您好，${username}！
                        </p>
                        
                        <p style="color: #555; line-height: 1.6;">
                            我们收到了您的密码重置请求。请点击下面的链接重置您的密码：
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background: linear-gradient(135deg, #4CAF50, #43a047); 
                                      color: white; 
                                      padding: 12px 30px; 
                                      text-decoration: none; 
                                      border-radius: 6px; 
                                      font-weight: 500;
                                      display: inline-block;">
                                重置密码
                            </a>
                        </div>
                        
                        <p style="color: #999; font-size: 14px; line-height: 1.6;">
                            或者复制以下链接到浏览器：
                        </p>
                        <p style="color: #666; font-size: 14px; word-break: break-all;">
                            ${resetLink}
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 13px;">
                                • 此链接有效期为1小时<br>
                                • 如果您没有请求重置密码，请忽略此邮件<br>
                                • 请勿将此链接分享给他人
                            </p>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; text-align: center; background: #f5f5f5; border: 1px solid #e0e0e0; border-top: none;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            此邮件由系统自动发送，请勿回复。
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('密码重置邮件已发送:', info.messageId);
        
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('发送密码重置邮件失败:', error);
        return {
            success: false,
            message: '发送邮件失败: ' + error.message
        };
    }
}

/**
 * 验证邮件配置
 */
async function verifyEmailConfig() {
    try {
        if (!config.email.auth.user || !config.email.auth.pass) {
            return {
                success: false,
                message: '邮件配置不完整'
            };
        }

        await transporter.verify();
        return {
            success: true,
            message: '邮件配置验证成功'
        };
    } catch (error) {
        console.error('邮件配置验证失败:', error);
        return {
            success: false,
            message: '邮件配置验证失败: ' + error.message
        };
    }
}

module.exports = {
    sendPasswordResetEmail,
    verifyEmailConfig
};