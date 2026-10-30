-- Create INSTEAD OF trigger on users view
CREATE TRIGGER users_iud_trigger
  INSTEAD OF INSERT OR UPDATE ON "users"
  FOR EACH ROW EXECUTE PROCEDURE iud_user();

-- Apply archived timestamp trigger to user table
CREATE TRIGGER user_archived_trigger
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE PROCEDURE before_update_archived();

-- Apply history trigger to user table
CREATE TRIGGER user_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "user"
  FOR EACH ROW EXECUTE PROCEDURE iud_history();
