/**
 * Submit API Routes
 * 代码提交和判题API
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const tcb = require('tcb-admin-node');
const config = require('../config');
const judge = require('../judge/sandbox');
const { requireAuth } = require('../middleware/auth');

// 初始化CloudBase
const app = tcb.init({
    envId: config.cloudBase.envId,
    secretId: config.cloudBase.secretId,
    secretKey: config.cloudBase.secretKey
});

const db = app.database();

async function syncProblemStats(problemId) {
    if (!problemId) {
        return;
    }

    const pageSize = 100;
    let skip = 0;
    const submitUsers = new Set();
    const acceptedUsers = new Set();

    while (true) {
        const submissionsResult = await db.collection('submissions')
            .where({ problemId })
            .skip(skip)
            .limit(pageSize)
            .get();

        const batch = submissionsResult.data || [];
        for (const submission of batch) {
            if (submission.userId) {
                submitUsers.add(submission.userId);
            }
            if (submission.status === 'accepted' && submission.userId) {
                acceptedUsers.add(submission.userId);
            }
        }

        if (batch.length < pageSize) {
            break;
        }
        skip += pageSize;
    }

    await db.collection('problems').doc(problemId).update({
        submitCount: submitUsers.size,
        acceptCount: acceptedUsers.size,
        updatedAt: new Date()
    });
}

// 提交代码（需要登录）
router.post('/', requireAuth, async (req, res) => {
    try {
        const { problemId, language, code } = req.body;
        const userId = req.user.userId; // 从认证中间件获取登录用户ID

        // 验证请求参数
        if (!problemId || !language || !code) {
            return res.status(400).json({
                success: false,
                message: '缺少必要字段: problemId, language, code'
            });
        }

        // 验证语言是否支持
        const supportedLanguage = config.languages.find(lang => lang.id === language);
        if (!supportedLanguage) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported language'
            });
        }

        // 生成提交ID
        const submissionId = uuidv4();

        // 获取题目信息
        const problemResult = await db.collection('problems').doc(problemId).get();
        if (!problemResult.data.length) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        const problem = problemResult.data[0];

        // 创建提交记录
        const submission = {
            _id: submissionId,
            userId,
            problemId,
            language,
            code,
            status: 'pending',
            runtime: 0,
            memoryUsage: 0,
            testCaseResults: [],
            submittedAt: new Date(),
            createdAt: new Date()
        };

        // 保存到数据库
        await db.collection('submissions').add(submission);

        // 提交入库后先同步一次统计，保证“提交数”实时更新
        syncProblemStats(problemId).catch((err) => {
            console.error('Sync problem stats after submit failed:', err);
        });

        // 异步判题
        judgeProblem(submissionId, problem, code, language).catch(err => {
            console.error('Judge error:', err);
            // 更新为错误状态
            db.collection('submissions').doc(submissionId).update({
                status: 'judge_error',
                error: err.message
            });
        });

        // 立即返回提交ID
        res.json({
            success: true,
            data: {
                submissionId,
                status: 'pending',
                message: 'Submission accepted, judging...'
            }
        });

    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit code',
            error: error.message
        });
    }
});

// 异步判题函数
async function judgeProblem(submissionId, problem, code, language) {
    try {
        // 更新状态为编译中
        await db.collection('submissions').doc(submissionId).update({
            status: 'compiling'
        });

        // 处理测试用例：如果没有testCases，使用sampleInput和sampleOutput创建
        let testCases = problem.testCases;
        if (!testCases || testCases.length === 0) {
            testCases = [{
                input: problem.sampleInput || '',
                expectedOutput: problem.sampleOutput || '',
                isSample: true
            }];
        }

        // 执行判题
        const result = await judge.run(code, language, testCases, config.judge);

        // 更新判题结果
        await db.collection('submissions').doc(submissionId).update({
            status: result.status,
            runtime: result.runtime,
            memoryUsage: result.memoryUsage,
            testCaseResults: result.testCaseResults,
            judgedAt: new Date()
        });

        await syncProblemStats(problem._id);

        console.log(`Submission ${submissionId} judged: ${result.status}`);

    } catch (error) {
        console.error('Judge error:', error);
        await db.collection('submissions').doc(submissionId).update({
            status: 'judge_error',
            error: error.message
        });
    }
}

// 运行代码（只编译运行，不对比答案）
router.post('/run', async (req, res) => {
    try {
        const { language, code, input = '' } = req.body;

        // 验证请求参数
        if (!language || !code) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: language, code'
            });
        }

        // 验证语言是否支持
        const supportedLanguage = config.languages.find(lang => lang.id === language);
        if (!supportedLanguage) {
            return res.status(400).json({
                success: false,
                message: '不支持的语言'
            });
        }

        // 执行代码（只编译运行，不进行判题）
        const result = await judge.runCodeOnly(code, language, input);

        res.json({
            success: true,
            status: result.status,
            output: result.output,
            error: result.error,
            runtime: result.runtime
        });

    } catch (error) {
        console.error('Run error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run code',
            error: error.message
        });
    }
});

module.exports = router;
