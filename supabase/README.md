# Supabase Setup Instructions

## Prerequisites
- A Supabase account (sign up at https://supabase.com)

## Setup Steps

### 1. Create a New Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: `ventastecate` (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Select closest to your users
4. Wait for the project to be created (~2 minutes)

### 2. Get Your API Keys
1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

### 3. Update Environment Variables
1. Open `.env.local` in the root of this project
2. Replace the placeholder values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Run the Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- All database tables (profiles, listings, listing_images, conversations, messages)
- Row Level Security (RLS) policies
- Database indexes for performance
- Triggers for automatic profile creation and timestamp updates
- Storage bucket for listing images with access policies

### 5. Verify Setup
1. Go to **Table Editor** in your Supabase dashboard
2. You should see all the tables: `profiles`, `listings`, `listing_images`, `conversations`, `messages`
3. Go to **Storage** and verify the `listing-images` bucket exists

### 6. Enable Email Authentication (Optional but Recommended)
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates if desired under **Email Templates**

## Database Schema Overview

### Tables
- **profiles**: User profiles with username, display name, avatar, and bio
- **listings**: Product listings with title, description, price, category, and location
- **listing_images**: Multiple images per listing
- **conversations**: Chat conversations between buyers and sellers
- **messages**: Individual messages within conversations

### Security
All tables have Row Level Security (RLS) enabled with policies that:
- Allow everyone to view public data (profiles, listings)
- Only allow users to modify their own data
- Restrict conversation and message access to participants only

## Next Steps
After completing this setup, you can start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000
