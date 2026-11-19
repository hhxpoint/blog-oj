/**
 * Rate Limiter Middleware
 * 速率限制中间件 - 防止暴力破解攻击
 */

// 内存存储登录尝试记录
const loginAttempts = new Map();

// 清理过期记录的定时器（每5分钟清理一次）
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of loginAttempts.entries()) {
        if (now - data.lastAttempt > 15 * 60 * 1000) { // 15分钟无活动则清理
            loginAttempts.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * 登录速率限制中间件
 * 限制：每个IP每分钟最多5次登录尝试
 */
function loginRateLimiter(req, res, next) {
    // 获取客户端IP
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1分钟窗口
    const maxAttempts = 5; // 最大尝试次数
    
    // 获取该IP的记录
    let record = loginAttempts.get(ip);
    
    if (!record) {
        record = {
            count: 0,
            resetTime: now + windowMs,
            lastAttempt: now
        };
        loginAttempts.set(ip, record);
    }
    
    // 检查是否需要重置计数
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
    }
    
    // 检查是否超过限制
    if (record.count >= maxAttempts) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.set('Retry-After', retryAfter);
        return res.status(429).json({
            success: false,
            message: `登录尝试过于频繁，请${retryAfter}秒后再试`,
            retryAfter: retryAfter
        });
    }
    
    // 增加尝试次数
    record.count++;
    record.lastAttempt = now;
    
    // 记录日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
        console.log(`Login attempt from ${ip}: ${record.count}/${maxAttempts}`);
    }
    
    next();
}

/**
 * 记录登录失败（用于登录失败时调用）
 */
function recordLoginFailure(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    let record = loginAttempts.get(ip);
    if (!record) {
        record = {
            count: 0,
            resetTime: now + 60 * 1000,
            lastAttempt: now
        };
        loginAttempts.set(ip, record);
    }
    
    // 登录失败，增加计数
    record.count++;
    record.lastAttempt = now;
}

/**
 * 清除IP的登录尝试记录（用于登录成功时调用）
 */
function clearLoginAttempts(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    loginAttempts.delete(ip);
}

/**
 * 获取登录尝试统计信息（用于管理接口）
 */
function getLoginAttemptsStats() {
    const stats = [];
    const now = Date.now();
    
    for (const [ip, data] of loginAttempts.entries()) {
        if (now - data.lastAttempt < 15 * 60 * 1000) { // 只显示最近15分钟的记录
            stats.push({
                ip,
                attempts: data.count,
                resetTime: new Date(data.resetTime).toISOString(),
                lastAttempt: new Date(data.lastAttempt).toISOString()
            });
        }
    }
    
    return stats;
}

module.exports = {
    loginRateLimiter,
    recordLoginFailure,
    clearLoginAttempts,
    getLoginAttemptsStats
};