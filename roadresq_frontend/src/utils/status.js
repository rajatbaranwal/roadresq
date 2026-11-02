import { Battery, CarFront, Cog, Disc3, Fuel, KeyRound, LifeBuoy, Truck } from 'lucide-react';

// Statuses during which customer and mechanic can chat and share location
export const CHAT_STATUSES = ['accepted', 'in-progress'];
export const isActiveJob = (status) => CHAT_STATUSES.includes(status);

export const STATUS_META = {
  pending: { label: 'Finding a mechanic', short: 'Pending', tone: 'signal' },
  accepted: { label: 'Mechanic assigned', short: 'Accepted', tone: 'info' },
  'in-progress': { label: 'Work in progress', short: 'In progress', tone: 'warning' },
  resolved: { label: 'Resolved', short: 'Resolved', tone: 'success' },
};

// Timeline steps. "Mechanic assigned" and "accepted" are the same backend event.
export const TIMELINE_STEPS = [
  { status: 'pending', label: 'Request created' },
  { status: 'accepted', label: 'Accepted', sub: 'Mechanic assigned' },
  { status: 'in-progress', label: 'In progress' },
  { status: 'resolved', label: 'Resolved' },
];

// Must match SERVICE_TYPES in the backend (models/HelpRequest.js)
export const SERVICE_TYPES = [
  { value: 'flat-tyre', label: 'Flat tyre', description: 'Puncture or tyre change', icon: Disc3 },
  { value: 'battery', label: 'Battery jump-start', description: "Car won't start", icon: Battery },
  { value: 'fuel', label: 'Fuel delivery', description: 'Ran out of fuel', icon: Fuel },
  { value: 'towing', label: 'Towing', description: 'Vehicle needs to be moved', icon: Truck },
  { value: 'lockout', label: 'Lockout', description: 'Keys locked inside', icon: KeyRound },
  { value: 'engine', label: 'Engine trouble', description: 'Breakdown or warning light', icon: Cog },
  { value: 'other', label: 'Other issue', description: 'Something else', icon: LifeBuoy },
];

const GENERAL = { value: 'general', label: 'General assistance', icon: CarFront };
export const serviceMeta = (value) => SERVICE_TYPES.find((s) => s.value === value) ?? GENERAL;

export const VEHICLE_TYPES = ['Car', 'Bike', 'Scooter', 'SUV', 'Truck', 'Auto'];
export const URGENCIES = ['Low', 'Medium', 'High'];

// Upsert by _id, newest first
export const upsertRequest = (list, request) => {
  const exists = list.some((r) => r._id === request._id);
  return exists ? list.map((r) => (r._id === request._id ? request : r)) : [request, ...list];
};

// When a given status was reached (null if unknown, e.g. legacy requests)
export const statusReachedAt = (request, status) => {
  if (status === 'pending') return request.createdAt;
  return request.statusHistory?.find((h) => h.status === status)?.at ?? null;
};
