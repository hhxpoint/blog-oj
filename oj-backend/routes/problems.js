/**
 * Problems API Routes
 * 题目管理API
 */

const express = require('express');
const router = express.Router();
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

function isTokenExpired(token) {
    if (!token) return true;
    const parts = token.split(':');
    if (parts.length !== 2) return true;
    const expiresAt = parseInt(parts[0], 10);
    if (isNaN(expiresAt)) return true;
    return Date.now() > expiresAt;
}

async function resolveCurrentUserId(req) {
    const userId = req.headers['x-user-id'];
    const token = req.headers['x-user-token'];

    if (!userId || !token) {
        return null;
    }

    if (isTokenExpired(token)) {
        return null;
    }

    try {
        const userResult = await db.collection('users').doc(userId).get();
        const user = normalizeSingleRecord(userResult.data);
        if (user && user.token === token) {
            return userId;
        }
    } catch (error) {
        // ignore and fallback
    }

    const fallbackResult = await db.collection('users').where({ _id: userId, token: token }).limit(1).get();
    const fallbackUser = normalizeSingleRecord(fallbackResult.data);
    return fallbackUser ? userId : null;
}

async function getSubmissionsByProblemIds(problemIds) {
    if (!problemIds || problemIds.length === 0) {
        return [];
    }

    const _ = db.command;
    const all = [];
    const pageSize = 100;
    let skip = 0;

    while (true) {
        const result = await db.collection('submissions')
            .where({ problemId: _.in(problemIds) })
            .skip(skip)
            .limit(pageSize)
            .get();

        const batch = result.data || [];
        all.push(...batch);

        if (batch.length < pageSize) {
            break;
        }

        skip += pageSize;
    }

    return all;
}

function buildProblemStats(problemIds, submissions) {
    const statsMap = new Map();

    for (const problemId of problemIds) {
        statsMap.set(problemId, {
            submitUsers: new Set(),
            acceptedUsers: new Set(),
            totalSubmissions: 0,
            acceptedSubmissions: 0
        });
    }

    for (const submission of submissions) {
        const key = submission.problemId;
        if (!statsMap.has(key)) {
            continue;
        }

        const stat = statsMap.get(key);
        stat.totalSubmissions += 1;

        if (submission.userId) {
            stat.submitUsers.add(submission.userId);
        }

        if (submission.status === 'accepted') {
            stat.acceptedSubmissions += 1;
            if (submission.userId) {
                stat.acceptedUsers.add(submission.userId);
            }
        }
    }

    return statsMap;
}

// 获取题目列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, difficulty, keyword } = req.query;
        const currentUserId = await resolveCurrentUserId(req);
        
        let query = db.collection('problems').orderBy('createdAt', 'desc');
        
        if (difficulty) {
            query = query.where({ difficulty });
        }
        
        if (keyword) {
            // CloudBase的全文搜索需要使用where或使用云函数
            query = query.where({
                title: db.RegExp({
                    regexp: keyword,
                    options: 'i'
                })
            });
        }

        // 分页查询
        const skip = (page - 1) * limit;
        const result = await query.skip(skip).limit(parseInt(limit)).get();

        const problems = result.data || [];
        const problemIds = problems.map(item => item._id).filter(Boolean);
        const submissions = await getSubmissionsByProblemIds(problemIds);
        const statsMap = buildProblemStats(problemIds, submissions);

        const merged = problems.map(problem => {
            const stats = statsMap.get(problem._id);
            const submitCount = stats ? stats.submitUsers.size : 0;
            const acceptCount = stats ? stats.acceptedUsers.size : 0;
            const acceptedByCurrentUser = !!(stats && currentUserId && stats.acceptedUsers.has(currentUserId));

            return {
                ...problem,
                submitCount,
                acceptCount,
                totalSubmitCount: stats ? stats.totalSubmissions : 0,
                acceptedSubmitCount: stats ? stats.acceptedSubmissions : 0,
                acceptedByCurrentUser
            };
        });

        res.json({
            success: true,
            data: merged,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.data.length
            }
        });
    } catch (error) {
        console.error('Error fetching problems:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch problems',
            error: error.message
        });
    }
});

// 获取单个题目详情
router.get('/:id', async (req, res) => {
    try {
        const result = await db.collection('problems')
            .doc(req.params.id)
            .get();

        if (!result.data.length) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        const problem = result.data[0];

        // 不返回测试用例的答案（前端看不到预期输出）
        const safeProblem = {
            ...problem,
            testCases: problem.testCases ? problem.testCases.map(tc => ({
                input: tc.input,
                isSample: tc.isSample,
                _id: tc._id
            })) : []
        };

        res.json({
            success: true,
            data: safeProblem
        });
    } catch (error) {
        console.error('Error fetching problem:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch problem',
            error: error.message
        });
    }
});

module.exports = router;
