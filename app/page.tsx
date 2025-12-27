'use client'

import Link from 'next/link'
import {
  SparklesIcon,
  ChartBarIcon,
  BoltIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-neutral-900">Ugent</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full mb-8">
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Usmle Study Agent</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6 leading-tight">
            Master Your Studies with
            <br />
            <span className="text-primary-600">AI-Driven Analytics</span>
          </h1>

          <p className="text-xl text-neutral-600 mb-12 max-w-3xl mx-auto">
            Ugent combines intelligent question banks with powerful analytics to help you
            ace your exams. Track progress, identify weaknesses, and study smarter with
            personalized AI insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Start Learning Free
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="bg-white text-neutral-900 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-neutral-200 hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              View Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-neutral-900">10K+</div>
              <div className="text-sm text-neutral-600 mt-1">Questions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-neutral-900">95%</div>
              <div className="text-sm text-neutral-600 mt-1">Pass Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-neutral-900">50K+</div>
              <div className="text-sm text-neutral-600 mt-1">Students</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Powerful features designed to help you study efficiently and track your progress in real-time
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">AI-Powered Insights</h3>
              <p className="text-neutral-600">
                Get personalized study recommendations based on your performance patterns and weak areas
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-secondary-blue/20 rounded-xl flex items-center justify-center mb-6">
                <ChartBarIcon className="w-7 h-7 text-secondary-blue" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Advanced Analytics</h3>
              <p className="text-neutral-600">
                Track your progress with detailed charts and metrics across all subjects and topics
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-secondary-yellow/30 rounded-xl flex items-center justify-center mb-6">
                <BoltIcon className="w-7 h-7 text-neutral-900" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Adaptive Testing</h3>
              <p className="text-neutral-600">
                Practice with questions that adapt to your skill level for maximum learning efficiency
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-secondary-green/20 rounded-xl flex items-center justify-center mb-6">
                <LightBulbIcon className="w-7 h-7 text-secondary-green" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Smart Study Plans</h3>
              <p className="text-neutral-600">
                AI-generated study schedules tailored to your goals and learning pace
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-secondary-pink/20 rounded-xl flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-7 h-7 text-secondary-pink" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Progress Tracking</h3>
              <p className="text-neutral-600">
                Monitor your improvement over time with comprehensive performance metrics
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 hover:border-primary-500 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Question Bank</h3>
              <p className="text-neutral-600">
                Access thousands of high-quality questions across all major subjects and topics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Study Habits?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join thousands of students who are already studying smarter with Ugent
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-neutral-50 transition-colors"
          >
            Get Started for Free
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Ugent</span>
          </div>
          <p className="text-sm">
            &copy; 2025 Ugent. All rights reserved. Study smarter, not harder.
          </p>
        </div>
      </footer>
    </div>
  )
}
