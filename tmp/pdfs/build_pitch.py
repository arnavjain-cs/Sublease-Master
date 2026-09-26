from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path('/Users/arnavjain/Downloads/GitHub/Sublease Master')
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont('Arial', '/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold')

W, H = 612, 792
LEFT, RIGHT = 72, 540
TEXT_LEFT = 81
TEXT_W = RIGHT - TEXT_LEFT - 9

body = ParagraphStyle('body', fontName='Arial', fontSize=12, leading=18, alignment=TA_LEFT)
bold = ParagraphStyle('bold', parent=body, fontName='Arial-Bold')
script_body = ParagraphStyle('script', fontName='Arial', fontSize=11.5, leading=17.2)
small = ParagraphStyle('small', fontName='Arial', fontSize=8.5, leading=12.5)


def para(c, value, x, top, width, style=body):
    p = Paragraph(value, style)
    _, height = p.wrap(width, H)
    p.drawOn(c, x, H - top - height)
    return top + height


def heading(c, value, top):
    c.setFont('Arial', 12)
    c.setFillColor(colors.black)
    c.drawString(LEFT, H - top - 12, value)
    return top + 18


def box(c, top, items, gap=6, pad=9):
    y = top + pad
    for kind, value in items:
        style = bold if kind == 'bold' else body
        y = para(c, value, TEXT_LEFT, y, TEXT_W, style)
        y += gap
    bottom = y - gap + pad
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.rect(LEFT, H - bottom, RIGHT - LEFT, bottom - top, stroke=1, fill=0)
    return bottom


def text(c, value, top, style=body, x=LEFT, width=468):
    return para(c, value, x, top, width, style)


pitch_path = OUT / 'Sublease_Master_Written_Pitch.pdf'
c = canvas.Canvas(str(pitch_path), pagesize=(W, H))
c.setTitle('Sublease Master - Written Pitch')
c.setAuthor('Sublease Master')

# Page 1 mirrors the sample's simple heading and boxed-answer format.
text(c, 'Video Pitch:', 74)
text(c, 'Script provided separately for a single-take recording.', 92)

heading(c, 'A. Problem & Evidence', 143)
box(c, 161, [
    ('p', 'The target user is a college student with an off-campus lease who will be away for an internship, study abroad, or part of the summer and needs a temporary tenant. They often repeat a listing across social groups and housing boards, while seekers must piece together dates, cost, roommates, and whether the sublet is allowed. UC Davis lists multiple Facebook housing groups, and Illinois says summer is especially difficult for finding a subtenant [1, 2]. Yale advises checking lease rules and getting written landlord permission, while an Illinois campus police report illustrates the risk of fake sublease posts [3, 4].'),
])

heading(c, 'B. Originality & Differentiation', 332)
box(c, 350, [
    ('p', 'The insight is that a sublease needs a precise date match and an approval process, while a social post usually ends at the introduction. Alternatives include Facebook and WhatsApp groups, campus housing boards, free university sublet listings such as UCF\'s, and general sites such as Sublet.com [5, 6]. Sublease Master will serve students across colleges through campus-based feeds with comparable dates, total monthly cost, room details, and self-reported approval status. It will guide both students from first inquiry to written landlord approval before they finalize a deal.'),
])

heading(c, 'C. MVP & Product Decisions', 527)
box(c, 545, [
    ('bold', 'Core capabilities'),
    ('p', '- School-email sign-in, $25 listing checkout, and a form for dates, rent, utilities, room type, roommates, photos, and approval status.'),
    ('p', '- Campus-based search by overlapping dates and budget; show when each listing was last confirmed.'),
    ('p', '- In-app inquiries so listers can respond and mark a room matched or unavailable.'),
], gap=5)
c.showPage()

# Page 2 continues the MVP box, then follows the sample's D and E sequence.
box(c, 72, [
    ('p', '- A plain-language checklist that asks both sides to confirm lease rules and written landlord approval before marking a match complete.'),
    ('p', '- Automatic expiration of stale listings and a way to flag suspicious posts for manual review.'),
    ('bold', 'Explicitly out of scope'),
    ('p', '- Rent payments, deposits, escrow, legal-document generation, or background checks.'),
    ('p', '- Native iOS or Android apps, automated landlord integrations, and paid nationwide marketing; the MVP is a responsive website.'),
    ('bold', 'Measurable MVP goals'),
    ('p', '- At least 8 of 10 student listers can publish a complete listing in four minutes or less without help.'),
    ('p', '- At least 8 of 10 seekers can find a listing matching their dates and budget and send an inquiry within two minutes in a seeded 20-listing test.'),
    ('p', '- In a six-week pilot spanning at least three colleges, publish ten paid listings and reach five matches for which both students confirm written landlord approval.'),
], gap=5)

heading(c, 'D. Build Plan, Tradeoffs & Risks', 424)
box(c, 442, [
    ('p', 'I will build a responsive web app with Next.js and Supabase for school-email sign-in, $25 listing checkout, campus-based listings, date filters, and inquiries. I will recruit listers through student housing channels at several colleges before inviting seekers, because search needs local inventory. The tradeoff is manual review of flagged posts instead of automated fraud detection, which slows growth but makes early reports easier to assess. The biggest product risk is that an upfront fee suppresses listings; I will track how many eligible listers pay and how often searches return results. A school email proves affiliation, not authority to sublet, so approval status will be labeled self-reported and both students must confirm written landlord consent.'),
])

heading(c, 'E. 5 ICP Questions', 662)
box(c, 680, [
    ('bold', '1. WHO:'),
], gap=0)
c.showPage()

