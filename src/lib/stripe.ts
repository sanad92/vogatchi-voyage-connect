import { loadStripe } from '@stripe/stripe-js';

// This is your Stripe publishable key
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51...' // Replace with your actual publishable key
);