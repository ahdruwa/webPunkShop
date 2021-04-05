const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EError = require('eerror');

const logger = require('../lib/logger');

const UserModel = require('../model/user');
const TokenStorageModel = require('../model/tokenStorage');

const router = express.Router();

const refresh = async (req, res) => {
	try {
		const { token } = await req.body;
		if (!token) {
			return res.sendStatus(401);
		}

		const userAgent = crypto
			.createHash('sha256')
			.update(req.header('User-Agent'))
			.digest('hex');

		const refreshToken = await TokenStorageModel.findOneAndDelete({
			userAgent,
		});

		console.log(token, refreshToken.refresh);

		if (!refreshToken) {
			return res.sendStatus(403);
		}

		if (token === refreshToken.refresh) {
			jwt.verify(token, process.env.REFRESH_SECRET, (err, user) => {
				if (err) {
					return res.sendStatus(403);
				}
				const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_SECRET, { expiresIn: '2h' });
				const newRefreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.REFRESH_SECRET, { expiresIn: '1y' });
				const accesExpirationDate = Date.now() + 1000 * 60 * 60 * 2;

				return res.json({
					accessToken,
					refreshToken: newRefreshToken,
					expired_at: accesExpirationDate,
				});
			});
		}

		return res.sendStatus(403);
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

const register = async (req, res, next) => {
	try {
		const user = req.body;
		const check = await UserModel.findOne({ email: req.body.email }).exec();

		delete user.role;
		delete user._id;

		if (check) {
			throw new EError('Email is busy').combine({
				name: 'ValidationError',
			});
		}

		const userModel = new UserModel(user);
		await userModel.save();

		delete userModel.password;

		req.user = userModel.toObject({
			useProjection: true,
		});

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

const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!(email && password)) {
			throw new EError('Email or password incorrect').combine({
				name: 'ValidationError',
			});
		}

		const user = req.user || await UserModel.findUser({
			email,
			password,
		});

		if (!user) {
			throw new EError('User not found').combine({
				name: 'ValidationError',
			});
		}

		const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_SECRET, { expiresIn: '2h' });
		const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.REFRESH_SECRET, { expiresIn: '1y' });
		const accesExpirationDate = Date.now() + 1000 * 60 * 60 * 2;

		const userAgent = crypto
			.createHash('sha256')
			.update(req.header('User-Agent'))
			.digest('hex');

		const tokenStorage = new TokenStorageModel({
			userAgent,
			refresh: refreshToken,
		});

		await tokenStorage.save();

		const response = req.user
			? {
				token: { accessToken, refreshToken, expired_at: accesExpirationDate },
				user: req.user,
			}
			: { accessToken, refreshToken, expired_at: accesExpirationDate };

		return res.status(200).json(response);
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

router.post('/login', login);

router.post('/register', register, login);
router.post('/refresh', refresh);

module.exports = router;
