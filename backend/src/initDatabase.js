// src/initDatabase.js
const axios = require('axios');
const { Transaction } = require('./database');

async function seedDatabase() {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    await Transaction.insertMany(transactions);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = seedDatabase;
