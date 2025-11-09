class JerryVideoManager {
    constructor() {
        this.video1 = document.getElementById('jerry-video-1');
        this.video2 = document.getElementById('jerry-video-2');
        this.textBox = document.getElementById('jerry-text');

        // Track which video is currently active
        this.currentVideo = this.video1;
        this.nextVideo = this.video2;
        this.isWaiting = false;
        this.isPlayingClickedVideo = false; // Track if we're playing the clicked video
        this.pendingTimeout = null; // Track pending setTimeout for cancellation

        // Define video list with optional text
        // jerry-vibing appears twice to make it twice as likely to be selected
        this.videos = [
            { src: './jarry-wave.mp4', text: null },
            { src: './jerry-lizard-eyes.mp4', text: null },
            { src: './jerry-sideeye.mp4', text: null },
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

        // Wait 1 second before swapping
        this.pendingTimeout = setTimeout(() => {
            this.swapVideos(videoData.text);
            this.isWaiting = false;
            this.pendingTimeout = null;
        }, 1000);
    }

    onVideoClicked() {
        // Cancel any pending transitions/timeouts
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
        this.isWaiting = false;

        // Stop current video immediately
        this.currentVideo.pause();
        this.currentVideo.currentTime = 0;

        this.hideText();
        this.isPlayingClickedVideo = true;

        // Always play the poked-hint video on the current video element
        this.currentVideo.src = this.clickedVideo;
        this.currentVideo.load();
        this.currentVideo.style.display = 'block';
        this.currentVideo.play();

        // Make sure next video is hidden
        this.nextVideo.style.display = 'none';
        this.nextVideo.pause();
    }

    swapVideos(text) {
        // Store references before swapping
        const videoToHide = this.currentVideo;
        const videoToShow = this.nextVideo;

        // Hide current video first
        videoToHide.style.display = 'none';
        videoToHide.pause();

        // Swap references
        const temp = this.currentVideo;
        this.currentVideo = this.nextVideo;
        this.nextVideo = temp;

        // Wait for next frame to ensure display:none has taken effect
        requestAnimationFrame(() => {
            // Show and play next video
            videoToShow.style.display = 'block';
            videoToShow.play();
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
}
