class JerryVideoManager {
    constructor() {
        this.video1 = document.getElementById('jerry-video-1');
        this.video2 = document.getElementById('jerry-video-2');
        this.speechBubble = document.getElementById('jerry-speech-bubble');
        this.speechBubbleContent = document.querySelector('.speech-bubble-content');
        this.container = document.getElementById('jerry-container');

        // Track which video is currently active
        this.currentVideo = this.video1;
        this.nextVideo = this.video2;
        this.isWaiting = false;
        this.isPlayingClickedVideo = false; // Track if we're playing the clicked video
        this.pendingTimeout = null; // Track pending setTimeout for cancellation
        this.typingTimeout = null; // Track typing animation timeout
        this.fadeOutTimeout = null; // Track speech bubble fade out timeout
        this.isClickDebounced = false; // Debounce flag to prevent multiple clicks
        this.videoHistory = []; // Track recently played videos to avoid repetition

        // Define video list with optional text
        // jerry-vibing appears twice to make it twice as likely to be selected
        // extendedDisplay: true makes the text show longer and keeps the last frame visible longer
        this.videos = [
            { src: './jerry-wave.mp4', text: null },
            { src: './jerry-lizard-eyes.mp4', text: null },
            { src: './jerry-sideeye.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-random-fact.mp4', text: "Do you think Mel knows... I'm a plant?" },
            { src: './jerry-my-real-name.mp4', text: "The fleshsacks label me Jerry, but my D̷e̶e̷p̵ ̸N̶a̸m̸e̴ is ASMODEUS THE GREAT", extendedDisplay: true },
        ];

        // this.clickedVideo = './jerry-poked-hint.mp4'; // Special video for clicks
        this.clickedVideo = './jerry-mad-at-being-poked.mp4';

        this.setupEventListeners();
        this.startInitialVideo();
    }

    startInitialVideo() {
        // Manually start the first video once it's loaded
        if (this.currentVideo.readyState >= 3) {
            // Video is already loaded enough to play
            this.currentVideo.play();
        } else {
            // Wait for video to be ready
            this.currentVideo.addEventListener('canplay', () => {
                this.currentVideo.play();
            }, { once: true });
        }
    }

    selectRandomVideo() {
        // Filter out videos from recent history to avoid repetition
        let availableVideos = this.videos.filter(video =>
            !this.videoHistory.includes(video.src)
        );

        // If all videos would be filtered out (shouldn't happen with 9 videos and 2 history),
        // just avoid the most recent one
        if (availableVideos.length === 0) {
            availableVideos = this.videos.filter(video =>
                video.src !== this.videoHistory[this.videoHistory.length - 1]
            );
        }

        // Select random video from available pool
        const randomIndex = Math.floor(Math.random() * availableVideos.length);
        const selectedVideo = availableVideos[randomIndex];

        // Add to history and limit to last 2 videos
        this.videoHistory.push(selectedVideo.src);
        if (this.videoHistory.length > 2) {
            this.videoHistory.shift(); // Remove oldest entry
        }

        return selectedVideo;
    }

    setupEventListeners() {
        // Handle video end for both videos
        this.video1.addEventListener('ended', () => {
            if (this.currentVideo === this.video1) {
                this.onVideoEnded();
            }
        });

        this.video2.addEventListener('ended', () => {
            if (this.currentVideo === this.video2) {
                this.onVideoEnded();
            }
        });

        // Handle click on both videos with smaller clickable area
        this.video1.addEventListener('click', (e) => {
            if (this.isClickInJerryArea(e)) {
                this.onVideoClicked(e);
            }
        });

        this.video2.addEventListener('click', (e) => {
            if (this.isClickInJerryArea(e)) {
                this.onVideoClicked(e);
            }
        });
    }

    isClickInJerryArea(event) {
        const video = event.target;
        const rect = video.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Define a clickable area that's 70% of the video size, centered
        const padding = 0.15; // 15% padding on each side
        const minX = rect.width * padding;
        const maxX = rect.width * (1 - padding);
        const minY = rect.height * padding;
        const maxY = rect.height * (1 - padding);

        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    createSparks(event) {
        const video = event.target;
        const rect = video.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Create 8 sparks
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            spark.className = 'jerry-spark';

            // Random angle for each spark
            const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
            const distance = 50 + Math.random() * 30;
            const endX = clickX + Math.cos(angle) * distance;
            const endY = clickY + Math.sin(angle) * distance;

            // Set CSS variables for animation
            spark.style.setProperty('--start-x', clickX + 'px');
            spark.style.setProperty('--start-y', clickY + 'px');
            spark.style.setProperty('--end-x', endX + 'px');
            spark.style.setProperty('--end-y', endY + 'px');

            this.container.appendChild(spark);

            // Remove spark after animation
            setTimeout(() => {
                spark.remove();
            }, 500);
        }
    }

    onVideoEnded() {
        if (this.isWaiting) return;

        // If we just finished the clicked video, return to normal flow
        if (this.isPlayingClickedVideo) {
            this.isPlayingClickedVideo = false;
            // Reset debounce flag when clicked video finishes
            this.isClickDebounced = false;
        }

        this.isWaiting = true;

        // Store current video data to check for extended display
        const currentVideoData = this.videos.find(v => this.currentVideo.src.includes(v.src));
        const hideDelay = currentVideoData?.extendedDisplay ? 5000 : 0;

        setTimeout(() => {
            this.hideSpeechBubble();

            // Preload next video in background (using history-aware selection)
            const videoData = this.selectRandomVideo();

            // Load next video into the hidden video element
            this.nextVideo.src = videoData.src;
            this.nextVideo.load();

            // Wait 1.5 seconds before swapping
            this.pendingTimeout = setTimeout(() => {
                this.swapVideos(videoData);
                this.isWaiting = false;
                this.pendingTimeout = null;
            }, 1500);
        }, hideDelay);
    }

