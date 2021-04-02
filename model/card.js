const mongoose = require('mongoose');

const { Schema } = mongoose;

const cardScheme = new Schema({
	number: {
		type: String,
		required: true,
	},
	date: {
		type: String,
		required: true,
	},
});

module.exports = cardScheme;
