"""
校园闲置交易平台 - 前端静态服务
前后端完全分离
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import os

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加缓存控制头
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    print('🚀 校园闲置交易平台前端服务启动中...')
    print(f'📡 前端地址: http://localhost:{PORT}')
    print('🔗 后端API: http://localhost:3001')
    print('🏗️  架构: 前后端完全分离')
    print('💡 提示: 如果页面显示旧内容，请硬刷新浏览器 (Cmd+Shift+R 或 Ctrl+Shift+R)')
    
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n✅ 服务已停止')
        httpd.shutdown()
