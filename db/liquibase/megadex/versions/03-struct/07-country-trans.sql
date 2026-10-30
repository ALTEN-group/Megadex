CREATE TABLE IF NOT EXISTS country_trans (
  code country NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  PRIMARY KEY (code, lang)
);
