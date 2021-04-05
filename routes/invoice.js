const express = require('express');
require('dotenv').config();

const logger = require('../lib/logger');

const InvoiceModel = require('../model/invoice');

const router = express.Router();

router.post('/:invoiceId/pay', async (req, res) => {
	try {
		const { invoiceId } = req.params;

		await InvoiceModel.findByIdAndUpdate(invoiceId, {
			$set: {
				payed: true,
			},
		});

		return res.status(200).json({});
	} catch (error) {
		logger.error(error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({
				error: {
					message: error.ValidationError,
				},
			});
		}
		return res.status(500).json({
			error: {
				message: 'Server Error',
			},
		});
	}
});

module.exports = router;
