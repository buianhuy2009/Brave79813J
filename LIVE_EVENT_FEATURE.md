# Live Tournament & Scouting Feature Specification

This document records the design specification and API request submission details for integrating real-time VEX Events data into **Level Up VEX IQ Calculator Online**.

---

## 1. Project Information & Links
* **Live Web App:** https://brave79813j.vercel.app
* **GitHub Repository:** https://github.com/buianhuy2009/Brave79813J
* **Team:** Brave 79813J (Vinschool Times City & Ngôi Sao Hoàng Mai, Hanoi, Vietnam)
* **Contact:** `buianhuy2009@gmail.com`
* **Target Game:** VEX IQ Robotics Competition (VIQRC) – *Level Up* (2026–2027)

---

## 2. Feature Overview & Scope

### Target Problem
At tournaments, teams and mentors keep laptops open in pit areas for strategy, match planning, and timer tracking. VEX Via is mobile-only, and browsing `events.vex.com` during busy tournament days can be clunky. Integrating tournament data directly into the desktop calculator creates an all-in-one pit station.

### Core Capabilities
1. **Event Discovery & Default Vietnam Pull:**
   * On initial site load, lightweight metadata for currently active VEX IQ events is fetched.
   * If any events in Vietnam are currently running, their data is automatically pulled by default (since the primary user base is Vietnamese teams).
   * Users can select and view any other active VEX IQ event worldwide. Full match and ranking details are fetched on demand when an event is selected.

2. **Match & Queue Tracking:**
   * Shows the current active match on the field and upcoming scheduled matches.
   * Alerts teams when their match is approaching so they know when to leave the practice fields for the queueing area.

3. **Live Standings:**
   * Live division qualification rankings, win-loss records, and points.
   * Live skills rankings (Driver + Autonomous Coding).

4. **Team Scouting & Analytics (LemonVEX-Style):**
   * **Mean OPR:** Measures a team's scoring contribution in teamwork matches.
   * **Skills Breakdown:** Driver vs. programming split bar chart, along with Global (# World) and Country skills rankings.
   * **Season Progression:** Historical trends showing scores and placements across tournaments over the season.
   * **Radar / Spider Chart:** Multi-axis profile comparing a team's stats against the tournament average/median.

---

## 3. Rate Limiting & Polling Architecture

To respect VEX API rate limits and avoid unnecessary server load:
* **Scope:** Restricted strictly to VEX IQ (VIQRC).
* **On-Demand Only:** Requests are only made when an active user is browsing an event. No 24/7 background scraping.
* **Smart Polling Loop:** While an active user is on an event page, data refreshes every 30–60 seconds.
* **15-Minute Inactivity Cutoff:** Polling automatically halts if the user leaves the tab or remains inactive for longer than 15 minutes.
* **Server-Side Edge Caching:** Requests pass through a lightweight backend proxy (e.g., Vercel Serverless Function) with a 30–60s shared cache header (`Cache-Control: s-maxage=30, stale-while-revalidate`), so multiple visitors viewing the same competition share a single upstream API call.

---

## 4. Official API Request Text (Submitted to RobotEvents)

```text
Hi,
I'm Huy from VEX IQ team Brave 79813J in Hanoi, Vietnam.

I made a web scoring calculator and match timer for this season's Level Up game:

Website: https://brave79813j.vercel.app
Code: https://github.com/buianhuy2009/Brave79813J

A lot of teams here use laptops in the pit instead of phones, so VEX Via isn't very convenient, and checking the events website on a browser during a tournament is pretty clunky. Since teams are already using our calculator on their laptops between matches, I want to add a live tournament tab so they can see everything on one screen.

This will only be for VEX IQ. When the site loads, it just grabs a basic list of ongoing events (Vietnam events, if currently running, will be completely pulled though since most of our users are Vietnamese, but you can click on any event). It only pulls the full match and ranking data when someone actually opens an event.

Here's what I'm adding:
- Current match on field and upcoming schedule so teams don't miss queueing.
- Live rankings and skills standings during the day.
- Team stats: mean OPR, driver vs. programming skills bars, and season score trends, some rankings such as top # Global Skills.
- A radar chart comparing a team against the event average.

To keep API traffic low, while a user is looking at an event, it refreshes every 30–60 seconds, but it automatically stops pulling if they leave the website for more than 15 minutes. We'll also cache responses on our server so multiple people checking the same event share the same data and don't spam requests.

This is completely non-commercial and free for any team to use.

Thanks!
Huy (Team Brave 79813J)

P/S: If you need to contact me then please contact this email buianhuy2009@gmail.com.
```
