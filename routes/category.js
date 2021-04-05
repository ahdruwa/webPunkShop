const express = require('express');
const EError = require('eerror');

const logger = require('../lib/logger');

const CategoryModel = require('../model/category');
const { authAdmin } = require('./middlewares/auth');

const router = express.Router();

/* GET home page. */
router.get('/', async (req, res) => {
	try {
		const categories = await CategoryModel.find().exec();

		return res.status(200).json(categories);
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

router.post('/', authAdmin, async (req, res) => {
	try {
		const category = {
			label: req.body.label,
		};

		const categoryModel = new CategoryModel(category);
		await categoryModel.save();

		return res.status(200).json(categoryModel.toObject());
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

router.delete('/:categoryId', async (req, res) => {
	try {
		const { categoryId } = req.params;

		const deleted = await CategoryModel.cascadeDelete(categoryId);

		if (!deleted) {
			throw new EError(`Not found category with id: ${categoryId} to delete`).combine({
				name: 'ValidationError',
			});
		}

		return res.status(200).json(deleted);
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

router.put('/:categoryId', async (req, res) => {
	try {
		const { categoryId } = req.params;
		const { label } = req.body;

		const updated = await CategoryModel.findByIdAndUpdate(categoryId, { label }).exec();

		if (!updated) {
			throw new EError(`Not found category with id: ${categoryId} to delete`).combine({
				name: 'ValidationError',
			});
		}

		return res.status(200).json(updated);
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
