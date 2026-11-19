# OJ System Backend - 在线判题系统后端

## 项目简介

这是一个基于 Node.js + Express + CloudBase 的在线判题系统后端服务，支持 C++、Java、Python 三种编程语言的代码编译运行和自动判题。

## 技术栈

- **Node.js** 20.x
- **Express.js** - Web框架
- **CloudBase** - 腾讯云数据库
- **PM2** - 进程管理
- **Redis** - 缓存（可选）

## 功能特性

- ✅ 支持多种编程语言（C++、Java、Python）
- ✅ 沙箱隔离执行用户代码
- ✅ 自动编译和运行
- ✅ 多测试用例验证
- ✅ 实时判题状态查询
- ✅ 提交历史记录
- ✅ RESTful API 设计

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `config.js` 文件，填写你的 CloudBase 配置：

```javascript
cloudBase: {
    envId: 'your-env-id',
    region: 'ap-shanghai',
    secretId: 'your-secret-id',
    secretKey: 'your-secret-key'
}
```

或者创建 `.env` 文件：

```bash
TCB_ENV_ID=your-env-id
TCB_REGION=ap-shanghai
TCB_SECRET_ID=your-secret-id
TCB_SECRET_KEY=your-secret-key
```

### 3. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

使用 PM2 启动（推荐）：
```bash
pm2 start app.js --name oj-backend
pm2 save
```

### 4. 验证服务

访问健康检查接口：
```bash
curl http://localhost:3000/api/health
```

## API 文档

### 1. 获取支持的语言列表

```http
GET /api/languages
```

响应示例：
```json
{
  "success": true,
  "data": [
    { "id": "cpp", "name": "C++", "version": "GCC 8.5.0", "extension": "cpp" },
    { "id": "java", "name": "Java", "version": "OpenJDK 11", "extension": "java" },
    { "id": "python", "name": "Python", "version": "3.6.8", "extension": "py" }
  ]
}
```

### 2. 获取题目列表

```http
GET /api/problems?page=1&limit=20&difficulty=easy
```

### 3. 获取题目详情

```http
GET /api/problems/:id
```

### 4. 提交代码

```http
POST /api/submit
Content-Type: application/json

{
  "problemId": "problem-001",
  "language": "cpp",
  "code": "#include <iostream>\nusing namespace std;\nint main() { cout << \"Hello\"; return 0; }",
  "userId": "user123"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "submissionId": "uuid-v4-id",
    "status": "pending",
    "message": "Submission accepted, judging..."
  }
}
```

### 5. 查询提交状态

```http
GET /api/status/:submissionId
```

### 6. 获取提交列表

```http
GET /api/status?page=1&limit=20&problemId=problem-001
```

## 判题状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 等待判题 |
| `compiling` | 编译中 |
| `running` | 运行中 |
| `accepted` | 通过 |
| `wrong_answer` | 答案错误 |
| `time_limit_exceeded` | 超时 |
| `memory_limit_exceeded` | 超内存 |
| `runtime_error` | 运行错误 |
| `compile_error` | 编译错误 |
| `judge_error` | 判题系统错误 |

## 配置说明

### 判题配置（`config.js`）

```javascript
judge: {
    timeLimit: {
        cpp: 2,      // C++ 时间限制（秒）
        java: 3,     // Java 时间限制（秒）
        python: 5    // Python 时间限制（秒）
    },
    memoryLimit: {
        cpp: 256,    // C++ 内存限制（MB）
        java: 512,   // Java 内存限制（MB）
        python: 512  // Python 内存限制（MB）
    }
}
```

## 部署到服务器

### 使用部署脚本（推荐）

```bash
# 1. 上传代码到服务器
scp -r oj-backend root@your-server:/var/www/oj-system

# 2. 登录服务器
ssh root@your-server

# 3. 执行部署脚本
cd /var/www/oj-system
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 1. 安装依赖
npm install --production

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动服务
pm2 start app.js --name oj-backend
pm2 save
```

## CloudBase 数据库配置

### 创建数据表

1. 登录 CloudBase 控制台
2. 创建以下集合（表）：

#### problems（题目表）

```javascript
{
  "_id": "problem-001",
  "title": "A+B问题",
  "description": "输入两个整数，输出它们的和",
  "inputFormat": "一行包含两个整数A和B",
  "outputFormat": "输出A+B的值",
  "samples": [
    {
      "input": "1 2",
      "output": "3"
    }
  ],
  "testCases": [
    {
      "input": "1 2",
      "expectedOutput": "3",
      "isSample": true
    }
  ],
  "difficulty": "easy",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

#### submissions（提交记录表）

会自动创建，无需手动初始化。

## 常见问题

### Q1: 如何查看服务日志？

```bash
pm2 logs oj-backend
```

### Q2: 如何重启服务？

```bash
pm2 restart oj-backend
```

### Q3: 如何查看服务状态？

```bash
pm2 list
```

### Q4: 判题超时怎么办？

在 `config.js` 中调整 `judge.timeLimit` 配置。

### Q5: 如何添加新的测试用例？

通过 CloudBase 控制台直接编辑 `problems` 集合，添加测试用例到 `testCases` 数组。

## 开发说明

### 项目结构

```
oj-backend/
├── app.js              # 主入口文件
├── config.js           # 配置文件
├── package.json        # 依赖配置
├── deploy.sh           # 部署脚本
├── routes/             # API路由
│   ├── problems.js     # 题目管理
│   ├── submit.js       # 代码提交
│   ├── status.js       # 状态查询
│   └── languages.js    # 语言列表
└── judge/              # 判题模块
    └── sandbox.js      # 沙箱判题核心
```

## 许可证

MIT

## 联系方式

- 作者: point_xuan
- 博客: https://hhxpoint.github.io
