const EError = require('eerror');
const express = require('express');
const multer = require('multer');
require('dotenv').config();

const logger = require('../lib/logger');

const StockModel = require('../model/stock');
const ImgBB = require('../services/ImgBB');
const { authAdmin } = require('./middlewares/auth');

const router = express.Router();
const upload = multer();

const imgBB = new ImgBB(process.env.IMGBB_API_KEY);

router.get('/', async (req, res) => {
	try {
		const stocks = await StockModel.find().select('img').exec();

		return res.status(200).json(stocks);
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

router.post('/', authAdmin, upload.any(), async (req, res) => {
	try {
		const image = req.files && req.files[0];

		if (!image) {
			throw new EError('Image is required').combine({
				name: 'ValidationError',
			});
		}

		const img = await imgBB.publishImageAndGetUrl(image);

		const stockModel = new StockModel({
			img,
		});

		await stockModel.save();

		return res.status(200).json(stockModel.toObject());
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

router.put('/:stockId', authAdmin, upload.any(), async (req, res) => {
	try {
		const { stockId } = req.params;
		const image = req.files && req.files[0];

		if (!image) {
			throw new EError('Image is required').combine({
				name: 'ValidationError',
			});
		}

		const img = await imgBB.publishImageAndGetUrl(image);

		const stockModel = StockModel.findByIdAndUpdate(stockId, {
			$set: {
				img,
			},
		});

		return res.status(200).json(stockModel);
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

router.delete('/:stockId', authAdmin, async (req, res) => {
	try {
		const { stockId } = req.params;

		const productModel = await StockModel.findByIdAndDelete(stockId).exec();

		if (!productModel) {
			throw new EError(`Not found stock with id: ${stockId} to delete`).combine({
				name: 'ValidationError',
			});
		}

		return res.status(200).json(productModel.toObject());
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
