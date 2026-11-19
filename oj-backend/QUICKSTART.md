# OJ系统快速开始指南

## 🎉 恭喜！OJ系统已配置完成

### 已完成的配置

✅ **后端代码**已生成并配置
✅ **前端页面**已集成到博客
✅ **CloudBase配置**已填入实际密钥
✅ **Hexo配置**已更新
✅ **部署脚本**已准备完毕

---

## 📋 你现在需要做的

### 步骤1：上传代码到服务器（5分钟）

在本地电脑执行：

```bash
# 进入项目目录
cd d:/Blog

# 上传后端代码
scp -r oj-backend root@82.156.126.121:/var/www/
```

### 步骤2：登录服务器并部署（10分钟）

在OrcaTerm中执行：

```bash
# 进入项目目录
cd /var/www/oj-backend

# 执行部署脚本
chmod +x deploy-full.sh
./deploy-full.sh
```

### 步骤3：在CloudBase创建测试数据（5分钟）

访问 https://console.cloud.tencent.com/tcb

1. 选择环境 `point`
2. 进入"数据库"
3. 创建集合 `problems`
4. 添加测试题目（参考 `DATABASE_INIT.md`）

### 步骤4：测试系统（5分钟）

1. 访问后端API：`http://82.156.126.121:3000/api/health`
2. 访问前端页面：`https://hhxpoint.github.io/oj/`
3. 提交测试代码，验证判题功能

---

## 🎯 访问地址

### 前端页面
- OJ首页：`https://hhxpoint.github.io/oj/`
- 题目详情：`https://hhxpoint.github.io/oj/problem/index.html?id=problem-001`

### 后端API
- 健康检查：`http://82.156.126.121:3000/api/health`
- 题目列表：`http://82.156.126.121:3000/api/problems`
- 语言列表：`http://82.156.126.121:3000/api/languages`

---

## 📊 测试代码示例

### C++示例（A+B问题）

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
```

### Java示例（A+B问题）

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int a = scanner.nextInt();
        int b = scanner.nextInt();
        System.out.println(a + b);
        scanner.close();
    }
}
```

### Python示例（A+B问题）

```python
def main():
    line = input().split()
    a, b = int(line[0]), int(line[1])
    print(a + b)

if __name__ == "__main__":
    main()
```

---

## 🔧 常用命令

### 查看服务状态

```bash
pm2 list
```

### 查看日志

```bash
pm2 logs oj-backend
```

### 重启服务

```bash
pm2 restart oj-backend
```

### 测试API

```bash
# 健康检查
curl http://localhost:3000/api/health

# 获取题目列表
curl http://localhost:3000/api/problems

# 获取支持的语言
curl http://localhost:3000/api/languages
```

---

## 📚 文档说明

| 文档 | 说明 |
|------|------|
| `README.md` | 项目概述和功能说明 |
| `DEPLOYMENT_GUIDE.md` | 详细部署指南 |
| `DATABASE_INIT.md` | 数据库初始化和测试数据 |
| `config.js` | 配置文件（已填入密钥） |
| `.env` | 环境变量（已填入密钥） |

---

## ⚡ 快速测试流程

1. ✅ 访问 `https://hhxpoint.github.io/oj/`
2. ✅ 点击题目列表中的"A+B问题"
3. ✅ 选择C++语言
4. ✅ 粘贴测试代码
5. ✅ 点击"提交运行"
6. ✅ 等待判题结果（2-10秒）
7. ✅ 查看结果（应该显示"通过"）

---

## 🐛 遇到问题？

### 问题1：无法访问后端API

**检查清单**：
- [ ] 服务是否启动：`pm2 list`
- [ ] 防火墙是否开放：`firewall-cmd --list-ports`
- [ ] 端口是否监听：`netstat -tunlp | grep 3000`

### 问题2：数据库连接失败

**检查清单**：
- [ ] CloudBase配置是否正确：`cat .env`
- [ ] 网络是否正常：`ping tcb.tencentcloudapi.com`

### 问题3：判题失败

**检查清单**：
- [ ] 编译器是否安装：`gcc --version`
- [ ] 工作目录权限：`ls -la /tmp/oj-judge`

---

## 🎓 下一步学习

1. 添加更多题目
2. 自定义判题规则
3. 添加排行榜功能
4. 优化性能（使用Redis）
5. 添加用户登录系统

---

**准备好了吗？开始部署吧！** 🚀

有任何问题随时查看文档或询问！
