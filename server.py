#!/usr/bin/env python3
"""
Simple HTTP server that serves static files and forwards /api requests to another localhost port.
Uses only Python standard library - no external dependencies required.
"""

import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import mimetypes
from pathlib import Path
import http.client

# Configuration
PORT = int(os.environ.get('PORT', 3000))
API_TARGET_PORT = int(os.environ.get('API_TARGET_PORT', 3001))
STATIC_DIR = 'src'  # Directory to serve static files from


class ProxyHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def do_PUT(self):
        self._handle_request()

    def do_DELETE(self):
        self._handle_request()

    def do_PATCH(self):
        self._handle_request()

    def _handle_request(self):
        parsed_url = urlparse(self.path)

        # API endpoint - forward to another localhost port
        if parsed_url.path.startswith('/api'):
            self._proxy_request(parsed_url)
            return

        # Serve static files
        self._serve_static_file(parsed_url.path)

    def _proxy_request(self, parsed_url):
        """Forward requests to the API target port."""
        # Remove '/api' prefix
        api_path = parsed_url.path[4:]

        # Reconstruct path with query string if present
        full_path = api_path
        if parsed_url.query:
            full_path += '?' + parsed_url.query

        try:
            # Read request body if present
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None

            # Create connection to target server
            conn = http.client.HTTPConnection('localhost', API_TARGET_PORT, timeout=30)

            # Forward headers (excluding host)
            headers = {k: v for k, v in self.headers.items() if k.lower() != 'host'}

            # Make the request
            conn.request(self.command, full_path, body, headers)
            response = conn.getresponse()

            # Send response back to client
            self.send_response(response.status)

            # Forward response headers
            for header, value in response.getheaders():
                self.send_header(header, value)
            self.end_headers()

            # Forward response body
            self.wfile.write(response.read())

            conn.close()

        except ConnectionRefusedError:
            self.send_error(502, 'Bad Gateway: Could not connect to API server')
        except Exception as e:
            print(f'Proxy error: {e}', file=sys.stderr)
            self.send_error(502, f'Bad Gateway: {str(e)}')

    def _serve_static_file(self, path):
        """Serve static files from the src directory."""
        # Remove leading slash and resolve path
        if path == '/':
            path = '/index.html'

        # Serve from src directory
        file_path = Path.cwd() / STATIC_DIR / path.lstrip('/')

        # Security check - ensure path is within src directory
        try:
            file_path = file_path.resolve()
            src_dir = (Path.cwd() / STATIC_DIR).resolve()
            if not str(file_path).startswith(str(src_dir)):
                self.send_error(403, 'Forbidden')
                return
        except Exception:
            self.send_error(400, 'Bad Request')
            return

        # Check if file exists
        if not file_path.is_file():
            self.send_error(404, 'File Not Found')
            return

        # Get MIME type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type is None:
            mime_type = 'application/octet-stream'

        # Serve the file
        try:
            with open(file_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            print(f'Error serving file: {e}', file=sys.stderr)
            self.send_error(500, 'Internal Server Error')

    def log_message(self, format, *args):
        """Custom log format."""
        sys.stdout.write(f'{self.address_string()} - [{self.log_date_time_string()}] {format % args}\n')


def main():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ProxyHTTPRequestHandler)

    print(f'Server running at http://localhost:{PORT}/')
    print(f'Serving static files from: {STATIC_DIR}/')
    print(f'API requests will be forwarded to http://localhost:{API_TARGET_PORT}/')
    print(f'Access the image at http://localhost:{PORT}/Humors-Wheel.jpg')
    print('Press Ctrl+C to stop the server')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
        httpd.shutdown()
        sys.exit(0)


if __name__ == '__main__':
    main()
