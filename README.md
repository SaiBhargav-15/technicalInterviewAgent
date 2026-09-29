<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e290c235-4730-4998-bb83-e6ed5a54ade2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Recruiter Access

Recruiter access is restricted to the exact addresses listed in `config/recruiter-allowlist.json`. Add approved addresses to its `allowedEmails` array; every address must use the `@chryselys.com` domain. The checked-in list is empty, so recruiter sign-in is denied until approved addresses are added. The server reads this file on each recruiter login.

## Candidate Assessment Invitations

Recruiters create a role-bound assessment invitation for the candidate. Links expire 24 hours after creation and can claim one assessment session; that session can be resumed until its assessment deadline. The link is a bearer credential, so share it only with the intended candidate. Candidate OTP verification has been removed. Data Engineering invitations remain unavailable until the third topic question bank is added.
