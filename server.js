require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/config',            require('./api/config'));
app.post('/api/create-order',     require('./api/create-order'));
app.post('/api/create-cod-order', require('./api/create-cod-order'));
app.post('/api/verify-payment',   require('./api/verify-payment'));
app.post('/api/capture-lead',     require('./api/capture-lead'));
app.post('/api/track-pageview',   require('./api/track-pageview'));
app.post('/api/validate-coupon',  require('./api/validate-coupon'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FIOREN server → http://localhost:${PORT}`);
});
