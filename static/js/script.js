// ============================================================
//  INSANE THRILLERS — script.js
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. LOADING SCREEN
// ─────────────────────────────────────────────────────────────
(function () {
    const loader  = document.getElementById("loader");
    const bar     = document.getElementById("loaderBar");
    if (!loader) return;

    let progress  = 0;
    const tick    = setInterval(() => {
        // Fast at first, slows near 90, jumps to 100 on load
        progress += progress < 70 ? Math.random() * 12 : Math.random() * 3;
        if (progress > 90) progress = 90;
        if (bar) bar.style.width = progress + "%";
    }, 60);

    function finish() {
        clearInterval(tick);
        if (bar) bar.style.width = "100%";
        setTimeout(() => {
            loader.classList.add("hidden");
            // Kick off page-in wipe-out after loader fades
            const pt = document.getElementById("page-transition");
            if (pt) {
                pt.classList.add("wipe-out");
            }
        }, 300);
    }

    if (document.readyState === "complete") {
        finish();
    } else {
        window.addEventListener("load", finish);
        // Safety: hide after 3.5s max even if load never fires
        setTimeout(finish, 3500);
    }
})();

// ─────────────────────────────────────────────────────────────
// 2. PAGE TRANSITION — intercept internal links
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

    const pt = document.getElementById("page-transition");

    function navigateTo(href) {
        if (!pt) { window.location.href = href; return; }
        pt.classList.remove("wipe-out");
        pt.classList.add("wipe-in");
        setTimeout(() => {
            window.location.href = href;
        }, 460);
    }

    document.querySelectorAll("a[href]").forEach(link => {
        const href = link.getAttribute("href");
        // Only intercept same-origin, non-hash, non-external links
        if (!href) return;
        if (href.startsWith("http") || href.startsWith("//")) return;
        if (href.startsWith("#")) return;
        if (link.target === "_blank") return;
        if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

        link.addEventListener("click", function (e) {
            e.preventDefault();
            navigateTo(href);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 3. CUSTOM WHEEL CURSOR + TYRE TRAIL
    // ─────────────────────────────────────────────────────────
    const cursor = document.getElementById("cursor");
    let lastX = 0, lastY = 0, lastTrailTime = 0, curAngle = 0;

    document.addEventListener("mousemove", function (e) {
        const x = e.clientX, y = e.clientY;
        const dx = x - lastX, dy = y - lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed > 1) {
            curAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        }

        if (cursor) {
            cursor.style.left      = x + "px";
            cursor.style.top       = y + "px";
            cursor.style.transform = `translate(-50%, -50%) rotate(${curAngle}deg)`;
        }

        // Tyre trail — throttled
        const now = Date.now();
        if (now - lastTrailTime > 55 && speed > 3) {
            lastTrailTime = now;
            const mark = document.createElement("div");
            mark.classList.add("tyre-mark");
            mark.style.left      = x + "px";
            mark.style.top       = y + "px";
            mark.style.transform = `translate(-50%, -50%) rotate(${curAngle}deg)`;
            document.body.appendChild(mark);
            setTimeout(() => mark.remove(), 1250);
        }

        lastX = x; lastY = y;
    });

    // ─────────────────────────────────────────────────────────
    // 4. NAVBAR SCROLL EFFECT
    // ─────────────────────────────────────────────────────────
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 60);
    }, { passive: true });

    // ─────────────────────────────────────────────────────────
    // 5. HERO PARALLAX
    // ─────────────────────────────────────────────────────────
    const heroBg = document.getElementById("heroBg");
    if (heroBg) {
        window.addEventListener("scroll", () => {
            heroBg.style.transform = `scale(1.08) translateY(${window.scrollY * 0.25}px)`;
        }, { passive: true });
    }

    // ─────────────────────────────────────────────────────────
    // 6. HAMBURGER MOBILE MENU
    // ─────────────────────────────────────────────────────────
    const hamburger = document.getElementById("hamburger");
    const nav       = document.getElementById("main-nav");

    if (hamburger && nav) {
        hamburger.addEventListener("click", () => {
            const open  = nav.classList.toggle("open");
            const spans = hamburger.querySelectorAll("span");
            spans[0].style.transform = open ? "rotate(45deg) translate(5px, 5px)" : "";
            spans[1].style.opacity   = open ? "0" : "";
            spans[2].style.transform = open ? "rotate(-45deg) translate(5px, -5px)" : "";
        });
    }

    // ─────────────────────────────────────────────────────────
    // 7. SCROLL REVEAL — event cards
    // ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────
    // 7. SCROLL REVEAL — IntersectionObserver (reliable on load)
    // ─────────────────────────────────────────────────────────
    const revealEls = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    // Small stagger per card
                    const idx = Array.from(revealEls).indexOf(entry.target);
                    setTimeout(() => {
                        entry.target.classList.add("visible");
                    }, idx * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        revealEls.forEach(el => observer.observe(el));
    } else {
        // Fallback for old browsers — show everything
        revealEls.forEach(el => el.classList.add("visible"));
    }

    // ─────────────────────────────────────────────────────────
    // 8. SMOOTH SCROLL for hash anchors
    // ─────────────────────────────────────────────────────────
    document.querySelectorAll("a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // ─────────────────────────────────────────────────────────
    // 9. EVENT CARD RED GLOW ON HOVER
    // ─────────────────────────────────────────────────────────
    document.querySelectorAll(".event-card").forEach(card => {
        card.addEventListener("mouseenter", () => { card.style.boxShadow = "0 0 40px rgba(230,51,41,0.12)"; });
        card.addEventListener("mouseleave", () => { card.style.boxShadow = ""; });
    });

    // ─────────────────────────────────────────────────────────
    // 10. CONTACT FORM — client-side loading state
    // ─────────────────────────────────────────────────────────
    const contactForm = document.getElementById("contactForm");
    const submitBtn   = document.getElementById("submitBtn");

    if (contactForm && submitBtn) {
        contactForm.addEventListener("submit", function () {
            submitBtn.textContent = "Sending...";
            submitBtn.style.opacity = "0.7";
            submitBtn.disabled = true;
        });
    }

    // Scroll to flash message if present (after redirect)
    const flash = document.querySelector(".flash-msg");
    if (flash) {
        setTimeout(() => flash.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }

    // Pre-select event from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get('event');
    if (eventParam) {
        const eventSelect = document.getElementById('event');
        if (eventSelect) {
            const targetValue = eventParam.toLowerCase().trim();
            for (let option of eventSelect.options) {
                if (option.value.toLowerCase().includes(targetValue) && targetValue !== "") {
                    eventSelect.value = option.value;
                    break;
                }
            }
        }
    }

});