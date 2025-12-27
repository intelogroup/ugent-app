-- Make password column nullable (since Supabase Auth handles passwords)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
