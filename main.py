import os
import io
import tempfile
from flask import Flask, request, jsonify, send_file
import yt_dlp

app = Flask(__name__, static_folder='static')

# Define a User-Agent string to mimic a real browser.
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'

@app.route('/')
def index():
    # Serve the HTML interface from the static folder.
    return app.send_static_file('youtube-downloader.html')

@app.route('/info')
def info():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        # Set options with custom headers to avoid YouTube errors.
        ydl_opts = {
            'http_headers': {
                'User-Agent': USER_AGENT
            }
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
        video_title = info_dict.get('title', 'No title found')
        duration = info_dict.get('duration', 0)
        return jsonify({'title': video_title, 'duration': duration})
    except Exception as e:
        return jsonify({'error': 'Failed to fetch video info', 'details': str(e)}), 500

@app.route('/download')
def download():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        # Create a temporary file for the video.
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tmp_file_name = tmp_file.name
        tmp_file.close()

        ydl_opts = {
            'outtmpl': tmp_file_name,
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'http_headers': {
                'User-Agent': USER_AGENT
            }
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Read the video file into memory so we can remove the temporary file.
        with open(tmp_file_name, 'rb') as f:
            data = f.read()
        os.remove(tmp_file_name)

        return send_file(
            io.BytesIO(data),
            as_attachment=True,
            download_name="video.mp4",
            mimetype="video/mp4"
        )
    except Exception as e:
        return jsonify({'error': 'Failed to download video', 'details': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
