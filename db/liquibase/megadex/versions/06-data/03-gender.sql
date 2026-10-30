
INSERT INTO gender_trans (code, lang, trans, abbr) VALUES
-- English translations
('M', 'en', 'Male', 'M'),
('F', 'en', 'Female', 'F'),
-- French translations
('M', 'fr', 'Masculin', 'M'),
('F', 'fr', 'Féminin', 'F'),
-- Spanish translations
('M', 'es', 'Masculino', 'M'),
('F', 'es', 'Femenino', 'F'),
-- German translations
('M', 'de', 'Männlich', 'M'),
('F', 'de', 'Weiblich', 'W'),
-- Italian translations
('M', 'it', 'Maschile', 'M'),
('F', 'it', 'Femminile', 'F'),
-- Portuguese translations
('M', 'pt', 'Masculino', 'M'),
('F', 'pt', 'Feminino', 'F'),
-- Dutch translations
('M', 'nl', 'Mannelijk', 'M'),
('F', 'nl', 'Vrouwelijk', 'V'),
-- Japanese translations
('M', 'ja', '男性', '男'),
('F', 'ja', '女性', '女'),
-- Chinese translations
('M', 'zh', '男', '男'),
('F', 'zh', '女', '女'),
-- Arabic translations
('M', 'ar', 'ذكر', 'ذ'),
('F', 'ar', 'أنثى', 'أ')
ON CONFLICT DO NOTHING;

ANALYZE gender_trans;
