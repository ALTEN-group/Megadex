CREATE TYPE gender AS ENUM ('M', 'F');

CREATE TYPE civility AS ENUM ('Mr.', 'Mrs.', 'Ms.');

CREATE TYPE language AS ENUM ('ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'nl', 'pt', 'zh');

-- ISO 3166-1 alpha-3 codes covered by country_trans
CREATE TYPE country AS ENUM (
  'AFG', 'ALB', 'ARE', 'ARG', 'ARM', 'AUS', 'AUT', 'AZE', 'BEL', 'BGD',
  'BGR', 'BHR', 'BIH', 'BLR', 'BOL', 'BRA', 'CAN', 'CHE', 'CHL', 'CHN',
  'CMR', 'COL', 'CRI', 'CUB', 'CYP', 'CZE', 'DEU', 'DNK', 'DOM', 'DZA',
  'ECU', 'EGY', 'ESP', 'EST', 'ETH', 'FIN', 'FRA', 'GBR', 'GEO', 'GHA',
  'GRC', 'GTM', 'HKG', 'HND', 'HRV', 'HUN', 'IDN', 'IND', 'IRL', 'IRN',
  'IRQ', 'ISL', 'ISR', 'ITA', 'JAM', 'JOR', 'JPN', 'KAZ', 'KEN', 'KHM',
  'KOR', 'KWT', 'LAO', 'LBN', 'LBY', 'LTU', 'LUX', 'LVA', 'MAR', 'MDA',
  'MEX', 'MKD', 'MMR', 'MNE', 'MNG', 'MYS', 'NGA', 'NLD', 'NOR', 'NPL',
  'NZL', 'PAK', 'PER', 'PHL', 'POL', 'PRK', 'PRT', 'ROU', 'RUS', 'SAU',
  'SGP', 'SLV', 'SRB', 'SVK', 'SVN', 'SWE', 'THA', 'TUR', 'UKR', 'URY',
  'USA', 'VEN', 'VNM', 'ZAF'
);
