const express = require('express');
const multer = require('multer');
require('dotenv').config();

const logger = require('../lib/logger');

const ProductModel = require('../model/product');
const ImgBB = require('../services/ImgBB');

const router = express.Router();
const upload = multer();

const imgBB = new ImgBB(process.env.IMGBB_API_KEY);
/* GET home page. */
router.get('/', (req, res) => {
	res.render('index', { title: 'Express' });
});

router.post('/', upload.any(), async (req, res) => {
	try {
		const product = req.body;
		const image = req.files[0];

		console.log(image);

		product.price = parseFloat(Math.round(product.price * 100) / 100);

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
			return res.status(400).json('Ты пидор');
		}
		return res.status(500).json('Пизда');
	}
});

module.exports = router;
