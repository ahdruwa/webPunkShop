const EError = require('eerror');
const express = require('express');

const logger = require('../../lib/logger');

const BasketModel = require('../../model/basket');
const product = require('./product');
const user = require('./user');

const router = express.Router();

/* GET home page. */
router.use('/product', product);
router.use('/user', user);

router.post('/buy', async (req, res) => {
	try {
		const { basketId, user: u } = req;

		const basketModel = await BasketModel.findById(basketId).exec();

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		await basketModel.buy(u.id);

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

router.get('/', async (req, res) => {
	const { basketId } = req;

	const basket = await BasketModel.findById(basketId).exec();

	res.json(basket);
});

module.exports = router;
