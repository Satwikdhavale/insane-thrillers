from flask import Flask, render_template, request, redirect, url_for, flash, send_file, Response
from werkzeug.middleware.proxy_fix import ProxyFix
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import mimetypes
import base64

# Load environment variables from .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

# Apply ProxyFix middleware so scheme and HTTP headers are preserved behind reverse proxies (e.g. Render, Nginx, Cloudflare)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Secure Secret Key configuration
secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    secret_key = "insane-thrillers-dev-key-change-in-production"
    if os.environ.get("FLASK_DEBUG", "False").lower() not in ("true", "1", "t"):
        print("[WARNING] SECRET_KEY environment variable is not set! Using fallback key.")
app.secret_key = secret_key

MAIL_USER = os.environ.get("MAIL_USER", "insanethrillers@gmail.com")
MAIL_PASS = os.environ.get("MAIL_PASS", "")
MAIL_TO   = os.environ.get("MAIL_TO", "insanethrillers@gmail.com")



# ══════════════════════════════════════════════════════════════
#  MEDIA FILES — YOUR LOCAL PATHS
#  Just update the paths on the right. Everything else is wired.
#
#  Windows:  r"C:\Insane\filename.jpg"
#  Mac/Linux: "/Users/name/Insane/filename.jpg"
# ══════════════════════════════════════════════════════════════
def _get_media_path(key, default_filename):
    env_val = os.environ.get(f"MEDIA_{key.upper().replace('-', '_')}")
    if env_val:
        return env_val
    if default_filename.startswith("http://") or default_filename.startswith("https://"):
        return default_filename
    return os.path.join(os.path.dirname(__file__), "media", default_filename)

MEDIA_FILES = {
    # ── WESTERN GHATS ─────────────────────────────────────────
    "wg-card":      _get_media_path("wg-card",      "https://res.cloudinary.com/moahwrg0/image/upload/v1784523984/insane.thrillers-20260502-0004_vujqeq.jpg"),
    "wg-poster":    _get_media_path("wg-poster",    "https://res.cloudinary.com/moahwrg0/image/upload/v1784524050/insane.thrillers-20260502-0005_offg8z.jpg"),
    "wg-gallery-1": _get_media_path("wg-gallery-1", "https://res.cloudinary.com/moahwrg0/image/upload/v1784524181/insane.thrillers-20260502-0007_eiam9e.jpg"),
    "wg-gallery-2": _get_media_path("wg-gallery-2", "https://res.cloudinary.com/moahwrg0/image/upload/v1784524126/insane.thrillers-20260502-0006_zduszq.jpg"),
    "wg-gallery-3": _get_media_path("wg-gallery-3", "https://res.cloudinary.com/moahwrg0/image/upload/v1784524226/insane.thrillers-20260502-0008_nzm9yy.jpg"),
    "wg-gallery-4": _get_media_path("wg-gallery-4", "https://res.cloudinary.com/moahwrg0/image/upload/v1784524226/insane.thrillers-20260502-0008_nzm9yy.jpg"),
    "wg-video":     _get_media_path("wg-video",     "https://res.cloudinary.com/moahwrg0/video/upload/v1784524455/insane.thrillers-20260502-0004_bl8ru7.mp4"),
    "wg-clip-1":    _get_media_path("wg-clip-1",    "https://res.cloudinary.com/moahwrg0/video/upload/v1784524504/insane.thrillers-20260502-0003_wwzxj7.mp4"),
    "wg-clip-2":    _get_media_path("wg-clip-2",    "https://res.cloudinary.com/moahwrg0/video/upload/v1784525228/insane.thrillers-20260502-0005_pqaoan.mp4"),

    # ── KANDATI TRAILS ────────────────────────────────────────
    "kt-card":      _get_media_path("kt-card",      "https://res.cloudinary.com/moahwrg0/image/upload/v1784525278/insane.thrillers-20260502-0001_hsscso.jpg"),
    "kt-poster":    _get_media_path("kt-poster",    "https://res.cloudinary.com/moahwrg0/image/upload/v1784525280/insane.thrillers-20260502-0002_ovixai.jpg"),
    "kt-gallery-1": _get_media_path("kt-gallery-1", "https://res.cloudinary.com/moahwrg0/image/upload/v1784525280/insane.thrillers-20260502-0003_bzevhy.jpg"),
    "kt-gallery-2": _get_media_path("kt-gallery-2", "https://res.cloudinary.com/moahwrg0/image/upload/v1784525280/insane.thrillers-20260502-0002_ovixai.jpg"),
    "kt-video":     _get_media_path("kt-video",     "https://res.cloudinary.com/moahwrg0/video/upload/v1784525228/insane.thrillers-20260502-0005_pqaoan.mp4"),
    "kt-clip-1":    _get_media_path("kt-clip-1",    "https://res.cloudinary.com/moahwrg0/video/upload/v1784525281/insane.thrillers-20260502-0002_tsqxji.mp4"),
}


