# momus collective — Storefront PRD

Sep 26, 2026 · @Stephen Nwankwo

Product requirements for the momus collective e-commerce storefront: a single-tenant, manually-fulfilled print-on-demand store selling shirts with unhinged and sarcastic slogans, featuring a text-based custom design tool.

## Overview

momus collective is a direct-to-consumer e-commerce storefront selling t-shirts printed with satirical, unhinged, and sarcastic slogans. The brand takes its name from the Greek spirit of satire and mockery who was expelled from Olympus for criticizing the gods. The tagline is "dressed up, filtered out."

This MVP is a single-tenant storefront for the momus collective brand only. It is not a multi-tenant platform. The goal is to validate product-market fit, prove the custom design tool concept, and generate initial revenue before expanding into a platform (Phase 2).

Fulfillment is entirely manual. When an order is placed and paid, the admin receives a notification with order details (design file, shirt color, size, shipping address). The admin then procures the blank shirt from a local vendor, takes the design to a local printer, and hands the finished product to a delivery rider. The system tracks order status through a simple pipeline: Paid, Shirt Acquired, Printed, Out for Delivery, Delivered.

The store sells two types of products: pre-designed shirts from the momus collective catalog (59+ designs across 11 categories), and custom-designed shirts where the customer uses an in-browser text editor to create their own slogan on a shirt.

Target market: young adults (18-35) in Nigeria, primarily Lagos, who engage with internet humor, meme culture, and bold self-expression. International expansion is a Phase 2 concern.

Success metrics for MVP: 50 orders in the first 30 days, average order value above NGN 15,000, and at least 10 custom design orders to validate the design tool.

## Brand Assets

All brand images are stored in the `assets/` directory at the project root. The storefront references them as follows:

**assets/wordmark.png** (the "momus collective" typographic logo, off-white on black, thin geometric sans-serif). Used in: the navigation bar as the site logo, the footer, email templates (header), and Open Graph/social share images. The nav should display this image at approximately 140px width on desktop and 110px on mobile, vertically centered.

**assets/avatar.png** (circular gold line-art Greek face on black background). Used in: the browser favicon (scaled to 32x32 and 16x16), the mobile web app icon (192x192 and 512x512 for PWA manifest), social media profile pictures, and as a subtle watermark/stamp on product detail pages. Also used as the sender avatar in order confirmation and status update emails.

**assets/mascot-human.png** (character sheet of Momus as a young man in Greek toga, three angles). Used in: the "Our Story" section on the homepage, positioned beside the brand origin narrative about Momus being expelled from Olympus. The center full-body view is the primary placement. The bust views can be cropped for social media templates and marketing materials.

**assets/mascot-raven.png** (raven perched on a broken Greek marble column, three angles, golden laurel leaf). Used in: the hero section of the homepage as the primary visual, positioned to the right of the hero text on desktop and above the text on mobile. The center view is the primary placement. The raven also appears on the custom design tool page as a decorative element, and can be used on the 404 page and empty-state illustrations throughout the store.

## User Personas

**Buyer (Customer)**

Age 18-35, based in Nigeria (primarily Lagos). Engages with meme culture, internet humor, and bold self-expression. Browses social media (Instagram, TikTok, X) daily. Shops primarily on mobile. Comfortable paying via Paystack (cards, bank transfers, USSD). Wants either a pre-designed shirt that says something they relate to, or the ability to create their own custom slogan. Expects fast delivery within Lagos (1-3 days) and clear order tracking.

**Admin (Store Owner)**

Solo operator managing the entire fulfillment pipeline manually. Needs instant notifications when orders arrive (WhatsApp, email, or SMS). Requires a clean dashboard to see pending orders, their design files, shipping details, and status. Manages the product catalog (add/edit/remove designs, set prices, create collections). Moderates custom designs before sending them to print. Tracks basic business metrics: daily orders, revenue, top-selling designs, and conversion rates.

## Product Catalog and Browsing

