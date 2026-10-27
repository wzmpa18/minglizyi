import importlib.util,unittest,sqlite3
from pathlib import Path
spec=importlib.util.spec_from_file_location('deploy_notices',Path(__file__).with_name('deploy-reviewed-notices-rewards.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ReviewedHunks(unittest.TestCase):
 def test_missing_real_financial_tables_fail_closed_instead_of_skipping(self):
  with sqlite3.connect(':memory:') as db:
   db.execute('CREATE TABLE orders(id INTEGER)');db.execute('CREATE TABLE commissions(id INTEGER)')
   with self.assertRaises(ValueError):module.ledger_snapshot(db)
 def test_actual_order_and_commission_rows_are_in_the_preservation_digest(self):
  with sqlite3.connect(':memory:') as db:
   db.execute('CREATE TABLE user_orders(id INTEGER,amount INTEGER)');db.execute('CREATE TABLE commission_records(id INTEGER,amount INTEGER)')
   db.execute('INSERT INTO user_orders VALUES(1,100)');db.execute('INSERT INTO commission_records VALUES(1,15)')
   before=module.ledger_snapshot(db);self.assertEqual(before['user_orders']['rows'],1);self.assertEqual(before['commission_records']['rows'],1)
   db.execute('UPDATE commission_records SET amount=20')
   self.assertNotEqual(module.ledger_snapshot(db)['commission_records']['sha256'],before['commission_records']['sha256'])
 def test_preserves_unique_live_privacy_patch_byte_for_byte(self):
  old=b'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven\ntwelve\n'
  new=old.replace(b'three',b'changed')
  live=old+b'// existing private-data redaction\n'
  self.assertEqual(module.merge_hunks(old,new,live),new+b'// existing private-data redaction\n')
 def test_context_mismatch_cannot_overwrite_live_code(self):
  with self.assertRaises(ValueError):module.merge_hunks(b'a\nb\nc\n',b'a\nchanged\nc\n',b'a\nunique-live-fix\nc\n')
 def test_ambiguous_hunk_is_rejected(self):
  with self.assertRaises(ValueError):module.merge_hunks(b'a\nb\nc\n',b'a\nchanged\nc\n',b'a\nb\nc\na\nb\nc\n')
 def test_crlf_live_lines_are_preserved(self):
  self.assertEqual(module.merge_hunks(b'a\nb\nc\n',b'a\nchanged\nc\n',b'a\r\nb\r\nc\r\n'),b'a\r\nchanged\r\nc\r\n')
 def test_new_module_never_replaces_unknown_existing_file(self):
  self.assertEqual(module.merge_hunks(None,b'new\n',None),b'new\n')
  with self.assertRaises(ValueError):module.merge_hunks(None,b'new\n',b'unknown-live\n')
 def test_equal_source_retains_unrelated_live_changes(self):
  self.assertEqual(module.merge_hunks(b'old\n',b'old\n',b'live privacy patch\n'),b'live privacy patch\n')

if __name__=='__main__':unittest.main()
