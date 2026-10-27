"""Rebuild labelled external study routes on the unchanged, pinned source skin.

No organ/internal branches are drawn. These are engineering surface schematics,
not professionally calibrated meridian tracks. Original pack files remain read-only.
"""
import argparse
import hashlib
import heapq
import json
import math
import pathlib
import struct
import zipfile
from collections import defaultdict

PACK_SHA = 'b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b'
BOOK = 'li-qijing-bamai-original'
REVISION = '2c35982f388b6493b7b05001a75754d5428dd992'
SOURCE = 'https://jicheng.tw/tcm/book/%E5%A5%87%E7%B6%93%E5%85%AB%E8%84%88%E8%80%83/index.html'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def distance(a, b):
    return math.dist(a, b)

def capsule(point, a, b):
    d = [b[i] - a[i] for i in range(3)]
    length = sum(v*v for v in d)
    t = max(0, min(1, sum((point[i]-a[i])*d[i] for i in range(3))/length)) if length else 0
    return distance(point, [a[i]+t*d[i] for i in range(3)])

def build(atlas_path, editions_path):
    raw = atlas_path.read_bytes()
    if sha(raw) != PACK_SHA:
        raise ValueError('This tracing plan only applies to the pinned original atlas')
    editions = json.loads(editions_path.read_text(encoding='utf-8'))
    book = next(b for b in editions['books'] if b['id'] == BOOK)
    if book['sourceRevision'] != REVISION:
        raise ValueError('Unexpected classical text revision')
    with zipfile.ZipFile(atlas_path) as archive:
        atlas = json.loads(archive.read('atlas.json'))
        surface_raw = archive.read('surface.json')
        surface = json.loads(surface_raw)
        part = next(p for p in atlas['parts'] if p['id'] == 'FJ2810')
        chunk = archive.read(atlas['chunks'][part['chunk']]['url'])
        coords = struct.unpack_from('<%df' % (part['vertexCount']*3), chunk, part['positions'])
        packed_normals = struct.unpack_from('<%dh' % (part['vertexCount']*3), chunk, part['normals'])
        indices = struct.unpack_from('<%dI' % part['indexCount'], chunk, part['indices'])
    points, normals, welded, remap = [], [], {}, []
    for i in range(part['vertexCount']):
        p = tuple(coords[i*3:i*3+3])
        key = tuple(round(v, 6) for v in p)
        if key not in welded:
            welded[key] = len(points)
            points.append(p)
            normals.append(tuple(v/32767 for v in packed_normals[i*3:i*3+3]))
        remap.append(welded[key])
    graph = [dict() for _ in points]
    for i in range(0, len(indices), 3):
        ids = [remap[v] for v in indices[i:i+3]]
        for a, b in [(ids[0], ids[1]), (ids[1], ids[2]), (ids[2], ids[0])]:
            if a != b:
                graph[a][b] = graph[b][a] = distance(points[a], points[b])
    # BodyParts3D skin contains a full inward-facing inner shell as well as the
    # external shell. Never jump between those disconnected surfaces by nearest
    # distance: select the large outward shell using its signed source volume.
    original_graph=[set() for _ in range(part['vertexCount'])]
    for i in range(0,len(indices),3):
        a,b,c=indices[i:i+3];original_graph[a].update([b,c]);original_graph[b].update([a,c]);original_graph[c].update([a,b])
    components, seen = [], set()
    for start in range(part['vertexCount']):
        if start in seen: continue
        found, queue = set([start]), [start];seen.add(start)
        while queue:
            for nxt in original_graph[queue.pop()]:
                if nxt not in seen: seen.add(nxt);found.add(nxt);queue.append(nxt)
        components.append(found)
    large = [c for c in components if len(c)>1000]
    def outward_score(c):
        # Source normal direction on the front torso distinguishes nested shells.
        sample=[i for i in c if .98<coords[i*3+1]<1.3 and coords[i*3+2]>.04]
        return sum(packed_normals[i*3+2]/32767 for i in sample)/max(1,len(sample))
    outer_original=max(large,key=outward_score)
    outer={remap[i] for i in outer_original}
    outer_ids=sorted(outer)
    for i in outer_original:normals[remap[i]]=tuple(v/32767 for v in packed_normals[i*3:i*3+3])
    graph=[dict() for _ in points]
    for i in range(0,len(indices),3):
        if not all(j in outer_original for j in indices[i:i+3]):continue
        ids=[remap[j] for j in indices[i:i+3]]
        for a,b in [(ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])]:
            if a!=b:graph[a][b]=graph[b][a]=distance(points[a],points[b])
    # Spatially indexed closest-triangle projection; interpolation uses the
    # original packed normals, rather than regenerating anatomical normals.
    cells=defaultdict(list);cell_size=.035;faces=[]
    for i in range(0,len(indices),3):
        ids=[remap[j] for j in indices[i:i+3]]
        if not all(j in outer_original for j in indices[i:i+3]): continue
        at=len(faces);faces.append(ids)
        lo=[math.floor(min(points[j][d] for j in ids)/cell_size) for d in range(3)]
        hi=[math.floor(max(points[j][d] for j in ids)/cell_size) for d in range(3)]
        for x in range(lo[0],hi[0]+1):
            for y in range(lo[1],hi[1]+1):
                for z in range(lo[2],hi[2]+1):cells[x,y,z].append(at)
    def dot(a,b):return sum(x*y for x,y in zip(a,b))
    def minus(a,b):return [x-y for x,y in zip(a,b)]
    def closest(p,a,b,c):
        ab,ac,ap=minus(b,a),minus(c,a),minus(p,a);d1,d2=dot(ab,ap),dot(ac,ap)
        if d1<=0 and d2<=0:return a,[1,0,0]
        bp=minus(p,b);d3,d4=dot(ab,bp),dot(ac,bp)
        if d3>=0 and d4<=d3:return b,[0,1,0]
        vc=d1*d4-d3*d2
        if vc<=0 and d1>=0 and d3<=0:
            v=d1/(d1-d3);return [a[k]+v*ab[k] for k in range(3)],[1-v,v,0]
        cp=minus(p,c);d5,d6=dot(ab,cp),dot(ac,cp)
        if d6>=0 and d5<=d6:return c,[0,0,1]
        vb=d5*d2-d1*d6
        if vb<=0 and d2>=0 and d6<=0:
            w=d2/(d2-d6);return [a[k]+w*ac[k] for k in range(3)],[1-w,0,w]
        va=d3*d6-d5*d4
        if va<=0 and d4-d3>=0 and d5-d6>=0:
            w=(d4-d3)/(d4-d3+d5-d6);return [b[k]+w*(c[k]-b[k]) for k in range(3)],[0,1-w,w]
        total=va+vb+vc
        if abs(total)<1e-18:return a,[1,0,0]
        v,w=vb/total,vc/total;return [a[k]+ab[k]*v+ac[k]*w for k in range(3)],[1-v-w,v,w]
    def project(p):
        cell=[math.floor(v/cell_size) for v in p];candidates=set()
        for dx in [-1,0,1]:
            for dy in [-1,0,1]:
                for dz in [-1,0,1]:candidates.update(cells[cell[0]+dx,cell[1]+dy,cell[2]+dz])
        result=None;best=float('inf')
        for face in candidates:
            ids=faces[face];at,weights=closest(p,*[points[j] for j in ids]);dist=distance(p,at)
            if dist>=best:continue
            normal=[sum(normals[ids[i]][d]*weights[i] for i in range(3)) for d in range(3)];length=math.sqrt(dot(normal,normal))
            if length<.1:continue
            best=dist;result={'position':at,'normal':[v/length for v in normal],'projectionDistance':round(dist,7)}
        return result
    targets = {p['key']: p['target'] for p in surface['points']}
    def nearest(p):
        return min(outer_ids, key=lambda i: sum((points[i][k]-p[k])**2 for k in range(3)))
    def trace(a, b, radius, side=0, aspect=None):
        start, end = nearest(a), nearest(b)
        # Endpoints and an explicit local corridor bound every graph traversal.
        def allowed(i):
            p = points[i]
            if side and side*p[0] < -.006:
                return False
            if aspect == 'front' and p[2] < min(a[2], b[2])-.025:
                return False
            if aspect == 'back' and p[2] > max(a[2], b[2])+.025:
                return False
            return capsule(p, a, b) <= radius
        dist, previous, queue = {start: 0.0}, {}, [(0.0, start)]
        while queue:
            cost, node = heapq.heappop(queue)
            if cost != dist[node]:
                continue
            if node == end:
                break
            for nxt, step in graph[node].items():
                if nxt not in outer or (nxt!=end and not allowed(nxt)):
                    continue
                candidate = cost + step
                if candidate < dist.get(nxt, float('inf')):
                    dist[nxt], previous[nxt] = candidate, node
                    heapq.heappush(queue, (candidate, nxt))
        if end not in dist:
            return None
        route = [end]
        while route[-1] != start:
            route.append(previous[route[-1]])
        route.reverse()
        if dist[end] > max(.06, distance(a, b)*3.8):
            return None
        # Endpoints retain their existing skin target, intermediate vertices are
        # genuine skin vertices. A render-only clearance is applied by the client.
        pa,pb=project(a),project(b)
        pts = [pa['position']] + [list(points[i]) for i in route[1:-1]] + [pb['position']]
        ns = [pa['normal']] + [list(normals[i]) for i in route[1:-1]] + [pb['normal']]
        return {'points': pts, 'normals': ns, 'length': round(sum(distance(pts[i], pts[i+1]) for i in range(len(pts)-1)), 6), 'corridorRadius': radius, 'aspect': aspect or 'surface', 'skinVertexCount': len(route)}
    definitions = [
        ('CHONG', '冲脉', 9, '衝脈', '气冲与少阴腹部具名交会段的体表示意。', '胞中、会阴、脊柱内、胸内及咽唇分支未绘制。横骨、大赫原点外壳投影超限，未作新线锚，原点与资料保留。', [['ST30']+['KI%d' % n for n in range(13,22)]], 'front'),
        ('DAI', '带脉', 15, '帶脈', '季胁交会点与腰部环绕体表示意。', '仅用原皮肤腰面示意横行，不表示深部组织。', [['GB26','GB27','GB28']], 'belt'),
        ('YIN_WEI', '阴维脉', 3, '陰維脈', '府舍至期门及天突至廉泉的分段体表示意；筑宾保留为具名参考点。', '筑宾上行入小腹、胸膈内行及无独立外行坐标段未连接。', [['SP13','SP15','SP16','LR14'],['CV22','CV23']], 'front'),
        ('YANG_WEI', '阳维脉', 4, '陽維脈', '金门、阳交、居髎至肩后与头部具名外行段。', '仅按本书本章路线；与其他版本的交会次序有异，不合并为精准全脉。', [['BL63','GB35','GB29','LI14','TE13','TE15','GB21','SI10','GB20','GB19','GB18','GB17','GB16','GB15','GB14','GB13']], 'surface'),
        ('YIN_QIAO', '阴跷脉', 6, '陰蹺脈', '然谷后、照海至交信的内踝外行段；睛明为终点参考。', '阴股入阴、胸里、缺盆及咽部内行未连线；不虚构整条外行。', [['KI2','KI6','KI8']], 'surface'),
        ('YANG_QIAO', '阳跷脉', 7, '陽蹺脈', '足外、外腿、胁后、肩及具名面部外行段。', '仆参原点与踝后绕跟次序的空间关系待核，未用作接续；原点资料保留。人迎前后及睛明上发际至耳后未校准段不强接。', [['BL62','BL59','GB29','SI10','LI16','LI15'],['ST4','ST3','ST1','BL1']], 'surface'),
    ]
    routes, paths, rejected = [], [], []
    for route_id, name, chapter_no, title, description, omitted, groups, aspect in definitions:
        chapter = next(c for c in book['chapters'] if c['id'] == '%s-%d' % (BOOK, chapter_no))
        anchors = list(dict.fromkeys(code for group in groups for code in group))
        if route_id == 'YIN_WEI': anchors += ['KI9']
        if route_id == 'YIN_QIAO': anchors += ['BL1']
        metadata = {'id':route_id,'name':name,'routeKind':'classical-surface-schematic','description':description,'omitted':omitted,'sourceBookId':BOOK,'sourceChapterId':chapter['id'],'sourceChapterTitle':title,'sourceUrl':SOURCE,'sourceRevision':REVISION,'sourceChapterSha256':sha(chapter['content'].encode()),'anchorCodes':anchors,'professionallyCalibrated':False,'projection':'constrained-original-skin-geodesic'}
        routes.append(metadata)
        if route_id=='YANG_QIAO':
            metadata['additionalSources']=[{'name':'北京中医药大学针灸学课件·阳跷脉经脉循行','url':'https://jxjyxb.bucm.edu.cn/BZYAttachs/courseware/zhenjiuxue/a4/a48_1.htm','scope':'居髎为本课件列出的交会穴；《奇经八脉考》第七章仅写股外廉、胁后髀，不冒称该章逐字具名居髎。'}]
        for side in [1,-1]:
            for group_index, group in enumerate(groups):
                if side==-1 and all(code.startswith(('CV','GV')) for code in group):continue
                keys = [code+':'+str(side if not code.startswith(('CV','GV')) else 1) for code in group]
                if route_id=='DAI' and side==-1:keys.reverse()
                for pair_index in range(len(keys)-1):
                    ka,kb=keys[pair_index:pair_index+2]
                    a,b=targets[ka]['position'],targets[kb]['position']
                    radius=max(.04,min(.14,distance(a,b)*.32))
                    result=trace(a,b,radius,side if aspect!='front' or not ka.startswith('CV') else 0,'front' if aspect in ['front','belt'] else None)
                    if result: paths.append({'id':route_id,'side':side,'anchorKeys':[ka,kb],**result})
                    else: rejected.append({'id':route_id,'side':side,'anchorKeys':[ka,kb],'reason':'No connected skin route inside the explicit corridor'})
        if route_id=='DAI':
            # Close the classical belt over anterior and posterior skin, never
            # through the body. The back reference is derived from the skin at
            # the mean source GB26 height and is not invented as an acupuncture point.
            a,b=targets['GB28:1']['position'],targets['GB28:-1']['position']
            result=trace(a,b,.14,0,'front')
            if result: paths.append({'id':route_id,'side':0,'anchorKeys':['GB28:1','GB28:-1'],**result})
            height=(targets['GB26:1']['position'][1]+targets['GB26:-1']['position'][1])/2
            candidates=[i for i,p in enumerate(points) if abs(p[0])<.012 and abs(p[1]-height)<.018]
            back=points[min(candidates,key=lambda i: points[i][2])]
            for key in ['GB26:1','GB26:-1']:
                a,b=(back,targets[key]['position']) if key.endswith(':1') else (targets[key]['position'],back)
                result=trace(a,b,.17,0,'back')
                if result: paths.append({'id':route_id,'side':0,'anchorKeys':['derived-waist-posterior-surface',key] if key.endswith(':1') else [key,'derived-waist-posterior-surface'],'surfaceGuide':'季胁高度腰后体表参考，不是新增穴位',**result})
            ordering={'GB26:1':0,'GB27:1':1,'GB28:1':2,'GB28:-1':3,'GB27:-1':4,'GB26:-1':5,'derived-waist-posterior-surface':6}
            others=[p for p in paths if p['id']!=route_id];belt=sorted([p for p in paths if p['id']==route_id],key=lambda p:ordering[p['anchorKeys'][0]]);paths=others+belt
    bridges=[]
    for path_index,path in enumerate(surface['paths']):
        if path['id']!='LI': continue
        values=path['vertices'];pts=[values[i:i+3] for i in range(0,len(values),3)]
        for i in range(2,len(pts),2):
            a,b=pts[i-1],pts[i];gap=distance(a,b)
            if gap<=1e-5 or gap>.065: continue
            side=1 if a[0]>0 else -1
            result=trace(a,b,.027,side)
            if result and result['length']<=gap*2.6:
                bridges.append({'id':'LI','sourcePathIndex':path_index,'beforeSegment':i//2,'originalGap':round(gap,6),'routeKind':'source-gap-surface-repair','sourceAnchor':'原LI顺序相邻源段；《灵枢·经脉》手阳明体表主干','professionallyCalibrated':False,**result})
            else: rejected.append({'id':'LI','sourcePathIndex':path_index,'beforeSegment':i//2,'reason':'Conservative local surface bridge failed; original gap retained'})
    point_rendering={key:project(target['position']) for key,target in targets.items()}
    source_rendering=[]
    for path in surface['paths']:
        values=path['vertices'];projections=[project(values[i:i+3]) for i in range(0,len(values),3)]
        source_rendering.append({'id':path['id'],'positions':[v for p in projections for v in p['position']],'normals':[v for p in projections for v in p['normal']],'projectionDistances':[p['projectionDistance'] for p in projections],'maxProjectionDistance':max(p['projectionDistance'] for p in projections)})
    def signature(values):
        h=2166136261
        for value in values:
            for byte in struct.pack('<d',value):h=((h^byte)*16777619)&0xffffffff
        return '%08x' % h
    return {'schema':'yandao.atlas.classical-surface-routes.v1','sourcePackSha256':PACK_SHA,'sourcePackVersion':'3.0.0','sourceAtlasVersion':atlas['version'],'sourceSkinChunkUrl':atlas['chunks'][part['chunk']]['url'],'sourceSkinChunkSha256':sha(chunk),'sourceSurfaceSha256':sha(surface_raw),'sourcePathSignatures':[signature(p['vertices']) for p in surface['paths']],'sourceSkinVertexCount':part['vertexCount'],'sourceSkinIndexCount':part['indexCount'],'outerSkinVertexCount':len(outer_original),'innerShellExcluded':True,'displayProjectionPolicy':{'maxDistance':.012,'normalClearance':.0015,'sourceTargetsModified':False,'overLimitPointKeys':[key for key,p in point_rendering.items() if p['projectionDistance']>.012]},'geometryAttribution':{'source':'BodyParts3D','license':'CC BY 4.0','notice':'/licenses/tcm-3d/NOTICE.txt','derivation':'Outer-skin geodesic study overlay; original anatomical assets remain unchanged'},'animationKind':'visual-reading-sequence-not-physiological-flow','sourceBookRevision':REVISION,'sourceBookRawSha256':book['sourceRawSha256'],'routes':routes,'paths':paths,'sourceGapRepairs':bridges,'pointRendering':point_rendering,'sourcePathRendering':source_rendering,'omittedCandidates':rejected,'limitations':'经典具名体表段的工程示意；未作医学专业路径审校，不绘内部路径。原26路线和原始资源不覆盖。'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--atlas',type=pathlib.Path,required=True);parser.add_argument('--editions',type=pathlib.Path,required=True);parser.add_argument('--output',type=pathlib.Path,required=True)
    args=parser.parse_args();data=build(args.atlas,args.editions)
    def rounded(value):
        if isinstance(value,float):return round(value,7)
        if isinstance(value,list):return [rounded(v) for v in value]
        if isinstance(value,dict):return {k:rounded(v) for k,v in value.items()}
        return value
    raw=(json.dumps(rounded(data),ensure_ascii=False,separators=(',',':'))+'\n').encode();args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_bytes(raw)
    print(json.dumps({'output':str(args.output),'sha256':sha(raw),'bytes':len(raw),'routes':len(data['routes']),'externalSegments':len(data['paths']),'sourceGapRepairs':len(data['sourceGapRepairs']),'omittedCandidates':data['omittedCandidates']},ensure_ascii=False))
