import { useEffect, useState } from 'react';
import { Heart } from '@phosphor-icons/react';
import { api } from '../api';
import { ListingCard } from '../components/ListingCard';
import { Alert, ButtonLink, EmptyState, PageLoader } from '../components/UI';

export default function Saved() {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/favorites').then(({ listings: items }) => setListings(items)).catch((caught) => setError(caught.message)); }, []);
  return <div className="shell page-pad"><div className="page-heading"><p className="overline">Keep the good ones close</p><h1>Saved rooms.</h1><p>Compare the places you are considering in one spot.</p></div><Alert>{error}</Alert>{listings === null ? <PageLoader /> : listings.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} initiallySaved onSavedChange={(id, saved) => { if (!saved) setListings((current) => current.filter((item) => item.id !== id)); }} />)}</div> : <EmptyState icon={Heart} title="Nothing saved yet" body="When a room catches your eye, tap the heart to keep it here." action={<ButtonLink to="/explore">Explore rooms</ButtonLink>} />}</div>;
}
