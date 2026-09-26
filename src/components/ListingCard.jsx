import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, CalendarBlank } from '@phosphor-icons/react';
import { api, dateRange, formatMoney, roomLabel } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge } from './UI';

export function ListingCard({ listing, initiallySaved = false, onSavedChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => setSaved(initiallySaved), [initiallySaved]);

  async function toggleSaved(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/rooms/${listing.id}`)}`);
    if (!user.verified) return navigate(`/verify?next=${encodeURIComponent(`/rooms/${listing.id}`)}`);
    setSaving(true);
    setSaveError('');
    try {
      const result = await api(`/favorites/${listing.id}`, { method: 'POST' });
      setSaved(result.saved);
      onSavedChange?.(listing.id, result.saved);
    } catch (caught) { setSaveError(caught.message); } finally { setSaving(false); }
  }

  return <article className="listing-card">
    <Link to={`/rooms/${listing.id}`} className="listing-card-image-link" aria-label={`View ${listing.title}`}>
      <img src={listing.photos[0] || '/images/room-olive.jpg'} alt={listing.title} loading="lazy" />
      {listing.isDemo && <span className="listing-demo-badge">Sample listing</span>}
    </Link>
    <button type="button" className={`save-button ${saved ? 'is-saved' : ''}`} onClick={toggleSaved} disabled={saving} aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`} aria-pressed={saved}>
      <Heart size={20} weight={saved ? 'fill' : 'regular'} aria-hidden="true" />
    </button>
    <div className="listing-card-content">
      <div className="listing-card-topline"><Badge tone="soft">{roomLabel(listing.roomType)}</Badge><span className="listing-card-price">{formatMoney(listing.rent)}<small>/mo</small></span></div>
      <h3><Link to={`/rooms/${listing.id}`}>{listing.title}</Link></h3>
      <p className="listing-location"><MapPin size={16} aria-hidden="true" />{listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}</p>
      <div className="listing-card-bottom"><span><CalendarBlank size={16} aria-hidden="true" />{dateRange(listing.availableFrom, listing.availableTo)}</span><span>{listing.school}</span></div>
      {saveError && <p className="card-error" role="alert">{saveError}</p>}
    </div>
  </article>;
}
