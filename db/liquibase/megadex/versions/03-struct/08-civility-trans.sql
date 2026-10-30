CREATE TABLE IF NOT EXISTS civility_trans (
  code civility NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);
