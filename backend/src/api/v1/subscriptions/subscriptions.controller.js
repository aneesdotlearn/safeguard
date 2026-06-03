'use strict';

const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const User = require('../../../models/User');
const { Transaction } = require('../../../models/index');
const AppError = require('../../../utils/AppError');
const { addNotificationJob } = require('../../../queues');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const PLANS = {
  basic: { price: 19900, currency: 'INR', interval: 'month', name: 'SafeGuard Basic' },
  premium: { price: 49900, currency: 'INR', interval: 'month', name: 'SafeGuard Premium' },
  enterprise: { price: 99900, currency: 'INR', interval: 'month', name: 'SafeGuard Enterprise' },
};

// ─── Razorpay ──────────────────────────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res, next) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return next(new AppError('Invalid plan', 400, 'INVALID_PLAN'));

  const planConfig = PLANS[plan];
  const order = await razorpay.orders.create({
    amount: planConfig.price,
    currency: planConfig.currency,
    receipt: `rcpt_${Date.now()}`,
    notes: { userId: (req.user._id || req.user.id).toString(), plan },
  });

  const tx = await Transaction.create({
    user: req.user._id || req.user.id,
    type: 'subscription',
    amount: planConfig.price / 100,
    currency: planConfig.currency,
    status: 'pending',
    gateway: 'razorpay',
    gatewayOrderId: order.id,
    description: `${planConfig.name} subscription`,
    metadata: { plan },
  });

  res.status(200).json({
    status: 'success',
    data: { orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID, txId: tx._id },
  });
};

exports.verifyRazorpayPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, txId, plan } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return next(new AppError('Payment verification failed', 400, 'PAYMENT_VERIFICATION_FAILED'));
  }

  const tx = await Transaction.findByIdAndUpdate(txId, {
    $set: { status: 'completed', gatewayPaymentId: razorpay_payment_id, gatewaySignature: razorpay_signature },
  }, { new: true });

  const userId = req.user._id || req.user.id;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  await User.findByIdAndUpdate(userId, {
    $set: {
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
      'subscription.razorpayCustomerId': razorpay_payment_id,
    },
  });

  addNotificationJob({
    userId: userId.toString(),
    title: 'Subscription Activated',
    body: `Your ${PLANS[plan].name} subscription is now active!`,
    type: 'subscription',
    data: { plan, txId: tx._id },
  });

  res.status(200).json({ status: 'success', message: 'Subscription activated', data: { plan, txId: tx._id } });
};

exports.razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);
  const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');

  if (signature !== expectedSig) return res.status(400).json({ status: 'fail', message: 'Invalid signature' });

  const { event, payload } = req.body;
  if (event === 'subscription.cancelled') {
    const subId = payload.subscription?.entity?.id;
    if (subId) {
      await User.findOneAndUpdate(
        { 'subscription.razorpaySubscriptionId': subId },
        { $set: { 'subscription.status': 'cancelled' } }
      );
    }
  }
  res.status(200).json({ status: 'success' });
};

// ─── Stripe ────────────────────────────────────────────────────────────────────
exports.createStripeSession = async (req, res, next) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return next(new AppError('Invalid plan', 400, 'INVALID_PLAN'));
  const userId = (req.user._id || req.user.id).toString();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: PLANS[plan].currency.toLowerCase(),
        product_data: { name: PLANS[plan].name },
        unit_amount: PLANS[plan].price,
        recurring: { interval: PLANS[plan].interval },
      },
      quantity: 1,
    }],
    success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
    metadata: { userId, plan },
    client_reference_id: userId,
  });

  res.status(200).json({ status: 'success', data: { url: session.url, sessionId: session.id } });
};

exports.stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ status: 'fail', message: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await User.findByIdAndUpdate(userId, {
        $set: {
          'subscription.plan': plan,
          'subscription.status': 'active',
          'subscription.startDate': new Date(),
          'subscription.endDate': endDate,
          'subscription.stripeCustomerId': session.customer,
          'subscription.stripeSubscriptionId': session.subscription,
        },
      });
      await Transaction.create({
        user: userId,
        type: 'subscription',
        amount: PLANS[plan].price / 100,
        currency: PLANS[plan].currency,
        status: 'completed',
        gateway: 'stripe',
        gatewayOrderId: session.id,
        gatewayPaymentId: session.payment_intent,
        description: `${PLANS[plan].name} subscription`,
        metadata: { plan },
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': sub.id },
        { $set: { 'subscription.status': 'cancelled' } }
      );
      break;
    }
    default: break;
  }

  res.status(200).json({ received: true });
};

exports.getTransactionHistory = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments({ user: userId }),
  ]);

  res.status(200).json({ status: 'success', data: { transactions, total, page, pages: Math.ceil(total / limit) } });
};

exports.generateInvoice = async (req, res, next) => {
  const tx = await Transaction.findOne({ _id: req.params.txId, user: req.user._id || req.user.id }).lean();
  if (!tx) return next(new AppError('Transaction not found', 404, 'NOT_FOUND'));

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${tx._id}.pdf`);
  doc.pipe(res);

  doc.fontSize(24).fillColor('#e53e3e').text('SafeGuard', 50, 50);
  doc.fontSize(10).fillColor('#666').text('Women Safety Platform', 50, 80);
  doc.moveTo(50, 100).lineTo(550, 100).stroke();
  doc.fontSize(20).fillColor('#333').text('INVOICE', 50, 120);
  doc.fontSize(10).text(`Invoice ID: ${tx._id}`, 50, 155);
  doc.text(`Date: ${new Date(tx.createdAt).toLocaleDateString()}`, 50, 170);
  doc.text(`Status: ${tx.status.toUpperCase()}`, 50, 185);
  doc.text(`Gateway: ${tx.gateway.toUpperCase()}`, 50, 200);
  if (tx.gatewayPaymentId) doc.text(`Payment ID: ${tx.gatewayPaymentId}`, 50, 215);
  doc.moveTo(50, 240).lineTo(550, 240).stroke();
  doc.fontSize(12).text('Description', 50, 255);
  doc.text('Amount', 450, 255);
  doc.fontSize(10).text(tx.description || 'Subscription', 50, 275);
  doc.text(`${tx.currency} ${tx.amount.toFixed(2)}`, 450, 275);
  doc.moveTo(50, 300).lineTo(550, 300).stroke();
  doc.fontSize(12).text('Total', 50, 315);
  doc.text(`${tx.currency} ${tx.amount.toFixed(2)}`, 450, 315);
  doc.end();
};

exports.getSubscriptionStatus = async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id).select('subscription wallet').lean();
  res.status(200).json({ status: 'success', data: { subscription: user.subscription, wallet: user.wallet } });
};
