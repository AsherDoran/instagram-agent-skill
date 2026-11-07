# Setting up the Instagram Graph API

Goal: let the dashboard read your Instagram followers and views automatically.
Heads-up: Meta changes these screens and names fairly often. If something below doesn't match,
the concepts stay the same; the official docs are at <https://developers.facebook.com/docs/instagram-platform>.

## What you need first (5 min)

- An Instagram **Business or Creator** account (Instagram app: Settings > Account type and tools >
  Switch to professional account). Personal accounts can't use the API.
- A **Facebook account** and a Facebook **Page**. For the older "Instagram API with Facebook Login" route
  the Instagram account must be linked to that Page (Page settings > Linked accounts > Instagram).

## Which route? Pick one

| | Instagram API with Instagram Login (newer) | Instagram API with Facebook Login |
|---|---|---|
| Needs a Facebook Page | No | Yes |
| Sign-in | Instagram username/password | Facebook login |
| Insights (views, followers) | Yes | Yes |

For a personal dashboard, **Instagram Login** is simpler. Steps below use it.

## Steps

1. **Create a developer account.** <https://developers.facebook.com> > Get started, log in with Facebook,
   verify your phone/email.
2. **Create an app.** My Apps > Create app > use case **Other** > type **Business** > name it
   ("My Dashboard") > Create.
3. **Add the Instagram product.** In the app dashboard, Add product > **Instagram** > set up
   *Instagram API with Instagram login*.
4. **Add yourself as a tester.** App roles > Roles > Instagram Testers > add your Instagram username.
   Then accept the invite in the Instagram app (Settings > Website permissions > Apps and websites >
   Tester invites). While the app is in **Development mode**, only you (and testers) can use it, which is
   exactly what you want. You do **not** need App Review for your own account.
5. **Generate a token.** In Instagram > API setup with Instagram login > **Generate token** next to your
   account, log in, and approve the permissions `instagram_business_basic` and
   `instagram_business_manage_insights`. Copy the token.
6. **Make it long-lived (60 days).** The token from step 5 expires in about 1 hour unless you exchange it:
   ```
   curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=APP_SECRET&access_token=SHORT_TOKEN"
   ```
   `APP_SECRET` is in App settings > Basic. Refresh the long token before day 60:
   ```
   curl "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=LONG_TOKEN"
   ```
7. **Test it.** Followers:
   ```
   curl "https://graph.instagram.com/v21.0/me?fields=username,followers_count&access_token=LONG_TOKEN"
   ```
   Views for the last days (account-level insights; metric names change between versions, check the docs):
   ```
   curl "https://graph.instagram.com/v21.0/me/insights?metric=views&period=day&access_token=LONG_TOKEN"
   ```
   Your recent posts, to find a top one:
   ```
   curl "https://graph.instagram.com/v21.0/me/media?fields=caption,permalink,like_count,timestamp&access_token=LONG_TOKEN"
   ```
8. **Store it.** Put the token in `dashboard/.env.local` as `INSTAGRAM_ACCESS_TOKEN=...`. Never commit it.

## Gotchas

- Insights need at least ~100 followers for some metrics, and only cover a recent window.
- Tokens expire (60 days). Put a reminder in your calendar to refresh.
- Follower history isn't available; the API gives today's count only, so the dashboard keeps its own daily log
  (that's what you're already doing).
- Rate limits are generous for one account.

## Next step (not built yet)

Once `curl` in step 7 returns your numbers, an `app/api/instagram/sync/route.ts` mirroring the YouTube
one is ~40 lines. Tell me when step 7 works and I'll add an "Sync Instagram" button.
