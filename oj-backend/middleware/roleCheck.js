/**
 * Role Check Middleware
 * 角色检查中间件
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

/**
 * 检查用户角色中间件
 * @param {string|string[]} roles - 允许的角色，可以是单个角色或角色数组
 */
function requireRole(roles) {
    // 如果是字符串，转换为数组
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return async (req, res, next) => {
        // 首先检查是否已认证（需要先使用requireAuth中间件）
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        try {
            // 获取用户信息（包含角色）
            const user = await findUserById(req.user.userId);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            const userRole = user.role || 'user';
            
            // 检查用户角色是否在允许的角色列表中
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: '权限不足'
                });
            }
            
            // 将角色信息添加到req.user中
            req.user.role = userRole;
            
            next();
        } catch (error) {
            console.error('角色检查错误:', error);
            return res.status(500).json({
                success: false,
                message: '权限验证失败'
            });
        }
    };
}

/**
 * 检查是否是管理员
 */
function requireAdmin() {
    return requireRole(['admin']);
}

/**
 * 检查是否是管理员或版主
 */
function requireAdminOrModerator() {
    return requireRole(['admin', 'moderator']);
}

/**
 * 获取用户角色信息（可选中间件）
 */
async function getUserRole(req, res, next) {
    if (!req.user) {
        return next();
    }
    
    try {
        const user = await findUserById(req.user.userId);

        if (user) {
            req.user.role = user.role || 'user';
        }
    } catch (error) {
        console.error('获取用户角色错误:', error);
        // 不阻塞请求
    }
    
    next();
}

module.exports = {
    requireRole,
    requireAdmin,
    requireAdminOrModerator,
    getUserRole
};