from flask import Flask, render_template, request, redirect, url_for, flash, send_file, Response
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import mimetypes
import base64

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "insane-thrillers-secret-2025")

MAIL_USER = os.environ.get("MAIL_USER", "insanethrillers@gmail.com")
MAIL_PASS = os.environ.get("MAIL_PASS", "")
MAIL_TO   = "insanethrillers@gmail.com"


# ══════════════════════════════════════════════════════════════
#  MEDIA FILES — YOUR LOCAL PATHS
#  Just update the paths on the right. Everything else is wired.
#
#  Windows:  r"C:\Insane\filename.jpg"
#  Mac/Linux: "/Users/name/Insane/filename.jpg"
# ══════════════════════════════════════════════════════════════
MEDIA_FILES = {

    # ── WESTERN GHATS ─────────────────────────────────────────
    "wg-card":      r"C:\Insane\insane.thrillers-20260502-0005.jpg",  # events page card thumbnail
    "wg-poster":    r"C:\Insane\insane.thrillers-20260502-0004.jpg",  # recap hero background

    "wg-gallery-1": r"C:\Insane\insane.thrillers-20260502-0005.jpg",
    "wg-gallery-2": r"C:\Insane\insane.thrillers-20260502-0006.jpg",
    "wg-gallery-3": r"C:\Insane\insane.thrillers-20260502-0007.jpg",
    "wg-gallery-4": r"C:\Insane\insane.thrillers-20260502-0008.jpg",

    "wg-video":     r"C:\Insane\insane.thrillers-20260502-0001.mp4",
    "wg-clip-1":    r"C:\Insane\insane.thrillers-20260502-0003.mp4",
    "wg-clip-2":    r"C:\Insane\insane.thrillers-20260502-0004.mp4",

    # ── KANDATI TRAILS ────────────────────────────────────────
    "kt-card":      r"C:\Insane\insane.thrillers-20260502-0001.jpg",  # events page card thumbnail
    "kt-poster":    r"C:\Insane\insane.thrillers-20260502-0003.jpg",  # recap hero background  ← CHANGE THIS to a different image if you have one

    "kt-gallery-1": r"C:\Insane\insane.thrillers-20260502-0001.jpg",
    "kt-gallery-2": r"C:\Insane\insane.thrillers-20260502-0002.jpg",

    "kt-video":     r"C:\Insane\insane.thrillers-20260502-0005.mp4",
    "kt-clip-1":    r"C:\Insane\insane.thrillers-20260502-0002.mp4",
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
    ext  = os.path.splitext(path or "")[1].lower()

    # Key missing or file not found
    if not path or not os.path.isfile(path):
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
        "slug":     "sahyadri-trails",
        "title":    "Sahyadri Trails",
        "date":     "Coming Soon",
        "location": "Western Ghats",
        "image":    "event2.jpg",
        "desc":     "Deep into the Sahyadri range — dense forests, mud bogs, and vertical drops that define legends.",
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

    return render_template("contact.html")


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


if __name__ == "__main__":
    app.run(debug=True)