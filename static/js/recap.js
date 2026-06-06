// ============================================================
//  INSANE THRILLERS — recap.js
//  Handles: custom video player controls + photo lightbox
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    // Gallery reveal — IntersectionObserver
    const galleryItems = document.querySelectorAll(".gallery-item.reveal");
    if ("IntersectionObserver" in window && galleryItems.length) {
        const gObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const idx = Array.from(galleryItems).indexOf(entry.target);
                    setTimeout(() => entry.target.classList.add("visible"), idx * 80);
                    gObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        galleryItems.forEach(el => gObserver.observe(el));
    } else {
        galleryItems.forEach(el => el.classList.add("visible"));
    }

    // ─────────────────────────────────────────────────────────
    // CUSTOM VIDEO PLAYER
    // ─────────────────────────────────────────────────────────
    const video       = document.getElementById("eventVideo");
    const playBtn     = document.getElementById("videoPlayBtn");
    const vcPlay      = document.getElementById("vcPlay");
    const vcMute      = document.getElementById("vcMute");
    const vcFullscreen= document.getElementById("vcFullscreen");
    const vcProgress  = document.getElementById("vcProgressWrap");
    const vcBar       = document.getElementById("vcProgressBar");
    const vcTime      = document.getElementById("vcTime");

    if (!video) return; // No video on this page

    // ── Play / Pause via big overlay button ──
    playBtn.addEventListener("click", togglePlay);
    vcPlay.addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);

    function togglePlay() {
        if (video.paused) {
            video.play();
            playBtn.classList.add("hidden");
            vcPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>`;
        } else {
            video.pause();
            playBtn.classList.remove("hidden");
            vcPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M8 5v14l11-7z"/>
            </svg>`;
        }
    }

    // ── Progress bar updates ──
    video.addEventListener("timeupdate", function () {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        vcBar.style.width = pct + "%";
        vcTime.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    });

    // ── Seek on click ──
    vcProgress.addEventListener("click", function (e) {
        const rect = vcProgress.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        video.currentTime = ratio * video.duration;
    });

    // ── Mute toggle ──
    vcMute.addEventListener("click", function () {
        video.muted = !video.muted;
        vcMute.innerHTML = video.muted
            ? `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                 <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                 <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
               </svg>`;
    });

    // ── Fullscreen ──
    vcFullscreen.addEventListener("click", function () {
        const wrap = video.closest(".video-player-wrap");
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            wrap.requestFullscreen();
        }
    });

    // ── Video ended ──
    video.addEventListener("ended", function () {
        playBtn.classList.remove("hidden");
        vcPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>`;
        vcBar.style.width = "0%";
    });

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

});

// ─────────────────────────────────────────────────────────────
// LIGHTBOX  (called from onclick in template)
// ─────────────────────────────────────────────────────────────
function openLightbox(src) {
    const lb  = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    if (!lb || !img) return;
    img.src = src;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    const lb = document.getElementById("lightbox");
    if (!lb) return;
    lb.classList.remove("open");
    document.body.style.overflow = "";
}

// Close lightbox on Escape key
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
});