CREATE TRIGGER preference_archived_trigger
  BEFORE UPDATE ON preference
  FOR EACH ROW EXECUTE FUNCTION before_update_archived();

CREATE TRIGGER preference_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON preference
  FOR EACH ROW EXECUTE FUNCTION change_trigger();
