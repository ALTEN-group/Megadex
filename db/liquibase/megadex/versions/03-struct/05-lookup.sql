-- Read-only translated reference data
CREATE TABLE country_trans (
  code        country      NOT NULL,
  lang        language     NOT NULL,
  trans       VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  PRIMARY KEY (code, lang)
);

CREATE TABLE civility_trans (
  code  civility    NOT NULL,
  lang  language    NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr  VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);

CREATE TABLE gender_trans (
  code  gender      NOT NULL,
  lang  language    NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr  VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);
