-- Seed all mock leads into CT Denver SE org
-- Safe to re-run: ON CONFLICT DO NOTHING

INSERT INTO leads (
  id, created_at, name, phone, email, address, zip_code,
  what_they_need, status, notes, square_footage, density,
  item_quality_score, job_type, lead_source,
  consult_at, project_start, project_end, crew_size,
  organization_id
) VALUES
(
  gen_random_uuid(), '2026-03-15T10:30:00Z',
  'Margaret Holloway', '(860) 554-2317', 'mholloway@gmail.com',
  '142 Elm Ridge Rd, Glastonbury, CT 06033', '06033',
  'Full estate cleanout after passing of husband. 4BR colonial, 40+ years of belongings. Some antiques and jewelry noted. Family would like auction items curated.',
  'New Lead', 'Spoke with daughter Karen. Very motivated, wants it done within 6 weeks.',
  2800, 'High', 8, 'Both', 'Referral',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-03-18T14:00:00Z',
  'Dennis Kowalski', '(203) 771-8840', 'dkowalski@yahoo.com',
  '87 Birchwood Dr, Shelton, CT 06484', '06484',
  'Moving to assisted living. Needs full cleanout of split-level home. Some furniture could go to auction. Two-car garage packed with tools.',
  'Contacted', 'Left voicemail 3/19. Emailed same day. Called back 3/20, very friendly.',
  1950, 'Medium', 6, 'Both', 'Senior Living Community',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-03-10T09:15:00Z',
  'Patricia Fenwick', '(860) 233-6612', 'pfenwick@comcast.net',
  '311 Prospect Ave, West Hartford, CT 06107', '06107',
  'Estate sale + cleanout. Large Tudor with Victorian furniture, silverware, art. Executor of estate, sibling dispute — wants fast professional.',
  'In Talks', 'Very motivated. Competing quote from another company. Emphasize our auction network reach.',
  3400, 'High', 9, 'Both', 'Realtor',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-03-05T11:00:00Z',
  'Robert Tanner', '(203) 445-9201', 'bob.tanner@gmail.com',
  '58 Meadow Lane, Trumbull, CT 06611', '06611',
  'Clean out of late mother''s ranch house. No auction items, just a straight cleanout. Wants it done before listing the house.',
  'Consult Scheduled', 'Consult booked for 4/22 at 10am. Realtor referred — Carol Simms from William Raveis.',
  1400, 'Medium', 4, 'Clean Out', 'Realtor',
  '2026-04-22T10:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-02-28T13:30:00Z',
  'Evelyn Marchetti', '(860) 678-4455', 'evelynm@hotmail.com',
  '920 Farmington Ave, Farmington, CT 06032', '06032',
  'Downsizing from 4BR to condo. Large collection of antiques and mid-century furniture. Wants auction maximized, rest cleaned out.',
  'Consult Completed', 'Walked through 4/10. Very organized. Antiques are legit — Tiffany lamp, Stickley chairs. Deal score should be high.',
  2600, 'Medium', 9, 'Both', 'Google',
  '2026-04-10T14:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-02-20T10:00:00Z',
  'Gerald Hutchinson', '(860) 344-8872', 'ghutchinson@sbcglobal.net',
  '14 Ridgecrest Blvd, Middletown, CT 06457', '06457',
  'Clean out garage and basement after estate settlement. No auction. Family keeping furniture. Just hauling old stuff.',
  'Estimate Sent', 'Estimate sent 4/14 for $7,200. Waiting on reply. Lower-end job but quick turnaround.',
  1200, 'Low', 3, 'Clean Out', 'Google',
  '2026-04-12T09:00:00Z', NULL, NULL, 3,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-02-14T16:00:00Z',
  'Dorothy Callahan', '(203) 929-7123', 'doricallahan@gmail.com',
  '266 Post Rd, Orange, CT 06477', '06477',
  'Full estate — auction + cleanout. Victorian home, 5 bedrooms, heirloom quality furniture and art. One of the kids lives out of state.',
  'Project Accepted', 'Signed contract 4/16. Confirmed budget $18,500. Project start TBD pending scheduling.',
  3800, 'High', 9, 'Both', 'Referral',
  '2026-04-08T11:00:00Z', '2026-05-05', '2026-05-07', 5,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-02-01T09:00:00Z',
  'Frank Deluca', '(860) 242-3390', 'frankdeluca59@gmail.com',
  '77 Cedar Hill Ave, Newington, CT 06111', '06111',
  'Clean out of storage unit and small home after dad passed. No auction. Just needs it cleared.',
  'Project Scheduled', 'Scheduled for 4/28–4/29. Crew of 3. Confirmed with client.',
  1100, 'Medium', 3, 'Clean Out', 'Staff Referral',
  '2026-04-18T10:00:00Z', '2026-04-28', '2026-04-29', 3,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-01-20T14:00:00Z',
  'Estate of Harold Briggs', '(860) 523-4461', 'briggsestate@outlook.com',
  '39 Sunset Terrace, West Hartford, CT 06119', '06119',
  'Large estate auction and full cleanout. Attorney-referred. 3,200 sqft colonial with significant art, jewelry, and antique furniture. High-value items.',
  'Won', 'Completed 3/15. Auction grossed $42k. Cleanout wrapped in 2 days. Client very happy. Referred us to neighbor.',
  3200, 'High', 10, 'Both', 'Referral',
  '2026-02-28T10:00:00Z', '2026-03-12', '2026-03-15', 5,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-01-10T11:30:00Z',
  'Susan Albright', '(203) 386-7744', 'salbright@gmail.com',
  '104 Maple St, Milford, CT 06460', '06460',
  'Cleanout of townhouse rental. Tenant left behind a lot. No auction value.',
  'Won', 'Completed 2/20. Fast job, 1.5 days. Good client, has 3 more rental properties.',
  1600, 'Medium', 2, 'Clean Out', 'Google',
  '2026-02-10T14:00:00Z', '2026-02-19', '2026-02-20', 3,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-03-22T10:00:00Z',
  'Carl Vickers', '(860) 812-5533', 'cvickers@aol.com',
  '550 Wethersfield Ave, Hartford, CT 06114', '06114',
  'Auction only — family handling cleanout themselves. Good mid-century furniture and vintage collectibles.',
  'Lost', 'Went with Consign It auction house. Price shopped — we were $800 higher. Worth noting for future pricing in 06114 area.',
  1800, 'Medium', 7, 'Auction', 'Google',
  '2026-04-01T09:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-03-28T15:00:00Z',
  'Janet Ostrowski', '(203) 688-4020', 'j.ostrowski@yahoo.com',
  '18 Orchard Hill Rd, Naugatuck, CT 06770', '06770',
  'Full estate cleanout. Modest home, mostly donation-level items. No auction interest.',
  'Lost', 'Client decided to have family handle it. Not budget-related — just a change of plan.',
  1300, 'Low', 2, 'Clean Out', 'Google',
  '2026-04-05T13:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-01T09:00:00Z',
  'Thomas Reardon', '(860) 677-9980', 'treardon@gmail.com',
  '29 Heritage Ln, Simsbury, CT 06070', '06070',
  'Estate of late wife. Wants to sell the house but not ready yet. Looking to do a partial cleanout and auction over the summer.',
  'Backlog', 'Not ready to move forward until June. Follow up 5/15.',
  2400, 'Medium', 7, 'Both', 'Referral',
  '2026-04-14T10:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-05T13:00:00Z',
  'Beverly Sampson', '(203) 874-2201', 'bev.sampson@gmail.com',
  '73 Soundview Ave, Milford, CT 06460', '06460',
  'Cleanout and auction prep for move to Florida. Nice coastal cottage, good quality furniture. Flexible timeline.',
  'Backlog', 'Moving date not set yet. She''ll call us when ready. Very warm lead — referral from Susan Albright.',
  1700, 'Medium', 8, 'Both', 'Referral',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-08T10:30:00Z',
  'Walter Pemberton', '(860) 445-6610', 'waltpemberton@gmail.com',
  '202 Thames St, Groton, CT 06340', '06340',
  'Auction of antique tool collection and maritime collectibles. Cleanout of workshop. No regular furniture.',
  'New Lead', 'Inbound call. Very specific about the tool collection being high value. Worth a scout visit.',
  900, 'High', 8, 'Both', 'Google',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-10T08:00:00Z',
  'Helen Kramer', '(203) 261-5577', 'helen.kramer@comcast.net',
  '410 Main St S, Woodbury, CT 06798', '06798',
  'Full house estate cleanout. Old antique dealer''s home — decades of inventory mixed in. Potential for significant auction value.',
  'Contacted', 'Initial call went great. Sending intro email with service overview. Scheduling consult for next week.',
  2900, 'High', 9, 'Both', 'Referral',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-12T11:00:00Z',
  'Raymond Costa', '(860) 569-8843', 'rcosta@gmail.com',
  '88 Reservoir Rd, Glastonbury, CT 06033', '06033',
  'Clean out of basement and detached garage. Some furniture for auction. Quick job, house already listed.',
  'In Talks', 'Realtor pushing hard for a start date. Need to match schedule with their open house prep.',
  1500, 'Medium', 5, 'Both', 'Realtor',
  NULL, NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
),
(
  gen_random_uuid(), '2026-04-14T14:30:00Z',
  'Nancy Fitzgerald', '(860) 721-3300', 'nancyfitz@outlook.com',
  '35 Buckingham St, Glastonbury, CT 06033', '06033',
  'Full estate of grandmother. Large cape cod, well-furnished. Family spread across country. Need professional to handle everything.',
  'Consult Scheduled', 'Consult 4/24 at 2pm with daughter Sarah on-site. Attorney contact is James Brophy 860-555-0112.',
  2200, 'High', 8, 'Both', 'Referral',
  '2026-04-24T14:00:00Z', NULL, NULL, NULL,
  'a0000000-0000-0000-0000-000000000001'
);
