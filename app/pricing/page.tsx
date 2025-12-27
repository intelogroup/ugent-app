'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  SparklesIcon,
  CheckIcon,
  ArrowRightIcon,
  BoltIcon,
  ChartBarIcon,
  LightBulbIcon,
  TrophyIcon
} from '@heroicons/react/24/solid';
import { createClient } from '@/lib/supabase/client';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId
        }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans = {
    monthly: {
      price: 40,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
      period: 'month',
      savings: null,
    },
    annual: {
      price: 400,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL || '',
      period: 'year',
      savings: '$80/year',
      monthlyEquivalent: '$33.33/month',
    },
  };

  const selectedPlan = plans[billingCycle];

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Insights',
      description: 'Get personalized study recommendations based on your performance',
      color: 'bg-primary-600',
    },
    {
      icon: BoltIcon,
      title: 'Unlimited Practice Tests',
      description: 'Access unlimited practice tests and quizzes across all subjects',
      color: 'bg-secondary-yellow',
    },
    {
      icon: ChartBarIcon,
      title: 'Advanced Analytics',
      description: 'Track your progress with detailed performance analytics',
      color: 'bg-secondary-blue',
    },
    {
      icon: LightBulbIcon,
      title: 'Smart Study Plans',
      description: 'AI-generated study plans tailored to your learning style',
      color: 'bg-secondary-green',
    },
    {
      icon: TrophyIcon,
      title: 'Priority Support',
      description: 'Get help when you need it with priority email support',
      color: 'bg-secondary-pink',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full mb-4">
            <SparklesIcon className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-semibold text-primary-600">Premium Plan</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900">
            Supercharge Your Learning
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Get unlimited access to AI-powered features and accelerate your exam preparation
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all relative ${
                billingCycle === 'annual'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Annual
              {plans.annual.savings && (
                <span className="absolute -top-2 -right-2 bg-secondary-green text-white text-xs px-2 py-1 rounded-full">
                  Save ${(plans.monthly.price * 12 - plans.annual.price)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="card bg-primary-600">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Premium {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                </h2>
                <p className="text-white/80">Everything you need to excel in your exams</p>
              </div>
              <div className="text-left md:text-right">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">
                    ${selectedPlan.price}
                  </span>
                  <span className="text-white/80">/{selectedPlan.period}</span>
                </div>
                {'monthlyEquivalent' in selectedPlan && selectedPlan.monthlyEquivalent && (
                  <p className="text-sm text-white/80 mt-1">{selectedPlan.monthlyEquivalent}</p>
                )}
                <p className="text-sm text-white/80 mt-1">Cancel anytime</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                'Unlimited AI-generated tests',
                'Advanced performance analytics',
                'Personalized study recommendations',
                'Priority customer support',
                'Detailed progress tracking',
                'Access to all question banks',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(selectedPlan.priceId)}
              disabled={loading}
              className="w-full md:w-auto bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-neutral-50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  Get Started Now
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-neutral-900 text-center">What's Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card group hover:shadow-xl transition-all">
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-neutral-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium Comparison */}
        <div className="card">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Free vs Premium</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-neutral-200">
                  <th className="text-left py-4 px-4 text-neutral-600 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 text-neutral-600 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 text-primary-600 font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Practice Tests', free: '5 per month', premium: 'Unlimited' },
                  { feature: 'AI Insights', free: 'Basic', premium: 'Advanced' },
                  { feature: 'Analytics', free: 'Limited', premium: 'Full Access' },
                  { feature: 'Study Plans', free: '—', premium: '✓' },
                  { feature: 'Priority Support', free: '—', premium: '✓' },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-neutral-100">
                    <td className="py-4 px-4 text-neutral-900">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-neutral-600">{row.free}</td>
                    <td className="py-4 px-4 text-center text-primary-600 font-semibold">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="card">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time from your account settings. You\'ll continue to have access until the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit and debit cards through Stripe, our secure payment processor.',
              },
              {
                q: 'Can I switch between monthly and annual billing?',
                a: 'Yes! You can upgrade from monthly to annual (or vice versa) at any time. We\'ll prorate the difference.',
              },
              {
                q: 'Can I get a refund?',
                a: 'We offer a 7-day money-back guarantee. If you\'re not satisfied, contact our support team for a full refund.',
              },
            ].map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-neutral-50">
                  <span className="font-semibold text-neutral-900">{faq.q}</span>
                  <ChartBarIcon className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-neutral-600">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
