import importlib.util,tempfile,unittest,zipfile,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('delta',Path(__file__).with_name('release-web-delta.py'));delta=importlib.util.module_from_spec(spec);spec.loader.exec_module(delta)
class WebDeltaTest(unittest.TestCase):
 def test_changed_page_and_existing_original_image_are_fully_verified(self):
  with tempfile.TemporaryDirectory()as d:
   root=Path(d);base=root/'old';new=root/'new';base.mkdir();new.mkdir();(base/'photo.jpg').write_bytes(b'original-photo');(new/'photo.jpg').write_bytes(b'original-photo');(new/'index.html').write_text('new page');proof=delta.create(base,new,root/'delta.zip','source');self.assertEqual(proof['reusedBytes'],14);delta.apply(base,root/'delta.zip',root/'out','source');self.assertEqual((root/'out/photo.jpg').read_bytes(),b'original-photo');self.assertEqual((root/'out/index.html').read_text(),'new page')
 def test_wrong_source_and_path_traversal_are_rejected(self):
  with tempfile.TemporaryDirectory()as d:
   root=Path(d);base=root/'old';base.mkdir()
   with zipfile.ZipFile(root/'bad.zip','w')as z:z.writestr('manifest.json',json.dumps({'schema':'yandao.static-release-delta.v1','source':'source','files':[{'path':'../outside','bytes':0,'reuse':False}]}));z.writestr('files/../outside',b'')
   with self.assertRaises(AssertionError):delta.apply(base,root/'bad.zip',root/'out','wrong')
   with self.assertRaises(AssertionError):delta.apply(base,root/'bad.zip',root/'out','source')
   self.assertFalse((root/'outside').exists())
if __name__=='__main__':unittest.main()
