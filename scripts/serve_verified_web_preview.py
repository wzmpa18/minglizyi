"""Serve a pinned official web artifact from RAM for private UI QA; no local extract.
API requests are GET-only proxies. Private canary content is counted, never logged.
Stop with Ctrl+C. This is a maintained QA tool, not a deployed application route.
"""
import argparse,hashlib,io,json,mimetypes,os,socket,subprocess,zipfile
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import PurePosixPath
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit,unquote

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--artifact-id',required=True,type=int);p.add_argument('--sha256',required=True);p.add_argument('--source',required=True);p.add_argument('--port',type=int,default=3113);p.add_argument('--offline-private',action='store_true',help='Disable API proxies and enforce browser connect-src none for offline local-vault acceptance');args=p.parse_args()
 meta=json.loads(subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/artifacts/{args.artifact_id}']))
 assert meta['name']=='study-layout-review-preview' and not meta['expired'] and meta['workflow_run']['head_sha'].startswith(args.source) and meta['digest']=='sha256:'+args.sha256
 raw=subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/artifacts/{args.artifact_id}/zip']);assert hashlib.sha256(raw).hexdigest()==args.sha256
 archive=zipfile.ZipFile(io.BytesIO(raw));assert sum(i.file_size for i in archive.infolist())<200_000_000
 assert all(not PurePosixPath(i.filename).is_absolute() and '..' not in PurePosixPath(i.filename).parts for i in archive.infolist())
 stats={'source':meta['workflow_run']['head_sha'],'artifactId':args.artifact_id,'apiGetRequests':0,'blockedMutations':0,'privateCanaryRequests':0,'offlinePrivate':args.offline_private}
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*_):pass
  def send(self,status,data,kind):
   self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store')
   if args.offline_private:self.send_header('Content-Security-Policy',"connect-src 'none'; form-action 'none'; frame-src 'none'")
   self.end_headers();self.wfile.write(data)
  def do_GET(self):
   path=urlsplit(self.path).path
   if '09_PRIVATE_CANARY' in self.path:stats['privateCanaryRequests']+=1
   if path=='/__qa_stats':return self.send(200,json.dumps(stats).encode(),'application/json')
   if path.startswith(('/api/','/pay-api/')):
    stats['apiGetRequests']+=1
    if args.offline_private:return self.send(503,b'{"success":false,"error":"Offline private acceptance: API proxy disabled"}','application/json')
    try:
     request=Request('https://yandaoguoxue.yandao.vip'+self.path,headers={key:value for key,value in self.headers.items() if key.lower() in ['authorization','x-client-platform','x-store-channel','x-client-version','content-type']})
     with urlopen(request,timeout=25) as response:return self.send(response.status,response.read(),response.headers.get('Content-Type','application/json'))
    except HTTPError as error:return self.send(error.code,error.read(),'application/json')
    except Exception:return self.send(503,b'{"success":false,"error":"QA read-only proxy unavailable"}','application/json')
   name=unquote(path).lstrip('/')
   if '..' in PurePosixPath(name).parts:return self.send(400,b'Invalid path','text/plain')
   if name.endswith('/') or not name:name+='index.html'
   if name not in archive.namelist() and name+'/index.html' in archive.namelist():name+='/index.html'
   if name not in archive.namelist():return self.send(404,b'Not found','text/plain')
   self.send(200,archive.read(name),mimetypes.guess_type(name)[0] or 'application/octet-stream')
  def do_POST(self):
   body=self.rfile.read(min(int(self.headers.get('Content-Length',0)),2000000));stats['blockedMutations']+=1
   if b'09_PRIVATE_CANARY' in body:stats['privateCanaryRequests']+=1
   self.send(503,b'{"success":false,"error":"QA preview blocks production mutations"}','application/json')
  do_PUT=do_POST
  do_DELETE=do_POST
 class ExclusiveServer(ThreadingHTTPServer):
  allow_reuse_address=False
  def server_bind(self):
   if os.name=='nt':self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
   super().server_bind()
 server=ExclusiveServer(('127.0.0.1',args.port),Handler);print(json.dumps({**stats,'pid':os.getpid(),'url':f'http://127.0.0.1:{args.port}/profile/life/','mode':'RAM, no package or extract on disk, production mutations disabled'}),flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close();print(json.dumps(stats),flush=True)
if __name__=='__main__':main()