box(c, 72, [
    ('p', '&#8226; Three attributes: college student; holds a private off-campus lease; expects to be away for at least one month while the lease continues.'),
    ('p', '&#8226; Real person fitting profile: to be identified in pilot interviews; no student interview is claimed yet.'),
    ('bold', '2. AGAINST WHAT:'),
    ('p', '&#8226; Current alternatives: campus Facebook or WhatsApp groups, university housing boards, and general sublet sites.'),
    ('p', '&#8226; Why we could win: one current, date-filtered listing and a visible approval checklist reduce repeated questions and unclear handoffs.'),
    ('bold', '3. THE FIRST TEN:'),
    ('p', '&#8226; Invite ten students actively seeking subtenants across several colleges through campus housing organizations and group moderators; ask them to create real listings.'),
    ('bold', '4. PRICE:'),
    ('p', '&#8226; $25 once per published listing, paid by the outgoing student; searching is free. This is half one competitor\'s $50 listing price [7], but willingness to pay is unproven. Later, assume the incoming subtenant pays $5 per monthly in-app rent payment for convenience and a payment record.'),
    ('bold', '5. SIGNAL:'),
    ('p', '&#8226; Show the $25 price to 30 eligible listers across at least three colleges; revise it if fewer than ten pay to post. After rent payments are built, test 20 monthly payments and check whether the $5 fee exceeds processing and support costs [8].'),
], gap=4)

c.setFont('Arial-Bold', 9)
c.drawString(LEFT, H - 601, 'Research sources (accessed September 2026)')
sources = [
    ('[1] UC Davis, Off-Campus Housing Toolkit', 'https://undocumented.ucdavis.edu/undocumented-and-immigrant-friendly-housing-toolkit'),
    ('[2] Illinois, Application & Lease', 'https://occl.illinois.edu/housing/application-and-lease'),
    ('[3] Yale College, Off-Campus Living: Subletting', 'https://college.yale.edu/life-at-yale/off-campus-living/off-campus-living-subletting'),
    ('[4] Illinois Police, Fake apartment sublease', 'https://www.police.illinois.edu/fake-apartment-sublease-3/'),
    ('[5] UCF, Off-Campus Housing Search', 'https://ucf.offcampuspartners.com/'),
    ('[6] Sublet.com, College Apartment Rentals', 'https://www.sublet.com/college-apartment-rentals'),
    ('[7] Student Spots, Pricing', 'https://studentspots.com/pricing'),
    ('[8] Stripe, Payment Pricing', 'https://stripe.com/pricing/local-payment-methods'),
]
sy = 615
for label, url in sources:
    c.setFont('Arial', 8.5)
    c.setFillColor(colors.blue)
    c.drawString(LEFT, H - sy - 8.5, label)
    c.linkURL(url, (LEFT, H - sy - 11, RIGHT, H - sy + 2), relative=0)
    sy += 16
c.save()


script_path = OUT / 'Sublease_Master_Video_Pitch_Script.pdf'
s = canvas.Canvas(str(script_path), pagesize=(W, H))
s.setTitle('Sublease Master - Video Pitch Script')
s.setAuthor('Sublease Master')
s.setFont('Arial-Bold', 17)
s.drawString(LEFT, H - 66, 'Sublease Master - Video Pitch Script')
s.setFont('Arial', 9.5)
s.drawString(LEFT, H - 86, 'Single take  |  About 2 minutes 40 seconds at a conversational pace')

script_sections = [
    ('User & Problem  |  0:00-0:38',
     'Imagine you are a college student leaving for a summer internship, but your apartment lease runs until August. You still owe rent on a room you will not use. To find a subtenant, you may post the same details in Facebook groups, WhatsApp chats, and a campus housing board, then answer the same questions about dates, price, and roommates over and over. The person looking for a room has to sort through those scattered posts and figure out which ones are still available.'),
    ('Insight  |  0:38-1:29',
     'What stood out in my research is the handoff after someone finds a listing. UC Davis points students toward many separate Facebook housing groups, and Illinois says summer can be especially hard for finding a subtenant. Yale tells students to check lease rules and get the landlord\'s written permission. There is a trust issue too: Illinois campus police documented a fake Facebook sublease that led a student to send money. A successful sublease needs an exact date and cost match, plus a clear path to approval. A generic post leaves students to coordinate that process alone.'),
    ('Solution  |  1:29-2:17',
     'Sublease Master would give college students a focused place to handle that handoff through a feed for each campus. A student posts a room once with the real available dates, monthly cost, roommate details, and whether landlord approval is still pending. Someone seeking a room filters for their dates and budget, asks a question in the app, and can see when the listing was last confirmed. Both sides follow a short approval checklist before calling it a completed match. A school email helps establish affiliation, but the app will be clear that it does not verify ownership or replace the landlord\'s consent.'),
    ('Why This Version  |  2:17-2:42',
     'I want to start with a simple website and real listings from at least three colleges. In six weeks, I want to learn whether forty-five listings can produce five matches that both sides confirm after written approval. If students find matches but approval is the bottleneck, I will improve that handoff before expanding outreach.'),
]

y = 110
for title, content in script_sections:
    s.setFont('Arial-Bold', 10)
    s.drawString(LEFT, H - y - 10, title)
    y += 18
    y = para(s, escape(content), LEFT, y, RIGHT - LEFT, script_body)
    y += 14

s.setStrokeColor(colors.black)
s.setLineWidth(0.5)
s.line(LEFT, H - 719, RIGHT, H - 719)
para(s, 'Research basis: UC Davis [1], Illinois [2], Yale [3], and Illinois Police [4]. Full links appear in the written pitch. Section labels and times are reading cues, not words to speak.', LEFT, 726, RIGHT - LEFT, small)
s.save()

print(pitch_path)
print(script_path)
