/**
 * Languages API Routes
 * 支持的编程语言列表
 */

const express = require('express');
const router = express.Router();
const config = require('../config');

// 获取支持的语言列表
router.get('/', (req, res) => {
    try {
        res.json({
            success: true,
            data: config.languages
        });
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch languages'
        });
    }
});

// 获取特定语言信息
router.get('/:id', (req, res) => {
    try {
        const language = config.languages.find(lang => lang.id === req.params.id);
        
        if (!language) {
            return res.status(404).json({
                success: false,
                message: 'Language not found'
            });
        }

        res.json({
            success: true,
            data: language
        });
    } catch (error) {
        console.error('Error fetching language:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch language'
        });
    }
});

module.exports = router;
