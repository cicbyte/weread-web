package mcp

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerTools 注册示例工具到 MCP 服务器
func registerTools(s *server.MCPServer) {
	// Echo 工具 - 测试连通性
	s.AddTool(mcp.NewTool("echo",
		mcp.WithDescription("回显用户输入的消息，用于测试 MCP 连接"),
		mcp.WithString("message",
			mcp.Required(),
			mcp.Description("要回显的消息内容"),
		),
	), handleEcho)

	// GetServerInfo 工具 - 获取服务器信息
	s.AddTool(mcp.NewTool("get_server_info",
		mcp.WithDescription("获取 MCP 服务器的运行信息，包括版本、运行时间、系统信息等"),
	), handleGetServerInfo)
}

func handleEcho(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := request.GetArguments()
	message, ok := args["message"].(string)
	if !ok {
		return nil, fmt.Errorf("message 参数必须是字符串")
	}

	return mcp.NewToolResultText(fmt.Sprintf("Echo: %s", message)), nil
}

func handleGetServerInfo(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	info := fmt.Sprintf(
		"WeRead Web MCP Server Info:\n"+
			"  Version: 1.0.0\n"+
			"  Go Version: %s\n"+
			"  OS: %s\n"+
			"  Architecture: %s\n"+
			"  CPU Cores: %d\n"+
			"  Current Time: %s",
		runtime.Version(),
		runtime.GOOS,
		runtime.GOARCH,
		runtime.NumCPU(),
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return mcp.NewToolResultText(info), nil
}
