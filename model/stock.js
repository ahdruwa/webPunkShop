const mongoose = require('mongoose');

const { Schema } = mongoose;

const stockScheme = new Schema({
	img: {
		type: String,
		required: true,
	},
},
{
	timestamps: true,
});

module.exports = mongoose.model('Stock', stockScheme);