**FR-CAT-01: Product Grid.** The homepage and shop page display products in a responsive grid (4 columns desktop, 2 columns mobile). Each product card shows: t-shirt mockup image, slogan text, category label, price in NGN, and any applicable tag (Bestseller, New, Popular).

**FR-CAT-02: Category Filtering.** Users can filter products by category. Launch categories: Philosophy, Self-Aware, Tech, Geopolitics, Pop Culture, Dad Jokes, Engineering, Relationships, Religion, Hot Takes, Chaotic. An "All" option shows the full catalog. Category buttons display the count of products in each.

**FR-CAT-03: Search.** A search bar in the navigation allows users to search products by slogan text or category name. Results update in real time as the user types (debounced at 300ms). Empty results show a friendly message with a prompt to try different terms.

**FR-CAT-04: Sorting.** Users can sort products by: Newest First (default), Price Low to High, Price High to Low, and Most Popular (based on order count).

**FR-CAT-05: Product Detail Page.** Clicking a product opens a detail view showing: full-size mockup (front view; back view in Phase 2), slogan, category, price, size selector (S, M, L, XL, XXL), color variants if applicable, "Add to Bag" button, product details (material, GSM, care instructions), and related products from the same category (up to 4). The detail view renders as a modal on desktop and a full page on mobile.

**FR-CAT-06: Collections.** The admin can create named collections (e.g., "New Drops," "Bestsellers," "Staff Picks") that group products for promotional purposes. Collections are displayed as horizontal scrollable carousels on the homepage. A product can belong to multiple collections.

**FR-CAT-07: Pagination.** The shop page loads 20 products initially and uses infinite scroll to load more in batches of 20. A loading indicator appears during fetch.

## Custom Design Tool (Text-Only MVP)

**FR-DES-01: Design Canvas.** A canvas-based editor (HTML5 Canvas or SVG) renders a t-shirt mockup in real time. The user sees their text rendered on the shirt as they type and adjust settings. The canvas is responsive and touch-friendly for mobile users.

**FR-DES-02: Shirt Color Selection.** The user picks a base shirt color from available options: Black, White, Navy, Charcoal, Maroon, Forest Green, Deep Purple. The mockup updates instantly to reflect the selected color.

**FR-DES-03: Text Input.** The user types their custom slogan into a text field. Maximum 80 characters. A live character counter is displayed. The text renders on the shirt mockup in real time.

**FR-DES-04: Font Selection.** The user selects from 8-10 curated fonts that work well on apparel. Options should include: a bold sans-serif (default), a condensed impact-style font, a handwritten/script font, a monospace font, a serif font, and a stencil/military font. Font previews are shown in the selector.

**FR-DES-05: Text Styling.** The user can adjust: font size (Small, Medium, Large, Extra Large), text color (from a curated palette of 8-10 colors that contrast well against each shirt color), text alignment (Center, Left, Right), and letter spacing (Normal, Wide, Extra Wide).

**FR-DES-06: Text Placement.** The user selects text placement from preset positions: Upper Chest, Center Chest (default), Lower Chest, and Full Front. Phase 2 will add back-of-shirt placement and free-drag positioning.

**FR-DES-07: Live Preview.** The canvas continuously re-renders the mockup as the user makes changes. A "Preview" button shows a clean final mockup without editing controls, simulating how the finished shirt will look.

**FR-DES-08: Design Save.** Logged-in users can save their design to their account for later editing or purchasing. Saved designs are stored with all configuration (shirt color, text, font, size, placement, text color). Guest users are prompted to create an account to save designs.

**FR-DES-09: Design File Generation.** When the user adds a custom design to their cart, the system generates a high-resolution PNG or SVG export of the design (text only, transparent background, at print-ready resolution of 300 DPI minimum). This file is attached to the order for the admin to take to the printer.

**FR-DES-10: Design Templates.** The tool offers 10-15 pre-built templates (popular slogan layouts with placeholder text) that users can start from and customize. Templates are organized by style: Bold Statement, Minimalist, Stacked Text, and Disclaimer Style (main text with smaller parenthetical).

