CREATE TABLE IF NOT EXISTS gender_trans (
  code gender NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);
