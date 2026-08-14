-- ============================================================
-- Billiards & Snooker Association of Fiji — migrated historical content
--
-- Phase 5 of PROJECT_PLAN.md: the archive of
-- https://fijisnooker.wordpress.com/ (2009–2011), which was still
-- online when this was written, ported into the schema.
--
-- Run in the Supabase SQL editor AFTER schema.sql. Your Studio
-- login bypasses RLS, which is why this works — the app's anon key
-- deliberately cannot insert anything.
--
-- Safe to run more than once: every row carries a fixed UUID and
-- every insert ends in `on conflict (id) do nothing`. Re-running
-- will NOT overwrite edits you have made through the admin panel.
-- To reload a row from scratch, delete it first.
--
-- ------------------------------------------------------------
-- READ THIS BEFORE RUNNING — five judgement calls made here
-- ------------------------------------------------------------
--
-- 1. THE COMMITTEE IS LOADED AS PAST, NOT CURRENT. The only
--    committee on record is the one elected 2009-09-28. The 2011
--    AGM had "election of office bearers" on its agenda and the
--    blog never reported the result, so who held office after
--    2011-05-28 is unknown — and it is now 2026. Every committee
--    row therefore has term_end = 2011-05-28 and appears under
--    "Past office bearers". Add the real current committee through
--    the admin panel; do not simply clear these end dates.
--
-- 2. PERSONAL PHONE NUMBERS WERE NOT MIGRATED. The 2009 tournament
--    notice lists two mobile numbers for entry registration. They
--    are seventeen years old and were published for one weekend's
--    entries, not as standing contact details, so they are not
--    reproduced in committee_members. Add current contact details
--    yourself if the people concerned agree.
--
-- 3. TWO PLAYER AGES WERE DROPPED. The source gives Praneel Singh
--    as 23 and Sikeli Nawaqaliva as 37 — as of 2009 and 2011. The
--    `age` column is a current age, so copying those numbers across
--    would publish figures fifteen years stale. Both ages are noted
--    in the player's bio with the year they applied, and the `age`
--    column is left null.
--
-- 4. ONE TOURNAMENT DATE IS A PLACEHOLDER, MARKED BELOW. The 2nd
--    divisional tournament was reported on 2009-09-28 without the
--    dates it was actually played. Its start_date is set to the
--    report date so the record exists; correct it if you know it.
--    Every other date here is stated explicitly in the source.
--
-- 5. THE 2011 RESULTS HAVE NO FRAME SCORES. The source names the
--    winners but no scoreline survives, so those matches carry a
--    winner_id with null scores. The site renders them as decided
--    with "Frame score not recorded" — they count as wins and
--    losses but contribute no frames to the rankings.
-- ============================================================


-- ------------------------------------------------------------
-- CLUBS
-- ------------------------------------------------------------
insert into public.clubs (id, name) values
  ('11111111-1111-4111-8111-000000000001', 'Merchants Club'),
  ('11111111-1111-4111-8111-000000000002', 'Fiji Club'),
  ('11111111-1111-4111-8111-000000000003', 'Defence Club'),
  ('11111111-1111-4111-8111-000000000004', 'Union Club'),
  ('11111111-1111-4111-8111-000000000005', 'Nausori Club')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- PLAYERS
