import mongoose from 'mongoose';

export const STATUSES = ['pending', 'accepted', 'in-progress', 'resolved'];

// Allowed status transitions (shared by the controller and the socket layer)
export const STATUS_TRANSITIONS = {
  pending: ['accepted'],
  accepted: ['in-progress'],
  'in-progress': ['resolved'],
  resolved: [],
};

// Kind of assistance needed (optional; legacy requests have none => "general")
export const SERVICE_TYPES = ['flat-tyre', 'battery', 'fuel', 'towing', 'lockout', 'engine', 'other'];

const helpRequestSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Mechanic who accepted the request (null until accepted; may be null on legacy docs)
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Mechanics who declined this request; it is hidden from their dashboard only.
    // Server-side only (select: false): never returned in API responses or socket payloads.
    rejectedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      select: false,
    },
    vehicleType: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    // When each status was reached (empty on legacy requests)
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: STATUSES, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

helpRequestSchema.index({ status: 1, createdAt: -1 });
helpRequestSchema.index({ userId: 1, createdAt: -1 });
helpRequestSchema.index({ mechanicId: 1, createdAt: -1 });

export default mongoose.model('HelpRequest', helpRequestSchema);
