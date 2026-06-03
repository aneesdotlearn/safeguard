'use strict';

const { Contact } = require('../../../models/index');
const AppError = require('../../../utils/AppError');
const { cacheDel } = require('../../../config/redis');

exports.addContact = async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const count = await Contact.countDocuments({ user: userId });
  if (count >= 10) return next(new AppError('Maximum 10 emergency contacts allowed', 400, 'LIMIT_EXCEEDED'));

  const contact = await Contact.create({ ...req.body, user: userId });
  res.status(201).json({ status: 'success', data: { contact } });
};

exports.getContacts = async (req, res) => {
  const contacts = await Contact.find({ user: req.user._id || req.user.id }).sort({ priority: 1 }).lean();
  res.status(200).json({ status: 'success', data: { contacts } });
};

exports.updateContact = async (req, res, next) => {
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id || req.user.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!contact) return next(new AppError('Contact not found', 404, 'NOT_FOUND'));
  res.status(200).json({ status: 'success', data: { contact } });
};

exports.deleteContact = async (req, res, next) => {
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.user._id || req.user.id });
  if (!contact) return next(new AppError('Contact not found', 404, 'NOT_FOUND'));
  res.status(204).json({ status: 'success', data: null });
};
