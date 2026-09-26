import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowClockwise, FadersHorizontal, MagnifyingGlass, HouseLine } from '@phosphor-icons/react';
import { api } from '../api';
import { ListingCard } from '../components/ListingCard';
import { Alert, Button, EmptyState, Input, PageLoader, Select } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Explore() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(Object.fromEntries(params.entries()));
  const [data, setData] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = params.toString();

  useEffect(() => { setForm(Object.fromEntries(params.entries())); }, [query]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/listings${query ? `?${query}` : ''}`).then((result) => { if (active) { setData(result); setError(''); } })
      .catch((caught) => { if (active) setError(caught.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);
  useEffect(() => { if (user) api('/favorites/ids').then((result) => setSavedIds(result.ids)).catch(() => {}); }, [user]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function apply(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(form)) if (value && key !== 'page') next.set(key, value);
    setParams(next);
    setFiltersOpen(false);
  }
  function changePage(page) {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <div className="explore-page shell">
    <div className="page-heading"><p className="overline">Your next chapter starts here</p><h1>Find a room that fits.</h1><p>Explore student spaces with clear dates, prices, and the details you need to decide.</p></div>
    <div className="explore-layout">
      <aside className={`filter-panel ${filtersOpen ? 'is-open' : ''}`} aria-label="Filter listings">
        <div className="filter-heading"><div><FadersHorizontal size={21} /><h2>Filters</h2></div><button type="button" onClick={() => { setParams({}); setForm({}); }} className="filter-reset"><ArrowClockwise size={16} /> Reset</button></div>
        <form onSubmit={apply}>
          <Input id="filter-q" label="City or college" placeholder="Try Boston or Michigan" value={form.q || ''} onChange={(e) => update('q', e.target.value)} />
          <div className="filter-section"><h3>When</h3><Input id="filter-start" type="date" label="Move in" value={form.start || ''} onChange={(e) => update('start', e.target.value)} /><Input id="filter-end" type="date" label="Move out" min={form.start || undefined} value={form.end || ''} onChange={(e) => update('end', e.target.value)} /></div>
          <div className="filter-section"><h3>Monthly budget</h3><div className="two-fields"><Input id="filter-min" type="number" min="0" label="Minimum" placeholder="$0" value={form.minRent || ''} onChange={(e) => update('minRent', e.target.value)} /><Input id="filter-max" type="number" min="0" label="Maximum" placeholder="Any" value={form.maxRent || ''} onChange={(e) => update('maxRent', e.target.value)} /></div></div>
          <div className="filter-section"><h3>Space</h3><Select id="filter-room" label="Room type" value={form.roomType || ''} onChange={(e) => update('roomType', e.target.value)}><option value="">Any room type</option><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="entire_place">Entire place</option></Select><label className="checkbox-row"><input type="checkbox" checked={form.furnished === 'true'} onChange={(e) => update('furnished', e.target.checked ? 'true' : '')} /><span>Furnished only</span></label></div>
          <Button type="submit" className="filter-submit">Show rooms</Button>
        </form>
      </aside>

      <div className="results-panel">
        <div className="results-bar"><div><h2>{loading ? 'Finding rooms...' : `${data?.total || 0} ${data?.total === 1 ? 'room' : 'rooms'} to explore`}</h2><p>Listings match the dates and budget you choose.</p></div><div className="results-controls"><button type="button" className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><FadersHorizontal size={18} /> Filters</button><label htmlFor="result-sort" className="visually-hidden">Sort listings</label><select id="result-sort" value={form.sort || 'newest'} onChange={(e) => { const next = new URLSearchParams(params); next.set('sort', e.target.value); setParams(next); }}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></div></div>
        <Alert>{error}</Alert>
        {loading ? <PageLoader /> : data?.listings?.length ? <>
          <div className="listing-grid explore-grid">{data.listings.map((listing) => <ListingCard key={listing.id} listing={listing} initiallySaved={savedIds.includes(listing.id)} onSavedChange={(id, saved) => setSavedIds((current) => saved ? [...new Set([...current, id])] : current.filter((item) => item !== id))} />)}</div>
          {data.pages > 1 && <div className="pagination"><button type="button" disabled={data.page <= 1} onClick={() => changePage(data.page - 1)}>Previous</button><span>Page {data.page} of {data.pages}</span><button type="button" disabled={data.page >= data.pages} onClick={() => changePage(data.page + 1)}>Next</button></div>}
        </> : <EmptyState icon={HouseLine} title="No rooms match just yet" body="Try a different date, budget, or city. New spaces can appear any time." action={<Button type="button" variant="outline" onClick={() => { setParams({}); setForm({}); }}>Clear filters</Button>} />}
      </div>
    </div>
  </div>;
}
