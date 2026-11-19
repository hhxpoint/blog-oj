/**
 * OJ System Configuration
 * 在线判题系统配置文件
 */

module.exports = {
    // 服务器配置
    server: {
        port: 3000,
        host: '0.0.0.0'
    },

    // CloudBase 配置
    cloudBase: {
        envId: process.env.TCB_ENV_ID || '',
        region: 'ap-shanghai',
        secretId: process.env.TCB_SECRET_ID || '',
        secretKey: process.env.TCB_SECRET_KEY || ''
    },

    // 判题配置
    judge: {
        // 时间限制（秒）
        timeLimit: {
            cpp: 2,
            java: 3,
            python: 5
        },
        // 内存限制（MB）
        memoryLimit: {
            cpp: 256,
            java: 512,
            python: 512
        },
        // 输出限制（字节）
        outputLimit: 1024 * 1024, // 1MB
        // 沙箱工作目录
        workDir: '/tmp/oj-judge'
    },

    // 支持的语言
    languages: [
        { id: 'cpp', name: 'C++', version: 'GCC 8.5.0', extension: 'cpp' },
        { id: 'java', name: 'Java', version: 'OpenJDK 11', extension: 'java' },
        { id: 'python', name: 'Python', version: '3.6.8', extension: 'py' }
    ],

    // 编译命令配置
    compile: {
        cpp: {
            command: 'g++',
            args: ['-O2', '-std=c++11', '-o', 'main', 'main.cpp'],
            timeout: 10000 // 编译超时10秒
        },
        java: {
            command: 'javac',
            args: ['Main.java'],
            timeout: 10000
        },
        python: {
            // Python不需要编译，直接运行
            command: null,
            args: [],
            timeout: 0
        }
    },

    // 运行命令配置
    run: {
        cpp: {
            command: './main',
            args: [],
            env: {}
        },
        java: {
            command: 'java',
            args: ['Main'],
            env: {}
        },
        python: {
            command: 'python3',
            args: ['main.py'],
            env: {}
        }
    },

    // Redis配置
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0
    },

    // CORS配置
    cors: {
        origin: ['http://localhost:4000', 'https://hhxpoint.github.io', 'http://82.156.126.121'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Token']
    },

    // 日志配置
    log: {
        level: 'info',
        file: '/var/log/oj-system/app.log'
    },

    // 邮件配置（用于密码重置）
    email: {
        host: process.env.EMAIL_HOST || 'smtp.qq.com',
        port: parseInt(process.env.EMAIL_PORT) || 465,
        secure: process.env.EMAIL_SECURE !== 'false', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        },
        from: process.env.EMAIL_FROM || 'OJ System <noreply@oj-system.com>'
    }
};
