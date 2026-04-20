# UGent - AI-Powered Medical Education Platform

A comprehensive, data-heavy medical education platform with user interaction tracking, personalized learning paths, and AI-powered recommendations.

## 🚀 Quick Start

### Get Started in 3 Steps

1. **Set Up Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Convex, WorkOS, OpenAI, and Stripe keys

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Start Convex Backend** (in a separate terminal)
   ```bash
   npx convex dev
   ```

## ✨ Features

### Frontend
- Modern dashboard with analytics
- Interactive test creation (26 medical systems, 250+ topics)
- Quiz interface with real-time feedback
- Study notes management
- Performance analytics with charts
- Responsive design (mobile-first)

### Backend
- **Convex** - Real-time database and backend functions
- **WorkOS** - Authentication and user management
- **Stripe** - Payments and subscriptions
- **OpenAI** - AI-powered insights and recommendations
- **Comprehensive tracking** - Every user action logged and analyzed

## 🏗️ Architecture

```
Frontend (React 19 / Next.js 16)
    ↓
Convex (Real-time DB + Functions)
    ↓
WorkOS (Auth) | Stripe (Payments) | OpenAI (AI)
```

## 💻 Development

### Prerequisites
- Node.js 18+
- Convex account
- WorkOS account
- Stripe account (optional for dev)
- OpenAI API Key

### Install & Run
```bash
# Install dependencies
npm install

# Start development
npm run dev
```

## 📁 Project Structure

```
ugent-app/
├── app/               # Next.js App Router (UI)
├── components/        # Reusable UI components
├── convex/            # Convex backend (Schema, API functions)
├── lib/               # Shared utilities and hooks
├── public/            # Static assets
└── scripts/           # Utility scripts (seed, migration, etc.)
```

## 🚀 Deployment to Vercel

1. **GitHub**: Push your code to a GitHub repository.
2. **Vercel**: Connect your GitHub repository to Vercel.
3. **Environment Variables**:
   - Add all variables listed in `.env.example` to Vercel project settings.
   - For `CONVEX_DEPLOY_KEY`, follow the instructions on the Convex dashboard.
4. **Build Settings**: Vercel will automatically detect Next.js.

## 🛠️ Tech Stack

**Frontend**: React 19 + Next.js 16 + TypeScript + Tailwind CSS v4
**Backend**: Convex + Node.js
**Authentication**: WorkOS
**Payments**: Stripe
**AI**: OpenAI (GPT-4)
**Deployment**: Vercel


## 🎯 Next Steps

1. Connect WorkOS to your Vercel deployment domain.
2. Configure Stripe webhooks if using payments.
3. Use `npx convex deploy` for production database deployments.

---

**Status**: 🚀 Ready for Deployment
**Version**: 0.1.0
**Last Updated**: April 2026
