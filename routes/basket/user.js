const EError = require('eerror');
const express = require('express');
const mongoose = require('mongoose');

const logger = require('../../lib/logger');

const BasketModel = require('../../model/basket');
const UserModel = require('../../model/user');

const router = express.Router();

const basketOwner = async (req, res, next) => {
	try {
		const { basketId, user } = req;

		const basketModel = await BasketModel.findOne({
			_id: mongoose.Types.ObjectId(basketId),
			owner: user.id,
		}).exec();

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

router.post('/:userId', basketOwner, async (req, res) => {
	try {
		const { basketId } = req;
		const { userId } = req.params;

		const user = await UserModel.findById(userId).exec();

		if (!user) {
			throw new EError(`Not found user with id: ${userId}`).combine({
				name: 'ValidationError',
			});
		}

		const basketModel = await BasketModel.findById(basketId).exec();

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		await basketModel.inviteUserToBasket(user);

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

router.post('/acceptInvite', async (req, res) => {
	try {
		const { basketId, user } = req;
		const userId = user.id;

		const userModel = await UserModel.findById(userId).exec();

		if (!user) {
			throw new EError(`Not found user with id: ${userId}`).combine({
				name: 'ValidationError',
			});
		}

		const baskets = await userModel.acceptInvite(basketId);

		return res.status(200).json(baskets);
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

router.delete('/:userId', basketOwner, async (req, res) => {
	try {
		const { basketId } = req;
		const { userId } = req.params;

		const user = await UserModel.findById(userId).exec();

		if (!user) {
			throw new EError(`Not found user with id: ${userId}`).combine({
				name: 'ValidationError',
			});
		}

		const basketModel = await BasketModel.findById(basketId).exec();

		if (!basketModel) {
			throw new EError(`Not found basket with id: ${basketId}`).combine({
				name: 'ValidationError',
			});
		}

		await basketModel.kickUserFromBasket(userId);

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
