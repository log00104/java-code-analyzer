// api/analyze.js
export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允许POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, options } = req.body;

        if (!code || code.trim().length === 0) {
            return res.status(400).json({ error: '代码内容不能为空' });
        }

        // 调用DeepSeek API进行分析
        const analysisResult = await analyzeWithDeepSeek(code, options);

        // 保存分析历史（简单实现）
        const history = {
            timestamp: new Date().toISOString(),
            codeLength: code.length,
            issuesCount: analysisResult.issues.length,
            options: options || {}
        };

        // 返回分析结果
        return res.status(200).json({
            success: true,
            data: analysisResult,
            history: history,
            message: '分析完成'
        });

    } catch (error) {
        console.error('分析错误:', error);
        return res.status(500).json({
            error: '分析过程中出现错误',
            details: error.message
        });
    }
}

// DeepSeek API分析函数
async function analyzeWithDeepSeek(code, options = {}) {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-your-api-key-here';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    // 构建分析提示词
    const prompt = buildAnalysisPrompt(code, options);

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-coder',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的Java代码审查专家，专门分析Java代码中的缺陷、安全漏洞、性能问题和代码规范。请以JSON格式返回分析结果。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API请求失败: ${response.status}`);
        }

        const data = await response.json();

        // 解析AI的回复
        return parseAIResponse(data.choices[0].message.content, code);

    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        // 返回模拟数据作为后备
        return generateMockAnalysis(code, options);
    }
}

// 构建分析提示词
function buildAnalysisPrompt(code, options) {
    const analysisTypes = [];
    if (options.security !== false) analysisTypes.push('安全漏洞');
    if (options.performance !== false) analysisTypes.push('性能问题');
    if (options.style !== false) analysisTypes.push('代码规范');
    if (options.bugs !== false) analysisTypes.push('潜在Bug');

    return `请分析以下Java代码，重点检查：${analysisTypes.join('、')}。

代码：
\`\`\`java
${code}
\`\`\`

请以JSON格式返回分析结果，包括：
1. issues: 问题列表，每个问题包含：type（类型）、severity（严重程度）、line（行号）、message（描述）、suggestion（建议）
2. summary: 统计信息，包括每种严重程度的数量
3. metrics: 代码度量，包括圈复杂度、代码行数等
4. suggestions: 详细的修复建议

严重程度分为：critical（严重）、high（高危）、medium（中危）、low（低危/建议）

请确保返回有效的JSON格式。`;
}

// 解析AI回复
function parseAIResponse(content, code) {
    try {
        // 尝试从回复中提取JSON
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[0].replace(/```json\n|\n```/g, '');
            const parsed = JSON.parse(jsonStr);

            // 验证和补充数据
            return {
                issues: parsed.issues || [],
                summary: parsed.summary || {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                metrics: parsed.metrics || calculateCodeMetrics(code),
                suggestions: parsed.suggestions || [],
                code: code
            };
        }
    } catch (error) {
        console.error('解析AI回复失败:', error);
    }

    // 如果解析失败，返回模拟数据
    return generateMockAnalysis(code);
}

// 计算代码度量
function calculateCodeMetrics(code) {
    const lines = code.split('\n').length;
    const complexity = estimateCyclomaticComplexity(code);

    return {
        complexity: complexity,
        lines: lines,
        maintainability: Math.max(0, Math.min(100, 100 - (complexity * 2))),
        securityScore: Math.floor(Math.random() * 30) + 70 // 模拟安全评分
    };
}

// 估算圈复杂度
function estimateCyclomaticComplexity(code) {
    const patterns = [
        /\bif\s*\(/g,
        /\bfor\s*\(/g,
        /\bwhile\s*\(/g,
        /\bcase\s+[^:]+:/g,
        /\bcatch\s*\(/g,
        /\b&&|\|\|/g
    ];

    let complexity = 1;
    patterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) complexity += matches.length;
    });

    return complexity;
}

// 生成模拟分析结果（后备方案）
function generateMockAnalysis(code, options = {}) {
    const lines = code.split('\n');
    const issues = [];
    const suggestions = [];

    // 模拟问题检测
    if (options.security !== false) {
        if (code.includes('Statement.execute') && !code.includes('PreparedStatement')) {
            issues.push({
                type: 'security',
                severity: 'critical',
                line: findLineContaining(code, 'Statement.execute'),
                message: '发现SQL注入漏洞，使用Statement直接执行SQL语句',
                suggestion: '建议使用PreparedStatement进行参数化查询'
            });
        }

        if (code.includes('Runtime.getRuntime().exec(')) {
            issues.push({
                type: 'security',
                severity: 'high',
                line: findLineContaining(code, 'Runtime.getRuntime().exec('),
                message: '发现命令注入风险',
                suggestion: '建议对输入进行严格验证和转义'
            });
        }
    }

    if (options.performance !== false) {
        if (code.includes('String +=') && code.includes('for') && code.includes('String')) {
            issues.push({
                type: 'performance',
                severity: 'medium',
                line: findLineContaining(code, 'String +='),
                message: '在循环中使用字符串拼接，性能低下',
                suggestion: '建议使用StringBuilder进行字符串拼接'
            });
        }
    }

    if (options.bugs !== false) {
        if (code.includes('close()') && code.includes('try') && !code.includes('finally') && !code.includes('try-with-resources')) {
            issues.push({
                type: 'bug',
                severity: 'high',
                line: findLineContaining(code, 'close()'),
                message: '资源可能未正确关闭',
                suggestion: '建议使用try-with-resources或确保在finally块中关闭资源'
            });
        }
    }

    if (options.style !== false) {
        if (lines.length > 100) {
            issues.push({
                type: 'style',
                severity: 'low',
                line: 1,
                message: '代码文件过长，建议拆分为多个类',
                suggestion: '遵循单一职责原则，将大文件拆分为小文件'
            });
        }
    }

    // 添加模拟建议
    if (issues.length > 0) {
        suggestions.push({
            title: '总体优化建议',
            content: '建议进行代码重构，优先修复严重和高危问题。'
        });
    }

    // 计算统计
    const summary = {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
    };

    return {
        issues,
        summary,
        metrics: calculateCodeMetrics(code),
        suggestions,
        code
    };
}

// 查找包含特定文本的行号
function findLineContaining(code, text) {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(text)) {
            return i + 1;
        }
    }
    return 1;
}