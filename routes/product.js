const EError = require('eerror');
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
		const [image] = req.files;

		product.price = parseFloat(Math.round(product.price * 100) / 100);

		try {
			const colors = JSON.parse(product.colors);
			const sizes = JSON.parse(product.sizes);
		} catch (error) {
			throw new EError(`JSON.parse failed at product adding`).combine({
				ValidationError: '',
				name: 'ValidationError',
			})
		}

		if (image) {
			const imageUrl = await imgBB.publishImageAndGetUrl(image);

			product.image = imageUrl;
		}

		console.log(product);

		const productModel = new ProductModel(product);
		console.log(productModel);
		await productModel.save();

		return res.status(200).json(productModel.toObject());
	} catch (error) {
		logger.error(error);
		console.log(error);
		if (error.name === 'ValidationError') {
			return res.status(400).json({
				error: {
					message: error.ValidationError,
				}
			});
		}
		return res.status(500).json({
			error: {
				message: 'Server Error',
			}
		});
	}
});

module.exports = router;
