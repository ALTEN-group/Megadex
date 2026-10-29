CREATE TRIGGER social_archived_trigger
  BEFORE UPDATE ON social
  FOR EACH ROW EXECUTE FUNCTION before_update_archived();

CREATE TRIGGER social_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON social
  FOR EACH ROW EXECUTE FUNCTION change_trigger();
