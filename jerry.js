class JerryVideoManager {
    constructor() {
        this.video1 = document.getElementById('jerry-video-1');
        this.video2 = document.getElementById('jerry-video-2');
        this.textBox = document.getElementById('jerry-text');
        this.speechBubble = document.getElementById('jerry-speech-bubble');
        this.speechBubbleContent = document.querySelector('.speech-bubble-content');

        // Track which video is currently active
        this.currentVideo = this.video1;
        this.nextVideo = this.video2;
        this.isWaiting = false;
        this.isPlayingClickedVideo = false; // Track if we're playing the clicked video
        this.pendingTimeout = null; // Track pending setTimeout for cancellation
        this.typingTimeout = null; // Track typing animation timeout
        this.fadeOutTimeout = null; // Track speech bubble fade out timeout

        // Define video list with optional text
        // jerry-vibing appears twice to make it twice as likely to be selected
        this.videos = [
            { src: './jarry-wave.mp4', text: null },
            { src: './jerry-lizard-eyes.mp4', text: null },
            { src: './jerry-sideeye.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
            { src: './jerry-vibing.mp4', text: null },
        ];

        this.clickedVideo = './jerry-poked-hint.mp4'; // Special video for clicks

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

        // Handle click on both videos
        this.video1.addEventListener('click', () => {
            this.onVideoClicked();
        });

        this.video2.addEventListener('click', () => {
            this.onVideoClicked();
        });
    }

    onVideoEnded() {
        if (this.isWaiting) return;

        // If we just finished the clicked video, return to normal flow
        if (this.isPlayingClickedVideo) {
            this.isPlayingClickedVideo = false;
        }

        this.isWaiting = true;
        this.hideText();

        // Preload next video in background
        const randomIndex = Math.floor(Math.random() * this.videos.length);
        const videoData = this.videos[randomIndex];

        // Load next video into the hidden video element
        this.nextVideo.src = videoData.src;
        this.nextVideo.load();

        // Wait 1.5 seconds before swapping
        this.pendingTimeout = setTimeout(() => {
            this.swapVideos(videoData.text);
            this.isWaiting = false;
            this.pendingTimeout = null;
        }, 1500);
    }

    onVideoClicked() {
        // Cancel any pending transitions/timeouts
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
        this.isWaiting = false;

        this.hideText();
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

        // Hide the current video immediately
        videoToHide.style.display = 'none';
        videoToHide.currentTime = 0;

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

            // Fade in poked-hint
            videoToShow.style.opacity = '1';

            // Wait for fade transition (500ms), then clean up
            setTimeout(() => {
                // Swap references
                const temp = this.currentVideo;
                this.currentVideo = this.nextVideo;
                this.nextVideo = temp;

                // Reset old video opacity for next use
                videoToHide.style.opacity = '1';
            }, 500);
        });
    }

    swapVideos(text) {
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

        // Handle text
        if (text) {
            this.showText(text);
        } else {
            this.hideText();
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

    showSpeechBubble() {
        const message = "Why are you bothering me?\nHave you tried looking at the art?";

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

        // Schedule fade out when video ends (~7 seconds total, fade out at ~6.5s)
        this.fadeOutTimeout = setTimeout(() => {
            this.speechBubble.classList.remove('visible');
            setTimeout(() => {
                this.speechBubble.style.display = 'none';
            }, 500);
        }, 6500);
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
