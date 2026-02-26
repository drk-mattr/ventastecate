# Google Tag Manager Setup

## 1. Create GTM Container

1. Go to [tagmanager.google.com](https://tagmanager.google.com)
2. Click "Create Account"
3. **Account Name**: Ventas Tecate
4. **Container Name**: ventastecate.com
5. **Target Platform**: Web
6. Click "Create"

## 2. Add to Environment Variables

Add your GTM container ID to `.env.local`:

```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Also add to:
- Vercel environment variables (if using Vercel)
- Cloudflare Pages environment variables

## 3. Configure Google Analytics 4 in GTM

1. In GTM, click **Add a new tag**
2. Tag Configuration:
   - Choose **Google Analytics: GA4 Configuration**
   - **Measurement ID**: `G-1MMMDDB5VL`
3. Triggering:
   - Choose **All Pages**
4. Save and name it "GA4 Configuration"
5. Click **Submit** → **Publish**

## 4. (Optional) Add Additional Tags

### Facebook Pixel
1. New Tag → Facebook Pixel
2. Add Pixel ID
3. Trigger: All Pages

### Google Ads Conversion
1. New Tag → Google Ads Conversion Tracking
2. Add Conversion ID and Label
3. Trigger: Form Submission or Thank You Page

### Custom Events
Example: Track "Contact Seller" button clicks
1. New Tag → GA4 Event
2. Event Name: `contact_seller`
3. Trigger: Click - matches CSS selector `.contact-seller-btn`

## 5. Test Your Setup

1. In GTM, click **Preview**
2. Enter your website URL
3. GTM debugger will open
4. Navigate your site and verify tags fire correctly
5. Check real-time reports in Google Analytics

## Benefits of GTM

✅ Add/edit tracking without code changes  
✅ Manage multiple marketing pixels in one place  
✅ Test before publishing  
✅ Version control for tags  
✅ Built-in debugging tools
