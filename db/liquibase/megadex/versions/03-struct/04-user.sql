
CREATE TABLE IF NOT EXISTS social (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL, 
  url VARCHAR(255) NULL,
  archived BOOLEAN DEFAULT FALSE,  
  "archivedAt" TIMESTAMPTZ DEFAULT NULL
);


-- Create a sequence that starts from 2 instead of 1
CREATE SEQUENCE user_id_seq START WITH 2 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS "user" (
	id INTEGER PRIMARY KEY DEFAULT nextval('user_id_seq'),
  gender gender NULL,
  civility civility NULL,
	"firstName" varchar(50) NOT NULL,
  "middleName" varchar(50) NULL,
	"lastName" varchar(50) NOT NULL,
	nickname varchar(30) NOT NULL UNIQUE,
  email VARCHAR(50) NOT NULL UNIQUE,
  backupEmail VARCHAR(50) NULL,
	address varchar(100) NULL,
	"zipCode" varchar(10) NULL,
	city varchar(50) NULL,
	country country NULL, -- ISO 3166-1 alpha-3 code
  nationality country NULL, -- ISO 3166-1 alpha-3 code
	phone varchar(10) NULL,
  birthdate DATE NULL,
  portrait varchar(30) NULL, 
  language language DEFAULT 'en',
  job varchar(100) NULL,
  company VARCHAR(50) NULL,
  website VARCHAR(50) NULL,
  facebook VARCHAR(50) NULL,
  instagram VARCHAR(50) NULL,
  x VARCHAR(50) NULL,
  linkedIn VARCHAR(50) NULL,
  youTube VARCHAR(50) NULL,
  tikTok VARCHAR(50) NULL,
  gitHub VARCHAR(50) NULL,
  pinterest VARCHAR(50) NULL,
  discord VARCHAR(50) NULL,
  reddit VARCHAR(50) NULL,
  twitch VARCHAR(50) NULL,
  "gdprConsentedAt" TIMESTAMP NULL,
  "marketingConsentedAt" TIMESTAMP NULL,
	"pwdUpdatedAt" TIMESTAMP NULL,
	active BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
	"archivedAt" TIMESTAMP DEFAULT NULL
);


CREATE TABLE IF NOT EXISTS user_role (
	"userId" INT NOT NULL,
	"roleId" INT NOT NULL,
	PRIMARY KEY ("userId", "roleId"),
  UNIQUE ("userId", "roleId"),
	CHECK ("userId">=0),
	CHECK ("roleId">=0),
	CONSTRAINT fk_role_user
		FOREIGN KEY ("userId") REFERENCES "user" (id)
		ON DELETE CASCADE
    ON UPDATE CASCADE,
	CONSTRAINT fk_user_role
		FOREIGN KEY ("roleId") REFERENCES role (id)
		ON DELETE CASCADE
    ON UPDATE CASCADE
);


CREATE TABLE IF NOT EXISTS preference (  
  id SERIAL PRIMARY KEY,  
  "userId" INT NOT NULL,  
  name varchar(50) NOT NULL,  
  component varchar(50) NOT NULL,  
  conf jsonb NOT NULL,  
  "isActive" BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,  
  "archivedAt" TIMESTAMPTZ DEFAULT NULL,  
  CONSTRAINT fk_preference_user    
    FOREIGN KEY ("userId") REFERENCES "user" (id)    
    ON DELETE CASCADE    
    ON UPDATE CASCADE
);


CREATE TABLE IF NOT EXISTS country_trans (
  code country NOT NULL,  -- ISO 3166-1 alpha-3 code
  lang language NOT NULL,
  trans VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  PRIMARY KEY (code, lang)
);


CREATE TABLE IF NOT EXISTS civility_trans (
  code civility NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);


CREATE TABLE IF NOT EXISTS gender_trans (
  code gender NOT NULL,
  lang language NOT NULL,
  trans VARCHAR(50) NOT NULL,
  abbr VARCHAR(10) NOT NULL,
  PRIMARY KEY (code, lang)
);
