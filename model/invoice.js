const mongoose = require('mongoose');

const { Schema, Types } = mongoose;

const optionsScheme = new Schema({
	color: String,
	size: String,
},
{ _id: false });

const productsScheme = new Schema({
	product: {
		type: Types.ObjectId,
		required: true,
		ref: 'Product',
	},
	options: {
		type: optionsScheme,
		required: true,
	},
},
{ _id: false });

const invoiceScheme = new Schema({
	user: {
		type: Types.ObjectId,
		required: true,
		ref: 'User',
	},
	fullfilled: {
		type: Boolean,
		default: false,
	},
	payed: {
		type: Boolean,
		default: false,
	},
	products: {
		type: [productsScheme],
		required: true,
	},
	deliveryAddress: {
		type: {
			city: String,
			country: String,
			address: String,
		},
		required: true,
	},
},
{
	timestamps: true,
});

module.exports = mongoose.model('Invoice', invoiceScheme);
