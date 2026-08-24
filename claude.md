  Overview

  "OA Football" (Olney Acres Football) is a Next.js-based web application for
  running an NFL survivor pool with a 4-lives system.

  Core Features

  Authentication

  - Magic link login - Passwordless authentication via email
  (app/login/page.tsx:1)
  - Users receive a login link in their email to sign in
  - Case-insensitive email handling for login

  Main Application (app/page.tsx:1)

  Players see:
  - Team Picker - Select an NFL team to win each week
  - Weekly Schedule - View all games for the current week
  - Leaderboard - See all players' lives remaining and elimination status
  - Pick History - View their own past picks and results
  - Pool Rules - Game rules display

  All Picks Page (app/all-picks/page.tsx:1)

  A comprehensive view showing:
  - All players' picks across all weeks
  - Filter by active/eliminated players
  - Filter by specific weeks or view all weeks
  - Toggle between viewing weekly picks, remaining teams, or used teams
  - Visual indicators for won/lost/pending picks

  Admin Panel (app/admin/page.tsx:1)

  Three main management tabs:
  1. Game Results - Set winners for completed games across all 18 weeks
  2. User Management - Create new users and view existing players
  3. Pick Management - Manually add picks for any player

  Admin Tools:
  - Schedule Sync - Button to sync the schedule with latest game times
    (POST /api/admin/sync-schedule?season=YYYY, sourced from ESPN)

  Database Structure (consolidated_schema.sql:1)

  Key tables:
  - users - Email, display name, admin status
  - teams - All 32 NFL teams with conference/division data
  - pools - Pool configuration (starting lives, current week, season)
  - players - Users in the pool with lives remaining & elimination status
  - games - NFL schedule per season (272 games, weeks 1-18)
  - picks - Player selections with win/loss tracking
  - magic_link_tokens - Passwordless authentication tokens

  Game Rules

  - Everyone starts with 4 lives (pools.starting_lives)
  - Pick one team per week to win their game
  - Can only pick each team once per season
  - Lose a life if your team loses that week
  - Lose a life if you forget to make a pick for a week (once that week has
    fully finished; never for weeks that started before you joined)
  - A tie counts as a loss
  - A team leaves your pickable list the moment its own game kicks off, so a
    Wednesday opener locks those two teams while the Sunday 1pm wave stays
    open until 1pm ET
  - Get eliminated when you run out of lives

  Technology Stack

  - Next.js 15 with App Router
  - React 19 (TypeScript)
  - Supabase for database and authentication
  - Tailwind CSS for styling
  - Resend for sending magic link emails
  - Runs on port 3001 (package.json:6)

  Key Functionality

  - Weekly scoring job (app/api/admin/score-week/route.ts:1). No auth; intended
    to run every Tuesday morning, but safe to call at any time:
    * Pulls final scores from ESPN's public scoreboard (no API key)
    * Sets each game's winner and score, marks every pick right or wrong
    * Recomputes remaining lives, including the penalty for missed picks
    * With no ?week= it settles every week still holding unfinished games, so
      a missed run costs nothing
  - Lives are DERIVED, never incremented: a player's total is always
    starting_lives minus counted losses (app/lib/scoreWeeks.ts:1). Re-running
    is a no-op and a corrected result self-heals. recomputeSeason() is the one
    place lives are decided - the admin's manual winner override goes through
    it too, so manual and automated scoring can never disagree.
  - House rules (tie = loss, missed pick = loss) are named constants at the top
    of app/lib/scoreWeeks.ts
  - Prevents picking the same team twice (database trigger)
  - Current season and week are derived from the Labor Day kickoff rule
    (app/lib/season.ts:1) - no hardcoded calendar
  - Real-time leaderboard updates
  - Mobile-responsive design

  Seasons

  A season is contained by its pool: pools.season names the year, players
  belong to a pool, and picks belong to a player - so scoring one season cannot
  disturb another. To start a new season: run add_season_support.sql, create
  that season's pool and players, then POST /api/admin/sync-schedule?season=YYYY.

  Admin access is the ADMIN_EMAILS allowlist in app/lib/simpleAuth.ts; the
  default admin is isaacmray1984@gmail.com.