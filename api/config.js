module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  res.json({ key_id: process.env.RAZORPAY_KEY_ID });
};
