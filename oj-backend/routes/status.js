/**
 * Status API Routes
 * 提交状态查询
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

// 获取提交列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, problemId, userId } = req.query;
        
        let query = db.collection('submissions').orderBy('submittedAt', 'desc');
        
        if (problemId) {
            query = query.where({ problemId });
        }
        
        if (userId) {
            query = query.where({ userId });
        }

        // CloudBase分页查询
        const skip = (page - 1) * limit;
        const result = await query.skip(skip).limit(parseInt(limit)).get();

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.data.length
            }
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
});

// 获取单个提交详情
router.get('/:id', async (req, res) => {
    try {
        const result = await db.collection('submissions')
            .doc(req.params.id)
            .get();

        if (!result.data.length) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission',
            error: error.message
        });
    }
});

module.exports = router;
