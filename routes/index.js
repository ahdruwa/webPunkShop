const express = require('express');
const product = require('./product');

const router = express.Router();

/* GET home page. */
router.use('/product', product);

module.exports = router;
