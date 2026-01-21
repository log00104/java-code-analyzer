import axios from 'axios';
import { createParser } from 'eventsource-parser';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 示例代码库
const SAMPLE_CODE = {
    vulnerable: `import java.sql.*;

public class VulnerableExample {
    // SQL注入漏洞
    public User getUser(String username) throws SQLException {
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/test");
        Statement stmt = conn.createStatement();
        // 高危：直接拼接SQL
        String sql = "SELECT * FROM users WHERE username = '" + username + "'";
        ResultSet rs = stmt.executeQuery(sql);
        
        // 硬编码密码
        String password = "admin123";
        
        // 命令注入风险
        String command = "ping " + username;
        Runtime.getRuntime().exec(command);
        
        return new User();
    }
    
    // 不安全的反序列化
    public Object deserialize(byte[] data) {
        ByteArrayInputStream bis = new ByteArrayInputStream(data);
        try (ObjectInputStream ois = new ObjectInputStream(bis)) {
            return ois.readObject(); // 高危
        }
    }
}

class User {
    private String username;
}`,

    performance: `import java.util.ArrayList;
import java.util.List;

public class PerformanceExample {
    // 低效的字符串拼接
    public String buildString(List<String> items) {
        String result = "";
        for (String item : items) {
            result += item; // 应该使用StringBuilder
        }
        return result;
    }
    
    // 循环内创建对象
    public void processItems() {
        for (int i = 0; i < 1000; i++) {
            String temp = new String("item" + i); // 应该复用
            System.out.println(temp);
        }
    }
    
    // 不必要的自动装箱
    public Long sumValues() {
        Long sum = 0L; // 应该使用long
        for (int i = 0; i < 1000; i++) {
            sum += i; // 每次都会创建新的Long对象
        }
        return sum;
    }
    
    // 资源未及时释放
    public void readFile() {
        try {
            FileInputStream fis = new FileInputStream("test.txt");
            // 忘记关闭流
            byte[] buffer = new byte[1024];
            fis.read(buffer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}`,

    buggy: `import java.io.*;
import java.util.concurrent.*;

public class BuggyExample {
    // 可能的空指针异常
    public void processData(String data) {
        if (data.equals("test")) { // 应该使用"test".equals(data)
            System.out.println("Found test");
        }
    }
    
    // 资源未关闭
    public void copyFile(String source, String dest) {
        try {
            FileInputStream fis = new FileInputStream(source);
            FileOutputStream fos = new FileOutputStream(dest);
            byte[] buffer = new byte[1024];
            int length;
            while ((length = fis.read(buffer)) > 0) {
                fos.write(buffer, 0, length);
            }
            // 忘记调用fis.close()和fos.close()
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // 并发问题
    private int counter = 0;
    
    public void incrementCounter() {
        counter++; // 非原子操作，多线程下有风险
    }
    
    // 错误的异常处理
    public void riskyOperation() {
        try {
            int result = 10 / 0;
        } catch (Exception e) {
            // 吞掉异常，不处理也不记录
        }
    }
}`,

    style: `public class StyleExample {
    // 糟糕的命名
    private int a; // 应该用有意义的名称
    private String s;
    
    // 过长的函数
    public void doEverything() {
        // 50+行代码...
        // 应该拆分为多个小函数
        step1();
        step2();
        step3();
        // ...更多代码
    }
    
    // 重复代码
    public void method1() {
        System.out.println("开始处理");
        // 业务逻辑A
        System.out.println("处理完成");
    }
    
    public void method2() {
        System.out.println("开始处理"); // 重复
        // 业务逻辑B
        System.out.println("处理完成"); // 重复
    }
    
    // 过度复杂的条件
    public boolean checkCondition(int a, int b, int c, String d) {
        if ((a > 10 && b < 5) || (c == 0 && d != null) || (!d.isEmpty() && a + b > c)) {
            return true;
        }
        return false;
    }
    
    // 魔数
    public double calculate(double amount) {
        return amount * 0.1; // 0.1是什么？应该是TAX_RATE
    }
    
    // 过大的类
    // 这个类有太多职责...
    
    private void step1() { /* ... */ }
    private void step2() { /* ... */ }
    private void step3() { /* ... */ }
}`
};