--
-- Everyone named as a competitor in the archive. Committee members
-- who never appear in a result (Ashneel Nand, Anup Kumar) are in
-- committee_members only — being an office bearer is not evidence
-- of having played.
--
-- Spelling note: the 2011 headline reads "Nawagaliva" but its body
-- reads "Nawaqaliva", which is the standard Fijian orthography. The
-- player record uses the q; the news post keeps the headline exactly
-- as it was published.
-- ------------------------------------------------------------
insert into public.players (id, name, age, club_id, bio) values
  ('22222222-2222-4222-8222-000000000001', 'Deepak Lal Bala', null,
   '11111111-1111-4111-8111-000000000001',
   'Five-time champion and the most decorated player in the archive. Won the North West Championship in Lautoka, the Southern Division Championship, the Champion of Champions series, and held the top national snooker ranking. Reported in 2010 as the only local player to have made a 107 break. Won the Southern Division Snooker Championship in January 2010 and was runner-up in the 2011 divisional tournament.'),

  ('22222222-2222-4222-8222-000000000002', 'Suman Lal', null,
   '11111111-1111-4111-8111-000000000001',
   'Made the highest break of the January 2010 Southern Division Championship — 58, in the third frame of his semi-final against Deepak Lal Bala.'),

  ('22222222-2222-4222-8222-000000000003', 'Jay Kalyan', null, null,
   'President of the Southern Division Billiards & Snooker Association from September 2009. Quarter-finalist at the January 2010 Southern Division Championship.'),

  ('22222222-2222-4222-8222-000000000004', 'Praneel Singh', null, null,
   'Runner-up in the 2nd Southern Snooker Championship and winner of the 3rd North West Open Snooker, both in 2009. Semi-finalist at the January 2010 Southern Division Championship, losing a deciding fifth frame to Deepak Jay Ram. Listed as 23 years old on the association''s 2009 player profile.'),

  ('22222222-2222-4222-8222-000000000005', 'Abid Ali', null, null,
   'Vice President of the association from September 2009. Quarter-finalist at the January 2010 Southern Division Championship.'),

  ('22222222-2222-4222-8222-000000000006', 'Deepak Jay Ram', null,
   '11111111-1111-4111-8111-000000000005',
   'Runner-up at the January 2010 Southern Division Championship, beaten 4–1 in the final by Deepak Lal Bala after knocking out defending champion Jiten Prasad and semi-finalist Praneel Singh.'),

  ('22222222-2222-4222-8222-000000000007', 'Jiten Prasad', null, null,
   'Defending champion going into the January 2010 Southern Division Championship, eliminated in the second round. Made the highest break of the 2nd divisional tournament in 2009 — 41.'),

  ('22222222-2222-4222-8222-000000000008', 'Sikeli Nawaqaliva', null, null,
   'Winner of the 2011 Carz and Carz Southern Division snooker tournament, beating Deepak Lal Bala in the final at Merchant Club after upsetting Suman Lal in the semi-finals and Yogen Prasad on the opening day. From Rewa, and reported as 37 years old at the time of the win.'),

  ('22222222-2222-4222-8222-000000000009', 'Yogen Prasad', null, null,
   'Beaten by eventual champion Sikeli Nawaqaliva on the opening day of the 2011 Carz and Carz divisional tournament.'),

  ('22222222-2222-4222-8222-000000000010', 'Pritesh', null, null,
   'Quarter-finalist at the January 2010 Southern Division Championship. Recorded in the source by first name only.'),

  ('22222222-2222-4222-8222-000000000011', 'Epeli Bua', null, null,
   'Named among the division''s notable players in 2010, absent from that January''s championship on personal commitments.'),

  ('22222222-2222-4222-8222-000000000012', 'Viliame Umu', null, null,
   'Named among the division''s notable players in 2010, absent from that January''s championship on personal commitments.')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- TOURNAMENTS
-- ------------------------------------------------------------
insert into public.tournaments (id, name, start_date, end_date, venue, format, status) values
  -- ⚠ PLACEHOLDER DATE. The report is dated 2009-09-28 and never says
  -- when this was played. Correct start_date if you know it.
  ('33333333-3333-4333-8333-000000000001', '2nd Southern Division Snooker Tournament',
   '2009-09-28', null, 'Suva', null, 'completed'),

  ('33333333-3333-4333-8333-000000000002', '3rd Southern Division Snooker Tournament',
   '2009-11-03', '2009-11-06', 'Merchants Club and Fiji Club, Suva',
   'Open entry, field of 32, $15 entry including financial membership', 'completed'),

  ('33333333-3333-4333-8333-000000000003', 'Southern Division Snooker Championship 2010',
   '2010-01-30', '2010-01-31', 'Merchants Club, Suva',
   'Best of five frames through the semi-finals, best of seven in the final', 'completed'),

  ('33333333-3333-4333-8333-000000000004', 'Carz and Carz Southern Division Snooker Tournament',
   '2011-06-06', null, 'Merchant Club, Suva', null, 'completed')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- TOURNAMENT ENTRIES
