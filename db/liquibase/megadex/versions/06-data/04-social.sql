-- Insert popular social networks
INSERT INTO social (name, url, "creatorId", "creatorName") VALUES
('Facebook',    'https://www.facebook.com', -1, 'system'),
('Instagram',   'https://www.instagram.com', -1, 'system'),
('X',           'https://www.x.com', -1, 'system'),
('LinkedIn',    'https://www.linkedin.com', -1, 'system'),
('YouTube',     'https://www.youtube.com', -1, 'system'),
('TikTok',      'https://www.tiktok.com', -1, 'system'),
('GitHub',      'https://www.github.com', -1, 'system'),
('Pinterest',   'https://www.pinterest.com', -1, 'system'),
('Discord',     'https://www.discord.com', -1, 'system'),
('Reddit',      'https://www.reddit.com', -1, 'system'),
('Twitch',      'https://www.twitch.com', -1, 'system')
ON CONFLICT DO NOTHING;

ANALYZE social;
