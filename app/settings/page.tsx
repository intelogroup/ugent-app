'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  UserIcon,
  CreditCardIcon,
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('account');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const tabs = [
    { id: 'account', name: 'Account', icon: UserIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        router.push('/pricing');
      }
    } catch (error) {
      console.error('Error:', error);
      router.push('/pricing');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Cog6ToothIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
          </div>
          <p className="text-neutral-600">Manage your account preferences and settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'account' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={user?.user_metadata?.name || ''}
                    disabled
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-600"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Contact support to update your name</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Billing & Subscription</h2>
                <p className="text-neutral-600 mb-6">
                  Manage your subscription, payment methods, and billing history.
                </p>
                <button
                  onClick={handleManageBilling}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Manage Billing
                </button>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <CreditCardIcon className="w-5 h-5" />
                    <span>View Pricing Plans</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-neutral-900">Email Notifications</p>
                    <p className="text-sm text-neutral-500">Receive updates about your progress</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-neutral-900">Study Reminders</p>
                    <p className="text-sm text-neutral-500">Get reminded to study daily</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-neutral-900">AI Insights</p>
                    <p className="text-sm text-neutral-500">Receive AI-powered recommendations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-neutral-900 mb-2">Password</h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    Use Supabase authentication to manage your password securely.
                  </p>
                  <button className="text-primary-600 hover:text-primary-700 font-medium">
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
