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
            // Always use the Vercel API path when deployed
            const apiUrl = '/api/download';

            const response = await fetch(apiUrl, {
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
                    const safeTitle = data.title ? data.title.replace(/[\\/:*?"<>|]/g, '') : 'video';
                    const fileName = `${safeTitle}.${format.ext}`;
                    // We'll use a class to identify these links and add data attributes for URL and filename
                    htmlContent += `<li style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                        <strong>Resolution:</strong> ${format.resolution || format.format_note || 'N/A'} | 
                        <strong>Ext:</strong> ${format.ext} | 
                        <strong>Size:</strong> ${format.filesize ? (format.filesize / 1024 / 1024).toFixed(2) + ' MB' : (format.filesize_approx ? (format.filesize_approx / 1024 / 1024).toFixed(2) + ' MB (approx)' : 'N/A')} | 
                        <strong>VCodec:</strong> ${format.vcodec || 'N/A'} | 
                        <strong>ACodec:</strong> ${format.acodec || 'N/A'}
                        <br>
                        <a href="${format.url}" class="download-video-link" data-filename="${fileName}" rel="noopener noreferrer" style="display: inline-block; margin-top: 5px; padding: 8px 12px; background-color: #BB2C1F; color: white; text-decoration: none; border-radius: 4px; transition: background-color 0.3s ease;">Download ${format.ext} (${format.resolution || format.format_note || 'N/A'})</a>
                    </li>`;
                });
                htmlContent += '</ul>';
            } else {
                htmlContent += '<p>No suitable download formats found. The video might be protected, unavailable, or requires processing not supported by this basic downloader.</p>';
            }

            resultsContainer.innerHTML = htmlContent;

            // Add event listeners to the newly created download links
            document.querySelectorAll('.download-video-link').forEach(link => {
                link.addEventListener('click', async function(event) { // Made async for await
                    event.preventDefault(); // Stop the default link navigation

                    const videoUrl = this.getAttribute('href'); // Get the actual video URL
                    const suggestedFilename = this.dataset.filename;
                    const originalButtonText = this.textContent;
                    const originalBgColor = '#BB2C1F'; // Default from your palette
                    const hoverBgColor = '#913830';    // Hover from your palette

                    // Update hover logic to respect button state
                    this.onmouseover = function() { 
                        if(this.textContent === originalButtonText) this.style.backgroundColor = hoverBgColor; 
                    };
                    this.onmouseout = function() { 
                        if(this.textContent === originalButtonText) this.style.backgroundColor = originalBgColor; 
                    };

                    try {
                        this.textContent = 'Downloading...';
                        this.style.backgroundColor = '#663733'; // Theme color for disabled-like state
                        this.style.pointerEvents = 'none'; // Disable further clicks

                        // Fetch the video as a blob
                        // Note: This requires the server (googlevideo.com) to have permissive CORS headers.
                        const response = await fetch(videoUrl);

                        if (!response.ok) {
                            let errorDetail = `Server responded with ${response.status} ${response.statusText}`;
                            try {
                                // Try to parse JSON error if available, otherwise use text
                                const errorText = await response.text();
                                const errJson = JSON.parse(errorText); // This might fail if not JSON
                                errorDetail = errJson.error || errorDetail;
                            } catch (e) { /* Ignore if response is not json or parsing fails */ }
                            throw new Error(`Failed to fetch video: ${errorDetail}`);
                        }

                        const blob = await response.blob();

                        // Create an object URL for the blob
                        const objectUrl = URL.createObjectURL(blob);

                        // Create a temporary link element to trigger download
                        const tempLink = document.createElement('a');
                        tempLink.href = objectUrl;
                        tempLink.setAttribute('download', suggestedFilename);
                        
                        document.body.appendChild(tempLink);
                        tempLink.click(); // Programmatically click the link
                        
                        // Clean up
                        document.body.removeChild(tempLink);
                        URL.revokeObjectURL(objectUrl); // Release the object URL

                        this.textContent = 'Downloaded!';
                        this.style.backgroundColor = originalBgColor; // Revert to original color
                        setTimeout(() => {
                            this.textContent = originalButtonText;
                            this.style.pointerEvents = 'auto'; // Re-enable clicks
                            // Re-apply original mouseout color if not hovering
                            if (document.querySelector(':hover') !== this) {
                                this.style.backgroundColor = originalBgColor;
                            }
                        }, 2000);

                    } catch (err) {
                        console.error('Download by Blob failed:', err);
                        // Fallback to the previous method (programmatic link click on original URL)
                        console.log('Attempting fallback download method (direct link click)...');
                        const fallbackLink = document.createElement('a');
                        fallbackLink.href = videoUrl; // Use the original videoUrl for fallback
                        fallbackLink.setAttribute('download', suggestedFilename);
                        fallbackLink.setAttribute('target', '_blank'); // For fallback, opening in new tab is acceptable if download fails
                        document.body.appendChild(fallbackLink);
                        fallbackLink.click();
                        document.body.removeChild(fallbackLink);
                        
                        this.textContent = 'Error (Using Fallback)';
                        this.style.backgroundColor = '#E61501'; // Error color from your palette
                        setTimeout(() => {
                            this.textContent = originalButtonText;
                            this.style.backgroundColor = originalBgColor;
                            this.style.pointerEvents = 'auto';
                            if (document.querySelector(':hover') !== this) {
                                this.style.backgroundColor = originalBgColor;
                            }
                        }, 3000);
                    }
                });
            });

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