    onVideoClicked(event) {
        // Debounce: if already handling a click, ignore
        if (this.isClickDebounced) {
            return;
        }

        // Set debounce flag
        this.isClickDebounced = true;

        // Reset debounce after 8 seconds as a safety measure
        setTimeout(() => {
            this.isClickDebounced = false;
        }, 8000);

        // Create sparks at click location
        this.createSparks(event);

        // Cancel any pending transitions/timeouts
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
        this.isWaiting = false;

        this.hideSpeechBubble();
        this.isPlayingClickedVideo = true;

        // Show speech bubble
        this.showSpeechBubble();

        // Immediately stop both videos and reset their states
        this.video1.pause();
        this.video1.style.opacity = '1';
        this.video2.pause();
        this.video2.style.opacity = '1';

        // Store references
        const videoToHide = this.currentVideo;
        const videoToShow = this.nextVideo;

        // Load the poked-hint video in the next video element
        videoToShow.src = this.clickedVideo;
        videoToShow.load();

        // Prepare new video underneath (opacity 0, but visible)
        videoToShow.style.display = 'block';
        videoToShow.style.opacity = '0';

        // Wait for next frame to ensure display:block has taken effect
        requestAnimationFrame(() => {
            // Start playing the new video
            videoToShow.play();

            // Fade in new video and fade out old video simultaneously
            videoToHide.style.opacity = '0';
            videoToShow.style.opacity = '1';

            // Wait for fade transition (500ms), then clean up
            setTimeout(() => {
                // Now hide and reset the old video
                videoToHide.style.display = 'none';
                videoToHide.pause();
                videoToHide.currentTime = 0;
                videoToHide.style.opacity = '1';

                // Swap references
                const temp = this.currentVideo;
                this.currentVideo = this.nextVideo;
                this.nextVideo = temp;
            }, 500);
        });
    }

    swapVideos(videoData) {
        // Store references before swapping
        const videoToHide = this.currentVideo;
        const videoToShow = this.nextVideo;

        // Prepare new video underneath (opacity 0, but visible)
        videoToShow.style.display = 'block';
        videoToShow.style.opacity = '0';

        // Wait for next frame to ensure display:block has taken effect
        requestAnimationFrame(() => {
            // Start playing the new video
            videoToShow.play();

            // Crossfade: fade out current, fade in next
            videoToHide.style.opacity = '0';
            videoToShow.style.opacity = '1';

            // Wait for fade transition (500ms), then clean up
            setTimeout(() => {
                // Hide and pause the old video
                videoToHide.style.display = 'none';
                videoToHide.pause();

                // Swap references
                const temp = this.currentVideo;
                this.currentVideo = this.nextVideo;
                this.nextVideo = temp;

                // Reset old video opacity for next use
                videoToHide.style.opacity = '1';
            }, 500);
        });

        // Handle text with speech bubble animation (same as poked interaction)
        if (videoData.text) {
            this.showSpeechBubbleWithText(videoData.text, videoData.extendedDisplay || false);
        } else {
            this.hideSpeechBubble();
        }
    }

    playVideoImmediate(src, text) {
        // Stop and hide the next video
        this.nextVideo.style.display = 'none';
        this.nextVideo.pause();

        // Load and play the clicked video on current video element
        this.currentVideo.src = src;
        this.currentVideo.load();
        this.currentVideo.style.display = 'block';
        this.currentVideo.play();

        if (text) {
            this.showText(text);
        } else {
            this.hideText();
        }
    }

    showText(text) {
        this.textBox.textContent = text;
        this.textBox.style.display = 'block';
    }

    hideText() {
        this.textBox.style.display = 'none';
    }

    showSpeechBubble(customMessage = null, extendedDisplay = false) {
        const message = customMessage || "Bleh, what is it!\nHave you even tried looking at the art?";

        // Clear any existing timeouts
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        if (this.fadeOutTimeout) {
            clearTimeout(this.fadeOutTimeout);
        }

        // Reset and show bubble
        this.speechBubbleContent.textContent = '';
        this.speechBubble.style.display = 'block';
        this.speechBubble.classList.remove('visible');

        // Fade in after 0.8 seconds
        setTimeout(() => {
            this.speechBubble.classList.add('visible');

            // Start typing animation after fade in
            this.typeText(message, 0);
        }, 800);

        // Schedule fade out - longer duration for special videos (10 seconds vs 6.5 seconds)
        const fadeOutDelay = extendedDisplay ? 10000 : 6500;
        this.fadeOutTimeout = setTimeout(() => {
            this.speechBubble.classList.remove('visible');
            setTimeout(() => {
                this.speechBubble.style.display = 'none';
            }, 500);
        }, fadeOutDelay);
    }

    showSpeechBubbleWithText(text, extendedDisplay = false) {
        this.showSpeechBubble(text, extendedDisplay);
    }

    typeText(message, index) {
        if (index < message.length) {
            this.speechBubbleContent.textContent += message[index];
            this.typingTimeout = setTimeout(() => {
                this.typeText(message, index + 1);
            }, 30); // Type one character every 30ms
        }
    }

    hideSpeechBubble() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        if (this.fadeOutTimeout) {
            clearTimeout(this.fadeOutTimeout);
        }
        this.speechBubble.classList.remove('visible');
        this.speechBubble.style.display = 'none';
    }
}
