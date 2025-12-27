require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

console.log('Testing Stripe Configuration...\n');

// Check if keys are loaded
console.log('Environment Variables:');
console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Found' : '✗ Missing');
console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ Found' : '✗ Missing');
console.log('- STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID ? '✓ Found' : '✗ Missing');
console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✓ Found' : '✗ Missing');
console.log('\n');

// Test secret key
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    console.log('Testing Secret Key Connection...');
    stripe.balance.retrieve()
      .then(balance => {
        console.log('✓ Secret key is valid!');
        console.log('- Account balance:', balance);
        console.log('\n');

        // Test if price exists
        if (process.env.STRIPE_PRICE_ID && process.env.STRIPE_PRICE_ID !== 'price_YOUR_PRICE_ID_HERE') {
          console.log('Testing Price ID...');
          return stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
        } else {
          console.log('⚠ Price ID not configured yet');
          return null;
        }
      })
      .then(price => {
        if (price) {
          console.log('✓ Price ID is valid!');
          console.log('- Product:', price.product);
          console.log('- Amount:', price.unit_amount / 100, price.currency.toUpperCase());
          console.log('- Recurring:', price.recurring?.interval);
        }
      })
      .catch(error => {
        console.error('✗ Error:', error.message);
        if (error.type === 'StripeAuthenticationError') {
          console.error('  → Secret key is invalid or expired');
        }
      });
  } catch (error) {
    console.error('✗ Error initializing Stripe:', error.message);
  }
} else {
  console.error('✗ STRIPE_SECRET_KEY not found in environment');
}

// Test publishable key format
if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  console.log('\nPublishable Key Check:');

  if (pubKey.startsWith('pk_test_')) {
    console.log('✓ Valid test publishable key format');
  } else if (pubKey.startsWith('pk_live_')) {
    console.log('✓ Valid live publishable key format');
  } else if (pubKey.startsWith('rk_test_')) {
    console.log('⚠ This is a RESTRICTED key - may not work with Stripe.js');
    console.log('  → You need a PUBLISHABLE key (starts with pk_test_)');
  } else {
    console.log('✗ Invalid publishable key format');
  }
}
