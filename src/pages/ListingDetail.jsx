import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarBlank, Check, Flag, Heart, HouseLine, MapPin, ShieldCheck, Users } from '@phosphor-icons/react';
import { api, approvalLabel, dateRange, formatMoney, roomLabel } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Button, ButtonLink, EmptyState, Input, PageLoader, Select, Textarea } from '../components/UI';

export default function ListingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inquiry, setInquiry] = useState({ requestedFrom: '', requestedTo: '', message: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: 'suspected_scam', details: '' });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/listings/${id}`).then(({ listing: item }) => { if (active) setListing(item); }).catch((caught) => { if (active) setError(caught.message); }).finally(() => { if (active) setLoading(false); });
    if (user) api('/favorites/ids').then(({ ids }) => { if (active) setSaved(ids.includes(id)); }).catch(() => {});
    return () => { active = false; };
  }, [id, user]);

  async function toggleSave() {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/rooms/${id}`)}`);
    if (!user.verified) return navigate(`/verify?next=${encodeURIComponent(`/rooms/${id}`)}`);
    setBusy(true); setError('');
    try { const result = await api(`/favorites/${id}`, { method: 'POST' }); setSaved(result.saved); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  async function sendInquiry(event) {
    event.preventDefault();
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/rooms/${id}`)}`);
    if (!user.verified) return navigate(`/verify?next=${encodeURIComponent(`/rooms/${id}`)}`);
    setBusy(true); setError('');
    try { const result = await api('/inquiries', { method: 'POST', body: { listingId: id, message: inquiry.message, ...(inquiry.requestedFrom ? { requestedFrom: inquiry.requestedFrom } : {}), ...(inquiry.requestedTo ? { requestedTo: inquiry.requestedTo } : {}) } }); navigate(`/inbox/${result.threadId}`); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  async function sendReport(event) {
    event.preventDefault();
    if (!user.verified) return navigate(`/verify?next=${encodeURIComponent(`/rooms/${id}`)}`);
    setBusy(true); setError('');
    try { await api(`/listings/${id}/report`, { method: 'POST', body: report }); setReportOpen(false); setNotice('Thanks. We received your report.'); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  if (loading) return <div className="shell page-pad"><PageLoader /></div>;
  if (!listing) return <div className="shell page-pad"><EmptyState icon={HouseLine} title="This room could not be found" body={error || 'It may have been removed or made unavailable.'} action={<ButtonLink to="/explore">Explore rooms</ButtonLink>} /></div>;
  const owner = user?.id === listing.ownerId;
  return <div className="detail-page shell">
    <Link to="/explore" className="back-link"><ArrowLeft size={17} /> Back to rooms</Link>
    <div className="detail-heading"><div><div className="detail-eyebrow"><Badge tone="soft">{roomLabel(listing.roomType)}</Badge>{listing.isDemo && <Badge tone="info">Sample listing</Badge>}</div><h1>{listing.title}</h1><p><MapPin size={18} /> {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}, {listing.region} <span className="dot-separator">·</span> {listing.school}</p></div><button type="button" className={`detail-save button button--outline ${saved ? 'is-saved' : ''}`} onClick={toggleSave} disabled={busy}><Heart size={19} weight={saved ? 'fill' : 'regular'} /> {saved ? 'Saved' : 'Save room'}</button></div>
    {params.get('published') === 'demo' && <Alert tone="info">This listing is live in local demo mode. No real payment was collected.</Alert>}
    <Alert tone="success">{notice}</Alert><Alert>{error}</Alert>
    <div className="photo-gallery"><div className="gallery-main"><img src={listing.photos[activePhoto] || '/images/room-olive.jpg'} alt={`${listing.title}, photo ${activePhoto + 1}`} /></div>{listing.photos.length > 1 && <div className="gallery-thumbs">{listing.photos.map((photo, index) => <button type="button" key={photo} className={activePhoto === index ? 'active' : ''} onClick={() => setActivePhoto(index)} aria-label={`Show photo ${index + 1}`}><img src={photo} alt="" /></button>)}</div>}</div>
    <div className="detail-layout"><div className="detail-content">
      <div className="detail-facts"><span><CalendarBlank size={23} /><strong>{dateRange(listing.availableFrom, listing.availableTo)}</strong><small>Available dates</small></span><span><HouseLine size={23} /><strong>{listing.bedrooms} bed · {listing.bathrooms} bath</strong><small>{listing.furnished ? 'Furnished' : 'Unfurnished'}</small></span><span><Users size={23} /><strong>{listing.roommates === 0 ? 'No roommates' : `${listing.roommates} roommate${listing.roommates === 1 ? '' : 's'}`}</strong><small>In the home</small></span></div>
      <section className="detail-section"><p className="overline">The space</p><h2>About this place</h2><p className="listing-description">{listing.description}</p></section>
      {listing.amenities.length > 0 && <section className="detail-section"><p className="overline">At a glance</p><h2>What comes with it</h2><div className="amenity-grid">{listing.amenities.map((amenity) => <span key={amenity}><Check size={18} />{amenity}</span>)}</div></section>}
      <section className="detail-section"><p className="overline">Before you commit</p><h2>Lease and approval</h2><div className="approval-box"><ShieldCheck size={23} /><div><strong>{approvalLabel(listing.approvalStatus)}</strong><p>This status is supplied by the poster. Ask to see the lease terms and written property approval before paying anyone.</p></div></div></section>
      <section className="detail-section"><p className="overline">The poster</p><h2>Meet the student</h2><div className="poster-row"><span className="avatar">{listing.ownerName?.slice(0, 1)}</span><div><strong>{listing.ownerName}</strong><p>{listing.isDemo ? 'Sample account' : 'School email confirmed'} · {listing.ownerSchool}</p></div></div></section>
      {user && !owner && <div className="report-area"><button type="button" className="link-button" onClick={() => setReportOpen(!reportOpen)}><Flag size={16} /> Report this listing</button>{reportOpen && <form onSubmit={sendReport} className="report-form"><Select id="report-reason" label="What is the issue?" value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })}><option value="suspected_scam">Possible scam</option><option value="incorrect_details">Incorrect details</option><option value="unavailable">No longer available</option><option value="other">Other</option></Select><Textarea id="report-details" label="Details (optional)" maxLength={1000} rows={3} value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} /><Button type="submit" loading={busy} size="sm">Send report</Button></form>}</div>}
    </div><aside className="detail-aside"><div className="contact-card"><div className="contact-price"><strong>{formatMoney(listing.rent)}</strong><span>/ month</span></div><p className="contact-price-note">{listing.utilities ? `Utilities: ${formatMoney(listing.utilities)}/mo` : 'Utilities included or unspecified'}{listing.deposit ? ` · Deposit: ${formatMoney(listing.deposit)}` : ''}</p><div className="contact-rule" />
      {owner ? <><p>This is your listing. Manage its details and availability from your dashboard.</p><ButtonLink to={`/post/${id}/edit`} className="form-primary">Edit listing</ButtonLink></> : listing.isDemo ? <><p>This sample shows how listings appear. It cannot receive messages.</p><ButtonLink to="/explore" variant="outline" className="form-primary">Explore more rooms</ButtonLink></> : <><h3>Ask about this room</h3><p>Message the poster directly. No renter fee to ask questions.</p><form onSubmit={sendInquiry}><div className="two-fields"><Input id="inquiry-from" label="Move in (optional)" type="date" min={listing.availableFrom} max={listing.availableTo} value={inquiry.requestedFrom} onChange={(e) => setInquiry({ ...inquiry, requestedFrom: e.target.value })} /><Input id="inquiry-to" label="Move out (optional)" type="date" min={inquiry.requestedFrom || listing.availableFrom} max={listing.availableTo} value={inquiry.requestedTo} onChange={(e) => setInquiry({ ...inquiry, requestedTo: e.target.value })} /></div><Textarea id="inquiry-message" label="Your message" rows={4} minLength={10} required placeholder="Hi! Is this room still available?" value={inquiry.message} onChange={(e) => setInquiry({ ...inquiry, message: e.target.value })} /><Button type="submit" loading={busy} className="form-primary">Send message</Button></form></>}
      <p className="contact-safety"><ShieldCheck size={17} /> Never send rent or a deposit before confirming the lease and approval.</p>
    </div></aside></div>
  </div>;
}
