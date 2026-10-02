import { sampleListings } from '../server/sample-listings.js';

// Keep the class-project examples available even when the API has no database.
function demoListings() {
  return sampleListings().map((room) => ({
    id: room.id,
    ownerId: 'demo-owner',
    ownerName: 'Sublease Master Demo',
    ownerSchool: room.school,
    title: room.title,
    description: room.description,
    school: room.school,
    city: room.city,
    region: room.region,
    neighborhood: room.neighborhood,
    rent: room.rent / 100,
    utilities: room.utilities / 100,
    deposit: room.deposit / 100,
    availableFrom: room.from,
    availableTo: room.to,
    roomType: room.type,
    bedrooms: room.beds,
    bathrooms: room.baths,
    roommates: room.roommates,
    furnished: Boolean(room.furnished),
    approvalStatus: room.approval,
    amenities: room.amenities,
    photos: [room.photo],
    status: 'published',
    paid: true,
    isDemo: true,
    views: 0,
    inquiryCount: 0,
  }));
}

export function demoResponse(path) {
  const { pathname, searchParams } = new URL(path, 'https://demo.local');
  if (pathname !== '/schools' && pathname !== '/listings' && !pathname.startsWith('/listings/demo-')) return null;
  const rooms = demoListings();

  if (pathname === '/schools') {
    const counts = new Map();
    rooms.forEach(({ school }) => counts.set(school, (counts.get(school) || 0) + 1));
    return { schools: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([school]) => school) };
  }

  if (pathname === '/listings') {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const school = searchParams.get('school');
    const minRent = Number(searchParams.get('minRent')) || 0;
    const maxRent = Number(searchParams.get('maxRent')) || Infinity;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const roomType = searchParams.get('roomType');
    const furnished = searchParams.get('furnished') === 'true';
    const matching = rooms.filter((room) =>
      (!q || [room.title, room.school, room.city, room.neighborhood].some((value) => value.toLowerCase().includes(q))) &&
      (!school || room.school === school) &&
      room.rent >= minRent && room.rent <= maxRent &&
      (!start || room.availableFrom <= start) &&
      (!end || room.availableTo >= end) &&
      (!roomType || room.roomType === roomType) &&
      (!furnished || room.furnished)
    );
    const sort = searchParams.get('sort');
    if (sort === 'price_asc') matching.sort((a, b) => a.rent - b.rent);
    else if (sort === 'price_desc') matching.sort((a, b) => b.rent - a.rent);
    else matching.reverse();

    const page = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('page'), 10) || 1));
    const pageSize = 12;
    return { listings: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pages: Math.max(1, Math.ceil(matching.length / pageSize)) };
  }

  if (pathname.startsWith('/listings/demo-')) {
    const listing = rooms.find((room) => room.id === decodeURIComponent(pathname.slice('/listings/'.length)));
    return listing ? { listing } : null;
  }

  return null;
}
