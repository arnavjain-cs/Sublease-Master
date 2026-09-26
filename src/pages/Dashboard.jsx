import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChartBar, ChatCircleDots, HouseLine, PencilSimple, Plus, Users } from '@phosphor-icons/react';
import { api, dateRange, formatMoney } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Badge, Button, ButtonLink, EmptyState, PageLoader } from '../components/UI';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  useEffect(() => { api('/dashboard').then(setData).catch((caught) => setError(caught.message)); }, []);
  async function status(id, value) {
    setBusyId(id); setError('');
    try { const result = await api(`/listings/${id}/status`, { method: 'PATCH', body: { status: value } }); setData((current) => ({ ...current, listings: current.listings.map((item) => item.id === id ? result.listing : item) })); }
    catch (caught) { setError(caught.message); } finally { setBusyId(''); }
  }
  async function signOut() { await logout(); navigate('/'); }
  return <div className="dashboard-page shell page-pad"><div className="dashboard-heading"><div><p className="overline">Your space</p><h1>Welcome back, {user.name.split(' ')[0]}.</h1><p>Manage your listings and conversations from one place.</p></div><ButtonLink to="/post"><Plus size={18} /> Post a room</ButtonLink></div><Alert>{error}</Alert>{params.get('checkout') === 'cancelled' && <Alert tone="info">Checkout was cancelled. Your draft is saved.</Alert>}
    <div className="dashboard-stats"><div><HouseLine size={22} /><strong>{data?.listings?.length ?? '—'}</strong><span>My listings</span></div><div><Users size={22} /><strong>{data?.inquiryCount ?? '—'}</strong><span>Inquiries</span></div><div><ChatCircleDots size={22} /><Link to="/inbox">Open inbox <ArrowRight size={16} /></Link><span>Student conversations</span></div></div>
    <div className="dashboard-section-heading"><div><p className="overline">Your rooms</p><h2>Listings</h2></div><button type="button" className="link-button" onClick={signOut}>Log out</button></div>
    {!data ? <PageLoader /> : data.listings.length ? <div className="dashboard-listings">{data.listings.map((listing) => <article className="dashboard-listing" key={listing.id}><Link to={`/rooms/${listing.id}`} className="dashboard-photo"><img src={listing.photos[0] || '/images/room-olive.jpg'} alt="" /></Link><div className="dashboard-listing-main"><div className="dashboard-listing-top"><Badge tone={listing.status === 'published' ? 'success' : listing.status === 'draft' ? 'info' : 'neutral'}>{listing.status}</Badge><span>{formatMoney(listing.rent)}/mo</span></div><h3><Link to={`/rooms/${listing.id}`}>{listing.title}</Link></h3><p>{listing.city} · {dateRange(listing.availableFrom, listing.availableTo)}</p><div className="dashboard-meta"><span><ChartBar size={16} /> {listing.views} views</span><span><ChatCircleDots size={16} /> {listing.inquiryCount} inquiries</span></div></div><div className="dashboard-listing-actions"><ButtonLink to={`/post/${listing.id}/edit`} variant="outline" size="sm"><PencilSimple size={16} /> Edit</ButtonLink>{listing.status === 'published' && <Button type="button" variant="ghost" size="sm" disabled={busyId === listing.id} onClick={() => status(listing.id, 'unavailable')}>Mark unavailable</Button>}{listing.status === 'unavailable' && <Button type="button" variant="ghost" size="sm" disabled={busyId === listing.id} onClick={() => status(listing.id, 'published')}>Republish</Button>}{listing.status === 'draft' && <Link className="text-link" to={`/post/${listing.id}/edit`}>Complete draft <ArrowRight size={16} /></Link>}{listing.status !== 'archived' && <Button type="button" variant="ghost" size="sm" disabled={busyId === listing.id} onClick={() => status(listing.id, 'archived')}>Archive</Button>}</div></article>)}</div> : <EmptyState icon={HouseLine} title="Your first listing starts here" body="Share the space and dates you have open. Your draft is free to create." action={<ButtonLink to="/post">Create a listing <ArrowRight size={18} /></ButtonLink>} />}
  </div>;
}
