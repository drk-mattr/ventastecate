# Ventas Tecate - Local Marketplace

A minimal, clean local marketplace web application built with Next.js and Supabase. Users can list products, browse listings, search, and communicate with sellers - all without payment processing or shopping cart functionality.

## Features

✅ **User Authentication**
- Email/password signup and login
- User profiles with usernames and display names
- Protected routes for authenticated users

✅ **Product Listings**
- Create listings with title, description, price, category, and location
- Upload up to 5 images per listing
- Edit and manage your own listings
- Mark listings as sold or inactive
- Image storage via Supabase Storage

✅ **Search & Filtering**
- Full-text search across titles and descriptions
- Filter by category, location, and price range
- Sort results

✅ **Messaging System**
- Messaging between buyers and sellers
- Conversation management
- Unread message indicators
- Message history

✅ **User Profiles**
- Public profile pages showing user's active listings
- Editable profiles with bio
- Member since dates and listing counts

✅ **Responsive Design**
- Mobile-first design using Tailwind CSS
- Clean, minimal UI with shadcn/ui components
- Optimized for all screen sizes

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works great)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Follow the detailed instructions in `supabase/README.md`:

1. Create a new Supabase project at https://supabase.com
2. Run the SQL schema from `supabase/schema.sql` in the Supabase SQL Editor
3. Get your API keys from Settings → API
4. Update `.env.local` with your credentials

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Pages

- `/` - Home page with recent listings
- `/search` - Search and filter listings
- `/listings/new` - Create a new listing
- `/listings/[id]` - View listing details
- `/my-listings` - Manage your listings
- `/messages` - Chat with other users
- `/users/[username]` - View user profiles
- `/profile/edit` - Edit your profile

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Deployment

### Cloudflare Pages (Recommended)

This app is optimized for deployment on Cloudflare Pages using OpenNext:

#### Cloudflare Pages Settings

In your Cloudflare Pages project settings, configure:

- **Build command**: `npx opennextjs-cloudflare build`
- **Build output directory**: `.open-next/assets`
- **Framework preset**: Next.js

#### Required Environment Variables

Add these in the Cloudflare Pages dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISCORD_WEBHOOK_URL=your-discord-webhook (optional)
DISCORD_NEW_USER_WEBHOOK_URL=your-new-user-webhook (optional)
RESEND_API_KEY=your-resend-api-key (for email notifications)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### Deployment Steps

1. **Via Git Integration** (Recommended):
   - Connect your GitHub repository to Cloudflare Pages
   - Push changes to trigger automatic deployments
   
2. **Manual Deployment**:
   ```bash
   npm run deploy
   ```

For detailed Cloudflare Pages setup instructions, see `.cloudflare-pages-build.md`.

### Alternative: Vercel

This app can also be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your environment variables
4. Deploy!

---

Built with ❤️ for the Tecate community
