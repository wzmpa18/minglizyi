import importlib.util,tempfile,unittest,zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('delta',Path(__file__).with_name('release-zip-delta.py'));delta=importlib.util.module_from_spec(spec);spec.loader.exec_module(delta)
class DeltaTest(unittest.TestCase):
 def fixture(self,root):
  base=root/'base.zip';target=root/'target.zip'
  with zipfile.ZipFile(base,'w',compression=zipfile.ZIP_DEFLATED)as z:z.writestr('same.bin',b'original-learning-image'*50000);z.writestr('old.js',b'old')
  target.write_bytes(b'self-extracting-prefix')
  with zipfile.ZipFile(target,'a',compression=zipfile.ZIP_DEFLATED)as z:z.writestr('same.bin',b'original-learning-image'*50000);z.writestr('new.js',b'new-runtime');z.comment=b'exact-signature-like-footer'
  return base,target
 def test_exact_reconstruction_keeps_prefix_footer_and_original_media(self):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder);base,target=self.fixture(root);proof=delta.create(base,target,root/'patch.zip');self.assertGreater(proof['reusedBytes'],0);delta.apply(base,root/'patch.zip',root/'restored.zip');self.assertEqual(target.read_bytes(),(root/'restored.zip').read_bytes())
 def test_changed_base_is_rejected_without_creating_release(self):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder);base,target=self.fixture(root);delta.create(base,target,root/'patch.zip');base.write_bytes(base.read_bytes()+b'corrupt')
   with self.assertRaises(AssertionError):delta.apply(base,root/'patch.zip',root/'restored.zip')
   self.assertFalse((root/'restored.zip').exists())
 def test_existing_output_is_not_overwritten(self):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder);base,target=self.fixture(root);delta.create(base,target,root/'patch.zip');out=root/'restored.zip';out.write_bytes(b'preserve')
   with self.assertRaises(AssertionError):delta.apply(base,root/'patch.zip',out)
   self.assertEqual(out.read_bytes(),b'preserve')
if __name__=='__main__':unittest.main()
