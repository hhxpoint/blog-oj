/**
 * OJ System Frontend JavaScript
 * 在线判题系统前端逻辑
 */

// API 基础地址 - 请修改为你的服务器地址
const API_BASE_URL = 'http://82.156.126.121:3000/api';

// 当前页面状态
let currentPage = 1;
let totalPages = 1;
let currentProblemId = null;
let currentSubmissionId = null;

// ==================== 工具函数 ====================

// 显示加载中
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>加载中...</span>
            </div>
        `;
    }
}

// 显示错误信息
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

// 发送 API 请求
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API request error:', error);
        return {
            success: false,
            message: '网络请求失败'
        };
    }
}

// ==================== 题目列表 ====================

// 加载题目列表
async function loadProblems(page = 1) {
    showLoading('problemList');

    const difficulty = document.getElementById('difficultyFilter').value;
    const keyword = document.getElementById('searchInput').value;

    let url = `/problems?page=${page}&limit=20`;
    if (difficulty) url += `&difficulty=${difficulty}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    const response = await apiRequest(url);

    if (response.success) {
        currentPage = page;
        renderProblemList(response.data);
        renderPagination(page, response.pagination);
    } else {
        showError('problemList', response.message || '加载失败');
    }
}

// 渲染题目列表
function renderProblemList(problems) {
    const container = document.getElementById('problemList');
    if (!container) return;

    if (problems.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-inbox"></i>
                <span>暂无题目</span>
            </div>
        `;
        return;
    }

    container.innerHTML = problems.map((problem, index) => {
        const difficultyClass = problem.difficulty || 'medium';
        const difficultyText = {
            'easy': '简单',
            'medium': '中等',
            'hard': '困难'
        }[difficultyClass] || difficultyClass;

        return `
            <div class="problem-item" onclick="goToProblem('${problem._id}')">
                <div class="problem-id">#${index + 1}</div>
                <div class="problem-title">${problem.title}</div>
                <div class="difficulty ${difficultyClass}">${difficultyText}</div>
                <div class="acceptance-rate">
                    ${problem.acceptanceRate ? problem.acceptanceRate + '%' : '-'}
                </div>
                <div class="status">
                    ${problem.accepted ? '<span class="accepted"><i class="fas fa-check"></i> 已通过</span>' : '-'}
                </div>
            </div>
        `;
    }).join('');
}

// 渲染分页
function renderPagination(page, pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    let html = '';
    html += `<button onclick="loadProblems(${page - 1})" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="loadProblems(${i})" ${i === page ? 'class="active"' : ''}>${i}</button>`;
    }

    html += `<button onclick="loadProblems(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

// 搜索题目
function searchProblems() {
    loadProblems(1);
}

// 筛选题目
function filterProblems() {
    loadProblems(1);
}

// 跳转到题目详情
function goToProblem(problemId) {
    window.location.href = `/oj/problem/index.html?id=${problemId}`;
}

// ==================== 题目详情 ====================

// 加载题目详情
async function loadProblemDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    currentProblemId = urlParams.get('id');

    if (!currentProblemId) {
        showError('problemDescription', '未指定题目ID');
        return;
    }

    showLoading('problemDescription');
    showLoading('inputFormat');
    showLoading('outputFormat');
    showLoading('samples');

    const response = await apiRequest(`/problems/${currentProblemId}`);

    if (response.success) {
        const problem = response.data;
        renderProblemDetail(problem);
    } else {
        showError('problemDescription', response.message || '加载失败');
    }
}

// 渲染题目详情
function renderProblemDetail(problem) {
    document.getElementById('problemTitle').textContent = problem.title || '未知题目';
    document.getElementById('problemDescription').textContent = problem.description || '';
    document.getElementById('inputFormat').textContent = problem.inputFormat || '';
    document.getElementById('outputFormat').textContent = problem.outputFormat || '';

    // 难度
    const difficultyEl = document.getElementById('problemDifficulty');
    difficultyEl.textContent = {
        'easy': '简单',
        'medium': '中等',
        'hard': '困难'
    }[problem.difficulty] || problem.difficulty || '中等';
    difficultyEl.className = `difficulty ${problem.difficulty || 'medium'}`;

    // 时间和内存限制
    document.getElementById('timeLimit').textContent = problem.timeLimit || '1000';
    document.getElementById('memoryLimit').textContent = problem.memoryLimit || '256';

    // 样例
    renderSamples(problem.samples || []);
}

// 渲染样例
function renderSamples(samples) {
    const container = document.getElementById('samples');
    if (!container) return;

    if (samples.length === 0) {
        container.innerHTML = '<div class="empty">暂无样例</div>';
        return;
    }

    container.innerHTML = samples.map((sample, index) => `
        <div class="sample-case">
            <div class="sample-header">样例 ${index + 1}</div>
            <div class="sample-body">
                <div>
                    <div class="sample-label">输入</div>
                    <div class="sample-code">${sample.input || ''}</div>
                </div>
                <div>
                    <div class="sample-label">输出</div>
                    <div class="sample-code">${sample.output || ''}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== 代码提交 ====================

// 提交代码
async function submitCode() {
    const language = document.getElementById('languageSelect').value;
    const code = window.editor ? window.editor.getValue() : '';

    if (!code.trim()) {
        alert('请输入代码');
        return;
    }

    if (!currentProblemId) {
        alert('未指定题目');
        return;
    }

    // 显示结果面板
    const resultPanel = document.getElementById('resultPanel');
    const resultStatus = document.getElementById('resultStatus');
    const resultContent = document.getElementById('resultContent');

    resultPanel.style.display = 'block';
    resultStatus.textContent = '提交中...';
    resultStatus.className = 'result-status pending';
    resultContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在提交代码...';

    const response = await apiRequest('/submit', {
        method: 'POST',
        body: JSON.stringify({
            problemId: currentProblemId,
            language: language,
            code: code,
            userId: 'anonymous'
        })
    });

    if (response.success) {
        currentSubmissionId = response.data.submissionId;
        resultStatus.textContent = '判题中...';
        resultContent.innerHTML = `
            <div>
                <p>提交ID: ${currentSubmissionId}</p>
                <p>状态: 判题中...</p>
            </div>
        `;

        // 开始轮询结果
        pollSubmissionResult(currentSubmissionId);
    } else {
        resultStatus.textContent = '提交失败';
        resultStatus.className = 'result-status wrong-answer';
        resultContent.innerHTML = `
            <div class="error">
                ${response.message || '提交失败'}
            </div>
        `;
    }
}

// 轮询提交结果
async function pollSubmissionResult(submissionId) {
    const maxRetries = 60; // 最多轮询60次
    let retries = 0;

    const poll = async () => {
        const response = await apiRequest(`/status/${submissionId}`);

        if (response.success && response.data) {
            const submission = response.data;
            const resultStatus = document.getElementById('resultStatus');
            const resultContent = document.getElementById('resultContent');

            // 更新状态
            const statusText = getStatusText(submission.status);
            resultStatus.textContent = statusText;
            resultStatus.className = `result-status ${submission.status}`;

            // 如果还在判题中，继续轮询
            if (['pending', 'compiling', 'running'].includes(submission.status)) {
                retries++;
                if (retries < maxRetries) {
                    setTimeout(poll, 2000); // 2秒后再次轮询
                } else {
                    resultContent.innerHTML = `
                        <div class="error">
                            判题超时，请稍后查看提交记录
                        </div>
                    `;
                }
            } else {
                // 判题完成，显示结果
                renderSubmissionResult(submission);
            }
        } else {
            retries++;
            if (retries < maxRetries) {
                setTimeout(poll, 2000);
            }
        }
    };

    poll();
}

// 渲染提交结果
function renderSubmissionResult(submission) {
    const resultContent = document.getElementById('resultContent');

    if (!submission.testCaseResults || submission.testCaseResults.length === 0) {
        resultContent.innerHTML = `
            <div class="error">
                ${submission.error || '未知错误'}
            </div>
        `;
        return;
    }

    const passedCount = submission.testCaseResults.filter(t => t.status === 'accepted').length;
    const totalCount = submission.testCaseResults.length;

    let html = `
        <div class="result-summary">
            <p><strong>运行时间:</strong> ${submission.runtime}ms</p>
            <p><strong>内存使用:</strong> ${submission.memoryUsage}KB</p>
            <p><strong>测试用例:</strong> ${passedCount}/${totalCount} 通过</p>
        </div>
        <div class="test-cases">
    `;

    submission.testCaseResults.forEach((testCase, index) => {
        const statusClass = testCase.status === 'accepted' ? 'accepted' : 'failed';
        const statusText = getStatusText(testCase.status);

        html += `
            <div class="test-case-result ${statusClass}">
                <div><strong>测试用例 ${index + 1}:</strong> ${statusText}</div>
                <div>运行时间: ${testCase.runtime}ms</div>
            </div>
        `;
    });

    html += '</div>';
    resultContent.innerHTML = html;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '等待判题',
        'compiling': '编译中',
        'running': '运行中',
        'accepted': '通过',
        'wrong_answer': '答案错误',
        'time_limit_exceeded': '超时',
        'memory_limit_exceeded': '超内存',
        'runtime_error': '运行错误',
        'compile_error': '编译错误',
        'judge_error': '判题错误'
    };
    return statusMap[status] || status;
}

// ==================== 初始化 ====================

// 页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化各种功能
    console.log('OJ System initialized');
});

// 导出全局函数
window.loadProblems = loadProblems;
window.searchProblems = searchProblems;
window.filterProblems = filterProblems;
window.submitCode = submitCode;
window.goToProblem = goToProblem;
