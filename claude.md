  Overview

  "OA Football" (Olney Acres Football) is a Next.js-based web application for
  running an NFL survivor pool with a 3-lives system.

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
  - Schedule Sync - Button to sync schedule with latest game times
  - Process Missed Picks - Manually trigger retroactive penalty for missed picks

  Database Structure (consolidated_schema.sql:1)

  Key tables:
  - users - Email, display name, admin status
  - teams - All 32 NFL teams with conference/division data
  - pools - Pool configuration (3 starting lives, current week)
  - players - Users in the pool with lives remaining & elimination status
  - games - Complete 2025 NFL schedule (272 games, weeks 1-18)
  - picks - Player selections with win/loss tracking
  - magic_link_tokens - Passwordless authentication tokens

  Game Rules

  - Everyone starts with 3 lives
  - Pick one team per week to win their game
  - Can only pick each team once per season
  - Lose a life if your team loses that week
  - Lose a life if you forget to make a pick for a week (automatic penalty)
  - Get eliminated when you run out of lives

  Technology Stack

  - Next.js 15 with App Router
  - React 19 (TypeScript)
  - Supabase for database and authentication
  - Tailwind CSS for styling
  - Resend for sending magic link emails
  - Runs on port 3001 (package.json:6)

  Key Functionality

  - Automatic life deduction when games are marked complete
  - Automatic penalty for missed picks (retroactive):
    * Players who forget to make a pick automatically lose a life
    * Checked automatically when players load the main page
    * Can be manually triggered from admin panel
    * Retroactively applies to all past weeks
  - Prevents picking the same team twice (database trigger)
  - Automatic calculation of current NFL week based on dates
  - Real-time leaderboard updates
  - Mobile-responsive design

  The site is currently set up for the 2025 NFL season with the default admin
  being isaacmray1984@gmail.com.