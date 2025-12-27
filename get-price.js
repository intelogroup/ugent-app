require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const productId = 'prod_TgNKcAr2DRCCjz';

console.log('Fetching prices for product:', productId);

stripe.prices.list({
  product: productId,
  limit: 10,
})
.then(prices => {
  if (prices.data.length === 0) {
    console.log('No prices found for this product.');
    return;
  }

  console.log('\nFound prices:');
  prices.data.forEach(price => {
    console.log('\n---');
    console.log('Price ID:', price.id);
    console.log('Amount:', (price.unit_amount / 100).toFixed(2), price.currency.toUpperCase());
    console.log('Recurring:', price.recurring ? `${price.recurring.interval}ly` : 'one-time');
    console.log('Active:', price.active);
  });

  // Get the active recurring price
  const recurringPrice = prices.data.find(p => p.active && p.recurring);
  if (recurringPrice) {
    console.log('\n✓ Found active recurring price:', recurringPrice.id);
  }
})
.catch(error => {
  console.error('Error:', error.message);
});
