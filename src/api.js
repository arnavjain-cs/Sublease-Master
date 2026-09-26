export async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(isForm ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: isForm || typeof options.body === 'string' || options.body == null ? options.body : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.fields = data.fields || {};
    error.code = data.code;
    throw error;
  }
  return data;
}

export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

export function dateRange(from, to) {
  if (!from || !to) return '';
  const differentYears = from.slice(0, 4) !== to.slice(0, 4);
  const start = formatDate(from, { month: 'short', day: 'numeric', ...(differentYears ? { year: 'numeric' } : {}) });
  const end = formatDate(to, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} – ${end}`;
}

export function roomLabel(value) {
  return { private_room: 'Private room', shared_room: 'Shared room', entire_place: 'Entire place' }[value] || value;
}

export function approvalLabel(value) {
  return { not_started: 'Approval not started', requested: 'Approval requested', approved: 'Approval reported' }[value] || 'Approval unknown';
}
