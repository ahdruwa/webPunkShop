const express = require('express');

const product = require('./product');
const category = require('./category');
const stock = require('./stock');
const user = require('./user');
const basket = require('./basket');
const UserModel = require('../model/user');
const { authUser } = require('./middlewares/auth');

const router = express.Router();

const basketBridge = (req, res, next) => {
	const { basketId } = req.params;

	req.basketId = basketId;

	next();
};

/* GET home page. */
router.use('/product', product);
router.use('/category', category);
router.use('/stock', stock);
router.use('/user', user);
router.use('/basket/:basketId', authUser, basketBridge, basket);
router.get('/basket', authUser, async (req, res) => {
	const userId = req.user.id;

	const userModel = await UserModel.findById(userId).exec();

	res.json(userModel.baskets);
});
router.post('/basket', authUser, async (req, res) => {
	const userId = req.user.id;

	const userModel = await UserModel.findById(userId).exec();

	res.json(userModel.baskets);
});

module.exports = router;
