import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarBlank, CheckCircle, HouseLine, MagnifyingGlass, MapPin, ShieldCheck } from '@phosphor-icons/react';
import { api } from '../api';
import { ListingCard } from '../components/ListingCard';
import { Button, ButtonLink, PageLoader } from '../components/UI';

export default function Home() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    api('/listings').then((data) => setListings(data.listings.slice(0, 4))).catch(() => setListings([])).finally(() => setLoading(false));
    api('/schools').then((data) => setSchools(data.schools.slice(0, 4))).catch(() => {});
  }, []);

  function searchRooms(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    navigate(`/explore?${params}`);
  }

  return <>
    <section className="home-hero shell">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-line" />Student housing, simplified</span>
        <h1>Find your place<br /><em>in between.</em></h1>
        <p>A better way to find and share short-term student housing, with the dates and details that actually matter.</p>
        <div className="hero-actions"><ButtonLink to="/explore">Explore rooms <ArrowRight size={18} aria-hidden="true" /></ButtonLink><ButtonLink to="/post" variant="outline">Post your room</ButtonLink></div>
      </div>
      <div className="hero-photo-wrap">
        <img className="hero-photo" src="/images/hero-apartment.jpg" alt="Bright student apartment bedroom and shared living space" fetchPriority="high" />
      </div>
    </section>

    <section className="search-panel shell" aria-label="Search rooms">
      <form onSubmit={searchRooms} className="home-search">
        <div className="search-field search-field--wide"><MapPin size={20} aria-hidden="true" /><label htmlFor="home-campus"><span>Where</span><input id="home-campus" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="City or college" /></label></div>
        <div className="search-field"><CalendarBlank size={20} aria-hidden="true" /><label htmlFor="home-start"><span>Move in</span><input id="home-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label></div>
        <div className="search-field"><CalendarBlank size={20} aria-hidden="true" /><label htmlFor="home-end"><span>Move out</span><input id="home-end" type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} /></label></div>
        <Button type="submit"><MagnifyingGlass size={19} aria-hidden="true" /> Search</Button>
      </form>
    </section>

    <section className="section shell home-discover">
      <div className="section-intro"><div><p className="overline">Find your fit</p><h2>Start with your campus.</h2><p>Browse by school, then narrow down the dates and budget that work for you.</p></div><Link to="/explore" className="text-link">Explore all rooms <ArrowRight size={17} aria-hidden="true" /></Link></div>
      {schools.length ? <div className="school-list">
        {schools.map((school, index) => <Link to={`/explore?school=${encodeURIComponent(school)}`} key={school} className="school-item">
          <span className="school-index">0{index + 1}</span><span>{school}</span><ArrowRight size={20} aria-hidden="true" />
        </Link>)}
      </div> : <div className="school-empty"><p>Rooms can be posted near any college. Start with your city or campus.</p><ButtonLink to="/explore" variant="outline">Search all rooms</ButtonLink></div>}
    </section>

    <section className="section featured-section">
      <div className="shell">
        <div className="section-intro"><div><p className="overline">Fresh possibilities</p><h2>Rooms worth a closer look.</h2><p>Thoughtful spaces for the next chapter, near the places you need to be.</p></div><Link className="text-link" to="/explore">View all rooms <ArrowRight size={17} aria-hidden="true" /></Link></div>
        {loading ? <PageLoader /> : listings.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="featured-empty"><p>Listings are on their way.</p><ButtonLink to="/post">Be the first to post</ButtonLink></div>}
      </div>
    </section>

    <section className="section shell how-home">
      <div className="how-home-copy"><p className="overline">A simpler handoff</p><h2>From open room<br />to next roommate.</h2><p>Subleasing should feel clear from the first search to the final landlord approval.</p><ButtonLink to="/how-it-works" variant="outline">See how it works <ArrowRight size={17} /></ButtonLink></div>
      <div className="how-steps">
        <div><span className="step-icon"><MagnifyingGlass size={24} aria-hidden="true" /></span><span className="step-number">01</span><h3>Find your match</h3><p>Search by campus, move-in dates, budget, and the kind of room you need.</p></div>
        <div><span className="step-icon"><HouseLine size={24} aria-hidden="true" /></span><span className="step-number">02</span><h3>Talk it through</h3><p>Keep questions and details in one conversation, directly with the student posting.</p></div>
        <div><span className="step-icon"><ShieldCheck size={24} aria-hidden="true" /></span><span className="step-number">03</span><h3>Make it official</h3><p>Check lease terms and get written landlord approval before money changes hands.</p></div>
      </div>
    </section>

    <section className="home-cta shell">
      <div><p className="overline">Have a room to share?</p><h2>Make the months away work for you.</h2><p>Post your space once. Connect with students looking for the dates you have open.</p><ButtonLink to="/post">Post your room <ArrowRight size={18} /></ButtonLink></div>
      <div className="cta-art"><img src="/images/room-olive.jpg" loading="lazy" alt="Bright furnished student bedroom" /></div>
    </section>
  </>;
}
