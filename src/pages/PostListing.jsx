import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle, Info, Trash, UploadSimple } from '@phosphor-icons/react';
import { api, formatMoney } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, ButtonLink, Input, PageLoader, Select, Textarea } from '../components/UI';

const amenityChoices = ['Wi-Fi', 'In-unit laundry', 'Laundry', 'Air conditioning', 'Heating', 'Dishwasher', 'Desk', 'Parking', 'Balcony', 'Near transit', 'Pet friendly', 'Gym'];
const empty = { title: '', description: '', school: '', city: '', region: '', neighborhood: '', privateAddress: '', rent: '', utilities: '0', deposit: '0', availableFrom: '', availableTo: '', roomType: 'private_room', bedrooms: '1', bathrooms: '1', roommates: '0', furnished: true, approvalStatus: 'not_started', amenities: [] };

export default function PostListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...empty, school: user?.school || '' });
  const [listing, setListing] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fields, setFields] = useState({});
  const [config, setConfig] = useState(null);
  useEffect(() => { api('/config').then(setConfig).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    api(`/listings/${id}`).then(({ listing: item }) => {
      if (!active) return;
      if (item.ownerId !== user?.id) { setError('You can only edit your own listing.'); return; }
      setListing(item);
      setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, item[key] ?? empty[key]])));
    }).catch((caught) => { if (active) setError(caught.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user?.id]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice(''); setFields({});
    let savedId = '';
    try {
      if ((listing?.photos.length || 0) + files.length > 5) throw new Error('Listings can have up to five photos. Remove one before adding more.');
      const oversized = files.find((file) => file.size > 3 * 1024 * 1024);
      if (oversized) throw new Error(`${oversized.name} is larger than 3 MB. Choose a smaller photo.`);
      const path = id ? `/listings/${id}` : '/listings';
      const result = await api(path, { method: id ? 'PUT' : 'POST', body: { ...form, rent: Number(form.rent), utilities: Number(form.utilities), deposit: Number(form.deposit), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), roommates: Number(form.roommates) } });
      let item = result.listing;
      savedId = item.id;
      for (const file of files) {
        const data = new FormData();
        data.append('photos', file);
        item = (await api(`/listings/${item.id}/photos`, { method: 'POST', body: data })).listing;
      }
      item = (await api(`/listings/${item.id}`)).listing;
      setListing(item); setFiles([]); setNotice('Your listing is saved.');
      if (!id) navigate(`/post/${item.id}/edit`, { replace: true });
    } catch (caught) {
      setError(savedId && !id ? `Your draft was saved, but the photos could not be added: ${caught.message}` : caught.message);
      if (savedId && !id) navigate(`/post/${savedId}/edit`, { replace: true });
      setFields(caught.fields || {});
      if (caught.fields && Object.keys(caught.fields).length) window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  }
  async function removePhoto(photo) {
    if (!listing) return;
    setBusy(true); setError('');
    try { await api(`/listings/${listing.id}/photos/${photo.id}`, { method: 'DELETE' }); const result = await api(`/listings/${listing.id}`); setListing(result.listing); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  async function publish() {
    if (!listing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/listings/${listing.id}/checkout`, { method: 'POST' });
      if (result.url) window.location.assign(result.url);
      else navigate(result.redirect || `/rooms/${listing.id}`);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  function toggleAmenity(value) { update('amenities', form.amenities.includes(value) ? form.amenities.filter((item) => item !== value) : [...form.amenities, value]); }
  if (loading) return <div className="shell page-pad"><PageLoader /></div>;
  return <div className="form-page shell"><div className="form-head"><Link to="/dashboard" className="back-link"><ArrowLeft size={17} /> My listings</Link><p className="overline">Share your space</p><h1>{id ? 'Edit your listing' : 'Make room for someone new.'}</h1><p>Tell students what matters most, then add photos. You can save a draft before paying to publish.</p></div>
    <div className="form-layout"><form id="listing-form" className="listing-form" onSubmit={save}><Alert>{error}</Alert><Alert tone="success">{notice}</Alert>
      <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>The basics</h2><p>Help someone recognize the right fit at a glance.</p></div></div><Input id="title" label="Listing title" required minLength={8} maxLength={90} placeholder="Bright private room near campus" value={form.title} onChange={(e) => update('title', e.target.value)} error={fields.title} /><Textarea id="description" label="Tell the story of your space" rows={6} required minLength={40} maxLength={2500} hint="Include the setup, the neighborhood, and anything a renter should know." placeholder="Describe the room, shared areas, and what makes it a good fit..." value={form.description} onChange={(e) => update('description', e.target.value)} error={fields.description} /><div className="two-fields"><Select id="roomType" label="Space type" value={form.roomType} onChange={(e) => update('roomType', e.target.value)}><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="entire_place">Entire place</option></Select><Select id="furnished" label="Furnished?" value={String(form.furnished)} onChange={(e) => update('furnished', e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></Select></div></section>
      <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Location and dates</h2><p>Your exact address stays private and is only shown to you.</p></div></div><Input id="school" label="College or university" required value={form.school} onChange={(e) => update('school', e.target.value)} error={fields.school} /><div className="two-fields"><Input id="city" label="City" required value={form.city} onChange={(e) => update('city', e.target.value)} error={fields.city} /><Input id="region" label="State or region" required placeholder="e.g. IL" value={form.region} onChange={(e) => update('region', e.target.value)} error={fields.region} /></div><Input id="neighborhood" label="Neighborhood (optional)" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} /><Input id="privateAddress" label="Exact address (private, optional)" value={form.privateAddress} onChange={(e) => update('privateAddress', e.target.value)} /><div className="two-fields"><Input id="availableFrom" label="Available from" type="date" required value={form.availableFrom} onChange={(e) => update('availableFrom', e.target.value)} error={fields.availableFrom} /><Input id="availableTo" label="Available until" type="date" min={form.availableFrom || undefined} required value={form.availableTo} onChange={(e) => update('availableTo', e.target.value)} error={fields.availableTo} /></div></section>
      <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Costs and setup</h2><p>Be upfront so there are fewer surprises later.</p></div></div><div className="three-fields"><Input id="rent" label="Monthly rent ($)" type="number" min={100} max={20000} required value={form.rent} onChange={(e) => update('rent', e.target.value)} error={fields.rent} /><Input id="utilities" label="Utilities / month ($)" type="number" min={0} value={form.utilities} onChange={(e) => update('utilities', e.target.value)} error={fields.utilities} /><Input id="deposit" label="Deposit ($)" type="number" min={0} value={form.deposit} onChange={(e) => update('deposit', e.target.value)} error={fields.deposit} /></div><div className="three-fields"><Input id="bedrooms" label="Bedrooms" type="number" min={1} max={20} required value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} /><Input id="bathrooms" label="Bathrooms" type="number" min={0.5} max={20} step={0.5} required value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} /><Input id="roommates" label="Roommates" type="number" min={0} max={20} required value={form.roommates} onChange={(e) => update('roommates', e.target.value)} /></div><fieldset className="amenity-fieldset"><legend>Amenities</legend><div className="amenity-choices">{amenityChoices.map((value) => <label key={value} className={form.amenities.includes(value) ? 'selected' : ''}><input type="checkbox" checked={form.amenities.includes(value)} onChange={() => toggleAmenity(value)} />{value}</label>)}</div></fieldset></section>
      <section className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Approval and photos</h2><p>Clear lease status helps everyone plan responsibly.</p></div></div><Select id="approvalStatus" label="Landlord or property approval" value={form.approvalStatus} onChange={(e) => update('approvalStatus', e.target.value)}><option value="not_started">I have not requested approval</option><option value="requested">I have requested approval</option><option value="approved">I have written approval</option></Select><p className="field-hint standalone-hint">You are responsible for confirming your lease allows subleasing. This status is self reported.</p><div className="photo-upload"><Camera size={29} /><strong>Add clear photos of the actual space</strong><span>Up to 5 PNG, JPEG, or WebP images, 3 MB each. At least one photo is required to publish.</span><label className="button button--outline button--sm"><UploadSimple size={17} /> Choose photos<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))} /></label></div>{files.length > 0 && <div className="selected-files">{files.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div>}{listing?.photoDetails?.length > 0 && <div className="uploaded-photos">{listing.photoDetails.map((photo) => <div key={photo.id}><img src={photo.path} alt="Listing upload" /><button type="button" onClick={() => removePhoto(photo)} disabled={busy} aria-label="Remove photo"><Trash size={17} /></button></div>)}</div>}</section>
      <div className="form-bottom"><Button type="submit" loading={busy}>{listing ? 'Save changes' : 'Save draft'} <ArrowRight size={18} /></Button><span>Save first, then publish from the panel.</span></div>
    </form><aside className="form-sidebar"><div className="publish-card"><p className="overline">Your listing</p><h2>Ready when you are.</h2><p>Creating and editing a draft is free. Publishing one listing costs <strong>$25 once</strong>.</p><div className="publish-price"><span>Publish listing</span><strong>$25</strong></div>{listing?.paid ? <div className="publish-status"><CheckCircle size={19} /> Listing fee paid</div> : <div className="publish-status"><Info size={19} /> Payment at publication</div>}{listing && !listing.paid && <Button type="button" onClick={publish} loading={busy} className="form-primary" disabled={!listing.photos.length || config?.paymentsMode === "unavailable"}>Publish for $25 <ArrowRight size={18} /></Button>}{listing && !listing.photos.length && <small>Add a photo and save to enable publication.</small>}{listing?.paid && <ButtonLink to={`/rooms/${listing.id}`} variant="outline" className="form-primary">View listing</ButtonLink>}{config?.paymentsMode === 'demo' && <p className="demo-note">Local demo checkout: no real payment is collected.</p>}{config?.paymentsMode === 'unavailable' && !listing?.paid && <p className="demo-note">Payments are not configured. The listing can be saved as a draft.</p>}</div><div className="aside-tip"><Info size={19} /><p>After a student reaches out, confirm lease rules and obtain written approval before any rent or deposit changes hands.</p></div></aside></div>
  </div>;
}
