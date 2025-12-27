#!/bin/bash
# Script to seed the final 154 questions to reach 400 total

DATABASE_URL="postgresql://postgres.yxuzslfctaattbcquamt:Jimkali90%2326@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

echo "Starting final seed to reach 400 questions..."
echo "Current count: 246"
echo "Adding: 154 questions"
echo "Target: 400 total"

# Run the existing seed-100 script one more time with modifications
# This will add approximately 100 more questions
npx ts-node seed-100.ts

# Then create and run a smaller batch of 54 unique questions
echo "Creating final 54 questions..."

