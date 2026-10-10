package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"omniterminal/internal/models"
)

type openAIChatRequest struct {
	Model       string                 `json:"model"`
	Messages    []models.AIChatMessage `json:"messages"`
	Temperature float64                `json:"temperature"`
	MaxTokens   int                    `json:"max_tokens,omitempty"`
}

type openAIChatChoice struct {
	Index   int `json:"index"`
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	FinishReason string `json:"finish_reason"`
}

type openAIChatResponse struct {
	ID      string             `json:"id"`
	Choices []openAIChatChoice `json:"choices"`
	Error   *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

// resolveAIEndpoint 根据 Provider 补全 BaseURL 与默认模型
func resolveAIEndpoint(cfg models.AIConfig) (string, string) {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	model := strings.TrimSpace(cfg.Model)

	switch strings.ToLower(cfg.Provider) {
	case "deepseek":
		if baseURL == "" {
			baseURL = "https://api.deepseek.com/v1"
		}
		if model == "" {
			model = "deepseek-chat"
		}
	case "ollama":
		if baseURL == "" {
			baseURL = "http://localhost:11434/v1"
		}
		if model == "" {
			model = "llama3"
		}
	case "gemini":
		if baseURL == "" {
			baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"
		}
		if model == "" {
			model = "gemini-1.5-flash"
		}
	case "claude":
		if baseURL == "" {
			baseURL = "https://api.anthropic.com/v1"
		}
		if model == "" {
			model = "claude-3-5-sonnet-20241022"
		}
	case "openai":
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
	default:
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
	}

	endpoint := baseURL + "/chat/completions"
	return endpoint, model
}

// callLLMAPI 发起标准 HTTP POST 请求到兼容 OpenAI 的端点
func (a *App) callLLMAPI(ctx context.Context, cfg models.AIConfig, messages []models.AIChatMessage) (string, error) {
	endpoint, model := resolveAIEndpoint(cfg)

	temp := cfg.Temperature
	if temp <= 0 {
		temp = 0.2
	}
	maxTokens := cfg.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 2048
	}

	reqBody := openAIChatRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temp,
		MaxTokens:   maxTokens,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to encode request payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to create http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(cfg.ApiKey) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(cfg.ApiKey))
	}

	client := &http.Client{
		Timeout: 45 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("AI service request error: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("AI API error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var chatResp openAIChatResponse
	if err := json.Unmarshal(bodyBytes, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse AI response JSON: %w (raw: %s)", err, string(bodyBytes))
	}

	if chatResp.Error != nil && chatResp.Error.Message != "" {
		return "", errors.New(chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", errors.New("empty response returned by AI model")
	}

	return strings.TrimSpace(chatResp.Choices[0].Message.Content), nil
}

// evaluateCommandRisk 评估生成命令的危险等级
func evaluateCommandRisk(cmd string) string {
	lower := strings.ToLower(strings.TrimSpace(cmd))

	// 极高危危险模式 (Danger)
	dangerRegexes := []*regexp.Regexp{
		regexp.MustCompile(`\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+/(?:\s|$|\*)`), // rm -rf / or rm -rf /*
		regexp.MustCompile(`\bmkfs(?:\.[a-z0-9]+)?\s+`),
		regexp.MustCompile(`\bdd\s+if=.*of=/dev/`),
		regexp.MustCompile(`>\s*/dev/(?:sd[a-z]|nvme[0-9]|hd[a-z])`),
		regexp.MustCompile(`:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:`),
		regexp.MustCompile(`\bchmod\s+-[a-zA-Z]*R\s+777\s+/(?:\s|$)`),
		regexp.MustCompile(`\b(?:reboot|shutdown|init\s+0|init\s+6|systemctl\s+poweroff)\b`),
		regexp.MustCompile(`\b(?:iptables\s+-F|ufw\s+disable)\b`),
	}

	// 警告模式 (Caution)
	cautionRegexes := []*regexp.Regexp{
		regexp.MustCompile(`\brm\s+-[a-zA-Z]*r`),
		regexp.MustCompile(`\b(?:kill\s+-9|pkill|killall)\b`),
		regexp.MustCompile(`\b(?:drop|truncate)\s+(?:database|table)\b`),
		regexp.MustCompile(`\bsystemctl\s+(?:restart|stop)\b`),
		regexp.MustCompile(`\bchmod\s+(?:-[a-zA-Z]*R\s+)?777\b`),
		regexp.MustCompile(`\bsed\s+-i\b`),
	}

	for _, re := range dangerRegexes {
		if re.MatchString(lower) {
			return "danger"
		}
	}
	for _, re := range cautionRegexes {
		if re.MatchString(lower) {
			return "caution"
		}
	}
	return "safe"
}

// extractCommandFromText 从 LLM 的回复中提取代码块或最可能的执行命令
func extractCommandFromText(raw string) (string, string) {
	// 匹配 ```bash ... ``` 或 ```sh ... ``` 或 ```powershell ... ``` 或 ``` ... ```
	re := regexp.MustCompile("(?s)```(?:bash|sh|shell|zsh|powershell|pwsh|cmd|fish|terminal)?\\r?\\n(.*?)\\r?\\n```")
	matches := re.FindStringSubmatch(raw)
	if len(matches) > 1 {
		cmd := strings.TrimSpace(matches[1])
		explanation := strings.TrimSpace(re.ReplaceAllString(raw, ""))
		return cmd, explanation
	}

	// 如果没有代码块，检查首行是否为命令
	lines := strings.Split(raw, "\n")
	if len(lines) == 1 {
		return strings.TrimSpace(lines[0]), ""
	}

	return raw, ""
}

// AIGenerateCommand 自然语言转 Shell 命令
func (a *App) AIGenerateCommand(config models.AIConfig, prompt string, terminalContext string, osType string) (*models.AIChatResponse, error) {
	if strings.TrimSpace(prompt) == "" {
		return nil, errors.New("prompt cannot be empty")
	}

	if osType == "" {
		osType = "Linux / Unix (Bash/Zsh)"
	}

	var sysPrompt string
	if strings.TrimSpace(config.SystemPrompt) != "" {
		sysPrompt = config.SystemPrompt
	} else if strings.Contains(strings.ToLower(osType), "windows") || strings.Contains(strings.ToLower(osType), "powershell") {
		sysPrompt = "You are OmniAI, an expert PowerShell & Windows Systems terminal copilot. " +
			"Convert natural language requests into precise, safe PowerShell commands.\n" +
			"1. Always wrap the executable command inside ```powershell ... ``` code block.\n" +
			"2. Provide a concise bullet-point explanation for the arguments below.\n" +
			"3. Output a single command or one-line pipeline where possible."
	} else {
		sysPrompt = "You are OmniAI, an expert senior Linux/Unix DevOps and SysAdmin terminal copilot. " +
			"Your task is to convert natural language requests into precise, safe, production-grade Shell commands. " +
			fmt.Sprintf("Target OS / Shell: %s.\n", osType) +
			"Output instructions:\n" +
			"1. Always wrap the executable command inside ```bash ... ``` code block.\n" +
			"2. Provide a concise bullet-point explanation for the arguments below the code block.\n" +
			"3. If multiple options exist, provide the most standard and efficient command first."
	}

	userContent := fmt.Sprintf("Request: %s", prompt)
	if strings.TrimSpace(terminalContext) != "" {
		userContent += fmt.Sprintf("\n\nCurrent Terminal Directory/Context:\n%s", terminalContext)
	}

	messages := []models.AIChatMessage{
		{Role: "system", Content: sysPrompt},
		{Role: "user", Content: userContent},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	fullText, err := a.callLLMAPI(ctx, config, messages)
	if err != nil {
		return nil, err
	}

	cmd, explanation := extractCommandFromText(fullText)
	risk := evaluateCommandRisk(cmd)

	return &models.AIChatResponse{
		Command:     cmd,
		Explanation: explanation,
		RiskLevel:   risk,
		FullText:    fullText,
	}, nil
}

// AIDiagnoseError 终端报错智能分析与一键修复
func (a *App) AIDiagnoseError(config models.AIConfig, errorOutput string, lastCommand string, osType string) (*models.AIChatResponse, error) {
	if strings.TrimSpace(errorOutput) == "" {
		return nil, errors.New("error output cannot be empty")
	}

	if osType == "" {
		osType = "Linux / Unix"
	}

	sysPrompt := "You are OmniAI, an expert troubleshooting DevOps copilot. " +
		"Analyze the terminal error output and provide:\n" +
		"1. The exact root cause.\n" +
		"2. The recommended remediation command inside ```bash ... ``` code block.\n" +
		"3. Step-by-step guidance on how to prevent this issue.\n" +
		fmt.Sprintf("Target OS: %s.", osType)

	userContent := fmt.Sprintf("Terminal Error Output:\n%s", errorOutput)
	if strings.TrimSpace(lastCommand) != "" {
		userContent += fmt.Sprintf("\n\nFailed Command:\n%s", lastCommand)
	}

	messages := []models.AIChatMessage{
		{Role: "system", Content: sysPrompt},
		{Role: "user", Content: userContent},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	fullText, err := a.callLLMAPI(ctx, config, messages)
	if err != nil {
		return nil, err
	}

	cmd, explanation := extractCommandFromText(fullText)
	risk := evaluateCommandRisk(cmd)

	return &models.AIChatResponse{
		Command:     cmd,
		Explanation: explanation,
		RiskLevel:   risk,
		FullText:    fullText,
	}, nil
}

// AIExplainOutput AI 终端输出与日志内容深度解释与摘要
func (a *App) AIExplainOutput(config models.AIConfig, outputText string, osType string) (*models.AIChatResponse, error) {
	if strings.TrimSpace(outputText) == "" {
		return nil, errors.New("output text cannot be empty")
	}

	if osType == "" {
		osType = "Linux / Unix"
	}

	sysPrompt := "You are OmniAI, an expert DevOps and Linux system administrator. " +
		"Explain the provided terminal output or log snippet concisely in Chinese.\n" +
		"1. Summarize what happened or what state the system is in.\n" +
		"2. Highlight any warnings, errors, performance bottlenecks, or notable details.\n" +
		"3. If applicable, recommend the next action or diagnostic command inside a ```bash ... ``` code block.\n" +
		fmt.Sprintf("Target OS: %s.", osType)

	messages := []models.AIChatMessage{
		{Role: "system", Content: sysPrompt},
		{Role: "user", Content: fmt.Sprintf("Terminal / Log Output:\n%s", outputText)},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	fullText, err := a.callLLMAPI(ctx, config, messages)
	if err != nil {
		return nil, err
	}

	cmd, explanation := extractCommandFromText(fullText)
	risk := evaluateCommandRisk(cmd)

	return &models.AIChatResponse{
		Command:     cmd,
		Explanation: explanation,
		RiskLevel:   risk,
		FullText:    fullText,
	}, nil
}

// AIGenerateScript AI 运维自动化脚本工坊生成
func (a *App) AIGenerateScript(config models.AIConfig, prompt string, scriptType string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", errors.New("prompt cannot be empty")
	}

	if scriptType == "" {
		scriptType = "bash"
	}

	sysPrompt := fmt.Sprintf("You are OmniAI, a senior site reliability engineer (SRE). "+
		"Generate a complete, robust, well-commented %s automation script based on the user's requirements.\n"+
		"Include error handling (set -euo pipefail for bash), argument validation, and logging helpers.\n"+
		"Wrap the entire script in ```%s ... ``` code block.", scriptType, scriptType)

	messages := []models.AIChatMessage{
		{Role: "system", Content: sysPrompt},
		{Role: "user", Content: prompt},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	return a.callLLMAPI(ctx, config, messages)
}

// AITestConnection 测试 AI API 连接性
func (a *App) AITestConnection(config models.AIConfig) (bool, error) {
	messages := []models.AIChatMessage{
		{Role: "user", Content: "Hello, reply with 'OK' only."},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	resp, err := a.callLLMAPI(ctx, config, messages)
	if err != nil {
		return false, err
	}

	return len(resp) > 0, nil
}

// AIChat 多轮智能对话接口，支持传入完整会话历史
func (a *App) AIChat(config models.AIConfig, messages []models.AIChatMessage) (string, error) {
	if len(messages) == 0 {
		return "", errors.New("chat messages cannot be empty")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	return a.callLLMAPI(ctx, config, messages)
}

