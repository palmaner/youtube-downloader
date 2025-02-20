import os
import tempfile
from flask import Flask, request, jsonify, send_file, after_this_request
import yt_dlp

app = Flask(__name__, static_folder='static')

@app.route('/')
def index():
    # Serve the HTML interface from the static folder
    return app.send_static_file('youtube-downloader.html')

@app.route('/info')
def info():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        # Use yt_dlp to extract video info without downloading the video
        ydl_opts = {}
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
        # Create a temporary file to hold the downloaded video
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tmp_file_name = tmp_file.name
        tmp_file.close()

        # Set yt_dlp options to download the best available video and merge audio+video if needed
        ydl_opts = {
            'outtmpl': tmp_file_name,
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4'
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Remove the temporary file after sending the response
        @after_this_request
        def remove_file(response):
            try:
                os.remove(tmp_file_name)
            except Exception as e:
                app.logger.error("Error removing temporary file: %s", e)
            return response

        return send_file(tmp_file_name, as_attachment=True, download_name="video.mp4")
    except Exception as e:
        return jsonify({'error': 'Failed to download video', 'details': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
