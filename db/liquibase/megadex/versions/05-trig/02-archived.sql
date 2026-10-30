CREATE TRIGGER user_before_update_archived
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION before_update_archived();

CREATE TRIGGER social_before_update_archived
  BEFORE UPDATE ON social
  FOR EACH ROW EXECUTE FUNCTION before_update_archived();
