from flask import Flask, request, jsonify
from yt_dlp import YoutubeDL
import json

app = Flask(__name__)

# Vercel expects the Flask app instance to be named 'app'
# and typically this file would be 'index.py' or the app callable defined in vercel.json

@app.route('/', methods=['POST'])
def handle_download():
    data = request.get_json()
    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = {
            'noplaylist': True,
            'nocheckcertificate': True,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'discard_in_playlist', # Get all info for single video
            'skip_download': True, # We only want to get the URLs
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # Prioritize mp4
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=False)
            
            formats = []
            if info_dict.get('formats'):
                for f in info_dict['formats']:
                    # Try to get formats that are likely pre-merged or common
                    if (f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('ext') == 'mp4') or \
                       (f.get('ext') == 'mp4' and f.get('protocol') in ['http', 'https']): # Prioritize MP4
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'resolution': f.get('resolution') or f.get('format_note'),
                            'fps': f.get('fps'),
                            'filesize': f.get('filesize'),
                            'filesize_approx': f.get('filesize_approx'),
                            'url': f.get('url'),
                            'vcodec': f.get('vcodec'),
                            'acodec': f.get('acodec'),
                            'format_note': f.get('format_note')
                        })
            
            # If no specific formats found above, try to get best video and audio separately for some cases
            # This is a fallback and might require more frontend logic or direct link if possible
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
                 return jsonify({"error": "Could not retrieve download links. The video might be protected or unavailable."}), 500

            # Sanitize the response to ensure it's JSON serializable
            # yt-dlp can sometimes return types that are not directly serializable (e.g. int64)
            # We are mainly interested in string, int, float, bool, list, dict, None
            def sanitize_value(value):
                if isinstance(value, (str, int, float, bool, list, dict)) or value is None:
                    return value
                if hasattr(value, 'isoformat'): # for datetime objects
                    return value.isoformat()
                return str(value) # Fallback to string conversion

            def sanitize_dict(d):
                return {k: sanitize_value(v) for k, v in d.items()}

            sanitized_formats = [sanitize_dict(f) for f in formats]
            
            response_data = {
                "title": sanitize_value(info_dict.get("title", "N/A")),
                "thumbnail": sanitize_value(info_dict.get("thumbnail", "N/A")),
                "duration_string": sanitize_value(info_dict.get("duration_string", "N/A")),
                "formats": sanitized_formats
            }
            
            return jsonify(response_data)

    except Exception as e:
        app.logger.error(f"Error processing URL {video_url}: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# This part is for local development if you run `python api/download.py`
# Vercel will use a WSGI server like Gunicorn and find the 'app' object.
if __name__ == '__main__':
    app.run(debug=True, port=5001) # Run on a different port if your main app uses 5000
