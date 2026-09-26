from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path('/Users/arnavjain/Downloads/GitHub/Sublease Master')
OUT = ROOT / 'output' / 'pdf' / 'Sublease_Master_Video_Pitch_Script.pdf'
pdfmetrics.registerFont(TTFont('Arial', '/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))

W, H = 612, 792
LEFT, RIGHT = 72, 540
style = ParagraphStyle('script', fontName='Arial', fontSize=11.5, leading=17.3)

paragraphs = [
    "Picture a college student who leaves campus in May for an internship. Her apartment lease runs until August, so every empty week costs money. She posts the room in Facebook groups, WhatsApp chats, and a campus housing board. Messages pile up about dates, roommates, and landlord approval. Meanwhile, a student arriving for a summer program is searching those same scattered posts. They might be a good match, but neither has a clear path to find out.",
    "What I learned is that the hard part is the handoff. UC Davis points students to many separate Facebook housing groups, Illinois calls summer subletting especially difficult, and Yale reminds tenants that written landlord approval matters. A post rarely shows whether dates fit or landlord approval is possible. Sublease Master is built around that moment: moving from 'I found a room' to 'we have an approved match.'",
    "The outgoing student would post once, with the real dates, full monthly cost, roommate situation, and approval status. The incoming student could search a feed for their campus and the weeks they actually need. They could talk in one place, see whether the listing is current, and follow a short approval checklist before treating the room as taken. It would never claim that a school email proves someone owns the apartment or can sublet it.",
    "Students on both sides use the app, but the student offering the room would pay twenty-five dollars once to publish a listing. Searching would stay free. That upfront fee could help cover hosting and review, and it is half the listing price published by one student-sublet service. I am assuming students will pay before they know whether the room will fill. Later, once rent payments are integrated, the incoming subtenant could pay rent in the app with a separate five-dollar fee each month for convenience and a payment record. That fee only works if processing costs are low enough; standard card fees could exceed it.",
    "First, I want to show the twenty-five-dollar price to thirty eligible listers at three colleges and see at least ten pay to post, followed by five approved matches. If students will not pay upfront, I will change the model. Before adding rent payments, I will test whether five dollars covers processing costs and whether subtenants want that option. That will show whether scattered posts can become approved subleases and support a business.",
]

c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('Sublease Master - Video Pitch Script')
c.setAuthor('Sublease Master')
c.setFont('Arial-Bold', 17)
c.drawString(LEFT, H - 67, 'Sublease Master - Video Pitch Script')
c.setFont('Arial', 9.5)
c.drawString(LEFT, H - 88, 'One continuous take  |  About 2 minutes 50 seconds at a conversational pace')

top = 116
for content in paragraphs:
    p = Paragraph(escape(content), style)
    _, height = p.wrap(RIGHT - LEFT, H)
    p.drawOn(c, LEFT, H - top - height)
    top += height + 9

if top > 702:
    raise RuntimeError(f'Script text runs into source notes at y={top:.1f}')

c.setStrokeColor(colors.black)
c.setLineWidth(0.5)
c.line(LEFT, H - 719, RIGHT, H - 719)
c.setFont('Arial', 8)
c.setFillColor(colors.black)
c.drawString(LEFT, H - 731, 'Research sources (not spoken):')

sources = [
    ('UC Davis', 'https://undocumented.ucdavis.edu/undocumented-and-immigrant-friendly-housing-toolkit'),
    ('Illinois', 'https://occl.illinois.edu/housing/application-and-lease'),
    ('Yale', 'https://college.yale.edu/life-at-yale/off-campus-living/off-campus-living-subletting'),
    ('Student Spots pricing', 'https://studentspots.com/pricing'),
    ('Stripe pricing', 'https://stripe.com/pricing/local-payment-methods'),
]
x = LEFT + 139
for i, (label, url) in enumerate(sources):
    display = label + (', ' if i < len(sources) - 1 else '')
    width = pdfmetrics.stringWidth(display, 'Arial', 8)
    c.setFillColor(colors.blue)
    c.drawString(x, H - 731, display)
    c.linkURL(url, (x, H - 733, x + width, H - 720), relative=0)
    x += width

c.save()
print(OUT)
