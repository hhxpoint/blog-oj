/**
 * User API Routes
 * 用户注册、登录、认证相关API
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const tcb = require('tcb-admin-node');
const config = require('../config');
const { loginRateLimiter, recordLoginFailure, clearLoginAttempts } = require('../middleware/rateLimiter');
const { sendPasswordResetEmail } = require('../services/emailService');
const { requireAdmin, requireRole } = require('../middleware/roleCheck');
const { requireAuth } = require('../middleware/auth');

// 初始化CloudBase（统一使用config中的配置）
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
        // 兼容不同CloudBase行为，失败时回退到where查询
    }

    if (!user) {
        const userQuery = await db.collection('users').where({ _id: userId }).limit(1).get();
        user = normalizeSingleRecord(userQuery.data);
    }

    return user || null;
}

async function verifyUserToken(userId, token, checkExpiry = true) {
    const user = await findUserById(userId);

    if (!user) {
        return { ok: false, message: '用户不存在' };
    }

    if (!token || user.token !== token) {
        return { ok: false, message: '未授权' };
    }

    if (checkExpiry && isTokenExpired(user.token)) {
        return { ok: false, message: 'Token已过期，请重新登录' };
    }

    return { ok: true, user };
}

function buildUserPublicInfo(user) {
    return {
        userId: user._id,
        username: user.username,
        nickname: user.nickname,
        email: user.email || null,
        avatar: user.avatar || null,
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

// 密码哈希
function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 生成随机盐
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

// 生成Token（带24小时过期时间）
function generateToken() {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时后过期
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${expiresAt}:${randomPart}`;
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

// 验证密码强度
function validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('密码长度至少8个字符');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('密码必须包含至少一个大写字母');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('密码必须包含至少一个小写字母');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('密码必须包含至少一个数字');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('密码必须包含至少一个特殊字符');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 生成密码重置Token（1小时过期）
function generatePasswordResetToken() {
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1小时后过期
    const randomPart = crypto.randomBytes(32).toString('hex');
    return {
        token: `${expiresAt}:${randomPart}`,
        expiresAt: new Date(expiresAt)
    };
}

// 验证密码重置Token是否过期
function isPasswordResetTokenExpired(token) {
    if (!token) return true;
    
    const parts = token.split(':');
    if (parts.length !== 2) return true;
    
    const expiresAt = parseInt(parts[0], 10);
    if (isNaN(expiresAt)) return true;
    
    return Date.now() > expiresAt;
}

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, nickname, email } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: '用户名和密码不能为空' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.json({ success: false, message: '用户名长度必须在3-20个字符之间' });
        }

        // 验证密码强度
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.json({ 
                success: false, 
                message: '密码不符合要求: ' + passwordValidation.errors.join('; ')
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.json({ success: false, message: '用户名只能包含字母、数字和下划线' });
        }

        // 验证邮箱格式（如果提供了邮箱）
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.json({ success: false, message: '请输入有效的邮箱地址' });
        }

        // 检查邮箱是否已存在（如果提供了邮箱）
        if (email) {
            const existingEmail = await db.collection('users')
                .where({ email: email })
                .get();

            if (existingEmail.data && existingEmail.data.length > 0) {
                return res.json({ success: false, message: '该邮箱已被注册' });
            }
        }

        // 检查用户名是否已存在
        const existingUser = await db.collection('users')
            .where({ username: username })
            .get();

        if (existingUser.data && existingUser.data.length > 0) {
            return res.json({ success: false, message: '用户名已被注册' });
        }

        // 创建新用户
        const salt = generateSalt();
        const token = generateToken();
        const now = new Date();

        const newUser = {
            username: username,
            nickname: nickname || username,
            email: email || null,
            passwordHash: hashPassword(password, salt),
            salt: salt,
            token: token,
            avatar: null,
            role: 'user', // 默认角色为普通用户
            createdAt: now,
            updatedAt: now
        };

        console.log('准备添加用户到数据库:', newUser.username);
        const result = await db.collection('users').add(newUser);
        console.log('用户添加结果:', result);

        res.json({
            success: true,
            message: '注册成功',
            data: {
                userId: result.id,
                username: username,
                nickname: newUser.nickname,
                avatar: null,
                token: token
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ success: false, message: '注册失败: ' + error.message });
    }
});

// 用户登录（添加速率限制）
router.post('/login', loginRateLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: '用户名和密码不能为空' });
        }

        // 查找用户
        const userResult = await db.collection('users')
            .where({ username: username })
            .get();

        if (!userResult.data || userResult.data.length === 0) {
            // 记录登录失败
            recordLoginFailure(req);
            console.log('未找到用户:', username);
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        const user = userResult.data[0];
        // 验证密码
        const inputHash = hashPassword(password, user.salt);
        
        if (inputHash !== user.passwordHash) {
            // 记录登录失败
            recordLoginFailure(req);
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        // 生成新Token
        const newToken = generateToken();

        // 更新用户Token
        await db.collection('users').doc(user._id).update({
            token: newToken,
            updatedAt: new Date()
        });

        // 清除登录尝试记录（登录成功）
        clearLoginAttempts(req);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                userId: user._id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                token: newToken
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '登录失败: ' + error.message });
    }
});

// 用户登出
router.post('/logout', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (userId) {
            // 验证token后再清除
            const authResult = await verifyUserToken(userId, token, false);
            if (authResult.ok) {
                await db.collection('users').doc(authResult.user._id).update({
                    token: null,
                    updatedAt: new Date()
                });
            }
        }

        res.json({ success: true, message: '已退出登录' });

    } catch (error) {
        console.error('登出错误:', error);
        res.status(500).json({ success: false, message: '登出失败' });
    }
});

// 验证Token
router.post('/verify', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.json({ success: false, message: '缺少验证信息' });
        }

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            if (authResult.message === 'Token已过期，请重新登录') {
                return res.json({ success: false, message: authResult.message });
            }
            return res.json({ success: false, message: 'Token已失效，请重新登录' });
        }

        const user = authResult.user;

        if (isTokenExpired(user.token)) {
            return res.json({ success: false, message: 'Token已过期，请重新登录' });
        }

        res.json({
            success: true,
            data: {
                ...buildUserPublicInfo(user)
            }
        });

    } catch (error) {
        console.error('验证Token错误:', error);
        res.json({ success: false, message: '验证失败' });
    }
});

// 获取用户信息
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const token = req.headers['x-user-token'];

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            return res.json({ success: false, message: authResult.message });
        }

        const user = authResult.user;

        if (user.token !== token) {
            return res.json({ success: false, message: '未授权访问' });
        }

        res.json({
            success: true,
            data: buildUserPublicInfo(user)
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ success: false, message: '获取用户信息失败' });
    }
});

// 获取用户信息（body方式，兼容旧调用）
router.post('/info', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.json({ success: false, message: '缺少验证信息' });
        }

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            return res.json({ success: false, message: authResult.message });
        }

        return res.json({
            success: true,
            data: buildUserPublicInfo(authResult.user)
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        return res.status(500).json({ success: false, message: '获取用户信息失败' });
    }
});

// 更新头像（Base64格式）
router.post('/avatar', async (req, res) => {
    try {
        const { userId, token, avatar } = req.body;

        if (!userId || !token) {
            return res.json({ success: false, message: '未登录' });
        }

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            return res.json({ success: false, message: authResult.message });
        }

        const userData = authResult.user;

        if (!avatar || !avatar.startsWith('data:image/')) {
            return res.json({ success: false, message: '无效的图片格式' });
        }

        // 检查Base64大小（限制500KB）
        const base64Size = Math.ceil((avatar.length - 22) * 3 / 4);
        if (base64Size > 500 * 1024) {
            return res.json({ success: false, message: '图片大小不能超过500KB' });
        }

        await db.collection('users').doc(userData._id).update({
            avatar: avatar,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: '头像更新成功',
            data: {
                avatar: avatar,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('更新头像错误:', error);
        res.status(500).json({ success: false, message: '更新头像失败' });
    }
});

// 更新用户信息
router.put('/profile', async (req, res) => {
    try {
        const { userId, token, nickname, email } = req.body;

        if (!userId || !token) {
            return res.json({ success: false, message: '未登录' });
        }

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            return res.json({ success: false, message: authResult.message });
        }

        const userData = authResult.user;

        // 构建更新对象
        const updateData = {
            updatedAt: new Date()
        };

        if (nickname) {
            updateData.nickname = nickname;
        }

        // 如果提供了邮箱，验证格式并检查是否已存在
        if (email !== undefined) {
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.json({ success: false, message: '请输入有效的邮箱地址' });
            }

            // 检查邮箱是否已被其他用户使用
            if (email) {
                const existingEmail = await db.collection('users').where({ email: email }).get();
                const emailUsedByAnotherUser = (existingEmail.data || []).some(user => user._id !== userData._id);

                if (emailUsedByAnotherUser) {
                    return res.json({ success: false, message: '该邮箱已被其他用户使用' });
                }
            }

            updateData.email = email || null;
        }

        // 如果有数据需要更新
        if (Object.keys(updateData).length > 1) { // 至少有updatedAt
            await db.collection('users').doc(userData._id).update(updateData);
        }

        res.json({
            success: true,
            message: '更新成功',
            data: {
                ...buildUserPublicInfo({
                    ...userData,
                    ...updateData
                })
            }
        });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 修改密码
router.post('/change-password', async (req, res) => {
    try {
        const { userId, token, currentPassword, newPassword } = req.body;

        if (!userId || !token) {
            return res.json({ success: false, message: '未登录' });
        }

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: '请提供当前密码和新密码' });
        }

        const authResult = await verifyUserToken(userId, token, true);
        if (!authResult.ok) {
            return res.json({ success: false, message: authResult.message });
        }

        const user = authResult.user;

        // 验证当前密码
        const currentHash = hashPassword(currentPassword, user.salt);
        if (currentHash !== user.passwordHash) {
            return res.json({ success: false, message: '当前密码错误' });
        }

        // 验证新密码强度
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.json({ 
                success: false, 
                message: '新密码不符合要求: ' + passwordValidation.errors.join('; ')
            });
        }

        // 生成新的盐和密码哈希
        const newSalt = generateSalt();
        const newPasswordHash = hashPassword(newPassword, newSalt);

        // 更新密码
        await db.collection('users').doc(user._id).update({
            salt: newSalt,
            passwordHash: newPasswordHash,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ success: false, message: '修改密码失败' });
    }
});

// 请求密码重置
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: '请输入邮箱地址' });
        }

        // 查找用户
        const userResult = await db.collection('users')
            .where({ email: email })
            .get();

        if (!userResult.data || userResult.data.length === 0) {
            // 为了安全，即使邮箱不存在也返回成功消息
            return res.json({ 
                success: true, 
                message: '如果该邮箱已注册，您将收到密码重置邮件' 
            });
        }

        const user = userResult.data[0];

        // 生成密码重置token
        const resetTokenData = generatePasswordResetToken();

        // 更新用户信息，保存重置token
        await db.collection('users').doc(user._id).update({
            passwordResetToken: resetTokenData.token,
            passwordResetExpires: resetTokenData.expiresAt,
            updatedAt: new Date()
        });

        // 发送密码重置邮件
        const emailResult = await sendPasswordResetEmail(email, resetTokenData.token, user.username);

        if (emailResult.success) {
            res.json({ 
                success: true, 
                message: '密码重置邮件已发送，请查收' 
            });
        } else {
            // 即使邮件发送失败，也返回成功消息（为了安全）
            console.error('发送密码重置邮件失败:', emailResult.message);
            res.json({ 
                success: true, 
                message: '如果该邮箱已注册，您将收到密码重置邮件' 
            });
        }

    } catch (error) {
        console.error('请求密码重置错误:', error);
        res.status(500).json({ success: false, message: '请求密码重置失败' });
    }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.json({ success: false, message: '请提供重置token和新密码' });
        }

        // 验证token是否过期
        if (isPasswordResetTokenExpired(token)) {
            return res.json({ success: false, message: '重置链接已过期，请重新申请' });
        }

        // 查找用户
        const userResult = await db.collection('users')
            .where({ passwordResetToken: token })
            .get();

        if (!userResult.data || userResult.data.length === 0) {
            return res.json({ success: false, message: '无效的重置链接' });
        }

        const user = userResult.data[0];

        // 检查token是否匹配
        if (user.passwordResetToken !== token) {
            return res.json({ success: false, message: '无效的重置链接' });
        }

        // 检查token是否过期
        if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
            return res.json({ success: false, message: '重置链接已过期，请重新申请' });
        }

        // 验证新密码强度
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.json({ 
                success: false, 
                message: '新密码不符合要求: ' + passwordValidation.errors.join('; ')
            });
        }

        // 生成新的盐和密码哈希
        const newSalt = generateSalt();
        const newPasswordHash = hashPassword(newPassword, newSalt);

        // 更新密码并清除重置token
        await db.collection('users').doc(user._id).update({
            salt: newSalt,
            passwordHash: newPasswordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: '密码重置成功，请使用新密码登录'
        });

    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ success: false, message: '重置密码失败' });
    }
});

// ========== 用户统计路由 ==========

// 获取用户个人统计信息
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 检查用户是否存在
        const user = await findUserById(userId);
        if (!user) {
            return res.json({ success: false, message: '用户不存在' });
        }
        
        // 获取用户提交记录
        const submissions = await db.collection('submissions')
            .where({ userId: userId })
            .get();
        
        // 计算统计信息
        let totalSubmissions = 0;
        let acceptedSubmissions = 0;
        let problemStats = {};
        
        submissions.data.forEach(submission => {
            totalSubmissions++;
            
            if (submission.status === 'accepted') {
                acceptedSubmissions++;
            }
            
            // 统计题目完成情况
            if (submission.problemId) {
                if (!problemStats[submission.problemId]) {
                    problemStats[submission.problemId] = {
                        total: 0,
                        accepted: false
                    };
                }
                problemStats[submission.problemId].total++;
                if (submission.status === 'accepted') {
                    problemStats[submission.problemId].accepted = true;
                }
            }
        });
        
        // 计算AC题目数量
        let acceptedProblems = 0;
        for (const problemId in problemStats) {
            if (problemStats[problemId].accepted) {
                acceptedProblems++;
            }
        }
        
        // 计算AC率
        const acRate = totalSubmissions > 0 ? 
            Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;
        
        res.json({
            success: true,
            data: {
                userId: user._id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                createdAt: user.createdAt,
                stats: {
                    totalSubmissions,
                    acceptedSubmissions,
                    acceptedProblems,
                    acRate
                }
            }
        });
    } catch (error) {
        console.error('获取用户统计错误:', error);
        res.status(500).json({ success: false, message: '获取用户统计失败' });
    }
});

// 获取用户排行榜
router.get('/ranking', async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        
        // 获取所有用户
        const users = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();
        
        // 计算每个用户的统计信息
        const userStats = [];
        
        for (const user of users.data) {
            // 获取用户提交记录
            const submissions = await db.collection('submissions')
                .where({ userId: user._id })
                .get();
            
            let totalSubmissions = 0;
            let acceptedSubmissions = 0;
            let acceptedProblems = new Set();
            
            submissions.data.forEach(submission => {
                totalSubmissions++;
                
                if (submission.status === 'accepted') {
                    acceptedSubmissions++;
                    if (submission.problemId) {
                        acceptedProblems.add(submission.problemId);
                    }
                }
            });
            
            userStats.push({
                userId: user._id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar,
                totalSubmissions,
                acceptedSubmissions,
                acceptedProblems: acceptedProblems.size,
                acRate: totalSubmissions > 0 ? 
                    Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0
            });
        }
        
        // 按AC题目数量排序
        userStats.sort((a, b) => {
            if (b.acceptedProblems !== a.acceptedProblems) {
                return b.acceptedProblems - a.acceptedProblems;
            }
            return b.acRate - a.acRate;
        });
        
        // 分页
        const skip = (page - 1) * limit;
        const paginatedStats = userStats.slice(skip, skip + limit);
        
        res.json({
            success: true,
            data: paginatedStats,
            pagination: {
                page: parseInt(page),
                limit: limit,
                total: userStats.length,
                totalPages: Math.max(Math.ceil(userStats.length / limit), 1)
            }
        });
    } catch (error) {
        console.error('获取排行榜错误:', error);
        res.status(500).json({ success: false, message: '获取排行榜失败' });
    }
});

// ========== 管理员路由 ==========

// 获取所有用户列表（管理员）
router.get('/admin/users', requireAuth, requireAdmin(), async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        let query = db.collection('users').orderBy('createdAt', 'desc');
        
        // 如果有搜索关键词
        if (search) {
            query = query.where({
                $or: [
                    { username: new RegExp(search, 'i') },
                    { nickname: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') }
                ]
            });
        }
        
        // 分页
        const skip = (page - 1) * limit;
        const result = await query.skip(skip).limit(parseInt(limit)).get();
        
        // 移除敏感信息
        const users = result.data.map(user => ({
            userId: user._id,
            username: user.username,
            nickname: user.nickname,
            email: user.email,
            role: user.role || 'user',
            avatar: user.avatar,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
        
        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: users.length
            }
        });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
});

// 修改用户角色（管理员）
router.put('/admin/users/:userId/role', requireAuth, requireAdmin(), async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        // 验证角色
        const validRoles = ['user', 'moderator', 'admin'];
        if (!role || !validRoles.includes(role)) {
            return res.json({ 
                success: false, 
                message: '无效的角色，可选角色: ' + validRoles.join(', ') 
            });
        }
        
        // 不能修改自己的角色
        if (userId === req.user.userId) {
            return res.json({ 
                success: false, 
                message: '不能修改自己的角色' 
            });
        }
        
        // 检查用户是否存在
        const user = await findUserById(userId);
        if (!user) {
            return res.json({ success: false, message: '用户不存在' });
        }
        
        // 更新用户角色
        await db.collection('users').doc(user._id).update({
            role: role,
            updatedAt: new Date()
        });
        
        res.json({
            success: true,
            message: '用户角色更新成功'
        });
    } catch (error) {
        console.error('修改用户角色错误:', error);
        res.status(500).json({ success: false, message: '修改用户角色失败' });
    }
});

// 删除用户（管理员）
router.delete('/admin/users/:userId', requireAuth, requireAdmin(), async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 不能删除自己
        if (userId === req.user.userId) {
            return res.json({ 
                success: false, 
                message: '不能删除自己的账户' 
            });
        }
        
        // 检查用户是否存在
        const user = await findUserById(userId);
        if (!user) {
            return res.json({ success: false, message: '用户不存在' });
        }
        
        // 删除用户
        await db.collection('users').doc(user._id).delete();
        
        res.json({
            success: true,
            message: '用户删除成功'
        });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ success: false, message: '删除用户失败' });
    }
});

// 获取用户统计信息（管理员）
router.get('/admin/users/stats', requireAuth, requireAdmin(), async (req, res) => {
    try {
        // 获取用户总数
        const totalUsers = await db.collection('users').count();
        
        // 获取角色统计
        const users = await db.collection('users').get();
        const roleStats = {
            user: 0,
            moderator: 0,
            admin: 0
        };
        
        users.data.forEach(user => {
            const role = user.role || 'user';
            if (roleStats[role] !== undefined) {
                roleStats[role]++;
            }
        });
        
        // 获取最近7天注册的用户数
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentUsers = await db.collection('users')
            .where({
                createdAt: db.command.gte(sevenDaysAgo)
            })
            .count();
        
        res.json({
            success: true,
            data: {
                totalUsers: totalUsers.total,
                roleStats,
                recentUsers: recentUsers.total
            }
        });
    } catch (error) {
        console.error('获取用户统计错误:', error);
        res.status(500).json({ success: false, message: '获取用户统计失败' });
    }
});

module.exports = router;
