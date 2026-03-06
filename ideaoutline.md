Updated succinct outline
Product concept
Build an AI outreach assistant for LinkedIn networking that helps users generate personalized coffee chat messages directly while browsing profiles, and automatically tracks outreach activity in a companion web app.
The product has two main parts:
a browser extension that works on LinkedIn profile pages


a web app that stores the user profile, generated drafts, and outreach history


The goal is to reduce the time it takes to research prospects, write outreach messages, and keep track of who has already been contacted.

Core product flow
1. User creates an account
The user signs up on the website and fills out a reusable profile with:
school, degree, graduation year


work experience


recruiting goals


industries / roles of interest


preferred tone


details to emphasize in outreach


This profile is used as persistent context for message generation.
2. User browses LinkedIn normally
The user visits a LinkedIn profile they may want to contact.
Instead of copying the URL into a separate app, they use the browser extension.
3. Extension captures the profile
The extension detects the LinkedIn profile URL and sends it to your backend.
Your backend then:
calls the Apify LinkedIn profile scraper


retrieves enriched profile data


normalizes and stores the prospect record


This may include:
name


headline


company


education


work history


location


skills


4. AI generates outreach instantly
Using:
the user’s saved profile/goals


the enriched recipient profile


the LLM generates:
a short LinkedIn coffee chat message


optionally an internal note explaining the personalization angle


5. Extension displays the draft on the page
The extension shows the generated draft in a side panel on the LinkedIn page, with:
recipient summary


LinkedIn message


copy button


regenerate / edit options


The user then manually pastes the message into LinkedIn.
6. Outreach activity is logged automatically or semi-manually
After using the extension, the system creates or updates a prospect record in the web app.
The user can mark statuses such as:
draft generated


sent on LinkedIn


skipped


follow-up needed


replied


This creates a lightweight outreach tracker.
7. Website acts as the outreach dashboard
The companion web app lets the user:
view all prospects they have interacted with


see generated messages


check contact status


manage and update their personal outreach profile


So the extension is the action layer, and the website is the tracking and management layer.

Base system design
Browser extension
Responsible for:
detecting LinkedIn profile pages


extracting the current profile URL


sending the URL to your backend


showing the generated draft in a side panel


allowing copy / regenerate / basic edit actions


optionally logging when the user marks something as sent


Web app
Responsible for:
account creation and login


storing the user’s reusable profile


showing prospect history


displaying outreach statuses


letting users review and manage all prior drafts


Backend
Responsible for:
receiving profile requests from the extension


calling the Apify Actor


normalizing enriched profile data


storing prospect and outreach records


calling the LLM


returning generated message drafts to the extension and web app


Database
At minimum, store:
User


User profile/preferences


Prospect


Generated draft


Outreach activity / status



MVP scope
Keep the first version narrow:
user account


saved user context/profile


Chrome extension for LinkedIn profile pages


Apify enrichment from detected profile URL


AI-generated LinkedIn drafts


copy-to-clipboard in the extension


basic outreach logging


web dashboard showing all contacted prospects and statuses


That is a real MVP.

Why this version is stronger
Compared with the original dashboard-first approach, this version is better because:
it removes manual URL copy-paste friction


it meets the user exactly where the workflow happens


it makes generation feel instant and contextual


it still preserves a central database and outreach tracker


It feels more like a real product and less like a utility script.

Minimal future additions
Later, you could add:
follow-up draft generation


prospect prioritization


suggested best outreach angle


reminders for unanswered outreach


email draft generation + send integrations (optional)



How hard this is to build
Short answer
Moderately hard, but very buildable if you already have the local proof of concept working.
The difficulty depends on whether you mean:
core MVP with extension + dashboard
 or


polished production product


Those are very different levels of effort.
What is easy
Since your local pipeline already works, the core value engine is validated:
Apify enrichment


LLM draft generation


personalization logic


That is the hardest product-risk question, and you already de-risked it.
What adds complexity
The new complexity is mostly product engineering, not AI:
1. Browser extension
The extension is very doable, but it adds:
extension architecture


LinkedIn page detection


auth between extension and backend


side panel UI


handling page changes cleanly


This is not conceptually hard, but it adds a meaningful layer of implementation work.
2. User accounts + persistence
Once you add accounts, you now need:
auth


per-user storage


saved profile context


secure API calls


user-level record ownership


Again, standard web app work, but definitely more than a quick prototype.
3. Reliable logging and syncing
If the extension is supposed to update the website automatically, you need a clean event model:
draft generated


copied


marked sent


status updated


That is manageable, but you need to design it intentionally.
What makes it very feasible
This is still much easier than products that require:
sending messages automatically


LinkedIn automation at scale


complicated scraping infrastructure of your own


inbox integrations


analytics pipelines


collaborative multi-user features


You are keeping the MVP in a good place:
manual sending


extension-assisted drafting


lightweight CRM/tracker


clear backend workflow


That is the right amount.
My practical assessment
If you are a competent builder and already have the local prototype working:
basic extension + backend + simple dashboard MVP: very achievable


clean polished product people would happily pay for: noticeably harder, but still realistic


full production-grade tool with strong UX, auth, billing, retries, edge cases: significantly more work


So I would frame it like this:
The core product is not too hard. The main lift is turning a working pipeline into a usable extension-backed application with accounts and tracking.
That is very different from “hard because the AI is hard.”
 In your case, the AI part is already the easy part now.
My recommendation
Build in this order:
wrap your current proof of concept in a backend API


build the web app for auth + stored user profile + prospect history


build the extension as the thin frontend that calls that backend


keep manual sending and simple statuses only


That gives you the cleanest path to an MVP without overbuilding.