**FR-DES-11: Pricing.** Custom-designed shirts carry a price premium over catalog shirts. The base price for a custom design is displayed clearly on the design page, and adjusts based on shirt color (some blanks cost more). The pricing formula: blank shirt cost + print cost + margin. The admin sets these values.

## Cart and Checkout

**FR-CART-01: Persistent Cart.** The cart persists across page navigations and browser refreshes. For guest users, the cart is stored in localStorage. For logged-in users, the cart is stored server-side and syncs across devices. When a guest logs in, their localStorage cart merges with their server-side cart.

**FR-CART-02: Cart Contents.** Each cart item displays: product mockup thumbnail, slogan text (or "Custom Design" with a preview), selected size, selected color, quantity (adjustable via +/- controls), unit price, and a remove button. The cart shows subtotal, estimated delivery fee, and total.

**FR-CART-03: Cart Drawer.** The cart opens as a slide-in drawer from the right side on desktop and as a bottom sheet on mobile. The drawer shows all items and a checkout button. A badge on the cart icon in the navigation shows the item count.

**FR-CART-04: Checkout Flow.** The checkout is a single-page flow with three sections: Shipping Information (full name, phone number, delivery address with state/LGA, optional delivery notes), Order Summary (itemized list with totals), and Payment. Users can edit their cart from the checkout page.

**FR-CART-05: Guest Checkout.** Users can complete checkout without creating an account. They provide their email and phone number. After payment, they receive an order confirmation email with a link to track their order. They are offered an option to create an account with their details pre-filled.

**FR-CART-06: Payment Integration.** Payment is processed via Paystack. Supported methods: card (Visa, Mastercard, Verve), bank transfer, and USSD. The Paystack inline popup handles payment. On successful payment, the system creates the order, sends a confirmation email to the customer, and sends a notification to the admin. Failed payments show a clear error message and allow retry.

**FR-CART-07: Promo Codes.** The checkout page includes a promo code input field. Valid codes apply either a percentage discount or a flat NGN discount. The admin creates and manages promo codes from the admin panel, with options for: code string, discount type (percentage or flat), discount value, expiry date, usage limit (total uses and per-customer uses), and minimum order value.

**FR-CART-08: Delivery Fee Calculation.** For MVP, delivery fees are a flat rate based on state: Lagos (within), Lagos (mainland/island cross), and Outside Lagos. The admin configures these rates. Free delivery thresholds can be set (e.g., free delivery on orders above NGN 25,000).

**FR-CART-09: Order Confirmation.** After successful payment, the customer sees a confirmation page with: order number, order summary, estimated delivery date, and a link to track the order. A confirmation email is sent with the same information.

## User Accounts

**FR-USR-01: Registration.** Users register with email and password, or via Google OAuth. Registration requires: email, password (minimum 8 characters), first name, and phone number. Email verification is sent on registration. Duplicate email registrations are rejected with a clear message.

**FR-USR-02: Login.** Users log in with email/password or Google OAuth. A "Forgot Password" flow sends a password reset link via email. Sessions persist for 30 days with a "Remember Me" option. JWT-based authentication with refresh tokens.

**FR-USR-03: Order History.** The account dashboard shows all past and active orders in reverse chronological order. Each order shows: order number, date, items (with thumbnails), total amount, and current status. Clicking an order expands it to show full details including tracking information when available.

**FR-USR-04: Saved Designs.** Users who have created custom designs see a gallery of their saved designs. Each design shows a thumbnail preview, creation date, and the design configuration. Users can: edit a saved design (opens it in the design tool with all settings restored), add it to cart, duplicate it, or delete it.

**FR-USR-05: Wishlist.** Users can save products to a wishlist by clicking a heart icon on product cards. The wishlist is accessible from the account dashboard. Items can be moved from the wishlist to the cart.

**FR-USR-06: Saved Addresses.** Users can save multiple shipping addresses. During checkout, saved addresses appear in a dropdown for quick selection. Users can set a default address. Addresses can be added, edited, and deleted from the account settings.

