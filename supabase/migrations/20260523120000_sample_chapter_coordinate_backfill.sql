-- Backfill sample chapter rows with map-ready coordinates.
--
-- Some environments may have migrations applied without the seed file, or may
-- have older sample rows from before map coordinates were required. Keep these
-- rows idempotent by matching the public invite codes used in seed.sql.

insert into public.chapters (
  name,
  country,
  region,
  invite_code,
  latitude,
  longitude,
  is_public,
  join_policy,
  public_join_enabled,
  description,
  meeting_location,
  meeting_day
)
values
  (
    'Santa Barbara Builders',
    'United States',
    'Santa Barbara, CA',
    'BLOKE-SBCA',
    34.4208,
    -119.6982,
    true,
    'open',
    true,
    'A coastal chapter focused on discipline, honest accountability, and steady weekly action.',
    'Downtown community room',
    'Tuesday'
  ),
  (
    'Los Angeles Westside',
    'United States',
    'Los Angeles, CA',
    'BLOKE-LAXW',
    34.0522,
    -118.2437,
    true,
    'request',
    false,
    'A warm, high-standard chapter for young men building purpose in the city.',
    'Westside recreation center',
    'Saturday'
  ),
  (
    'Mbabane Brotherhood',
    'Eswatini',
    'Mbabane',
    'BLOKE-SWAZ',
    -26.3054,
    31.1367,
    true,
    'invite_code',
    false,
    'A chapter for consistent action, brotherhood, and local leadership development.',
    'Facilitator confirmed weekly',
    'Thursday'
  ),
  (
    'Nairobi Builders',
    'Kenya',
    'Nairobi',
    'BLOKE-NBO1',
    -1.2921,
    36.8219,
    true,
    'open',
    true,
    'A practical chapter helping members show up, keep their word, and build reliable habits.',
    'Community partner space',
    'Wednesday'
  ),
  (
    'Manila Chapter',
    'Philippines',
    'Manila',
    'BLOKE-MNL1',
    14.5995,
    120.9842,
    true,
    'request',
    false,
    'A chapter centered on focus, respect, and finishing what you start.',
    'Local facilitator meetup point',
    'Sunday'
  )
on conflict (invite_code) do update
set
  name = excluded.name,
  country = excluded.country,
  region = excluded.region,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_public = excluded.is_public,
  join_policy = excluded.join_policy,
  public_join_enabled = excluded.public_join_enabled,
  description = excluded.description,
  meeting_location = excluded.meeting_location,
  meeting_day = excluded.meeting_day;
