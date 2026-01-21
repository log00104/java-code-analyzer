// script.js - 前端逻辑
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const codeInput = document.getElementById('codeInput');
    const charCount = document.getElementById('charCount');
    const lineCount = document.getElementById('lineCount');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const clearBtn = document.getElementById('clearBtn');
    const fileUpload = document.getElementById('fileUpload');
    const dropArea = document.getElementById('dropArea');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const inputModes = document.querySelectorAll('.input-mode');
    const exportBtn = document.getElementById('exportBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const apiStatus = document.getElementById('apiStatus');
    const historyList = document.getElementById('historyList');
    const sampleModal = document.getElementById('sampleModal');

    // 初始化示例代码
    const sampleCode = {
        vulnerable: `import java.sql.*;

public class VulnerableCode {
    public void getUserData(String userId) {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        
        try {
            conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/mydb", "root", "password123");
            stmt = conn.createStatement();
            
            // 危险：SQL注入漏洞
            String query = "SELECT * FROM users WHERE id = '" + userId + "'";
            rs = stmt.executeQuery(query);
            
            // 危险：硬编码密码
            String adminPassword = "admin123";
            
            while (rs.next()) {
                System.out.println("User: " + rs.getString("username"));
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            // 资源可能未正确关闭
        }
    }
    
    public void executeCommand(String input) {
        try {
            // 危险：命令注入
            Runtime.getRuntime().exec("ping " + input);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}`,

        performance: `import java.util.*;

public class PerformanceIssues {
    public void stringConcatenation() {
        String result = "";
        
        // 性能问题：循环中使用字符串拼接
        for (int i = 0; i < 1000; i++) {
            result += "data" + i; // 应该使用StringBuilder
        }
    }
    
    public void inefficientCollections() {
        List<String> list = new ArrayList<>();
        
        // 性能问题：频繁扩容
        for (int i = 0; i < 10000; i++) {
            list.add("item" + i);
        }
        
        // 性能问题：不必要的装箱拆箱
        Integer sum = 0;
        for (int i = 0; i < 1000; i++) {
            sum += i; // 自动装箱拆箱开销
        }
    }
    
    public void objectCreationInLoop() {
        List<Date> dates = new ArrayList<>();
        
        // 性能问题：循环内创建对象
        for (int i = 0; i < 1000; i++) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            dates.add(new Date());
        }
    }
}`,

        buggy: `import java.io.*;

public class BuggyCode {
    public void potentialNPE(String input) {
        // 潜在Bug：可能抛出NullPointerException
        if (input.equals("test")) {
            System.out.println("Found test");
        }
    }
    
    public void resourceLeak() {
        FileInputStream fis = null;
        
        try {
            fis = new FileInputStream("test.txt");
            // 处理文件...
            
            // Bug：异常时资源未关闭
            if (someCondition()) {
                throw new IOException("Test exception");
            }
            
        } catch (IOException e) {
            e.printStackTrace();
        }
        // 资源未在finally中关闭
    }
    
    public void concurrentIssue() {
        List<String> list = new ArrayList<>();
        
        // 并发问题：ArrayList不是线程安全的
        Runnable task = () -> {
            list.add("item");
        };
        
        new Thread(task).start();
        new Thread(task).start();
    }
    
    private boolean someCondition() {
        return Math.random() > 0.5;
    }
}`,

        style: `public class StyleViolations {
    private String MY_CONSTANT = "constant"; // 命名规范：常量应该大写
    
    public void longMethod() {
        // 这个方法太长了，违反了单一职责原则
        int a = 1;
        int b = 2;
        int c = 3;
        int d = 4;
        int e = 5;
        int f = 6;
        int g = 7;
        int h = 8;
        int i = 9;
        int j = 10;
        int k = 11;
        int l = 12;
        int m = 13;
        int n = 14;
        int o = 15;
        int p = 16;
        int q = 17;
        int r = 18;
        int s = 19;
        int t = 20;
        int u = 21;
        int v = 22;
        int w = 23;
        int x = 24;
        int y = 25;
        int z = 26;
        
        // 重复的代码块
        System.out.println("Processing " + a);
        System.out.println("Processing " + b);
        System.out.println("Processing " + c);
        // ... 更多重复代码
    }
    
    public void complexLogic() {
        // 复杂的条件逻辑，圈复杂度高
        if (condition1()) {
            if (condition2()) {
                for (int i = 0; i < 10; i++) {
                    while (condition3()) {
                        switch (i) {
                            case 1: break;
                            case 2: break;
                            default: break;
                        }
                    }
                }
            }
        } else if (condition4()) {
            try {
                // 复杂的异常处理
            } catch (Exception e) {
                // 空的catch块
            }
        }
    }
    
    private boolean condition1() { return true; }
    private boolean condition2() { return true; }
    private boolean condition3() { return true; }
    private boolean condition4() { return true; }
}`
    };

    // 初始化状态
    let currentFile = null;
    let analysisHistory = JSON.parse(localStorage.getItem('analysisHistory') || '[]');

    // 初始化代码高亮
    hljs.highlightAll();

    // 更新字符和行数统计
    function updateCounters() {
        const text = codeInput.value;
        charCount.textContent = `${text.length} 字符`;
        lineCount.textContent = `${text.split('\n').length} 行`;
    }

    // 切换输入模式
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            // 更新按钮状态
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 显示对应的输入区域
            inputModes.forEach(div => {
                div.classList.remove('active');
                if (div.id === `${mode}Input`) {
                    div.classList.add('active');
                }
            });
        });
    });

    // 文件拖放功能
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.style.borderColor = '#2563eb';
        dropArea.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
    }

    function unhighlight() {
        dropArea.style.borderColor = '';
        dropArea.style.backgroundColor = '';
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (file.size > 1024 * 1024) {
            alert('文件大小不能超过1MB');
            return;
        }

        if (!file.name.endsWith('.java') && !file.name.endsWith('.txt')) {
            alert('只支持.java和.txt文件');
            return;
        }

        currentFile = file;

        // 显示文件信息
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        fileName.textContent = file.name;
        fileSize.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        fileInfo.classList.remove('hidden');

        // 读取文件内容
        const reader = new FileReader();
        reader.onload = function (e) {
            codeInput.value = e.target.result;
            updateCounters();
        };
        reader.readAsText(file);
    }

    // 移除文件
    document.getElementById('removeFile').addEventListener('click', () => {
        currentFile = null;
        document.getElementById('fileInfo').classList.add('hidden');
        fileUpload.value = '';
    });

    // 清空代码
    clearBtn.addEventListener('click', () => {
        if (confirm('确定要清空代码吗？')) {
            codeInput.value = '';
            updateCounters();
            currentFile = null;
            document.getElementById('fileInfo').classList.add('hidden');
            fileUpload.value = '';
            showStatusMessage('请输入或上传Java代码进行分析');
        }
    });

    // 加载示例代码
    sampleBtn.addEventListener('click', () => {
        sampleModal.classList.remove('hidden');
    });

    // 关闭模态框
    document.querySelector('.close-modal').addEventListener('click', () => {
        sampleModal.classList.add('hidden');
    });

    sampleModal.addEventListener('click', (e) => {
        if (e.target === sampleModal) {
            sampleModal.classList.add('hidden');
        }
    });

    // 选择示例代码
    document.querySelectorAll('.sample-item').forEach(item => {
        item.addEventListener('click', () => {
            const sampleType = item.dataset.sample;
            codeInput.value = sampleCode[sampleType];
            updateCounters();
            sampleModal.classList.add('hidden');
        });
    });

    // 开始分析
    analyzeBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();

        if (code.length === 0) {
            alert('请输入Java代码');
            return;
        }

        // 显示加载状态
        showLoading(true);

        // 获取分析选项
        const options = {
            security: document.getElementById('optSecurity').checked,
            performance: document.getElementById('optPerformance').checked,
            style: document.getElementById('optStyle').checked,
            bugs: document.getElementById('optBugs').checked
        };

        try {
            const result = await analyzeCode(code, options);

            // 保存到历史记录
            const historyItem = {
                id: Date.now(),
                timestamp: new Date().toLocaleString(),
                codeLength: code.length,
                issuesCount: result.data.issues.length,
                summary: result.data.summary
            };

            analysisHistory.unshift(historyItem);
            if (analysisHistory.length > 10) {
                analysisHistory = analysisHistory.slice(0, 10);
            }

            localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
            updateHistoryList();

            // 显示分析结果
            displayAnalysisResults(result.data);

            // 启用导出和复制按钮
            exportBtn.disabled = false;
            copyBtn.disabled = false;

        } catch (error) {
            console.error('分析失败:', error);
            showStatusMessage('分析失败: ' + error.message, true);
        } finally {
            showLoading(false);
        }
    });

    // 分析代码函数
    async function analyzeCode(code, options) {
        // 如果是本地开发，使用模拟数据
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                success: true,
                data: generateMockAnalysis(code, options),
                history: {
                    timestamp: new Date().toISOString(),
                    codeLength: code.length,
                    issuesCount: 3
                }
            };
        }

        // 调用API
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, options })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        return await response.json();
    }

    // 显示加载状态
    function showLoading(show) {
        const statusMessage = document.getElementById('statusMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        if (show) {
            statusMessage.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
            statusMessage.classList.remove('hidden');
        }
    }

    // 显示状态消息
    function showStatusMessage(message, isError = false) {
        const statusArea = document.getElementById('statusArea');
        const statusMessage = document.getElementById('statusMessage');

        statusMessage.innerHTML = `
            <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <p>${message}</p>
        `;

        if (isError) {
            statusMessage.style.color = '#ef4444';
        } else {
            statusMessage.style.color = '';
        }

        document.getElementById('summaryCards').classList.add('hidden');
        document.getElementById('resultsArea').classList.add('hidden');
        statusArea.classList.remove('hidden');
        exportBtn.disabled = true;
        copyBtn.disabled = true;
    }

    // 显示分析结果
    function displayAnalysisResults(data) {
        // 更新摘要卡片
        document.getElementById('criticalCount').textContent = data.summary.critical || 0;
        document.getElementById('highCount').textContent = data.summary.high || 0;
        document.getElementById('mediumCount').textContent = data.summary.medium || 0;
        document.getElementById('lowCount').textContent = data.summary.low || 0;

        // 显示摘要卡片和结果区域
        document.getElementById('statusArea').classList.add('hidden');
        document.getElementById('summaryCards').classList.remove('hidden');
        document.getElementById('resultsArea').classList.remove('hidden');

        // 显示问题列表
        displayIssues(data.issues);

        // 显示代码视图
        displayCodeView(data.code);

        // 显示修复建议
        displaySuggestions(data.suggestions);

        // 更新代码度量
        updateMetrics(data.metrics);

        // 设置标签页切换
        setupTabs();
    }

    // 显示问题列表
    function displayIssues(issues) {
        const issuesList = document.getElementById('issuesList');

        if (!issues || issues.length === 0) {
            issuesList.innerHTML = `
                <div class="no-issues">
                    <i class="fas fa-check-circle fa-3x"></i>
                    <h3>代码检查通过！</h3>
                    <p>没有发现明显的问题。</p>
                </div>
            `;
            return;
        }

        issuesList.innerHTML = issues.map((issue, index) => `
            <div class="issue-item severity-${issue.severity}">
                <div class="issue-header">
                    <div class="issue-title">
                        <span class="issue-type ${issue.type}">${getIssueTypeText(issue.type)}</span>
                        ${issue.message}
                    </div>
                    <span class="issue-severity">${getSeverityText(issue.severity)}</span>
                </div>
                <div class="issue-line">
                    <i class="fas fa-code"></i> 第 ${issue.line || 1} 行
                </div>
                <div class="issue-suggestion">
                    <strong>建议：</strong> ${issue.suggestion}
                </div>
            </div>
        `).join('');
    }

    // 显示代码视图
    function displayCodeView(code) {
        const codeViewer = document.getElementById('codeViewer');
        codeViewer.textContent = code;
        hljs.highlightElement(codeViewer);
    }

    // 显示修复建议
    function displaySuggestions(suggestions) {
        const suggestionsList = document.getElementById('suggestionsList');

        if (!suggestions || suggestions.length === 0) {
            suggestionsList.innerHTML = `
                <div class="no-suggestions">
                    <i class="fas fa-lightbulb"></i>
                    <p>暂无额外的修复建议</p>
                </div>
            `;
            return;
        }

        suggestionsList.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item">
                <h4>${suggestion.title}</h4>
                <p>${suggestion.content}</p>
            </div>
        `).join('');
    }

    // 更新代码度量
    function updateMetrics(metrics) {
        document.getElementById('metricComplexity').textContent = metrics.complexity || 0;
        document.getElementById('metricLines').textContent = metrics.lines || 0;
        document.getElementById('metricMaintainability').textContent = metrics.maintainability || 0;
        document.getElementById('metricSecurity').textContent = metrics.securityScore ? `${metrics.securityScore}%` : '0%';

        // 更新进度条
        document.querySelectorAll('.metric-fill').forEach((fill, index) => {
            let percentage = 0;
            switch (index) {
                case 0: // 圈复杂度
                    percentage = Math.min(100, ((metrics.complexity || 0) / 20) * 100);
                    fill.style.backgroundColor = percentage > 80 ? '#ef4444' :
                        percentage > 60 ? '#f59e0b' : '#10b981';
                    break;
                case 1: // 代码行数
                    percentage = Math.min(100, ((metrics.lines || 0) / 500) * 100);
                    fill.style.backgroundColor = percentage > 80 ? '#ef4444' :
                        percentage > 60 ? '#f59e0b' : '#10b981';
                    break;
                case 2: // 可维护性
                    percentage = metrics.maintainability || 0;
                    fill.style.backgroundColor = percentage < 50 ? '#ef4444' :
                        percentage < 70 ? '#f59e0b' : '#10b981';
                    break;
                case 3: // 安全评分
                    percentage = metrics.securityScore || 0;
                    fill.style.backgroundColor = percentage < 60 ? '#ef4444' :
                        percentage < 80 ? '#f59e0b' : '#10b981';
                    break;
            }
            fill.style.width = `${percentage}%`;
        });
    }

    // 设置标签页切换
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // 更新按钮状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 显示对应的标签页
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `tab-${tabId}`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }

    // 获取问题类型文本
    function getIssueTypeText(type) {
        const typeMap = {
            security: '安全漏洞',
            performance: '性能问题',
            bug: '潜在Bug',
            style: '代码规范'
        };
        return typeMap[type] || type;
    }

    // 获取严重程度文本
    function getSeverityText(severity) {
        const severityMap = {
            critical: '严重',
            high: '高危',
            medium: '中危',
            low: '低危'
        };
        return severityMap[severity] || severity;
    }

    // 更新历史记录列表
    function updateHistoryList() {
        historyList.innerHTML = analysisHistory.map(item => `
            <div class="history-item" onclick="loadHistory(${item.id})">
                <div class="history-time">${item.timestamp}</div>
                <div class="history-info">
                    <span>${item.codeLength} 字符</span>
                    <span>${item.issuesCount} 个问题</span>
                </div>
            </div>
        `).join('');
    }

    // 加载历史记录（全局函数）
    window.loadHistory = function (id) {
        const item = analysisHistory.find(h => h.id === id);
        if (item) {
            // 这里可以添加加载历史代码的逻辑
            alert('历史记录加载功能需要后端支持');
        }
    };

    // 清空历史记录
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有历史记录吗？')) {
            analysisHistory = [];
            localStorage.removeItem('analysisHistory');
            updateHistoryList();
        }
    });

    // 复制结果
    copyBtn.addEventListener('click', async () => {
        try {
            const issues = Array.from(document.querySelectorAll('.issue-item')).map(item => {
                const title = item.querySelector('.issue-title').textContent;
                const line = item.querySelector('.issue-line').textContent;
                const suggestion = item.querySelector('.issue-suggestion').textContent;
                return `${title}\n${line}\n${suggestion}\n`;
            }).join('\n');

            await navigator.clipboard.writeText(issues);
            alert('分析结果已复制到剪贴板');
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败');
        }
    });

    // 导出报告
    exportBtn.addEventListener('click', () => {
        const issues = Array.from(document.querySelectorAll('.issue-item')).map(item => {
            const title = item.querySelector('.issue-title').textContent;
            const line = item.querySelector('.issue-line').textContent;
            const suggestion = item.querySelector('.issue-suggestion').textContent;
            return `• ${title}\n  位置：${line}\n  建议：${suggestion}\n`;
        }).join('\n');

        const report = `Java代码分析报告
生成时间：${new Date().toLocaleString()}
问题总数：${document.querySelectorAll('.issue-item').length}

${issues}`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `java-code-analysis-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 检查API状态
    async function checkAPIStatus() {
        try {
            const response = await fetch('/api/analyze', { method: 'OPTIONS' });
            const statusDot = apiStatus.querySelector('.status-dot');
            const statusText = apiStatus.querySelector('span:last-child');

            if (response.ok) {
                statusDot.style.backgroundColor = '#10b981';
                statusText.textContent = '在线';
                apiStatus.style.color = '#10b981';
            } else {
                statusDot.style.backgroundColor = '#f59e0b';
                statusText.textContent = '受限';
                apiStatus.style.color = '#f59e0b';
            }
        } catch (error) {
            const statusDot = apiStatus.querySelector('.status-dot');
            const statusText = apiStatus.querySelector('span:last-child');
            statusDot.style.backgroundColor = '#ef4444';
            statusText.textContent = '离线';
            apiStatus.style.color = '#ef4444';
        }
    }

    // 模拟分析数据生成（用于本地测试）
    function generateMockAnalysis(code, options) {
        const issues = [];
        const lines = code.split('\n');

        // 模拟安全漏洞检测
        if (options.security && code.includes('Statement.execute')) {
            issues.push({
                type: 'security',
                severity: 'critical',
                line: findLineContaining(code, 'Statement.execute'),
                message: 'SQL注入漏洞：使用Statement直接执行用户输入',
                suggestion: '使用PreparedStatement进行参数化查询'
            });
        }

        if (options.security && code.includes('Runtime.getRuntime().exec(')) {
            issues.push({
                type: 'security',
                severity: 'high',
                line: findLineContaining(code, 'Runtime.getRuntime().exec('),
                message: '命令注入风险',
                suggestion: '对输入进行严格验证和转义'
            });
        }

        // 模拟性能问题检测
        if (options.performance && code.includes('String +=') && code.includes('for')) {
            issues.push({
                type: 'performance',
                severity: 'medium',
                line: findLineContaining(code, 'String +='),
                message: '循环中使用字符串拼接，性能低下',
                suggestion: '使用StringBuilder进行字符串拼接'
            });
        }

        // 模拟Bug检测
        if (options.bugs && code.includes('close()') && !code.includes('finally') && !code.includes('try-with-resources')) {
            issues.push({
                type: 'bug',
                severity: 'high',
                line: findLineContaining(code, 'close()'),
                message: '资源可能未正确关闭',
                suggestion: '使用try-with-resources或确保在finally块中关闭资源'
            });
        }

        // 模拟代码规范检测
        if (options.style && lines.length > 50) {
            issues.push({
                type: 'style',
                severity: 'low',
                line: 1,
                message: '代码文件过长，建议拆分为多个类',
                suggestion: '遵循单一职责原则，将大文件拆分为小文件'
            });
        }

        // 计算统计数据
        const summary = {
            critical: issues.filter(i => i.severity === 'critical').length,
            high: issues.filter(i => i.severity === 'high').length,
            medium: issues.filter(i => i.severity === 'medium').length,
            low: issues.filter(i => i.severity === 'low').length
        };

        // 计算代码度量
        const metrics = {
            complexity: calculateComplexity(code),
            lines: lines.length,
            maintainability: Math.max(0, Math.min(100, 100 - (calculateComplexity(code) * 2))),
            securityScore: issues.length === 0 ? 95 : Math.max(50, 95 - (summary.critical * 20 + summary.high * 10))
        };

        // 生成建议
        const suggestions = [];
        if (issues.length > 0) {
            suggestions.push({
                title: '总体优化建议',
                content: '建议优先修复严重和高危问题，然后考虑性能优化和代码规范改进。'
            });
        }

        if (metrics.complexity > 10) {
            suggestions.push({
                title: '降低圈复杂度',
                content: '代码逻辑较复杂，建议拆分为多个小方法，每个方法只负责单一功能。'
            });
        }

        return {
            issues,
            summary,
            metrics,
            suggestions,
            code
        };
    }

    function findLineContaining(code, text) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(text)) {
                return i + 1;
            }
        }
        return 1;
    }

    function calculateComplexity(code) {
        let complexity = 1;
        const patterns = [/\bif\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+[^:]+:/g];

        patterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) complexity += matches.length;
        });

        return Math.min(complexity, 20);
    }

    // 事件监听器
    codeInput.addEventListener('input', updateCounters);
    codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;

            // 插入制表符
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);

            // 移动光标位置
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });

    // 页面加载时初始化
    updateCounters();
    updateHistoryList();
    checkAPIStatus();

    // 每5分钟检查一次API状态
    setInterval(checkAPIStatus, 5 * 60 * 1000);

    // 关于和隐私政策按钮
    document.getElementById('aboutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Java代码缺陷检测工具\n版本：1.0.0\n基于DeepSeek AI的智能代码审查系统\n仅供学习使用');
    });

    document.getElementById('privacyBtn').addEventListener('click', (e) => {
        e.preventDefault();
        alert('隐私政策\n\n我们不会存储您的代码内容。所有分析都在内存中进行，分析完成后不会保留代码副本。');
    });
});