**FR-USR-07: Account Settings.** Users can update: name, email (requires re-verification), phone number, password, and notification preferences (email and/or WhatsApp for order updates).

## Admin Panel and Order Pipeline

**FR-ADM-01: Order Notifications.** When a new order is paid, the admin receives an instant notification via: email (with full order details and design file attached), and WhatsApp (via the WhatsApp Business API or a webhook to a WhatsApp bot) with a summary and link to the admin panel. Notifications include: order number, customer name, phone number, items ordered, sizes, design files (for custom designs), shipping address, and total paid.

**FR-ADM-02: Order Dashboard.** The admin panel displays all orders in a kanban-style board with columns for each status: Paid, Shirt Acquired, Printed, Out for Delivery, Delivered, and Cancelled. Orders are dragged between columns to update status. Each status change triggers a notification to the customer. A list view is also available, sortable by date, status, and amount.

**FR-ADM-03: Order Detail View.** Clicking an order shows full details: customer information (name, phone, email, address), items with mockup thumbnails, sizes and quantities, design file download (high-res PNG/SVG for custom designs), payment confirmation reference from Paystack, order timeline (timestamps for each status change), and delivery notes.

**FR-ADM-04: Product Management.** The admin can: create new products (upload mockup images, enter slogan, set category, set price, add tags), edit existing products (update any field), delete or archive products, bulk-update prices, and reorder products within a category. Product images should support multiple angles in Phase 2; MVP requires one front-view mockup.

**FR-ADM-05: Category Management.** The admin can create, rename, reorder, and archive categories. Each category has a name, a slug (for URLs), and an optional description.

**FR-ADM-06: Collection Management.** The admin can create named collections, add/remove products from collections, set a collection as featured (appears on homepage), and set collection display order.

**FR-ADM-07: Design Moderation.** Custom designs submitted by customers appear in a moderation queue before the order enters fulfillment. The admin reviews each design and either approves it (order proceeds to Shirt Acquired status) or rejects it with a reason (customer is notified and offered a refund or a chance to revise). Rejection reasons include: offensive content, copyright concerns, and unprintable design (too small, too many colors, etc.).

**FR-ADM-08: Analytics Dashboard.** A simple dashboard showing: total revenue (today, this week, this month, all time), total orders by status, top 10 selling products, orders by category breakdown, custom vs. catalog order ratio, average order value, and a revenue trend line chart (daily for the last 30 days).

**FR-ADM-09: Promo Code Management.** The admin creates, edits, deactivates, and deletes promo codes. Each code tracks: total redemptions, total discount given, and remaining uses.

**FR-ADM-10: Customer List.** The admin can view all registered customers with: name, email, phone, total orders, total spent, and date of last order. Clicking a customer shows their full order history.

## Notifications

**FR-NOT-01: Order Confirmation Email.** Sent to the customer immediately after successful payment. Contains: order number, itemized list with thumbnails, total amount, shipping address, estimated delivery window, and a link to track the order.

**FR-NOT-02: Order Status Updates.** The customer receives an email and/or WhatsApp message (based on their preference) when the order status changes. Messages include the new status, a brief description of what it means (e.g., "Your shirt is printed and being packed for delivery"), and the tracking link.

**FR-NOT-03: Design Moderation Outcome.** If a custom design is approved, the customer receives a confirmation. If rejected, the notification includes the reason and options (revise the design or request a refund).

**FR-NOT-04: Newsletter.** The storefront includes an email capture form (footer and a homepage section). Subscribers receive weekly "New Drops" emails featuring new designs. Newsletter management uses a simple list stored in the database; integration with Mailchimp or Brevo is a Phase 2 enhancement.

**FR-NOT-05: Abandoned Cart Reminder (Phase 2).** If a user adds items to their cart but does not complete checkout within 24 hours, an email reminder is sent with the cart contents and a direct link to checkout.

