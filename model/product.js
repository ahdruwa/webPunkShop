const EError = require('eerror');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const config = require('../config');
const InvoiceModel = require('./invoice');
const UserModel = require('./user');

const productScheme = new Schema({
	category: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: 'Category',
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
		type: [String],
		enum: config.product.sizes,
		required: true,
	},
	stock: {
		type: Number,
		default: 100,
		min: 0,
	},
	bought: {
		type: Number,
		default: 0,
		min: 0,
	},
},
{
	timestamps: true,
});

productScheme.statics.getAllForResponse = async function (filter, sort) {
	const pipelines = [
		{
			$set: {
				originRoot: '$$ROOT',
			},
		},
		{
			$unwind: '$colors',
		},
		{
			$unwind: '$sizes',
		},
		{
			$group: {
				colors: {
					$addToSet: '$colors',
				},
				sizes: {
					$addToSet: '$sizes',
				},
				price: {
					$addToSet: '$price',
				},
				products: {
					$addToSet: '$originRoot',
				},
				_id: 1,
			},
		},
		{
			$project: {
				_id: 0,
				options: {
					colors: '$colors',
					sizes: '$sizes',
					price: '$price',
				},
				products: '$products',
			},
		},
	];

	if (sort) {
		pipelines.unshift({
			$sort: sort,
		});
	}

	if (filter) {
		pipelines.unshift({
			$match: filter,
		});
	}

	const products = await this.aggregate(pipelines).exec();

	return products[0];
};

productScheme.methods.quickBuy = async function (userId, opts) {
	const user = await UserModel.findById(userId).exec();
	const { color, size } = opts;

	if (!(this.colors.includes(color) && this.sizes.includes(size))) {
		throw new EError('Product hasn`t that color').combine({
			name: 'ValidationError',
		});
	}

	if ((this.stock - 1) < 0) {
		throw new EError('Out of stock').combine({
			name: 'ValidationError',
		});
	}

	const invoice = new InvoiceModel({
		user: userId,
		deliveryAddress: {
			country: user.country,
			city: user.city,
			address: user.address,
		},
		products: [
			{
				product: this._id,
				options: opts,
			},
		],
	});

	await invoice.save();
	this.stock -= 1;
	this.bought += 1;
	await this.save();

	setTimeout(async () => {
		const futureInvoice = await InvoiceModel.findById(invoice._id).exec();

		if (!futureInvoice.payed) {
			this.stock += 1;
			this.bought -= 1;
			this.save();
		}
	}, 1000 * 60 * 60);

	return {
		invoice: invoice._id,
	};
};

module.exports = mongoose.model('Product', productScheme);
