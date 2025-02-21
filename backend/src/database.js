// src/database.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  category: String,
  image: String,
  sold: Boolean,
  dateOfSale: Date,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb+srv://wikitubeio3:WHczzApLcKzScVg2@roxiler.0mqpc.mongodb.net/?retryWrites=true&w=majority&appName=roxiler', {
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

module.exports = { Transaction, connectToDatabase };
