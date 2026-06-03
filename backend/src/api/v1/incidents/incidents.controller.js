'use strict';

const { Incident } = require('../../../models/index');
const AppError = require('../../../utils/AppError');

exports.createIncident = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const incident = await Incident.create({ ...req.body, user: userId });
  res.status(201).json({ status: 'success', data: { incident } });
};

exports.getIncidents = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [incidents, total] = await Promise.all([
    Incident.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Incident.countDocuments(filter),
  ]);

  res.status(200).json({ status: 'success', data: { incidents, total, page, pages: Math.ceil(total / limit) } });
};

exports.getIncident = async (req, res, next) => {
  const incident = await Incident.findOne({ _id: req.params.id, user: req.user._id || req.user.id }).lean();
  if (!incident) return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
  res.status(200).json({ status: 'success', data: { incident } });
};

exports.updateIncident = async (req, res, next) => {
  const allowed = ['title', 'description', 'type', 'severity', 'isAnonymous'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const incident = await Incident.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id || req.user.id, status: 'open' },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!incident) return next(new AppError('Incident not found or not editable', 404, 'NOT_FOUND'));
  res.status(200).json({ status: 'success', data: { incident } });
};

// Admin: get all incidents
exports.adminGetIncidents = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;

  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone')
      .lean(),
    Incident.countDocuments(filter),
  ]);

  res.status(200).json({ status: 'success', data: { incidents, total, page, pages: Math.ceil(total / limit) } });
};

exports.adminUpdateIncident = async (req, res, next) => {
  const { status, adminNotes, severity } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (adminNotes) updates.adminNotes = adminNotes;
  if (severity) updates.severity = severity;
  if (status === 'resolved') { updates.resolvedAt = new Date(); updates.resolvedBy = req.user._id || req.user.id; }

  const incident = await Incident.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!incident) return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
  res.status(200).json({ status: 'success', data: { incident } });
};
