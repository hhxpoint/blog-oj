/**
 * OJ System Backend
 * 在线判题系统后端服务
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');

// 初始化Express应用
const app = express();

// 请求日志中间件（用于调试）
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 中间件配置
app.use(cors(config.cors));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'public')));

// 路由导入
const problemRoutes = require('./routes/problems');
const submitRoutes = require('./routes/submit');
const statusRoutes = require('./routes/status');
const languageRoutes = require('./routes/languages');
const userRoutes = require('./routes/users');

// 路由注册
app.use('/api/problems', problemRoutes);
app.use('/api/submit', submitRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/users', userRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 根路径 - 提供OJ前端页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'oj', 'index.html'));
});

// OJ前端页面路由
app.get('/oj/*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path);
    res.sendFile(filePath);
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// 启动服务器
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     OJ System Backend Server Started!          ║
║                                                ║
╠════════════════════════════════════════════════╣
║  Server: http://${HOST}:${PORT}                    ║
║  Health: http://${HOST}:${PORT}/api/health         ║
║                                                ║
║  Environment: ${process.env.NODE_ENV || 'development'}          ║
║  Time: ${new Date().toLocaleString()}           ║
║                                                ║
╚════════════════════════════════════════════════╝
    `);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
