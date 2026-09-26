import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import { api } from '../api';
import { Alert, ButtonLink, PageLoader } from '../components/UI';

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const [listingId, setListingId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const session = params.get('session_id');
    if (!session) { setError('Checkout session is missing.'); return; }
    api(`/payments/confirm?session_id=${encodeURIComponent(session)}`).then((result) => setListingId(result.listingId)).catch((caught) => setError(caught.message));
  }, [params]);
  return <div className="shell page-pad checkout-success">{listingId ? <><CheckCircle size={54} weight="duotone" /><p className="overline">Published</p><h1>Your room is live.</h1><p>Students can now discover your listing and send you questions. You can update it any time from your dashboard.</p><div><ButtonLink to={`/rooms/${listingId}`}>View listing</ButtonLink><ButtonLink to="/dashboard" variant="outline">Go to dashboard</ButtonLink></div></> : error ? <><Alert>{error}</Alert><ButtonLink to="/dashboard">Return to dashboard</ButtonLink></> : <PageLoader />}</div>;
}
