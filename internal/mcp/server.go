package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// NewMCPServer 创建并配置 MCP 服务器
func NewMCPServer() *server.MCPServer {
	s := server.NewMCPServer(
		"WeRead Web MCP Server",
		"1.0.0",
		server.WithToolCapabilities(true),
	)

	registerTools(s)
	return s
}

// NewStreamableHTTPServer 创建支持 HTTP 的 MCP 服务器
func NewStreamableHTTPServer() *server.StreamableHTTPServer {
	mcpServer := NewMCPServer()
	return server.NewStreamableHTTPServer(mcpServer)
}
