const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardSchema = require('./card');

const userSchema = new Schema({
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
        default: '',
    },
    city: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    card: {
        type: cardSchema,
        default: {}
    },
    
});



mongoose.model('Blog', userSchema);