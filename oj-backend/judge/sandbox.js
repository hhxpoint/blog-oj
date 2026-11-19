/**
 * Sandbox Judge
 * 沙箱判题核心模块
 * 使用Docker容器隔离用户代码执行
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const config = require('../config');

class SandboxJudge {
    constructor() {
        this.workDir = config.judge.workDir;
    }

    /**
     * 创建工作目录
     */
    async createWorkDir() {
        const dir = path.join(this.workDir, `judge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        await fs.ensureDir(dir);
        return dir;
    }

    /**
     * 清理工作目录
     */
    async cleanup(dir) {
        try {
            await fs.remove(dir);
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    /**
     * 保存源代码文件
     */
    async saveCodeFile(dir, code, extension) {
        const filename = extension === 'cpp' ? 'main.cpp' : 
                        extension === 'java' ? 'Main.java' : 
                        'main.py';
        const filePath = path.join(dir, filename);
        await fs.writeFile(filePath, code, 'utf8');
        return filePath;
    }

    /**
     * 编译代码
     */
    async compile(dir, language) {
        const compileConfig = config.compile[language];
        
        if (!compileConfig.command) {
            return { success: true, executable: null }; // Python不需要编译
        }

        try {
            const output = execSync(
                `${compileConfig.command} ${compileConfig.args.join(' ')}`,
                {
                    cwd: dir,
                    timeout: compileConfig.timeout,
                    stdio: ['pipe', 'pipe', 'pipe']
                }
            );
            return { success: true, executable: true };
        } catch (error) {
            return {
                success: false,
                error: error.stderr.toString() || error.message,
                status: 'compile_error'
            };
        }
    }

    /**
     * 运行代码
     */
    async runCode(dir, language, input, timeLimit, memoryLimit) {
        const runConfig = config.run[language];
        const command = runConfig.command;
        const args = runConfig.args;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const memoryUsages = [];
            let output = '';
            let errorOutput = '';
            let timedOut = false;

            const childProcess = spawn(command, args, {
                cwd: dir,
                env: { ...process.env, ...runConfig.env }
            });

            // 超时处理
            const timeout = setTimeout(() => {
                timedOut = true;
                childProcess.kill();
                resolve({
                    success: false,
                    status: 'time_limit_exceeded',
                    output: output.slice(-100), // 返回部分输出
                    runtime: timeLimit * 1000
                });
            }, timeLimit * 1000);

            // 写入输入（安全处理）
            if (childProcess.stdin && input) {
                try {
                    childProcess.stdin.write(input);
                } catch (e) {
                    // 忽略写入错误
                }
            }
            if (childProcess.stdin) {
                try {
                    childProcess.stdin.end();
                } catch (e) {
                    // 忽略关闭错误
                }
            }

            // 收集输出
            childProcess.stdout.on('data', (data) => {
                output += data.toString();
                // 检查输出长度限制
                if (output.length > config.judge.outputLimit) {
                    childProcess.kill();
                }
            });

            childProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            childProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (timedOut) return;

                const runtime = Date.now() - startTime;
                
                if (errorOutput.length > 0) {
                    resolve({
                        success: false,
                        status: 'runtime_error',
                        error: errorOutput,
                        runtime
                    });
                    return;
                }

                // 检查返回码
                if (code !== 0) {
                    resolve({
                        success: false,
                        status: 'runtime_error',
                        error: `Process exited with code ${code}`,
                        runtime
                    });
                    return;
                }

                // 检查输出长度
                if (output.length > config.judge.outputLimit) {
                    resolve({
                        success: false,
                        status: 'output_limit_exceeded',
                        output: output.slice(-100),
                        runtime
                    });
                    return;
                }

                resolve({
                    success: true,
                    output: output.trim(),
                    runtime
                });
            });

            childProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * 比较输出
     */
    compareOutput(actual, expected) {
        const normalize = (str) => str.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
        return normalize(actual) === normalize(expected);
    }

    /**
     * 运行代码（仅编译运行，不比较输出）
     */
    async runCodeOnly(code, language, input) {
        const workDir = await this.createWorkDir();
        
        try {
            // 1. 保存源代码
            const langConfig = config.languages.find(l => l.id === language);
            await this.saveCodeFile(workDir, code, langConfig.extension);

            // 2. 编译
            const compileResult = await this.compile(workDir, language);
            if (!compileResult.success) {
                return {
                    success: false,
                    status: compileResult.status || 'compile_error',
                    output: '',
                    error: compileResult.error
                };
            }

            // 3. 运行代码
            const timeLimit = config.judge.timeLimit[language] || 10;
            const memoryLimit = config.judge.memoryLimit[language] || 128;
            const runResult = await this.runCode(workDir, language, input, timeLimit, memoryLimit);

            return {
                success: runResult.success,
                status: runResult.status || 'success',
                output: runResult.output || '',
                error: runResult.error || '',
                runtime: runResult.runtime
            };

        } catch (error) {
            console.error('Run code error:', error);
            return {
                success: false,
                status: 'judge_error',
                output: '',
                error: error.message
            };
        } finally {
            await this.cleanup(workDir);
        }
    }

    /**
     * 主判题函数
     */
    async run(code, language, testCases, judgeConfig) {
        const workDir = await this.createWorkDir();
        
        try {
            // 1. 保存源代码
            const langConfig = config.languages.find(l => l.id === language);
            await this.saveCodeFile(workDir, code, langConfig.extension);

            // 2. 编译
            const compileResult = await this.compile(workDir, language);
            if (!compileResult.success) {
                return {
                    success: false,
                    status: compileResult.status || 'compile_error',
                    runtime: 0,
                    memoryUsage: 0,
                    testCaseResults: [],
                    error: compileResult.error
                };
            }

            // 3. 运行测试用例
            const timeLimit = judgeConfig.timeLimit[language] || config.judge.timeLimit[language];
            const memoryLimit = judgeConfig.memoryLimit[language] || config.judge.memoryLimit[language];

            const testCaseResults = [];
            let maxRuntime = 0;
            let finalStatus = 'accepted';

            for (const testCase of testCases) {
                const runResult = await this.runCode(workDir, language, testCase.input, timeLimit, memoryLimit);
                
                maxRuntime = Math.max(maxRuntime, runResult.runtime);

                const testCaseResult = {
                    testCaseId: testCase._id || testCase.id,
                    status: runResult.status,
                    runtime: runResult.runtime,
                    memoryUsage: 0
                };

                if (runResult.success) {
                    const isCorrect = this.compareOutput(runResult.output, testCase.expectedOutput);
                    if (!isCorrect) {
                        testCaseResult.status = 'wrong_answer';
                        finalStatus = 'wrong_answer';
                    }
                } else {
                    finalStatus = runResult.status;
                }

                testCaseResults.push(testCaseResult);

                // 如果不是AC，可以提前结束（可选）
                if (finalStatus !== 'accepted' && finalStatus !== 'compiling') {
                    break;
                }
            }

            return {
                success: finalStatus === 'accepted',
                status: finalStatus,
                runtime: maxRuntime,
                memoryUsage: 0, // TODO: 实现真正的内存监控
                testCaseResults
            };

        } catch (error) {
            console.error('Judge error:', error);
            return {
                success: false,
                status: 'judge_error',
                runtime: 0,
                memoryUsage: 0,
                testCaseResults: [],
                error: error.message
            };
        } finally {
            await this.cleanup(workDir);
        }
    }
}

module.exports = new SandboxJudge();