# ── Helper ────────────────────────────────────────────────────
def media_url(key):
    return f"/media/{key}"

# Transparent 1×1 PNG — returned when an image key is missing
_BLANK_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


# ── /media/<key> route ────────────────────────────────────────
@app.route("/media/<key>")
def serve_media(key):
    path = MEDIA_FILES.get(key)
    if not path:
        return Response(_BLANK_PNG, mimetype="image/png")

    # If path is an external URL, redirect directly
    if path.startswith("http://") or path.startswith("https://"):
        return redirect(path)

    ext  = os.path.splitext(path)[1].lower()

    # Key missing or file not found
    if not os.path.isfile(path):
        if ext in (".mp4", ".mov", ".webm"):
            return "Video not found", 404
        return Response(_BLANK_PNG, mimetype="image/png")

    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"

    if mime.startswith("video/"):
        return _stream_video(path, mime)

    return send_file(path, mimetype=mime)


def _stream_video(path, mime):
    """HTTP Range streaming so scrubbing works in the browser."""
    file_size    = os.path.getsize(path)
    range_header = request.headers.get("Range")

    if range_header:
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0])
        end   = int(parts[1]) if parts[1] else file_size - 1
        length = end - start + 1

        def _gen():
            with open(path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining:
                    chunk = f.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return Response(_gen(), 206, headers={
            "Content-Range":  f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges":  "bytes",
            "Content-Length": str(length),
            "Content-Type":   mime,
        })

    def _gen_full():
        with open(path, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                yield chunk

    return Response(_gen_full(), 200, headers={
        "Content-Length": str(file_size),
        "Accept-Ranges":  "bytes",
        "Content-Type":   mime,
    })


# ══════════════════════════════════════════════════════════════
#  EVENT DATA
# ══════════════════════════════════════════════════════════════
completed_events = [
    {
        "slug":      "western-ghats",
        "title":     "Western Ghats Offroad",
        "edition":   "Edition 01",
        "date":      "1 September",
        "location":  "Mahabaleshwar, Uchat",
        "card_key":  "wg-card",       # ← card thumbnail on events page
        "poster_key":"wg-poster",     # ← hero background on recap page
        "desc":      "Our very first event — 15/20 km of raw off-road track, river crossings minimum 3ft deep, extreme muddy terrain, and vehicle river crossings in a ferry boat. The one that started it all.",
        "stats":     {"riders": "50+", "km": "20", "hours": "8"},
        "amenities": [
            "10 Ltr fuel provided",
            "Vehicle river crossing in ferry boat",
            "Breakfast & lunch included",
            "3 recovery vehicles on track",
            "Medical team on support",
            "Drone shoots taken",
        ],
        "gallery_keys":    ["wg-gallery-1", "wg-gallery-2", "wg-gallery-3", "wg-gallery-4"],
        "video_key":       "wg-video",
        "extra_clip_keys": ["wg-clip-1", "wg-clip-2"],
    },
    {
        "slug":      "kandati-trails",
        "title":     "Kandati Trails",
        "edition":   "Edition 02",
        "date":      "3 August",
        "location":  "Mahabaleshwar, Uchat",
        "card_key":  "kt-card",
        "poster_key":"kt-poster",
        "desc":      "Brutal jungle terrain with river crossings, rocky ascents, and 2 full off-road tracks. Kandati added camping in the Sahyadri range — an unforgettable overnight for the hardcore riders.",
        "stats":     {"riders": "80+", "km": "42", "hours": "10"},
        "amenities": [
            "Official goodies & custom car stickers",
            "Free lunch, refreshments & mineral water",
            "No toll charges — prepaid by us",
            "Drone coverage & Instagram reels",
            "Medical & recovery support",
            "Walkie-talkie coordination",
            "2 off-road tracks with unlimited access",
            "Thrilling river crossings",
            "Camping in Sahyadri (bring own kit)",
        ],
        "gallery_keys":    ["kt-gallery-1", "kt-gallery-2"],
        "video_key":       "kt-video",
        "extra_clip_keys": ["kt-clip-1"],
    },
]

upcoming_events = [
    {
        "slug":     "koyna-expeditions",
        "title":    "Koyna Expeditions",
        "date":     "Coming Soon",
        "location": "Western Ghats",
        "image":    "https://res.cloudinary.com/moahwrg0/image/upload/v1784996048/koyna_expiditions_qfwccl.png",
        "desc":     "Deep into the Koyna wildlife sanctuary and Sahyadri range — dense forests, mud bogs, and vertical drops that define legends.",
        "form_url": "https://docs.google.com/forms/d/e/1FAIpQLScgs2gcVFeg8vay8dbNHZbcwvGeCumFD9F9A2CvhBx_NR9Ixw/viewform?usp=dialog",
        "countdown_date": "2026-08-15T09:00:00",
    },
]


# ── Inject helper into all templates ─────────────────────────
@app.context_processor
def inject_helpers():
    return dict(media_url=media_url)


# ══════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════
@app.route("/")
def home():
    return render_template("index.html",
        completed_events=completed_events,
        upcoming_events=upcoming_events)

@app.route("/events")
def show_events():
    return render_template("events.html",
        completed_events=completed_events,
        upcoming_events=upcoming_events)

@app.route("/events/<slug>")
def event_recap(slug):
    event = next((e for e in completed_events if e["slug"] == slug), None)
    if not event:
        return redirect(url_for("show_events"))
    return render_template("recap.html", event=event)

@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name    = request.form.get("name",    "").strip()
        email   = request.form.get("email",   "").strip()
        phone   = request.form.get("phone",   "").strip()
        event   = request.form.get("event",   "").strip()
        message = request.form.get("message", "").strip()

        if not name or not email or not message:
            flash("Please fill in your name, email, and message.", "error")
            return redirect(url_for("contact"))

        if not MAIL_PASS:
            flash("✅ Message received! We'll reach out to you soon.", "success")
        else:
            try:
                _send_email(name, email, phone, event, message)
                flash("✅ Message sent! We'll reach out to you soon.", "success")
            except Exception as e:
                print(f"[EMAIL ERROR] {e}")
                flash("Something went wrong. Please email us at insanethrillers@gmail.com", "error")

        return redirect(url_for("contact"))

    return render_template("contact.html", upcoming_events=upcoming_events)


def _send_email(name, email, phone, event, message):
    msg = MIMEMultipart("alternative")
    msg["Subject"]  = f"[Insane Thrillers] New enquiry from {name}"
    msg["From"]     = MAIL_USER
    msg["To"]       = MAIL_TO
    msg["Reply-To"] = email
    plain = f"Name: {name}\nEmail: {email}\nPhone: {phone}\nEvent: {event}\n\n{message}"
    html  = f"""<html><body style="font-family:Arial;background:#111;color:#f0ece4;padding:32px;">
      <h2 style="color:#E63329;">INSANE THRILLERS — New Enquiry</h2>
      <p><b>Name:</b> {name}</p><p><b>Email:</b> {email}</p>
      <p><b>Phone:</b> {phone or '—'}</p><p><b>Event:</b> {event or '—'}</p>
      <hr style="border-color:#333;"><p style="white-space:pre-wrap;">{message}</p>
    </body></html>"""
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html,  "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(MAIL_USER, MAIL_PASS)
        s.sendmail(MAIL_USER, MAIL_TO, msg.as_string())


@app.route("/submit-testimonial", methods=["POST"])
def submit_testimonial():
    name    = request.form.get("name",    "").strip()
    vehicle = request.form.get("vehicle", "").strip()
    review  = request.form.get("review",  "").strip()

    if not name or not review:
        flash("Please fill in your name and review.", "error")
        return redirect(url_for("home"))

    if not MAIL_PASS:
        flash("✅ Testimonial received! It will be posted after moderation.", "success")
    else:
        try:
            _send_testimonial_email(name, vehicle, review)
            flash("✅ Testimonial submitted! It will be posted after moderation.", "success")
        except Exception as e:
            print(f"[TESTIMONIAL EMAIL ERROR] {e}")
            flash("Thank you! Your testimonial has been saved for moderation.", "success")

    return redirect(url_for("home"))


def _send_testimonial_email(name, vehicle, review):
    msg = MIMEMultipart("alternative")
    msg["Subject"]  = f"[Insane Thrillers] New Testimonial from {name}"
    msg["From"]     = MAIL_USER
    msg["To"]       = MAIL_TO
    plain = f"New Rider Testimonial:\n\nName: {name}\nVehicle: {vehicle}\n\nReview:\n{review}"
    html  = f"""<html><body style="font-family:Arial;background:#111;color:#f0ece4;padding:32px;">
      <h2 style="color:#E63329;">INSANE THRILLERS — New Rider Testimonial</h2>
      <p><b>Name:</b> {name}</p>
      <p><b>Vehicle/Rig:</b> {vehicle or '—'}</p>
      <hr style="border-color:#333;"><p style="white-space:pre-wrap;">{review}</p>
    </body></html>"""
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html,  "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(MAIL_USER, MAIL_PASS)
        s.sendmail(MAIL_USER, MAIL_TO, msg.as_string())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    app.run(host="0.0.0.0", port=port, debug=debug)
