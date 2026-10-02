// Fictional examples used to show the marketplace before students post real rooms.
// They roll forward to the next summer so a newly deployed site stays populated.
export function sampleListings(now = new Date()) {
  const year = now.getUTCFullYear() + (now.getUTCMonth() >= 8 ? 1 : 0);
  const date = (monthDay) => `${year}-${monthDay}`;
  return [
    {
      id: 'demo-evanston', title: 'The Evanston Landing', description: 'A comfortable private room in a quiet shared apartment, with a desk and natural light. This is a fictional sample listing for exploring the app.',
      school: 'Northwestern University', city: 'Evanston', region: 'IL', neighborhood: 'Downtown Evanston', rent: 98000, utilities: 6500, deposit: 0,
      from: date('05-20'), to: date('08-31'), type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'not_started', amenities: ['Wi-Fi', 'In-unit laundry', 'Desk', 'Air conditioning'], photo: '/images/room-olive.jpg',
    },
    {
      id: 'demo-boston', title: 'Allston Garden Apartments', description: 'A compact furnished studio with a work area and an easygoing layout. This is a fictional sample listing for exploring the app.',
      school: 'Boston University', city: 'Boston', region: 'MA', neighborhood: 'Allston', rent: 165000, utilities: 8000, deposit: 0,
      from: date('06-01'), to: date('08-31'), type: 'entire_place', beds: 1, baths: 1, roommates: 0, furnished: 1, approval: 'not_started', amenities: ['Wi-Fi', 'Furnished', 'Near transit'], photo: '/images/studio-sunlit.jpg',
    },
    {
      id: 'demo-ann-arbor', title: 'The Diag Commons', description: 'A private room with a workspace in a shared student apartment. This is a fictional sample listing for exploring the app.',
      school: 'University of Michigan', city: 'Ann Arbor', region: 'MI', neighborhood: 'Central Campus', rent: 87500, utilities: 5000, deposit: 0,
      from: date('05-15'), to: date('08-31'), type: 'private_room', beds: 4, baths: 2, roommates: 3, furnished: 1, approval: 'not_started', amenities: ['Desk', 'Laundry', 'Dishwasher'], photo: '/images/room-blue.jpg',
    },
    {
      id: 'demo-ucla', title: 'Westwood Terrace Apartments', description: 'A bright private bedroom in a shared apartment, with room to study and unwind. This is a fictional sample listing for exploring the app.',
      school: 'University of California, Los Angeles', city: 'Los Angeles', region: 'CA', neighborhood: 'Westwood', rent: 145000, utilities: 9000, deposit: 30000,
      from: date('06-10'), to: date('08-31'), type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'not_started', amenities: ['Desk', 'Wi-Fi', 'Laundry'], photo: '/images/room-olive.jpg',
    },
    {
      id: 'demo-nyu', title: 'Bleecker Lane Studios', description: 'A small furnished studio with a simple kitchen and a quiet place to work. This is a fictional sample listing for exploring the app.',
      school: 'New York University', city: 'New York', region: 'NY', neighborhood: 'Greenwich Village', rent: 220000, utilities: 10000, deposit: 40000,
      from: date('05-25'), to: date('08-31'), type: 'entire_place', beds: 1, baths: 1, roommates: 0, furnished: 1, approval: 'not_started', amenities: ['Furnished', 'Near transit', 'Wi-Fi'], photo: '/images/studio-sunlit.jpg',
    },
    {
      id: 'demo-georgia-tech', title: 'Midtown Grove Apartments', description: 'A furnished bedroom in a shared apartment with a desk and practical common spaces. This is a fictional sample listing for exploring the app.',
      school: 'Georgia Institute of Technology', city: 'Atlanta', region: 'GA', neighborhood: 'Midtown', rent: 109000, utilities: 7500, deposit: 20000,
      from: date('05-18'), to: date('08-31'), type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'not_started', amenities: ['Desk', 'Wi-Fi', 'Air conditioning'], photo: '/images/room-blue.jpg',
    },
    {
      id: 'demo-austin', title: 'The West Campus Courtyard', description: 'A private bedroom in a shared apartment with a practical layout and plenty of afternoon light. This is a fictional sample listing for exploring the app.',
      school: 'University of Texas at Austin', city: 'Austin', region: 'TX', neighborhood: 'West Campus', rent: 112500, utilities: 7000, deposit: 0,
      from: date('05-25'), to: date('08-31'), type: 'private_room', beds: 3, baths: 2, roommates: 2, furnished: 1, approval: 'not_started', amenities: ['Balcony', 'Wi-Fi', 'In-unit laundry'], photo: '/images/hero-apartment.jpg',
    },
    {
      id: 'demo-austin-studio', title: 'North University Studios', description: 'An entire furnished studio with a desk, kitchenette, and a bright living area. This is a fictional sample listing for exploring the app.',
      school: 'University of Texas at Austin', city: 'Austin', region: 'TX', neighborhood: 'North University', rent: 139000, utilities: 8500, deposit: 25000,
      from: date('06-01'), to: date('08-31'), type: 'entire_place', beds: 1, baths: 1, roommates: 0, furnished: 1, approval: 'not_started', amenities: ['Furnished', 'Desk', 'Wi-Fi'], photo: '/images/studio-sunlit.jpg',
    },
    {
      id: 'demo-rice-village', title: 'Rice Village Landing', description: 'A furnished bedroom in a shared apartment with inviting common space and a study nook. This is a fictional sample listing for exploring the app.',
      school: 'Rice University', city: 'Houston', region: 'TX', neighborhood: 'Rice Village', rent: 105000, utilities: 7000, deposit: 20000,
      from: date('05-20'), to: date('08-31'), type: 'private_room', beds: 2, baths: 2, roommates: 1, furnished: 1, approval: 'not_started', amenities: ['Wi-Fi', 'Desk', 'In-unit laundry'], photo: '/images/room-olive.jpg',
    },
    {
      id: 'demo-rice-museum', title: 'Museum Park Flats', description: 'A one-bedroom apartment with a separate workspace and comfortable living area. This is a fictional sample listing for exploring the app.',
      school: 'Rice University', city: 'Houston', region: 'TX', neighborhood: 'Museum District', rent: 152000, utilities: 9000, deposit: 30000,
      from: date('06-01'), to: date('08-31'), type: 'entire_place', beds: 1, baths: 1, roommates: 0, furnished: 1, approval: 'not_started', amenities: ['Furnished', 'Air conditioning', 'Near transit'], photo: '/images/hero-apartment.jpg',
    },
  ];
}
