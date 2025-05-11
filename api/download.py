# api/download.py
from http.server import BaseHTTPRequestHandler
import json
from yt_dlp import YoutubeDL
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class handler(BaseHTTPRequestHandler):

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204) # No Content
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data_bytes = self.rfile.read(content_length)
        
        video_url = None # Initialize video_url
        try:
            data = json.loads(post_data_bytes.decode('utf-8'))
            video_url = data.get('url')
        except json.JSONDecodeError:
            logger.error("Invalid JSON input")
            self._send_json_response(400, {"error": "Invalid JSON input"})
            return
        except Exception as e:
            logger.error(f"Error decoding request body: {str(e)}")
            self._send_json_response(400, {"error": f"Error decoding request body: {str(e)}"})
            return

        if not video_url:
            logger.warning("No URL provided in request")
            self._send_json_response(400, {"error": "No URL provided"})
            return
        
        logger.info(f"Processing URL: {video_url}")

        try:
            ydl_opts = {
                'noplaylist': True,
                'nocheckcertificate': True,
                'quiet': True,
                'no_warnings': True,
                'extract_flat': 'discard_in_playlist',
                'skip_download': True,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                # 'geo_bypass': False, # Default, but can be explicit if testing geo issues
            }
            
            with YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Extracting info for {video_url} with yt-dlp")
                info_dict = ydl.extract_info(video_url, download=False)
                logger.info(f"Successfully extracted info for {video_url}")
            
            formats = []
            
            def sanitize_value(value):
                if isinstance(value, (str, int, float, bool, list, dict)) or value is None:
                    return value
                if hasattr(value, 'isoformat'): # For datetime objects
                    return value.isoformat()
                return str(value) # Fallback to string conversion

            def sanitize_dict(d):
                if not isinstance(d, dict):
                    return {}
                return {k: sanitize_value(v) for k, v in d.items()}

            if info_dict.get('formats'):
                for f_info in info_dict['formats']:
                    # Try to get formats that are likely pre-merged or common
                    if (f_info.get('vcodec') != 'none' and f_info.get('acodec') != 'none' and f_info.get('ext') == 'mp4') or \
                       (f_info.get('ext') == 'mp4' and f_info.get('protocol') in ['http', 'https']):
                        formats.append({
                            'format_id': f_info.get('format_id'),
                            'ext': f_info.get('ext'),
                            'resolution': f_info.get('resolution') or f_info.get('format_note'),
                            'fps': f_info.get('fps'),
                            'filesize': f_info.get('filesize'),
                            'filesize_approx': f_info.get('filesize_approx'),
                            'url': f_info.get('url'),
                            'vcodec': f_info.get('vcodec'),
                            'acodec': f_info.get('acodec'),
                            'format_note': f_info.get('format_note')
                        })
            
            if not formats and info_dict.get('url'): # Direct link for the 'best' chosen by ydl_opts
                 formats.append({
                            'format_id': info_dict.get('format_id', 'best'),
                            'ext': info_dict.get('ext'),
                            'resolution': info_dict.get('resolution'),
                            'fps': info_dict.get('fps'),
                            'filesize': info_dict.get('filesize'),
                            'url': info_dict.get('url'), # This might be a direct media URL
                            'vcodec': info_dict.get('vcodec'),
                            'acodec': info_dict.get('acodec'),
                            'format_note': 'Best automatic selection'
                        })

            if not formats:
                 logger.warning(f"No suitable formats found for {video_url}")
                 self._send_json_response(500, {"error": "Could not retrieve download links. The video might be protected or unavailable."})
                 return

            sanitized_formats = [sanitize_dict(f) for f in formats]
            
            response_data = {
                "title": sanitize_value(info_dict.get("title", "N/A")),
                "thumbnail": sanitize_value(info_dict.get("thumbnail", "N/A")),
                "duration_string": sanitize_value(info_dict.get("duration_string", "N/A")),
                "formats": sanitized_formats
            }
            
            logger.info(f"Sending successful response for {video_url}")
            self._send_json_response(200, response_data)

        # Catch ANY exception during the process and check its message for bot detection keywords
        except Exception as e:
            error_type_name = type(e).__name__
            error_message_full = str(e)
            error_message_lower = error_message_full.lower()

            # Define conditions for bot detection
            check_bot = "confirm you’re not a bot" in error_message_lower
            check_signin = "sign in" in error_message_lower
            check_auth = "authentication" in error_message_lower
            check_verify = "verify account" in error_message_lower
            check_cookies = "cookies" in error_message_lower 

            logger.error(f"Error processing URL {video_url if video_url else 'Unknown_URL'}: {error_type_name} - {error_message_full}", exc_info=True)

            if check_bot or check_signin or check_auth or check_verify or check_cookies:
                logger.warning(f"Bot detection or sign-in required for {video_url} (Caught in generic Exception). Matched keywords.")
                self._send_json_response(403, {"error": "This video cannot be processed due to YouTube restrictions (e.g., sign-in or bot verification required). Please try another video."})
            else:
                logger.warning(f"Generic exception for {video_url} did NOT match bot detection keywords. Type: {error_type_name}. Sending 500.")
                self._send_json_response(500, {"error": f"An unexpected server error occurred while processing the video ({error_type_name})."})
        return
