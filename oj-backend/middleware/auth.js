/**
 * Authentication Middleware
 * 认证中间件 - 统一Token验证
 */

const tcb = require('tcb-admin-node');
const config = require('../config');

// 初始化CloudBase
const app = tcb.init({
    envId: config.cloudBase.envId,
    secretId: config.cloudBase.secretId,
    secretKey: config.cloudBase.secretKey
});

const db = app.database();

function normalizeSingleRecord(data) {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
}

async function findUserById(userId) {
    let user = null;

    try {
        const userResult = await db.collection('users').doc(userId).get();
        user = normalizeSingleRecord(userResult.data);
    } catch (error) {
        // fallback to where query
    }

    if (!user) {
        const userQuery = await db.collection('users').where({ _id: userId }).limit(1).get();
        user = normalizeSingleRecord(userQuery.data);
    }

    return user || null;
}

// 检查Token是否过期
function isTokenExpired(token) {
    if (!token) return true;
    
    const parts = token.split(':');
    if (parts.length !== 2) return true;
    
    const expiresAt = parseInt(parts[0], 10);
    if (isNaN(expiresAt)) return true;
    
    return Date.now() > expiresAt;
}

/**
 * 可选认证中间件 - 如果有token就验证，没有也放行（用于获取req.user）
 */
async function optionalAuth(req, res, next) {
    req.user = null;

    const userId = req.headers['x-user-id'];
    const token = req.headers['x-user-token'];

    if (!userId || !token) {
        return next();
    }

    try {
        const user = await findUserById(userId);
        if (user && user.token === token) {
            // 检查Token是否过期
            if (!isTokenExpired(user.token)) {
                req.user = {
                    userId: user._id,
                    username: user.username,
                    nickname: user.nickname,
                    avatar: user.avatar
                };
            }
        }
    } catch (error) {
        // 查询失败不阻塞请求
        console.error('Auth middleware error:', error.message);
    }

    next();
}

/**
 * 必须认证中间件 - 必须有有效token才能继续
 */
async function requireAuth(req, res, next) {
    const userId = req.headers['x-user-id'];
    const token = req.headers['x-user-token'];

    if (!userId || !token) {
        return res.status(401).json({
            success: false,
            message: '请先登录'
        });
    }

    try {
        const user = await findUserById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 检查Token是否过期
        if (isTokenExpired(user.token)) {
            return res.status(401).json({
                success: false,
                message: 'Token已过期，请重新登录'
            });
        }

        if (user.token !== token) {
            return res.status(401).json({
                success: false,
                message: 'Token已失效，请重新登录'
            });
        }

        req.user = {
            userId: user._id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: '认证失败'
        });
    }
}

module.exports = {
    optionalAuth,
    requireAuth
};
