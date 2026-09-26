import { z } from 'zod';

const isoDate = z.iso.date();
const text = (min, max) => z.string().trim().min(min).max(max);

export const signupSchema = z.object({
  name: text(2, 80),
  email: z.email().max(180).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(200),
  school: text(3, 120),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const listingSchema = z.object({
  title: text(8, 90),
  description: text(40, 2500),
  school: text(3, 120),
  city: text(2, 80),
  region: text(2, 80),
  neighborhood: z.string().trim().max(100).default(''),
  privateAddress: z.string().trim().max(200).default(''),
  rent: z.coerce.number().min(100).max(20000),
  utilities: z.coerce.number().min(0).max(5000).default(0),
  deposit: z.coerce.number().min(0).max(20000).default(0),
  availableFrom: isoDate,
  availableTo: isoDate,
  roomType: z.enum(['private_room', 'shared_room', 'entire_place']),
  bedrooms: z.coerce.number().int().min(1).max(20),
  bathrooms: z.coerce.number().min(0.5).max(20),
  roommates: z.coerce.number().int().min(0).max(20),
  furnished: z.boolean(),
  approvalStatus: z.enum(['not_started', 'requested', 'approved']),
  amenities: z.array(text(2, 50)).max(20).default([]),
}).refine((value) => value.availableTo > value.availableFrom, {
  path: ['availableTo'], message: 'End date must be after the start date.',
});

export const inquirySchema = z.object({
  listingId: z.string().min(1),
  requestedFrom: isoDate.optional(),
  requestedTo: isoDate.optional(),
  message: text(10, 1500),
}).refine((value) => !value.requestedFrom || !value.requestedTo || value.requestedTo > value.requestedFrom, {
  path: ['requestedTo'], message: 'End date must be after the start date.',
});

export const messageSchema = z.object({ body: text(1, 1500) });
export const reportSchema = z.object({
  reason: z.enum(['suspected_scam', 'incorrect_details', 'unavailable', 'other']),
  details: z.string().trim().max(1000).default(''),
});

export function academicEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const explicit = (process.env.ALLOWED_SCHOOL_DOMAINS || '')
    .split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return domain.endsWith('.edu') || /(?:^|\.)edu\.[a-z]{2}$/.test(domain) || /(?:^|\.)ac\.[a-z]{2}$/.test(domain) || explicit.includes(domain);
}

export function validationError(result) {
  return {
    error: 'Please check the highlighted fields.',
    fields: Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
  };
}
