document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download-button');
    const youtubeLinkInput = document.getElementById('youtube-link');
    const downloadButtonBottom = document.getElementById('download-button-bottom');
    const youtubeLinkInputBottom = document.getElementById('youtube-link-bottom');

    // Create a container to display results if it doesn't exist
    let resultsContainer = document.getElementById('download-results-container');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'download-results-container';
        // Insert it after the hero section or a specific section for results
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            heroSection.parentNode.insertBefore(resultsContainer, heroSection.nextSibling);
        } else {
            document.body.appendChild(resultsContainer); // Fallback
        }
    }
    resultsContainer.style.padding = '20px';
    resultsContainer.style.textAlign = 'left';
    resultsContainer.style.maxWidth = '800px';
    resultsContainer.style.margin = '20px auto';
    resultsContainer.style.backgroundColor = '#fff';
    resultsContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    resultsContainer.style.borderRadius = '8px';

    const handleDownload = async (url) => {
        if (!url || !url.trim()) {
            resultsContainer.innerHTML = '<p style="color: red;">Please paste a valid YouTube URL.</p>';
            return;
        }

        resultsContainer.innerHTML = '<p>Fetching download links... Please wait.</p>';

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "An unknown error occurred." }));
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                return;
            }

            let htmlContent = `<h3>${data.title}</h3>`;
            if(data.thumbnail) {
                htmlContent += `<img src="${data.thumbnail}" alt="Thumbnail for ${data.title}" style="max-width: 200px; border-radius: 5px; margin-bottom: 10px;">`;
            }
            htmlContent += `<p>Duration: ${data.duration_string}</p>`;
            htmlContent += '<h4>Available Formats:</h4>';

            if (data.formats && data.formats.length > 0) {
                htmlContent += '<ul style="list-style-type: none; padding: 0;">';
                data.formats.forEach(format => {
                    htmlContent += `<li style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                        <strong>Resolution:</strong> ${format.resolution || format.format_note || 'N/A'} | 
                        <strong>Ext:</strong> ${format.ext} | 
                        <strong>Size:</strong> ${format.filesize ? (format.filesize / 1024 / 1024).toFixed(2) + ' MB' : (format.filesize_approx ? (format.filesize_approx / 1024 / 1024).toFixed(2) + ' MB (approx)' : 'N/A')} | 
                        <strong>VCodec:</strong> ${format.vcodec || 'N/A'} | 
                        <strong>ACodec:</strong> ${format.acodec || 'N/A'}
                        <br>
                        <a href="${format.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 5px; padding: 8px 12px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Download</a>
                    </li>`;
                });
                htmlContent += '</ul>';
            } else {
                htmlContent += '<p>No suitable download formats found. The video might be protected, unavailable, or requires processing not supported by this basic downloader.</p>';
            }

            resultsContainer.innerHTML = htmlContent;

        } catch (error) {
            console.error('Download error:', error);
            resultsContainer.innerHTML = `<p style="color: red;">An unexpected error occurred: ${error.message}. Check the console for more details.</p>`;
        }
    };

    if (downloadButton && youtubeLinkInput) {
        downloadButton.addEventListener('click', () => {
            const videoUrl = youtubeLinkInput.value;
            handleDownload(videoUrl);
        });
    }

    if (downloadButtonBottom && youtubeLinkInputBottom) {
        downloadButtonBottom.addEventListener('click', () => {
            const videoUrl = youtubeLinkInputBottom.value;
            handleDownload(videoUrl);
            // Scroll to results if this button is clicked
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // FAQ Toggle (Simple Example - can be enhanced)
    const faqItems = document.querySelectorAll('.faq-item h3');
    faqItems.forEach(h3 => {
        h3.addEventListener('click', () => {
            const p = h3.nextElementSibling;
            if (p) {
                p.style.display = p.style.display === 'none' ? 'block' : 'none';
            }
        });
        // Initially hide answers
        // const p = h3.nextElementSibling;
        // if (p) p.style.display = 'none'; // Uncomment to hide by default
    });
});
