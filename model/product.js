const mongoose = require('mongoose');

const { Schema } = mongoose;

const config = require('../config');

const productScheme = new Schema({
	category: {
		type: String,
		default: 'common',
	},
	name: {
		type: String,
		required: true,
	},
	price: {
		type: Number,
		required: true,
	},
	oldPrice: {
		type: Number,
		default: 0,
	},
	image: {
		type: String,
		default: '',
	},
	colors: {
		type: [String],
		required: true,
		enum: config.product.colors,
	},
	sizes: {
		type: String,
		enum: config.product.sizes,
		required: true,
	},
});

const productModel = mongoose.model('Product', productScheme);
module.exports = productModel;
