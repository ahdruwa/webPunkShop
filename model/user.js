const mongoose = require('mongoose');
const crypto = require('crypto');
const EError = require('eerror');

const BasketModel = require('./basket');

const { Schema, Types } = mongoose;

const basketScheme = new Schema({
	basket: Types.ObjectId,
	status: String,
},
{
	_id: false,
});

const userScheme = new Schema({
	email: {
		type: String,
		required: true,
	},
	phone: {
		type: String,
		required: true,
	},
	lastName: {
		type: String,
		default: '',
	},
	firstName: {
		type: String,
		default: '',
	},
	patronymic: {
		type: String,
		default: '',
	},
	country: {
		type: String,
		required: true,
	},
	city: {
		required: true,
		type: String,
	},
	address: {
		type: String,
		required: true,
	},
	baskets: {
		type: [basketScheme],
		default: [],
	},
	password: {
		type: String,
		required: true,
		select: false,
	},
	role: {
		type: String,
		default: 'user',
	},
});

userScheme.pre('save', async function (next) {
	if (this.isNew) {
		const user = this;
		const hash = crypto
			.createHash('sha256')
			.update(user.password)
			.digest('hex');

		user.password = hash;

		const basket = new BasketModel({
			owner: this._id,
		});

		await basket.save();

		this.baskets.push({
			basket: basket._id,
			status: 'main',
		});
	}

	next();
});

userScheme.statics.findUser = async function ({ email, password }) {
	const hash = crypto
		.createHash('sha256')
		.update(password)
		.digest('hex');

	const user = await this.findOne({
		email,
		password: hash,
	});

	delete user.password;

	return user;
};

userScheme.methods.acceptInvite = async function (basketId) {
	const basketIndex = this.baskets.findIndex((b) => b.basket.equals(basketId));

	this.baskets[basketIndex] = {
		...this.baskets[basketIndex],
		status: 'accepted',
	};

	return this.baskets;
};

userScheme.methods.addBasket = async function () {
	const basket = new BasketModel({
		owner: this._id,
		products: [],
	});

	await basket.save();

	this.baskets.push({
		status: 'accepted',
		basket: basket._id,
	});

	return this.baskets;
};

userScheme.methods.removeBasket = async function (basketId) {
	const [userBasket] = this.baskets.filter(({ basket }) => basket.equals(basketId));

	if (userBasket.status === 'main') {
		throw new EError('You cannot delete main basket').combine({
			name: 'ValidationError',
		});
	}

	await BasketModel.findByIdAndDelete(basketId).exec();

	await this.save();

	return this.baskets;
};

module.exports = mongoose.model('User', userScheme);
