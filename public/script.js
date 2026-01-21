class CodeAnalyzer {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.loadHistory();
        this.checkAPIStatus();
    }

    initElements() {
        // 输入元素
        this.codeInput = document.getElementById('codeInput');
        this.charCount = document.getElementById('charCount');
        this.lineCount = document.getElementById('lineCount');

        // 按钮
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.sampleBtn = document.getElementById('sampleBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearHistoryBtn = document.getElementById('clearHistory');

        // 模式切换
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.textInput = document.getElementById('textInput');
        this.fileInput = document.getElementById('fileInput');

        // 文件上传
        this.fileUpload = document.getElementById('fileUpload');
        this.dropArea = document.getElementById('dropArea');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.removeFile = document.getElementById('removeFile');

        // 分析选项
        this.optSecurity = document.getElementById('optSecurity');
        this.optPerformance = document.getElementById('optPerformance');
        this.optStyle = document.getElementById('optStyle');
        this.optBugs = document.getElementById('optBugs');

        // 结果显示
        this.statusArea = document.getElementById('statusArea');
        this.statusMessage = document.getElementById('statusMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.summaryCards = document.getElementById('summaryCards');
        this.resultsArea = document.getElementById('resultsArea');

        // 摘要计数
        this.criticalCount = document.getElementById('criticalCount');
        this.highCount = document.getElementById('highCount');
        this.mediumCount = document.getElementById('mediumCount');
        this.lowCount = document.getElementById('lowCount');

        // 标签页
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');

        // 问题列表
        this.issuesList = document.getElementById('issuesList');
        this.codeViewer = document.getElementById('codeViewer');
        this.suggestionsList = document.getElementById('suggestionsList');

        // 度量指标
        this.metricComplexity = document.getElementById('metricComplexity');
        this.metricLines = document.getElementById('metricLines');
        this.metricMaintainability = document.getElementById('metricMaintainability');
        this.metricSecurity = document.getElementById('metricSecurity');
        this.metricBars = document.querySelectorAll('.metric-fill');

        // 模态框
        this.sampleModal = document.getElementById('sampleModal');
        this.sampleItems = document.querySelectorAll('.sample-item');
        this.closeModal = document.querySelector('.close-modal');

        // API状态
        this.apiStatus = document.getElementById('apiStatus');

        // 历史记录
        this.historyList = document.getElementById('historyList');
    }

    initEventListeners() {
        // 代码输入监听
        this.codeInput.addEventListener('input', () => this.updateCounters());

        // 分析按钮
        this.analyzeBtn.addEventListener('click', () => this.analyzeCode());

        // 示例按钮
        this.sampleBtn.addEventListener('click', () => this.showSampleModal());

        // 清空按钮
        this.clearBtn.addEventListener('click', () => this.clearCode());

        // 导出按钮
        this.exportBtn.addEventListener('click', () => this.exportReport());

        // 复制按钮
        this.copyBtn.addEventListener('click', () => this.copyResults());

        // 清空历史
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // 模式切换
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchInputMode(btn.dataset.mode));
        });

        // 文件上传
        this.fileUpload.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeFile.addEventListener('click', () => this.removeSelectedFile());

        // 拖放功能
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.style.borderColor = '#2563eb';
            this.dropArea.style.background = 'rgba(37, 99, 235, 0.05)';
        });

        this.dropArea.addEventListener('dragleave', () => {
            this.dropArea.style.borderColor = '';
            this.dropArea.style.background = '';
        });

        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.style.borderColor = '';
            this.dropArea.style.background = '';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files } });
            }
        });

        // 标签页切换
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // 示例选择
        this.sampleItems.forEach(item => {
            item.addEventListener('click', () => this.loadSample(item.dataset.sample));
        });

        // 关闭模态框
        this.closeModal.addEventListener('click', () => this.hideSampleModal());
        this.sampleModal.addEventListener('click', (e) => {
            if (e.target === this.sampleModal) this.hideSampleModal();
        });

        // 初始计数器更新
        this.updateCounters();
    }

    updateCounters() {
        const code = this.codeInput.value;
        const chars = code.length;
        const lines = code.split('\n').length;

        this.charCount.textContent = `${chars} 字符`;
        this.lineCount.textContent = `${lines} 行`;
    }

    switchInputMode(mode) {
        // 更新按钮状态
        this.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 显示对应的输入区域
        this.textInput.classList.toggle('active', mode === 'text');
        this.fileInput.classList.toggle('active', mode === 'file');

        // 如果切换到文件模式且已有文件，显示文件信息
        if (mode === 'file' && this.fileUpload.files.length > 0) {
            this.fileInfo.classList.remove('hidden');
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        if (!file.name.match(/\.(java|txt)$/i)) {
            this.showError('请选择Java或文本文件 (.java, .txt)');
            return;
        }

        // 检查文件大小 (1MB限制)
        if (file.size > 1024 * 1024) {
            this.showError('文件大小不能超过1MB');
            return;
        }

        // 显示文件信息
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.classList.remove('hidden');

        // 读取文件内容
        try {
            const text = await this.readFile(file);
            this.codeInput.value = text;
            this.updateCounters();
            this.switchInputMode('text'); // 切换到文本模式显示内容
        } catch (error) {
            this.showError('读取文件失败: ' + error.message);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('读取失败'));
            reader.readAsText(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    removeSelectedFile() {
        this.fileUpload.value = '';
        this.fileInfo.classList.add('hidden');
    }

    showSampleModal() {
        this.sampleModal.classList.remove('hidden');
    }

    hideSampleModal() {
        this.sampleModal.classList.add('hidden');
    }

    async loadSample(sampleType) {
        try {
            this.showLoading('正在加载示例代码...');

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sample: sampleType })
            });

            const data = await response.json();

            if (response.ok) {
                this.codeInput.value = data.code;
                this.updateCounters();
                this.hideSampleModal();
                this.showSuccess('示例代码加载成功');
            } else {
                throw new Error(data.message || '加载失败');
            }
        } catch (error) {
            this.showError('加载示例失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async analyzeCode() {
        const code = this.codeInput.value.trim();

        if (!code) {
            this.showError('请输入Java代码进行分析');
            return;
        }

        // 检查代码长度
        if (code.length > 10000) {
            this.showError('代码过长，请控制在10000字符以内');
            return;
        }

        // 构建分析选项
        const options = {
            security: this.optSecurity.checked,
            performance: this.optPerformance.checked,
            style: this.optStyle.checked,
            bugs: this.optBugs.checked
        };

        try {
            this.showLoading('正在分析代码...');
            this.analyzeBtn.disabled = true;

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, options })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.success) {
                    this.displayResults(data.data);
                    this.saveToHistory(code, data.data);
                    this.showSuccess('分析完成');
                } else {
                    this.showWarning('分析完成，但AI返回了异常格式');
                    this.displayResults(data.data || {
                        summary: { critical: 0, high: 0, medium: 0, low: 0 },
                        issues: [],
                        suggestions: [],
                        metrics: { complexity: 0, lines: 0, maintainability: 0, securityScore: 0 }
                    });
                }
            } else {
                throw new Error(data.message || '分析失败');
            }
        } catch (error) {
            console.error('分析错误:', error);
            this.showError('分析失败: ' + error.message);
        } finally {
            this.hideLoading();
            this.analyzeBtn.disabled = false;
        }
    }

    displayResults(data) {
        // 更新摘要
        this.criticalCount.textContent = data.summary.critical || 0;
        this.highCount.textContent = data.summary.high || 0;
        this.mediumCount.textContent = data.summary.medium || 0;
        this.lowCount.textContent = data.summary.low || 0;

        // 显示摘要卡片和结果区域
        this.summaryCards.classList.remove('hidden');
        this.resultsArea.classList.remove('hidden');
        this.statusArea.classList.add('hidden');

        // 启用导出和复制按钮
        this.exportBtn.disabled = false;
        this.copyBtn.disabled = false;

        // 更新代码视图
        this.codeViewer.textContent = this.codeInput.value;
        hljs.highlightElement(this.codeViewer);

        // 显示问题列表
        this.displayIssues(data.issues);

        // 显示修复建议
        this.displaySuggestions(data.suggestions);

        // 更新度量指标
        this.updateMetrics(data.metrics);

        // 默认显示问题列表标签页
        this.switchTab('issues');
    }

    displayIssues(issues) {
        this.issuesList.innerHTML = '';

        if (!issues || issues.length === 0) {
            this.issuesList.innerHTML = `
                <div class="issue-item severity-low">
                    <div class="issue-header">
                        <div class="issue-title">
                            <i class="fas fa-check-circle"></i>
                            未发现问题
                        </div>
                    </div>
                    <p class="issue-description">代码质量良好，未发现明显问题。</p>
                </div>
            `;
            return;
        }

        issues.forEach(issue => {
            const issueElement = document.createElement('div');
            issueElement.className = `issue-item severity-${issue.severity}`;

            // 获取问题类型图标
            const typeIcon = this.getIssueTypeIcon(issue.type);
            const severityText = this.getSeverityText(issue.severity);

            issueElement.innerHTML = `
                <div class="issue-header">
                    <div class="issue-title">
                        ${typeIcon}
                        ${issue.description}
                    </div>
                    <span class="issue-severity">${severityText}</span>
                </div>
                ${issue.line ? `
                    <div class="issue-line">
                        <i class="fas fa-code"></i>
                        第 ${issue.line} 行
                    </div>
                ` : ''}
                ${issue.codeSnippet ? `
                    <div class="issue-suggestion">
                        <strong>问题代码：</strong>
                        <pre class="code-snippet"><code class="bad">${this.escapeHtml(issue.codeSnippet)}</code></pre>
                    </div>
                ` : ''}
                ${issue.fixedSnippet ? `
                    <div class="issue-suggestion">
                        <strong>修复建议：</strong>
                        <p>${issue.suggestion || ''}</p>
                        <strong>修复后代码：</strong>
                        <pre class="code-snippet"><code class="good">${this.escapeHtml(issue.fixedSnippet)}</code></pre>
                    </div>
                ` : issue.suggestion ? `
                    <div class="issue-suggestion">
                        <strong>修复建议：</strong>
                        <p>${issue.suggestion}</p>
                    </div>
                ` : ''}
            `;

            this.issuesList.appendChild(issueElement);
        });

        // 高亮代码片段
        this.issuesList.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    displaySuggestions(suggestions) {
        this.suggestionsList.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            this.suggestionsList.innerHTML = `
                <div class="suggestion-item">
                    <h4>暂无额外建议</h4>
                    <p>代码质量良好，没有需要特别优化的地方。</p>
                </div>
            `;
            return;
        }

        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-item';

            const priorityClass = `priority-${suggestion.priority || 'medium'}`;
            const priorityText = this.getPriorityText(suggestion.priority);

            suggestionElement.innerHTML = `
                <h4>
                    ${this.getSuggestionIcon(suggestion.type)}
                    ${suggestion.description}
                    <span class="suggestion-priority ${priorityClass}">${priorityText}</span>
                </h4>
                ${suggestion.example ? `
                    <p><strong>示例：</strong> ${suggestion.example}</p>
                ` : ''}
            `;

            this.suggestionsList.appendChild(suggestionElement);
        });
    }

    updateMetrics(metrics) {
        if (!metrics) return;

        // 更新数值
        this.metricComplexity.textContent = metrics.complexity || 0;
        this.metricLines.textContent = metrics.lines || 0;
        this.metricMaintainability.textContent = metrics.maintainability || 0;
        this.metricSecurity.textContent = `${metrics.securityScore || 0}%`;

        // 更新进度条
        const complexityPercent = Math.min((metrics.complexity || 0) / 20 * 100, 100);
        const linesPercent = Math.min((metrics.lines || 0) / 500 * 100, 100);
        const maintainabilityPercent = metrics.maintainability || 0;
        const securityPercent = metrics.securityScore || 0;

        this.metricBars[0].style.width = `${complexityPercent}%`;
        this.metricBars[1].style.width = `${linesPercent}%`;
        this.metricBars[2].style.width = `${maintainabilityPercent}%`;
        this.metricBars[3].style.width = `${securityPercent}%`;
    }

    switchTab(tabName) {
        // 更新按钮状态
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 显示对应的标签页内容
        this.tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });

        // 如果是代码标签页，重新高亮代码
        if (tabName === 'code') {
            setTimeout(() => {
                hljs.highlightElement(this.codeViewer);
            }, 100);
        }
    }

    getIssueTypeIcon(type) {
        const icons = {
            security: '<i class="fas fa-shield-alt"></i>',
            performance: '<i class="fas fa-tachometer-alt"></i>',
            bug: '<i class="fas fa-bug"></i>',
            style: '<i class="fas fa-paint-brush"></i>'
        };
        return icons[type] || '<i class="fas fa-exclamation-circle"></i>';
    }

    getSeverityText(severity) {
        const texts = {
            critical: '严重',
            high: '高危',
            medium: '中危',
            low: '优化建议'
        };
        return texts[severity] || severity;
    }

    getPriorityText(priority) {
        const texts = {
            high: '高优先级',
            medium: '中优先级',
            low: '低优先级'
        };
        return texts[priority] || '中优先级';
    }

    getSuggestionIcon(type) {
        const icons = {
            refactoring: '<i class="fas fa-code-branch"></i> ',
            optimization: '<i class="fas fa-bolt"></i> ',
            security: '<i class="fas fa-shield-alt"></i> ',
            style: '<i class="fas fa-paint-brush"></i> '
        };
        return icons[type] || '<i class="fas fa-lightbulb"></i> ';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearCode() {
        this.codeInput.value = '';
        this.updateCounters();
        this.removeSelectedFile();
        this.showInfo('代码已清空');
    }

    async exportReport() {
        const code = this.codeInput.value;
        const issues = Array.from(this.issuesList.querySelectorAll('.issue-item')).map(item => ({
            title: item.querySelector('.issue-title').textContent.trim(),
            severity: item.querySelector('.issue-severity').textContent,
            description: item.querySelector('.issue-description')?.textContent,
            suggestion: item.querySelector('.issue-suggestion')?.textContent
        }));

        const report = `
Java代码分析报告
================

分析时间: ${new Date().toLocaleString()}
代码行数: ${this.lineCount.textContent}
总字符数: ${this.charCount.textContent}

问题摘要:
---------
严重问题: ${this.criticalCount.textContent} 个
高危问题: ${this.highCount.textContent} 个
中危问题: ${this.mediumCount.textContent} 个
优化建议: ${this.lowCount.textContent} 个

详细问题列表:
------------

${issues.map((issue, i) => `
${i + 1}. [${issue.severity}] ${issue.title}
${issue.description ? `   描述: ${issue.description}` : ''}
${issue.suggestion ? `   建议: ${issue.suggestion}` : ''}
`).join('\n')}

原始代码:
--------
${code}
        `.trim();

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `java-code-analysis-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccess('报告已导出');
    }

    copyResults() {
        const issues = Array.from(this.issuesList.querySelectorAll('.issue-item')).map(item =>
            item.textContent.replace(/\s+/g, ' ').trim()
        ).join('\n\n');

        const summary = `严重: ${this.criticalCount.textContent}, 高危: ${this.highCount.textContent}, 中危: ${this.mediumCount.textContent}, 优化: ${this.lowCount.textContent}`;

        const textToCopy = `Java代码分析结果\n\n${summary}\n\n${issues}`;

        navigator.clipboard.writeText(textToCopy)
            .then(() => this.showSuccess('结果已复制到剪贴板'))
            .catch(err => this.showError('复制失败: ' + err.message));
    }

    saveToHistory(code, results) {
        const history = this.getHistory();

        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            code: code.substring(0, 500), // 只保存部分代码预览
            summary: results.summary,
            lines: code.split('\n').length
        };

        history.unshift(historyItem);

        // 限制历史记录数量
        if (history.length > 20) {
            history.pop();
        }

        localStorage.setItem('codeAnalysisHistory', JSON.stringify(history));
        this.loadHistory();
    }

    loadHistory() {
        const history = this.getHistory();
        this.historyList.innerHTML = '';

        if (history.length === 0) {
            this.historyList.innerHTML = '<div class="no-history">暂无历史记录</div>';
            return;
        }

        history.forEach(item => {
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            historyElement.dataset.id = item.id;

            const time = new Date(item.timestamp).toLocaleString();
            const preview = item.code.split('\n')[0] || '空代码';

            historyElement.innerHTML = `
                <div class="time">${time}</div>
                <div class="preview">${this.escapeHtml(preview)}</div>
                <div class="summary">
                    问题: ${item.summary.critical + item.summary.high + item.summary.medium + item.summary.low} 个
                    行数: ${item.lines}
                </div>
            `;

            historyElement.addEventListener('click', () => this.loadFromHistory(item.id));
            this.historyList.appendChild(historyElement);
        });
    }

    getHistory() {
        try {
            const history = localStorage.getItem('codeAnalysisHistory');
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    }

    loadFromHistory(id) {
        const history = this.getHistory();
        const item = history.find(h => h.id == id);

        if (item) {
            this.codeInput.value = item.code;
            this.updateCounters();
            this.showSuccess('历史记录已加载');
        }
    }

    clearHistory() {
        if (confirm('确定要清空所有历史记录吗？')) {
            localStorage.removeItem('codeAnalysisHistory');
            this.loadHistory();
            this.showSuccess('历史记录已清空');
        }
    }

    async checkAPIStatus() {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sample: 'vulnerable' })
            });

            const statusDot = this.apiStatus.querySelector('.status-dot');
            const statusText = this.apiStatus.querySelector('span:nth-child(2)');

            if (response.ok) {
                statusDot.classList.add('connected');
                statusText.textContent = '在线';
            } else {
                statusText.textContent = '离线';
            }
        } catch {
            const statusText = this.apiStatus.querySelector('span:nth-child(2)');
            statusText.textContent = '连接失败';
        }
    }

    // 状态显示方法
    showLoading(message) {
        this.statusMessage.querySelector('p').textContent = message || '正在处理...';
        this.statusMessage.classList.add('hidden');
        this.loadingSpinner.classList.remove('hidden');
        this.loadingSpinner.querySelector('p').textContent = message || '正在处理，请稍候...';
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
        this.statusMessage.classList.remove('hidden');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        // 创建新的toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="fas fa-${icons[type]}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // 添加显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new CodeAnalyzer();

    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            background: white;
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 10000;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast-success {
            border-left: 4px solid var(--success-color);
            color: var(--success-color);
        }
        
        .toast-error {
            border-left: 4px solid var(--danger-color);
            color: var(--danger-color);
        }
        
        .toast-warning {
            border-left: 4px solid var(--warning-color);
            color: var(--warning-color);
        }
        
        .toast-info {
            border-left: 4px solid var(--info-color);
            color: var(--info-color);
        }
        
        .no-history {
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
        }
    `;
    document.head.appendChild(style);
});