## Reviews and Social Proof

**FR-REV-01: Product Reviews.** Customers who have received their order can leave a review on the product. Each review includes: a star rating (1-5), written text (optional, max 500 characters), and the reviewer's first name and initial. Reviews are displayed on the product detail page, sorted by most recent.

**FR-REV-02: Verified Purchase Badge.** Reviews from customers who purchased the product through the store display a "Verified Purchase" badge. Only verified purchasers can leave reviews; this prevents spam.

**FR-REV-03: Review Moderation.** All reviews are published immediately but can be removed by the admin if they violate guidelines (offensive content, spam, or irrelevant). The admin can flag and hide reviews from the admin panel.

**FR-REV-04: Aggregate Rating.** Each product shows an average star rating and total review count on its card and detail page. The homepage can feature a "Top Rated" collection based on average ratings.

**FR-REV-05: Review Prompt.** 3 days after an order is marked as Delivered, the customer receives an email asking them to leave a review, with a direct link to the product's review form.

## Data Models

**User:** id (UUID), email (unique), password\_hash, first\_name, last\_name, phone, is\_verified, auth\_provider (email/google), notification\_pref (email/whatsapp/both), created\_at, updated\_at.

**Address:** id, user\_id (FK), label (e.g., "Home"), full\_name, phone, address\_line\_1, address\_line\_2, city, state, lga, is\_default, created\_at.

**Category:** id, name, slug (unique), description, display\_order, is\_active, created\_at.

**Product:** id, slogan, slug (unique), category\_id (FK), price (NGN), description, shirt\_colors (JSON array of available colors), mockup\_images (JSON array of image URLs), tags (JSON array, e.g., \["BESTSELLER", "NEW"\]), is\_active, is\_custom (boolean, false for catalog products), display\_order, total\_orders, avg\_rating, created\_at, updated\_at.

**Collection:** id, name, slug, description, is\_featured, display\_order, is\_active, created\_at.

**CollectionProduct:** id, collection\_id (FK), product\_id (FK), display\_order.

**SavedDesign:** id, user\_id (FK), name, config (JSON: shirt\_color, text, font, font\_size, text\_color, alignment, letter\_spacing, placement), preview\_image\_url, design\_file\_url, created\_at, updated\_at.

**Cart:** id, user\_id (FK, nullable for guests), session\_id (for guests), created\_at, updated\_at.

**CartItem:** id, cart\_id (FK), product\_id (FK, nullable for custom designs), saved\_design\_id (FK, nullable for catalog products), size, color, quantity, unit\_price, created\_at.

**Order:** id, order\_number (human-readable, e.g., MOM-20260926-001), user\_id (FK, nullable for guest checkout), guest\_email, guest\_phone, shipping\_address (JSON snapshot), subtotal, delivery\_fee, discount, total, promo\_code\_id (FK, nullable), status (enum: paid, moderation, shirt\_acquired, printed, out\_for\_delivery, delivered, cancelled, refunded), paystack\_reference, paid\_at, status\_history (JSON array of {status, timestamp}), notes (admin notes), created\_at, updated\_at.

**OrderItem:** id, order\_id (FK), product\_id (FK, nullable), saved\_design\_id (FK, nullable), slogan\_text, size, color, quantity, unit\_price, design\_file\_url (for custom designs).

**Review:** id, product\_id (FK), user\_id (FK), order\_id (FK), rating (1-5), text (nullable), is\_verified, is\_visible, created\_at.

**PromoCode:** id, code (unique), discount\_type (percentage/flat), discount\_value, min\_order\_value (nullable), max\_uses (nullable), max\_uses\_per\_user, uses\_count, expires\_at (nullable), is\_active, created\_at.

**NewsletterSubscriber:** id, email (unique), is\_active, subscribed\_at, unsubscribed\_at.

## Tech Stack

**Frontend:** Next.js 14+ with App Router. TypeScript. Tailwind CSS for styling. Zustand for client state management (cart, UI state). React Query (TanStack Query) for server state and caching. HTML5 Canvas or Fabric.js for the custom design tool. Framer Motion for animations.

