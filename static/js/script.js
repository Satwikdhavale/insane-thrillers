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

        // Skip transition and smooth scroll if it's a hash link pointing to the current page
        try {
            const linkUrl = new URL(link.href, window.location.href);
            if (linkUrl.pathname === window.location.pathname && linkUrl.search === window.location.search && linkUrl.hash) {
                link.addEventListener("click", function (e) {
                    const target = document.querySelector(linkUrl.hash);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: "smooth" });
                    }
                });
                return;
            }
        } catch (e) {
            // fallback
        }

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

    // ─────────────────────────────────────────────────────────
    // 11. FAQ ACCORDION INTERACTION
    // ─────────────────────────────────────────────────────────
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach(item => {
        const trigger = item.querySelector(".faq-trigger");
        const content = item.querySelector(".faq-content");
        if (trigger && content) {
            trigger.addEventListener("click", () => {
                const isActive = item.classList.contains("active");

                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove("active");
                        const otherContent = otherItem.querySelector(".faq-content");
                        if (otherContent) otherContent.style.maxHeight = null;
                    }
                });

                // Toggle current item
                if (isActive) {
                    item.classList.remove("active");
                    content.style.maxHeight = null;
                } else {
                    item.classList.add("active");
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        }
    });

    // ─────────────────────────────────────────────────────────
    // 12. COUNTDOWN TIMER
    // ─────────────────────────────────────────────────────────
    const countdownEl = document.getElementById("countdown");
    if (countdownEl) {
        const targetStr = countdownEl.getAttribute("data-date");
        const targetDate = new Date(targetStr).getTime();

        const daysSpan = document.getElementById("days");
        const hoursSpan = document.getElementById("hours");
        const minutesSpan = document.getElementById("minutes");
        const secondsSpan = document.getElementById("seconds");

        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                countdownEl.innerHTML = "<div class='countdown-label' style='color:var(--mid);'>REGISTRATION CLOSED</div>";
                return;
            }

            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);

            if (daysSpan) daysSpan.textContent = String(d).padStart(2, "0");
            if (hoursSpan) hoursSpan.textContent = String(h).padStart(2, "0");
            if (minutesSpan) minutesSpan.textContent = String(m).padStart(2, "0");
            if (secondsSpan) secondsSpan.textContent = String(s).padStart(2, "0");
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // ─────────────────────────────────────────────────────────
    // 13. LEAFLET DARK MAP
    // ─────────────────────────────────────────────────────────
    const mapEl = document.getElementById("leaflet-map");
    if (mapEl && typeof L !== "undefined") {
        const map = L.map("leaflet-map", {
            scrollWheelZoom: false,
            dragging: !L.Browser.mobile,
            tap: !L.Browser.mobile
        }).setView([17.715, 73.725], 11);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        const checkpoints = [
            {
                coords: [17.653, 73.765],
                title: "Koyna Base Camp",
                desc: "Assembly point, mechanical inspection, and briefing zone."
            },
            {
                coords: [17.695, 73.712],
                title: "Deep River Crossing",
                desc: "3.5ft water crossing challenge. Tow ropes and winches required."
            },
            {
                coords: [17.722, 73.691],
                title: "Extreme Mud Bogs",
                desc: "Brutal clay slopes and deep ruts. Low-range 4L gearing zone."
            },
            {
                coords: [17.749, 73.738],
                title: "Ridge Camp",
                desc: "Panoramic campsite overlooking the scenic Koyna backwaters."
            }
        ];

        checkpoints.forEach(cp => {
            const marker = L.circleMarker(cp.coords, {
                radius: 8,
                fillColor: "#E63329",
                color: "#fff",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.95
            }).addTo(map);

            const popupContent = `
                <div>
                    <h3>${cp.title}</h3>
                    <p>${cp.desc}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            marker.on('mouseover', function () {
                this.setStyle({ radius: 11, fillColor: "#fff", color: "#E63329" });
            });
            marker.on('mouseout', function () {
                this.setStyle({ radius: 8, fillColor: "#E63329", color: "#fff" });
            });
        });
    }

    // ─────────────────────────────────────────────────────────
    // 14. TESTIMONIALS SLIDER
    // ─────────────────────────────────────────────────────────
    const slider = document.querySelector(".testimonials-slider");
    const cards = document.querySelectorAll(".testimonial-card");
    const prevBtn = document.querySelector(".prev-btn");
    const nextBtn = document.querySelector(".next-btn");
    const dots = document.querySelectorAll(".slider-dot");

    if (slider && cards.length > 0) {
        let currentIndex = 0;
        let slideInterval;

        function updateSlider() {
            slider.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            cards.forEach((card, idx) => {
                card.classList.toggle("active", idx === currentIndex);
            });

            dots.forEach((dot, idx) => {
                dot.classList.toggle("active", idx === currentIndex);
            });
        }

        function showNext() {
            currentIndex = (currentIndex + 1) % cards.length;
            updateSlider();
        }

        function showPrev() {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            updateSlider();
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                showNext();
                resetAutoplay();
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                showPrev();
                resetAutoplay();
            });
        }

        dots.forEach(dot => {
            dot.addEventListener("click", (e) => {
                currentIndex = parseInt(e.target.getAttribute("data-index"));
                updateSlider();
                resetAutoplay();
            });
        });

        function startAutoplay() {
            slideInterval = setInterval(showNext, 6000);
        }

        function resetAutoplay() {
            clearInterval(slideInterval);
            startAutoplay();
        }

        startAutoplay();
    }

    // ─────────────────────────────────────────────────────────
    // 15. TESTIMONIAL SUBMISSION MODAL
    // ─────────────────────────────────────────────────────────
    const modal = document.getElementById("testimonialModal");
    const openModalBtn = document.getElementById("openReviewModalBtn");
    const closeModalBtn = document.getElementById("closeReviewModalBtn");

    if (modal && openModalBtn && closeModalBtn) {
        openModalBtn.addEventListener("click", () => {
            modal.classList.add("active");
        });

        closeModalBtn.addEventListener("click", () => {
            modal.classList.remove("active");
        });

        // Close when clicking outside the modal-box
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("active");
            }
        });
    }

    // Auto-dismiss flash messages after 4.5 seconds
    const flashMessages = document.querySelectorAll(".flash-msg");
    flashMessages.forEach(msg => {
        setTimeout(() => {
            msg.style.transform = "translateX(50px)";
            msg.style.opacity = "0";
            setTimeout(() => msg.remove(), 400);
        }, 4500);
    });

});