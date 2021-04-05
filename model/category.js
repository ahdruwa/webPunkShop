const mongoose = require('mongoose');
const Product = require('./product');

const { Schema } = mongoose;

const categoryScheme = new Schema({
	label: {
		type: String,
		required: true,
	},
});

categoryScheme.statics.cascadeDelete = async function (categoryId) {
	const deletedCategory = await this.findByIdAndDelete(categoryId).exec();

	const categoryObjectId = mongoose.Types.ObjectId(categoryId);
	const deletedProducts = await Product.deleteMany({ category: categoryObjectId }).exec();

	return {
		deletedCategory,
		deletedProducts: {
			deletedCount: deletedProducts.deletedCount,
		},
	};
};

module.exports = mongoose.model('Category', categoryScheme);
