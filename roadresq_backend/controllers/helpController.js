import mongoose from 'mongoose';
import HelpRequest, { STATUSES, STATUS_TRANSITIONS, SERVICE_TYPES } from '../models/HelpRequest.js';
import { notifyNewRequest, notifyStatusUpdate } from '../socket/index.js';

const URGENCIES = ['Low', 'Medium', 'High'];
const CUSTOMER_FIELDS = 'name email phone';
const MECHANIC_FIELDS = 'name phone';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const withParties = (query) =>
  query.populate('userId', CUSTOMER_FIELDS).populate('mechanicId', MECHANIC_FIELDS);

const isBlank = (v) => typeof v !== 'string' || !v.trim();

// Until a mechanic accepts a request, mechanics see who and where, but not
// the customer's contact details (phone/email).
const toMechanicView = (request, mechanicId) => {
  const obj = typeof request.toObject === 'function' ? request.toObject() : { ...request };
  const assignedToMe = obj.mechanicId && String(obj.mechanicId._id ?? obj.mechanicId) === String(mechanicId);
  if (assignedToMe) return obj;

  delete obj.phone;
  delete obj.rejectedBy;
  if (obj.userId && typeof obj.userId === 'object') {
    obj.userId = { _id: obj.userId._id, name: obj.userId.name };
  }
  return obj;
};

export const createHelpRequest = async (req, res) => {
    try {
      const { vehicleType, description, location, urgency = 'Medium', serviceType } = req.body ?? {};

      if (isBlank(vehicleType) || isBlank(description) || isBlank(location)) {
        return res.status(400).json({ message: 'Vehicle type, description and location are required' });
      }
      if (!URGENCIES.includes(urgency)) {
        return res.status(400).json({ message: 'Invalid urgency' });
      }
      if (serviceType !== undefined && !SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ message: 'Invalid assistance type' });
      }

      const created = await HelpRequest.create({
        userId: req.user._id,
        phone: req.user.phone,
        vehicleType,
        description,
        location,
        urgency,
        serviceType,
        status: 'pending',
        statusHistory: [{ status: 'pending', at: new Date() }],
      });

      // Populate so real-time payload matches GET /all (dashboard reads userId.name)
      const helpRequest = await withParties(HelpRequest.findById(created._id));

      // Broadcast to mechanics without customer contact details
      notifyNewRequest(req.app.get('io'), toMechanicView(helpRequest, null));

      res.status(201).json({ message: 'Help request submitted', helpRequest });
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Invalid help request data' });
      }
      console.error('Error creating help request:', err.message);
      res.status(500).json({ message: 'Failed to create help request' });
    }
  };


// Mechanic dashboard: open requests + requests assigned to this mechanic
// (legacy requests with no assigned mechanic stay visible to all mechanics)
export const getAllHelpRequests = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const me = req.user._id;

    const requests = await withParties(
      HelpRequest.find({
        rejectedBy: { $ne: me },
        $or: [{ mechanicId: null }, { mechanicId: me }],
      })
    )
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ requests: requests.map((r) => toMechanicView(r, me)) });
  } catch (err) {
    console.error('Error fetching help requests:', err.message);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Customer: their own requests, newest first
export const getMyHelpRequests = async (req, res) => {
  try {
    const requests = await withParties(HelpRequest.find({ userId: req.user._id }))
      .sort({ createdAt: -1 })
      .limit(MAX_LIMIT);

    res.status(200).json({ requests });
  } catch (err) {
    console.error('Error fetching user help requests:', err.message);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Single request, visible to its customer, its assigned mechanic,
// or any mechanic while it is still unassigned
export const getHelpRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const request = await withParties(HelpRequest.findById(id));
    if (!request) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    const me = String(req.user._id);
    const isCustomer = String(request.userId?._id) === me;
    const isAssigned = request.mechanicId && String(request.mechanicId._id) === me;
    const isOpenToMechanic = req.user.role === 'mechanic' && !request.mechanicId;

    if (!isCustomer && !isAssigned && !isOpenToMechanic) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json({ request: isCustomer ? request : toMechanicView(request, me) });
  } catch (err) {
    console.error('Error fetching help request:', err.message);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
};

// Atomically move a request to `status`, enforcing transitions and ownership.
const applyTransition = async (req, res, status) => {
  const { id } = req.params;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid request id' });
  }

  try {
    const current = await HelpRequest.findById(id).select('status mechanicId').lean();

    if (!current) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    const currentStatus = current.status;

    if (!STATUS_TRANSITIONS[currentStatus].includes(status)) {
      return res.status(400).json({
        message: `❌ Invalid transition: Cannot move from "${currentStatus}" to "${status}".`,
      });
    }

    const me = req.user._id;
    if (current.mechanicId && String(current.mechanicId) !== String(me)) {
      return res.status(403).json({ message: 'This request is assigned to another mechanic' });
    }

    // Conditional update guards against two mechanics acting at the same time
    const updated = await withParties(
      HelpRequest.findOneAndUpdate(
        {
          _id: id,
          status: currentStatus,
          $or: [{ mechanicId: null }, { mechanicId: me }],
        },
        { $set: { status, mechanicId: me }, $push: { statusHistory: { status, at: new Date() } } },
        { new: true }
      )
    );

    if (!updated) {
      return res.status(409).json({ message: 'Request was just updated by someone else. Please refresh.' });
    }

    notifyStatusUpdate(req.app.get('io'), updated);

    res.json({ message: '✅ Status updated successfully', helpRequest: updated });
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// Used by mechanic to accept a request
export const acceptHelpRequest = (req, res) => applyTransition(req, res, 'accepted');

export const updateHelpRequestStatus = (req, res) => applyTransition(req, res, req.body?.status);

// Mechanic declines a pending request: hides it from their own dashboard only
export const rejectHelpRequest = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid request id' });
  }

  try {
    const updated = await HelpRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $addToSet: { rejectedBy: req.user._id } },
      { new: true }
    ).select('_id');

    if (!updated) {
      return res.status(409).json({ message: 'Only pending requests can be declined' });
    }

    res.json({ message: 'Request declined', requestId: id });
  } catch (err) {
    console.error('Error declining request:', err.message);
    res.status(500).json({ message: 'Failed to decline request' });
  }
};

// Mechanic dashboard counters, computed by the database (not from a truncated list)
export const getMechanicStats = async (req, res) => {
  try {
    const me = req.user._id;
    const [available, accepted, inProgress, completed] = await Promise.all([
      HelpRequest.countDocuments({ status: 'pending', mechanicId: null, rejectedBy: { $ne: me } }),
      HelpRequest.countDocuments({ mechanicId: me, status: 'accepted' }),
      HelpRequest.countDocuments({ mechanicId: me, status: 'in-progress' }),
      HelpRequest.countDocuments({ mechanicId: me, status: 'resolved' }),
    ]);
    res.json({ stats: { available, accepted, inProgress, completed } });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
