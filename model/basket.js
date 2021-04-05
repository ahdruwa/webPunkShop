/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const EError = require('eerror');

const UserModel = require('./user');
const InvoiceModel = require('./invoice');
const ProductModel = require('./product');

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

const basketScheme = new Schema({
	owner: {
		type: Types.ObjectId,
		required: true,
		ref: 'User',
	},
	products: {
		type: [productsScheme],
		default: [],
	},
});

basketScheme.methods.addToBasket = async function (productModel, opts) {
	const product = productModel;

	if (!product.colors.includes(opts.color)) {
		throw new EError('No picked color').combine({
			name: 'ValidationError',
		});
	}

	if (!product.sizes.includes(opts.size)) {
		throw new EError('No picked size').combine({
			name: 'ValidationError',
		});
	}

	this.products.push({
		product: product._id,
		options: opts,
	});

	await this.save();

	return this;
};

basketScheme.methods.removeFromBasket = async function (productId) {
	this.products = this.products.filter(({ product }) => product._id.equals(productId));

	await this.save();

	return this;
};

basketScheme.methods.inviteUserToBasket = async function (userModel) {
	const check = userModel.baskets.find(({ basket }) => basket.equals(this._id));

	if (check) {
		throw new EError('User in basket').combine({
			name: 'ValidationError',
		});
	}

	userModel.baskets.push({
		basket: this._id,
		status: 'pending',
	});

	await userModel.save();

	return this;
};

basketScheme.methods.kickUserFromBasket = async function (userId) {
	if (!this.owner.equals(userId)) {
		throw new EError('Access Forbidden').combine({
			name: 'ForbiddenError',
		});
	}

	const userModel = await UserModel.findById(userId).exec();
	userModel.baskets.filter(({ basket }) => basket._id.equals(this._id));

	await userModel.save();

	return this;
};

basketScheme.methods.buy = async function (userId) {
	const user = await mongoose.model('User').findById(userId).exec();

	const productIds = this.products.map((product) => product._id);
	const products = await mongoose.model('Product').find({
		_id: {
			$in: productIds,
		},
	});

	for (const product of products) {
		product.stock -= 1;

		if ((product.stock) < 0) {
			throw new EError('Out of stock').combine({
				name: 'ValidationError',
			});
		}
	}

	const invoice = new InvoiceModel({
		user: userId,
		deliveryAddress: {
			country: user.country,
			city: user.city,
			address: user.address,
		},
		products: this.products,
	});

	await invoice.save();
	products.forEach(p => p.save());

	this.products = [];

	await this.save();

	setTimeout(async () => {
		const futureInvoice = await InvoiceModel.findById(invoice._id).exec();
		const futureInvoiceProductIds = futureInvoice.products.map(({ product }) => product);

		const futureInvoiceProducts = ProductModel.find({
			_id: {
				$in: futureInvoiceProductIds,
			},
		});

		if (!futureInvoice.payed) {
			for (const product of futureInvoiceProducts) {
				product.stock += 1;
			}
			futureInvoiceProducts.save();
		}
	}, 1000 * 60 * 60);

	return {
		invoice: invoice._id,
	};
};

module.exports = mongoose.model('Basket', basketScheme);
