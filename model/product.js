const mongoose = require('mongoose');

const { Schema } = mongoose;

const config = require('../config');

const colorScheme = new Schema({
	type: String,
	enum: config.product.colors,
},
{
	_id: false,
});

const sizeScheme = new Schema({
	type: String,
	enum: config.product.sizes,
},
{
	_id: false,
});

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
		type: [colorScheme],
		required: true,
	},
	sizes: {
		type: [sizeScheme],
		required: true,
	},
});

const productModel = mongoose.model('Product', productScheme);
module.exports = productModel;