**Backend:** Django with Django REST Framework. Python 3.12+. This aligns with existing expertise and allows rapid development. Django's admin can serve as a quick-start admin panel while a custom React admin is built. Celery + Redis for async tasks (email sending, design file generation, webhook processing).

**Database:** PostgreSQL on Supabase (free tier provides 500MB, sufficient for MVP) or Railway. Redis for caching, session storage, and Celery broker.

**Storage:** Cloudinary (free tier: 25GB) or AWS S3 for product images, design files, and mockup renders. Design files (customer-generated PNGs/SVGs) stored with order references.

**Payments:** Paystack (standard integration). Paystack Inline for checkout popup. Webhook endpoint for payment verification and order creation. Test mode for development.

**Email:** Resend (free tier: 3,000 emails/month) or Brevo for transactional emails (order confirmations, status updates, password resets) and newsletter.

**WhatsApp Notifications:** WhatsApp Business API via a provider like Termii or Africa's Talking (Nigerian-friendly APIs), or a simple webhook to a WhatsApp bot for admin order alerts.

**Hosting:** Vercel for the Next.js frontend (free tier). Railway or Render for the Django backend (free or $5/month tier). Supabase for PostgreSQL.

**CI/CD:** GitHub Actions for automated testing and deployment.

**Monitoring:** Sentry for error tracking (free tier). Vercel Analytics for frontend performance.

## Non-Functional Requirements

**NFR-01: Mobile-First Design.** The storefront must be designed mobile-first, as the primary user base browses and shops on mobile devices. All features (including the custom design tool) must be fully functional on screens as narrow as 360px. Touch targets must be at least 44x44px.

**NFR-02: Performance.** Initial page load under 3 seconds on a 3G connection. Lighthouse performance score above 80. Images lazy-loaded and served in WebP format. Product grid uses virtual scrolling or pagination to avoid rendering hundreds of items at once.

**NFR-03: SEO.** The storefront uses server-side rendering (Next.js SSR/SSG) for all public pages (homepage, product pages, category pages). Each product page has unique meta tags (title, description, OG image). Structured data (JSON-LD) for products with pricing and reviews. Clean URL structure: /shop, /shop/philosophy, /product/war-bad-naps-good, /design.

**NFR-04: Security.** All traffic over HTTPS. Paystack integration follows PCI DSS compliance (handled by Paystack's tokenization). CSRF protection on all forms. Rate limiting on auth endpoints (login, registration, password reset) to prevent brute force. Input sanitization on all user-generated content (custom designs, reviews). Admin panel accessible only to authenticated admin users.

**NFR-05: Accessibility.** WCAG 2.1 AA compliance as a target. Semantic HTML throughout. Alt text on all product images. Keyboard navigation support. Sufficient color contrast ratios (the dark theme must be tested for readability).

**NFR-06: Scalability.** The MVP targets up to 1,000 concurrent users and 500 orders per month. The architecture should not require re-engineering to handle 10x that volume, but active optimization for scale is a Phase 2 concern.

**NFR-07: Data Backup.** Database backups daily (Supabase handles this on managed plans). Design files and product images backed up to a secondary storage location weekly.

## Out of Scope (Phase 2)

The following features are explicitly deferred to Phase 2 and should not be built for MVP:

- Multi-tenant platform (opening the storefront builder to other creators/brands)
- POD API integration (Printful, Printify, AfrPrint, or JaraPrint automated fulfillment)
- International shipping and multi-currency pricing
- Full canvas design editor (image uploads, layers, free-drag positioning, back-of-shirt designs)
- Inventory management system
- Shipping rate calculators and courier API integrations
- Abandoned cart email automation
- Referral/affiliate program
- Social media storefront integrations (Instagram Shop, TikTok Shop)
- Multi-language support
- A/B testing for product pages
- Subscription model (monthly shirt drops)
- Mobile app (native iOS/Android)