--
-- Only players the source actually places in a given tournament.
-- Thirty players entered the January 2010 championship; the report
-- names eight of them (seven quarter-finalists plus defending
-- champion Jiten Prasad, who went out in the second round). The
-- other twenty-two are not named anywhere, so they are not invented
-- here — this is who the source can place in the draw, not the full
-- field.
-- ------------------------------------------------------------
insert into public.tournament_entries (id, tournament_id, player_id, seed) values
  -- Southern Division Snooker Championship 2010
  ('55555555-5555-4555-8555-000000000001', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000001', null),
  ('55555555-5555-4555-8555-000000000002', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000002', null),
  ('55555555-5555-4555-8555-000000000003', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000003', null),
  ('55555555-5555-4555-8555-000000000004', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000004', null),
  ('55555555-5555-4555-8555-000000000005', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000005', null),
  ('55555555-5555-4555-8555-000000000006', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000006', null),
  ('55555555-5555-4555-8555-000000000007', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000010', null),
  ('55555555-5555-4555-8555-000000000008', '33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000007', null),

  -- Carz and Carz 2011
  ('55555555-5555-4555-8555-000000000011', '33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000008', null),
  ('55555555-5555-4555-8555-000000000012', '33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000001', null),
  ('55555555-5555-4555-8555-000000000013', '33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000002', null),
  ('55555555-5555-4555-8555-000000000014', '33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000009', null)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- MATCHES
--
-- Every result the archive records precisely enough to enter.
-- Quarter-final pairings from 2010 are not reproduced because the
-- source lists who advanced, not who played whom.
-- ------------------------------------------------------------
insert into public.matches
  (id, tournament_id, round, player1_id, player2_id, score1, score2, highest_break, winner_id, played_at) values

  -- Southern Division Snooker Championship 2010 — full scorelines survive.
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000003', 'Semi-final',
   '22222222-2222-4222-8222-000000000006', '22222222-2222-4222-8222-000000000004',
   3, 2, null, '22222222-2222-4222-8222-000000000006', '2010-01-31 19:00:00+12'),

  -- Suman Lal''s 58 came in the third frame of this match.
  ('44444444-4444-4444-8444-000000000002', '33333333-3333-4333-8333-000000000003', 'Semi-final',
   '22222222-2222-4222-8222-000000000001', '22222222-2222-4222-8222-000000000002',
   3, 2, 58, '22222222-2222-4222-8222-000000000001', '2010-01-31 19:00:00+12'),

  -- Bala led 3–0, Ram took the fourth, Bala closed it out in the fifth.
  ('44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000003', 'Final',
   '22222222-2222-4222-8222-000000000001', '22222222-2222-4222-8222-000000000006',
   4, 1, null, '22222222-2222-4222-8222-000000000001', '2010-01-31 21:00:00+12'),

  -- Carz and Carz 2011 — winners named, no frame scores anywhere in the source.
  ('44444444-4444-4444-8444-000000000011', '33333333-3333-4333-8333-000000000004', 'Opening round',
   '22222222-2222-4222-8222-000000000008', '22222222-2222-4222-8222-000000000009',
   null, null, null, '22222222-2222-4222-8222-000000000008', null),

  ('44444444-4444-4444-8444-000000000012', '33333333-3333-4333-8333-000000000004', 'Semi-final',
   '22222222-2222-4222-8222-000000000008', '22222222-2222-4222-8222-000000000002',
   null, null, null, '22222222-2222-4222-8222-000000000008', null),

  ('44444444-4444-4444-8444-000000000013', '33333333-3333-4333-8333-000000000004', 'Final',
   '22222222-2222-4222-8222-000000000008', '22222222-2222-4222-8222-000000000001',
   null, null, null, '22222222-2222-4222-8222-000000000008', '2011-06-06 20:00:00+12')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- COMMITTEE MEMBERS
--
-- Elected at the Special General Meeting of 2009-09-28, 19 members
-- present. term_end is set to the date of the 2011 AGM, which had
-- election of office bearers on its agenda — so this committee is
-- known to have held office up to that date and not beyond it.
-- See note 1 at the top of this file.
-- ------------------------------------------------------------
insert into public.committee_members (id, name, role, term_start, term_end) values
  ('66666666-6666-4666-8666-000000000001', 'Jay Kalyan',      'President',      '2009-09-28', '2011-05-28'),
  ('66666666-6666-4666-8666-000000000002', 'Abid Ali',        'Vice President', '2009-09-28', '2011-05-28'),
  ('66666666-6666-4666-8666-000000000003', 'Deepak Lal Bala', 'Vice President', '2009-09-28', '2011-05-28'),
  ('66666666-6666-4666-8666-000000000004', 'Ashneel Nand',    'Secretary',      '2009-09-28', '2011-05-28'),
  ('66666666-6666-4666-8666-000000000005', 'Anup Kumar',      'Treasurer',      '2009-09-28', '2011-05-28')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- EVENTS
--
-- Historical, so it sits in the past on the calendar rather than
-- under "upcoming". Kept because it is the association's only
-- recorded AGM.
-- ------------------------------------------------------------
insert into public.events (id, title, event_date, location, description) values
  ('88888888-8888-4888-8888-000000000001', '2011 Annual General Meeting', '2011-05-28',
   'Merchants Club, Suva',
   'Annual General Meeting of the Southern Division Billiards & Snooker Association, called for 9:30am. Agenda: election of office bearers, financial matters, general business. All financial members were asked to attend.')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- NEWS POSTS
--
-- The ten posts from the WordPress blog, newest first, with the
-- original publication dates and permalink slugs preserved so old
-- inbound links can be redirected if you ever want to.
--
-- Bodies are faithful retellings of the originals rather than
-- byte-for-byte copies — the source was recovered as rendered HTML,
-- so exact wording could not be guaranteed. Every name, date, score
-- and break below comes from the source. Each post ends with a link
-- to the original. Review and reword freely; this is your content.
-- ------------------------------------------------------------
insert into public.news_posts (id, title, slug, body, published_at) values

  ('77777777-7777-4777-8777-000000000001',
   'Nawagaliva crowned new Snooker Champion',
   'nawagaliva-crowned-new-snooker-champion',
   E'Sikeli Nawaqaliva is the new Southern Division snooker champion, beating tournament favourite Deepak Lal Bala in the final of the Carz and Carz Southern Division tournament at Merchant Club in Suva.\n\nNawaqaliva took the $400 winner''s cheque, with $200 going to Bala as runner-up.\n\nThe 37-year-old from Rewa was quick to give thanks after the win. "I just want to thank God for the win today (last night)," he said, adding that the match had been a hard one and that his family had kept him motivated.\n\nIt was not his first upset of the tournament. Nawaqaliva knocked out Suman Lal in the semi-finals, having already beaten Yogen Prasad on the opening day.\n\nHe said the win would give him a lift going into his campaign in the Nausori Snooker League.\n\n---\n\n*Originally published on the association''s blog, 7 June 2011: <https://fijisnooker.wordpress.com/2011/06/07/nawagaliva-crowned-new-snooker-champion/>*',
   '2011-06-07 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000002',
   '2011 AGM Notice — Southern Division',
   '2011-agm-notice-southern-division',
   E'The Southern Division Billiards & Snooker Association will hold its Annual General Meeting on **Saturday 28 May 2011 at 9:30am** at Merchants Club, Suva.\n\n**Agenda**\n\n1. Election of office bearers\n2. Financial matters\n3. General business\n\nAll financial members are requested to attend.\n\nSigned: Abid Ali, Deepak Lal Bala, Ashneel Nand, Anup Kumar.\n\n---\n\n*Originally published on the association''s blog, 18 May 2011: <https://fijisnooker.wordpress.com/2011/05/18/2011-agm-notice-southern-division/>*',
   '2011-05-18 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000003',
   'Deepak wins Snooker title',
   'deepak-wins-snooker-title',
   E'Deepak Lal Bala of Merchants Club has won the Southern Snooker Club Championship, beating Nausori''s Deepak Jay Ram in the final in Suva.\n\nIt is Bala''s fifth title overall and his fourth in the space of a year. His earlier wins include the North West Championship in Lautoka, the Southern Division Championship and the Champion of Champions series, and he currently holds the top national snooker ranking. He is also the only local player to have made a 107 break.\n\nDefending champion Jiten Prasad went out in the second round to Jay Ram. Suman Lal made the tournament''s highest break with 58.\n\nThe association expects to send seven of its top players to the Oceania Championship in Australia in March. Test matches against Papua New Guinea and other teams are set for 19 March, ahead of the official tournament starting on 24 March.\n\n---\n\n*Originally published on the association''s blog, 1 February 2010: <https://fijisnooker.wordpress.com/2010/02/01/deepak-wins-snooker-title/>*',
   '2010-02-01 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000004',
   'Deepak Bala wins',
   'deepak-bala-wins',
   E'The Southern Division Association tournament ran on 30 and 31 January 2010, hosted by Merchants Club with Fiji Club, Defence Club and Union Club as co-hosts. Thanks go to all four venues and their staff for supporting the event.\n\nThirty players from the Suva and Nausori areas took part, and the standard of play and of etiquette was high throughout. Spectators saw a number of breaks over 30, the best of them Suman Lal''s 58. Matches were played over the best of five frames, with players ranked according to previous tournaments. Epeli Bua and Viliame Umu were both absent on personal commitments.\n\nThe quarter-finalists were Deepak Bala, Suman Lal, Jay Kalyan, Praneel Singh, Abid Ali, Pritesh and Deepak J Ram.\n\nThe first semi-final went the full five frames, Deepak J Ram beating Praneel Singh. The second also went to five, Bala edging out Suman Lal — Suman making his 58 break in the third frame.\n\nThe final was played over the best of seven. Bala led 3–0 before Ram took the fourth, and Bala closed out the championship 4–1 in the fifth.\n\n**Results**\n\n- **Winner:** Deepak Bala (Merchants Club)\n- **Runner-up:** Deepak J Ram (Nausori Club)\n- **Losing semi-finalists:** Praneel Singh and Suman Lal (Merchants Club)\n- **Highest break:** Suman Lal, 58\n\n---\n\n*Originally published on the association''s blog, 31 January 2010: <https://fijisnooker.wordpress.com/2010/01/31/deepak-bala-wins/>*',
   '2010-01-31 22:00:00+12'),

  ('77777777-7777-4777-8777-000000000005',
   'Notice of 3rd Snooker tournament',
   'notice-of-3rd-snooker-tournament',
   E'The Southern Division Billiards & Snooker Association will hold its third tournament from **3 to 6 November 2009** at Merchants Club and Fiji Club in Suva, starting at 6pm each day with the finals on Friday evening.\n\nEntry is $15, which includes financial membership. There is room for 32 players, allocated on a first-paid basis.\n\nEntries close at 5pm on 2 November and should go to Jay Kalyan or Praneel Singh.\n\n---\n\n*Originally published on the association''s blog, 27 October 2009: <https://fijisnooker.wordpress.com/2009/10/27/southern-association-hosted-event-details/>*\n\n*(Registration phone numbers from the original notice have not been reproduced here.)*',
   '2009-10-27 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000006',
   'Nausori Club launches website',
   'nausori-club-launches-website',
   E'Congratulations to Nausori Club on the launch of their website at nausoriclub.com.fj. It is an informative site and well worth a look — we hope other clubs will follow their lead.\n\n---\n\n*Originally published on the association''s blog, 21 October 2009: <https://fijisnooker.wordpress.com/2009/10/21/nausori-club-launches-website/>*',
   '2009-10-21 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000007',
   '2010 Oceania Billiards & Snooker Championships',
   '2010-oceania-billiards-snooker-championships',
   E'The 2010 Oceania Billiards & Snooker Championships will be held from 20 to 29 March at Mt Pritchard Community Club in Sydney, Australia.\n\nTest matches between Australia and New Zealand, and between Papua New Guinea and Fiji, are scheduled for Saturday 20 March, with the opening ceremony that evening.\n\n---\n\n*Originally published on the association''s blog, 29 September 2009: <https://fijisnooker.wordpress.com/2009/09/29/2010-oceania-billiards-snooker-championships/>*',
   '2009-09-29 09:00:00+12'),

  ('77777777-7777-4777-8777-000000000008',
   '2nd Southern Division Tournament Report',
   '2nd-southern-division-tournament-report',
   E'Thirty players from Suva and Nausori took part in the association''s second tournament.\n\nThere were around six breaks over 30 and a good number over 20. Jiten Prasad made the highest of the tournament with 41.\n\n---\n\n*Originally published on the association''s blog, 28 September 2009: <https://fijisnooker.wordpress.com/2009/09/28/2nd-southern-division-tournament-report-2/>*',
   '2009-09-28 12:00:00+12'),

  ('77777777-7777-4777-8777-000000000009',
   'Southern Division Snooker Association Committee',
   'southern-division-snooker-association-committee',
   E'A Special General Meeting was held at Fiji Club with 19 members present. The following office bearers were elected:\n\n| Office | Elected |\n| --- | --- |\n| President | Jay Kalyan |\n| Vice President | Abid Ali |\n| Vice President | Deepak Bala |\n| Secretary | Ashneel Nand |\n| Treasurer | Anup Kumar |\n\n---\n\n*Originally published on the association''s blog, 28 September 2009: <https://fijisnooker.wordpress.com/2009/09/28/southern-division-snooker-association-committee/>*',
   '2009-09-28 10:00:00+12'),

  ('77777777-7777-4777-8777-000000000010',
   'Welcome to the website of the Southern Snooker Association',
   'welcome',
   E'Welcome to the website of the Southern Division Billiards & Snooker Association.\n\nHere you will find news and updates, results from local events, and player rankings.\n\n---\n\n*Originally published on the association''s blog, 27 September 2009: <https://fijisnooker.wordpress.com/2009/09/27/welcome/>*',
   '2009-09-27 09:00:00+12')

on conflict (id) do nothing;


-- ------------------------------------------------------------
-- WHAT YOU SHOULD SEE AFTERWARDS
--
--   clubs               5
--   players            12
--   tournaments         4
--   tournament_entries 12
--   matches             6
--   committee_members   5  (all shown as past office bearers)
--   events              1
--   news_posts         10
--
-- Run this to confirm:
-- ------------------------------------------------------------
-- select 'clubs' as table_name, count(*) from public.clubs
-- union all select 'players',            count(*) from public.players
-- union all select 'tournaments',        count(*) from public.tournaments
-- union all select 'tournament_entries', count(*) from public.tournament_entries
-- union all select 'matches',            count(*) from public.matches
-- union all select 'committee_members',  count(*) from public.committee_members
-- union all select 'events',             count(*) from public.events
-- union all select 'news_posts',         count(*) from public.news_posts;
