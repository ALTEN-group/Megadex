BEGIN;

CREATE TEMP TABLE lookup_seed_test_state (
  countries_before integer NOT NULL,
  civilities_before integer NOT NULL,
  genders_before integer NOT NULL
) ON COMMIT DROP;

INSERT INTO lookup_seed_test_state
SELECT
  (SELECT count(*) FROM country_trans),
  (SELECT count(*) FROM civility_trans),
  (SELECT count(*) FROM gender_trans);

\i /schema/versions/06-data/01-country.sql
\i /schema/versions/06-data/02-civility.sql
\i /schema/versions/06-data/03-gender.sql

DO $$
DECLARE
  state record;
BEGIN
  SELECT * INTO STRICT state FROM lookup_seed_test_state;

  IF state.countries_before = 0 OR state.civilities_before = 0 OR state.genders_before = 0 THEN
    RAISE EXCEPTION 'lookup seeds did not create rows (countries %, civilities %, genders %)',
      state.countries_before, state.civilities_before, state.genders_before;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM country_trans WHERE code = 'FRA' AND lang = 'en' AND trans = 'France'
  ) THEN
    RAISE EXCEPTION 'required FRA/en country translation seed is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM civility_trans WHERE code = 'Mr.' AND lang = 'en' AND trans = 'Mister'
  ) THEN
    RAISE EXCEPTION 'required Mr./en civility translation seed is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM gender_trans WHERE code = 'M' AND lang = 'en' AND trans = 'Male'
  ) THEN
    RAISE EXCEPTION 'required M/en gender translation seed is missing';
  END IF;

  IF (SELECT count(*) FROM country_trans) <> state.countries_before
     OR (SELECT count(*) FROM civility_trans) <> state.civilities_before
     OR (SELECT count(*) FROM gender_trans) <> state.genders_before THEN
    RAISE EXCEPTION 'reapplying lookup seeds inserted duplicate rows';
  END IF;
END;
$$;

ROLLBACK;
