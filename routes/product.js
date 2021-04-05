const EError = require('eerror');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
require('dotenv').config();

const logger = require('../lib/logger');

const ProductModel = require('../model/product');
const ImgBB = require('../services/ImgBB');
const { jsonParse } = require('../utils/json');
const { authAdmin, authUser } = require('./middlewares/auth');

const router = express.Router();
const upload = multer();

const imgBB = new ImgBB(process.env.IMGBB_API_KEY);

router.get('/:productId', async (req, res) => {
	try {
		const { productId } = req.params;

		const productModel = await ProductModel.findById(productId).exec();

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId}`).combine({
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

router.get('/', async (req, res) => {
	try {
		const { query } = req;

		if (query.type) {
			const currentDate = new Date();
			const monthAgo = currentDate.getUTCMonth() - 1;
			currentDate.setUTCMonth(monthAgo);

			const creationFilter = { createdAt: { $gte: currentDate } };
			const boughtFilter = { bought: { $gte: 3 } };

			const filterBy = query.type === 'new' ? creationFilter : boughtFilter;

			const pm = await ProductModel.getAllForResponse(filterBy);

			return res.status(200).json(pm);
		}

		const {
			category, sort,
		} = query;

		let { colors, price, sizes } = query;

		colors = colors && colors.split(',');
		sizes = sizes && sizes.split(',');
		price = price && JSON.parse(price);

		const filterBy = {};

		if (colors) {
			filterBy.colors = {
				$in: colors,
			};
		}

		if (sizes) {
			filterBy.sizes = {
				$in: sizes,
			};
		}

		if (price) {
			filterBy.price = {
				$gte: price.min,
				$lte: price.max,
			};
		}

		if (category) {
			filterBy.category = mongoose.Types.ObjectId.ObjectId(category);
		}

		const sortVariants = [{ price: -1 }, { price: 1 }, { createdAt: -1 }];

		const sortBy = sortVariants[sort - 1];

		const pm = await ProductModel.getAllForResponse(filterBy, sortBy);

		return res.status(200).json(pm);
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
		const product = req.body;
		const image = req.files && req.files[0];

		product.price = parseFloat(Math.round(product.price * 100) / 100);

		const { colors, sizes } = jsonParse({
			colors: product.colors,
			sizes: product.sizes,
		});

		product.colors = colors;
		product.sizes = sizes;

		if (image) {
			const imageUrl = await imgBB.publishImageAndGetUrl(image);

			product.image = imageUrl;
		}

		const productModel = new ProductModel(product);
		await productModel.save();

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

router.put('/:productId', authAdmin, upload.any(), async (req, res) => {
	try {
		const product = {};
		const {
			colors, sizes, price, category, name,
		} = req.body;
		const image = req.files && req.files[0];
		const { productId } = req.params;

		if (price) {
			product.price = parseFloat(Math.round(product.price * 100) / 100);
		}

		if (colors) {
			product.colors = jsonParse({
				colors,
			});
		}

		if (sizes) {
			product.sizes = jsonParse({
				sizes,
			});
		}

		if (category) {
			product.category = category;
		}

		if (image) {
			const imageUrl = await imgBB.publishImageAndGetUrl(image);

			product.image = imageUrl;
		}

		if (name) {
			product.name = name;
		}

		const productModel = await ProductModel.findByIdAndUpdate(productId, {
			$set: product,
		}, { new: true }).exec();

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId} to update`).combine({
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

router.delete('/:productId', authAdmin, async (req, res) => {
	try {
		const { productId } = req.params;

		const productModel = await ProductModel.findByIdAndDelete(productId).exec();

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId} to delete`).combine({
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

router.post('/:productId/buy', authUser, async (req, res) => {
	try {
		const { productId } = req.params;
		const { color, size } = req.body;

		const productModel = await ProductModel.findById(productId);

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId}`).combine({
				name: 'ValidationError',
			});
		}

		const invoiceId = await productModel.quickBuy(req.user.id, {
			color, size,
		});

		return res.status(200).json({ invoiceId });
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