// 分析提示模板
const ANALYSIS_PROMPT = `你是一个专业的Java代码安全审查和缺陷检测专家。请分析以下Java代码，找出其中的问题并提供修复建议。

分析要求：
1. 按严重程度分类：严重、高危、中危、优化建议
2. 每个问题需要包含：
   - 问题类型（安全漏洞、性能问题、代码缺陷、规范问题）
   - 具体位置（行号或代码段）
   - 问题描述
   - 风险等级
   - 修复建议
   - 示例代码（修复前/修复后）

3. 提供代码度量：
   - 圈复杂度估算
   - 代码行数
   - 可维护性评分（0-100）
   - 安全评分（0-100%）

4. 生成修复建议时，要提供具体的代码示例

请以JSON格式返回结果，格式如下：
{
  "summary": {
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "issues": [
    {
      "id": "unique-id",
      "type": "security|performance|bug|style",
      "severity": "critical|high|medium|low",
      "line": number,
      "description": "问题描述",
      "suggestion": "修复建议",
      "codeSnippet": "有问题的代码片段",
      "fixedSnippet": "修复后的代码示例"
    }
  ],
  "suggestions": [
    {
      "type": "refactoring|optimization|security|style",
      "description": "具体建议",
      "priority": "high|medium|low",
      "example": "示例说明"
    }
  ],
  "metrics": {
    "complexity": number,
    "lines": number,
    "maintainability": number,
    "securityScore": number
  }
}

需要分析的代码：
`;

export default async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只支持POST请求' });
    }

    try {
        const { code, sample, options } = req.body;

        // 检查API密钥
        if (!DEEPSEEK_API_KEY) {
            return res.status(500).json({
                error: '服务器配置错误',
                message: '未配置DeepSeek API密钥'
            });
        }

        let javaCode = code;

        // 如果是请求示例代码
        if (sample && SAMPLE_CODE[sample]) {
            return res.status(200).json({
                code: SAMPLE_CODE[sample],
                type: sample
            });
        }

        // 检查代码是否为空
        if (!javaCode || javaCode.trim().length === 0) {
            return res.status(400).json({
                error: '代码不能为空',
                message: '请提供Java代码进行分析'
            });
        }

        // 检查代码长度
        if (javaCode.length > 10000) {
            return res.status(400).json({
                error: '代码过长',
                message: '代码不能超过10000个字符'
            });
        }

        // 构建分析选项
        const analysisOptions = options || {
            security: true,
            performance: true,
            style: true,
            bugs: true
        };

        // 构建具体的分析提示
        const detailedPrompt = ANALYSIS_PROMPT +
            `\n分析选项：${JSON.stringify(analysisOptions, null, 2)}\n\n` +
            `Java代码：\n\`\`\`java\n${javaCode}\n\`\`\`\n\n` +
            `请确保返回有效的JSON格式，不要包含其他文本。`;

        // 调用DeepSeek API
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: "deepseek-coder",
                messages: [
                    {
                        role: "system",
                        content: "你是一个Java代码分析专家，专门检测代码缺陷、安全漏洞和性能问题。请始终以指定的JSON格式返回分析结果。"
                    },
                    {
                        role: "user",
                        content: detailedPrompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 4000
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        // 解析响应
        const aiResponse = response.data.choices[0].message.content;

        try {
            // 尝试提取JSON部分
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);

            // 验证结果格式
            if (!result.issues || !Array.isArray(result.issues)) {
                throw new Error('AI返回格式不正确');
            }

            return res.status(200).json({
                success: true,
                data: result,
                rawResponse: aiResponse
            });

        } catch (parseError) {
            console.error('解析AI响应失败:', parseError);
            console.log('原始响应:', aiResponse);

            // 返回一个格式化的错误响应
            return res.status(200).json({
                success: true,
                data: {
                    summary: { critical: 0, high: 0, medium: 0, low: 0 },
                    issues: [],
                    suggestions: [{
                        type: "error",
                        description: "解析AI响应时出错，但代码已收到",
                        priority: "low",
                        example: "请尝试简化代码或减少代码长度"
                    }],
                    metrics: {
                        complexity: 0,
                        lines: javaCode.split('\n').length,
                        maintainability: 0,
                        securityScore: 0
                    }
                }
            });
        }

    } catch (error) {
        console.error('分析失败:', error);

        let errorMessage = '分析失败';
        let statusCode = 500;

        if (error.response) {
            // DeepSeek API错误
            statusCode = error.response.status;
            errorMessage = `DeepSeek API错误: ${error.response.data?.error?.message || error.response.statusText}`;
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = '请求超时，请稍后重试';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = '无法连接到DeepSeek API';
        }

        return res.status(statusCode).json({
            error: errorMessage,
            message: error.message,
            code: error.code
        });
    }
}