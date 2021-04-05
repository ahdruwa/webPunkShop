const mongoose = require('mongoose');

const { Schema } = mongoose;

const tokenScheme = new Schema({
	refresh: {
		type: String,
		required: true,
	},
	userAgent: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model('Token', tokenScheme);
