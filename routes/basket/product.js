const EError = require('eerror');
const express = require('express');

const logger = require('../../lib/logger');

const BasketModel = require('../../model/basket');
const ProductModel = require('../../model/product');
const UserModel = require('../../model/user');

const router = express.Router();

const basketUser = async (req, res, next) => {
	try {
		const { basketId, user } = req;

		const basketModel = await BasketModel.findById(basketId).exec();

		console.log(basketModel);

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		const userModel = await UserModel.findOne({
			_id: user.id,
			'baskets.basket': basketId,
		});

		if (!userModel) {
			throw new EError('Basket not found').combine({
				name: 'ValidationError',
			});
		}

		req.basket = basketModel.toObject();

		return next();
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
};

/* GET home page. */
router.post('/:productId', basketUser, async (req, res) => {
	try {
		const { basketId } = req;
		const { productId } = req.params;
		const { color, size } = req.body;

		const productModel = await ProductModel.findById(productId).exec();

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId}`).combine({
				name: 'ValidationError',
			});
		}

		const basketModel = await BasketModel.findById(basketId).exec();

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		await basketModel.addToBasket(productModel, { color, size });

		return res.status(200).json(basketModel.toObject());
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

router.delete('/:productId', basketUser, async (req, res) => {
	try {
		const { basketId } = req;
		const { productId } = req.params;

		const productModel = await ProductModel.findById(productId).exec();

		if (!productModel) {
			throw new EError(`Not found product with id: ${productId}`).combine({
				name: 'ValidationError',
			});
		}

		const basketModel = await BasketModel.findById(basketId).exec();

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		await basketModel.removeFromBasket(productModel._id);

		return res.status(200).json(basketModel.toObject());
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
