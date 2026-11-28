(()=>{var To=null;function Pr(Tn,Ue,on,Fn,Dn){if(typeof mn!="function")var mn=function(t){if(t==null)return"#000000";var e=String(t).trim().toLowerCase();if(e.charAt(0)==="#"){var a=e.slice(1);return a.length===3&&(a=a.split("").map(function(s){return s+s}).join("")),a.length===8&&(a=a.slice(0,6)),"#"+(a.length===6?a:(a+"000000").slice(0,6))}var l=e.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);if(l){var n=function(s){return Math.max(0,Math.min(255,Math.round(Number(s)))).toString(16).padStart(2,"0")};return"#"+n(l[1])+n(l[2])+n(l[3])}var r={black:"#000000",white:"#ffffff",red:"#ff0000",green:"#008000",blue:"#0000ff",transparent:"#000000"};return r[e]||e};function xn(t){for(var e={},a=/([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g,l;l=a.exec(t);)e[l[1]||l[3]]=l[2]!=null?l[2]:l[4];return e}function $n(t){for(var e={},a=/<(linearGradient|radialGradient)\b([^>]*)>([\s\S]*?)<\/(?:linearGradient|radialGradient)>/g,l;l=a.exec(t);){var n=xn(l[2]);if(n.id){for(var r=[],s=/<stop\b([^>]*)\/?>/g,i;i=s.exec(l[3]);){var _=xn(i[1]),u=String(_.offset||"0").trim();r.push({offset:u.endsWith("%")?parseFloat(u)/100:parseFloat(u)||0,color:_["stop-color"]||"#000000",op:_["stop-opacity"]!=null?parseFloat(_["stop-opacity"]):1})}r.length>=2&&(e[n.id]={type:l[1]==="radialGradient"?"radial":"linear",x1:parseFloat(n.x1)||0,y1:parseFloat(n.y1)||0,x2:n.x2!=null?parseFloat(n.x2):1,y2:parseFloat(n.y2)||0,cx:parseFloat(n.cx)||.5,cy:parseFloat(n.cy)||.5,r:parseFloat(n.r)||.5,stops:r})}}return e}if(typeof Be!="function")var Be=function(t){if(!t||typeof t!="string")return[];for(var e=$n(t),a=[],l=/<(path|rect)\b([^>]*)\/?>/g,n;n=l.exec(t);){var r=xn(n[2]),s=r.d;if(n[1]==="rect"){var i=parseFloat(r.x)||0,_=parseFloat(r.y)||0,u=parseFloat(r.width)||0,b=parseFloat(r.height)||0;if(!(u>0&&b>0))continue;s="M"+i+" "+_+"L"+(i+u)+" "+_+"L"+(i+u)+" "+(_+b)+"L"+i+" "+(_+b)+"Z"}if(s){var C=r.fill||"#000000",T=null,I=/^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(C||"");I&&e[I[1]]&&(T=e[I[1]],C=T.stops[Math.floor(T.stops.length/2)].color);var p=null;try{typeof Path2D<"u"&&(p=new Path2D(s))}catch{p=null}a.push({p2d:p,d:s,fill:C,fillGrad:T,stroke:r.stroke||"none",strokeWidth:r["stroke-width"]!=null?parseFloat(r["stroke-width"]):0,opacity:r.opacity!=null?parseFloat(r.opacity):1,fillRule:r["fill-rule"]||"evenodd"})}}return a};if(typeof Ce!="function")var Ce=function(t,e){if(!(!t||!e||!e.d)){t.fillStyle=typeof we=="function"?we(t,e.fill,e.fillGrad):e.fill;try{if(e.p2d){t.fill(e.p2d,e.fillRule||"evenodd");return}}catch{}var a=e.d.match(/[MLCZ]|-?\d+\.?\d*/g)||[];t.beginPath();for(var l=0,n=0,r=0;l<a.length;){var s=a[l++];s==="M"?(n=parseFloat(a[l++]),r=parseFloat(a[l++]),t.moveTo(n,r)):s==="L"?t.lineTo(parseFloat(a[l++]),parseFloat(a[l++])):s==="C"?t.bezierCurveTo(parseFloat(a[l++]),parseFloat(a[l++]),parseFloat(a[l++]),parseFloat(a[l++]),parseFloat(a[l++]),parseFloat(a[l++])):s==="Z"&&t.closePath()}try{t.fill(e.fillRule||"evenodd")}catch{t.fill()}}};if(typeof we!="function")var we=function(t,e,a){if(!a||!a.stops||a.stops.length<2)return e;try{var l;if(a.type==="radial"&&t.createRadialGradient)l=t.createRadialGradient(a.cx,a.cy,0,a.cx,a.cy,Math.max(.001,a.r));else if(t.createLinearGradient)l=t.createLinearGradient(a.x1,a.y1,a.x2,a.y2);else return e;for(var n=0;n<a.stops.length;n++){var r=a.stops[n];l.addColorStop(Math.max(0,Math.min(1,r.offset)),r.color)}return l}catch{return e}};let Ee=(()=>{let t=()=>"n"+Math.random().toString(36).slice(2,9),e=(B,L,m)=>({x:B.x+(L.x-B.x)*m,y:B.y+(L.y-B.y)*m}),a=(B,L)=>({x:B.x-L.x,y:B.y-L.y}),l=(B,L)=>({x:B.x+L.x,y:B.y+L.y}),n=(B,L)=>B.x*L.x+B.y*L.y,r=(B,L)=>B.x*L.y-B.y*L.x,s=B=>Math.round(B*1e3)/1e3,i=B=>({x:B.x,y:B.y}),_="[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?",u=B=>(B.match(new RegExp(_,"g"))||[]).map(Number),b=B=>String(B).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),C=(B,L)=>[B[0]*L[0]+B[2]*L[1],B[1]*L[0]+B[3]*L[1],B[0]*L[2]+B[2]*L[3],B[1]*L[2]+B[3]*L[3],B[0]*L[4]+B[2]*L[5]+B[4],B[1]*L[4]+B[3]*L[5]+B[5]];function T(B){let L=[1,0,0,1,0,0];if(!B)return L;let m=/(\w+)\s*\(([^)]*)\)/g,F;for(;F=m.exec(B);){let d=u(F[2]),M=[1,0,0,1,0,0];if(F[1]==="translate")M=[1,0,0,1,d[0]||0,d[1]||0];else if(F[1]==="scale")M=[d[0],0,0,d.length>1?d[1]:d[0],0,0];else if(F[1]==="rotate"){let v=(d[0]||0)*Math.PI/180,D=Math.cos(v),N=Math.sin(v);M=[D,N,-N,D,0,0],d.length>2&&(M=C(C([1,0,0,1,d[1],d[2]],M),[1,0,0,1,-d[1],-d[2]]))}else F[1]==="matrix"&&d.length>=6?M=d.slice(0,6):F[1]==="skewX"?M=[1,0,Math.tan((d[0]||0)*Math.PI/180),1,0,0]:F[1]==="skewY"&&(M=[1,Math.tan((d[0]||0)*Math.PI/180),0,1,0,0]);L=C(L,M)}return L}let I=B=>B[0]===1&&B[1]===0&&B[2]===0&&B[3]===1&&B[4]===0&&B[5]===0,p=(B,L)=>L&&{x:B[0]*L.x+B[2]*L.y+B[4],y:B[1]*L.x+B[3]*L.y+B[5]},x=(B,L)=>I(L)?B:B.map(m=>({...m,nodes:m.nodes.map(F=>({...F,...p(L,F),handleIn:p(L,F.handleIn),handleOut:p(L,F.handleOut)}))}));function w(B,L,m,F,d,M,v,D,N){if(m=Math.abs(m),F=Math.abs(F),!m||!F||B===D&&L===N)return null;let V=d*Math.PI/180,K=Math.cos(V),W=Math.sin(V),H=(B-D)/2,et=(L-N)/2,rt=K*H+W*et,dt=-W*H+K*et,Y=rt*rt/(m*m)+dt*dt/(F*F);if(Y>1){let yt=Math.sqrt(Y);m*=yt,F*=yt}let Z=m*m*dt*dt+F*F*rt*rt,ot=Math.sqrt(Math.max(0,(m*m*F*F-Z)/(Z||1)));!!M==!!v&&(ot=-ot);let xt=ot*m*dt/F,At=-ot*F*rt/m,st=K*xt-W*At+(B+D)/2,at=W*xt+K*At+(L+N)/2,ft=Math.atan2((dt-At)/F,(rt-xt)/m),J=(rt-xt)/m,ut=(dt-At)/F,mt=(-rt-xt)/m,it=(-dt-At)/F,nt=Math.atan2(J*it-ut*mt,J*mt+ut*it);!v&&nt>0?nt-=2*Math.PI:v&&nt<0&&(nt+=2*Math.PI);let lt=Math.max(1,Math.ceil(Math.abs(nt)/(Math.PI/2)-1e-9)),ht=nt/lt,gt=4/3*Math.tan(ht/4),ct=yt=>[st+m*Math.cos(yt)*K-F*Math.sin(yt)*W,at+m*Math.cos(yt)*W+F*Math.sin(yt)*K],bt=yt=>[-m*Math.sin(yt)*K-F*Math.cos(yt)*W,-m*Math.sin(yt)*W+F*Math.cos(yt)*K],Ct=[],Tt=ft;for(let yt=0;yt<lt;yt++){let pt=Tt+ht,Mt=ct(Tt),vt=bt(Tt),Ft=yt===lt-1?[D,N]:ct(pt),wt=bt(pt);Ct.push([Mt[0]+gt*vt[0],Mt[1]+gt*vt[1],Ft[0]-gt*wt[0],Ft[1]-gt*wt[1],Ft[0],Ft[1]]),Tt=pt}return Ct}function y(B){let L=new RegExp("\\s*,?\\s*("+_+")","y"),m=/\s*,?\s*([01])/y,F=0,d=[],M=v=>{v.lastIndex=F;let D=v.exec(B);return D?(F=v.lastIndex,+D[1]):null};for(;;){let v=[];for(let D of"nnnffnn"){let N=M(D==="f"?m:L);if(N===null)return d;v.push(N)}d.push(v)}}function G(B,L){let m=[],F=null,d=0,M=0,v=0,D=0,N=null,V=null,K="",W=(ot,xt)=>({id:t(),x:ot,y:xt,type:"corner",handleIn:null,handleOut:null}),H=(ot,xt)=>{F={id:t(),closed:!1,nodes:[W(ot,xt)]},m.push(F)},et=(ot,xt)=>{F||H(d,M),F.nodes.push(W(ot,xt)),d=ot,M=xt},rt=(ot,xt,At,st,at,ft)=>{F||H(d,M);let J=F.nodes[F.nodes.length-1];J.handleOut=ot===J.x&&xt===J.y?null:{x:ot,y:xt};let ut=W(at,ft);ut.handleIn=At===at&&st===ft?null:{x:At,y:st},F.nodes.push(ut),d=at,M=ft,N={x:At,y:st}},dt=/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g,Y;for(;Y=dt.exec(B||"");){let ot=Y[1],xt=ot.toUpperCase(),At=ot===xt;if(xt==="Z"){if(F){F.closed=!0;let ft=F.nodes[0],J=F.nodes[F.nodes.length-1];F.nodes.length>1&&Math.hypot(J.x-ft.x,J.y-ft.y)<1e-6&&(ft.handleIn=J.handleIn,F.nodes.pop())}d=v,M=D,F=null,N=V=null,K="Z";continue}let st={M:2,L:2,T:2,H:1,V:1,C:6,S:4,Q:4,A:7}[xt],at=xt==="A"?y(Y[2]).flat():u(Y[2]);for(let ft=0,J=!0;ft+st<=at.length;ft+=st,J=!1){let ut=At?0:d,mt=At?0:M;if(xt==="M"){let it=at[ft]+ut,nt=at[ft+1]+mt;J?(H(it,nt),v=it,D=nt,d=it,M=nt):et(it,nt),N=V=null}else if(xt==="L")et(at[ft]+ut,at[ft+1]+mt);else if(xt==="H")et(at[ft]+ut,M);else if(xt==="V")et(d,at[ft]+mt);else if(xt==="C")rt(at[ft]+ut,at[ft+1]+mt,at[ft+2]+ut,at[ft+3]+mt,at[ft+4]+ut,at[ft+5]+mt);else if(xt==="S"){let it=(K==="C"||K==="S")&&N?{x:2*d-N.x,y:2*M-N.y}:{x:d,y:M};rt(it.x,it.y,at[ft]+ut,at[ft+1]+mt,at[ft+2]+ut,at[ft+3]+mt)}else if(xt==="Q"||xt==="T"){let it,nt,lt,ht;if(xt==="Q")it=at[ft]+ut,nt=at[ft+1]+mt,lt=at[ft+2]+ut,ht=at[ft+3]+mt;else{let gt=(K==="Q"||K==="T")&&V?{x:2*d-V.x,y:2*M-V.y}:{x:d,y:M};it=gt.x,nt=gt.y,lt=at[ft]+ut,ht=at[ft+1]+mt}rt(d+2/3*(it-d),M+2/3*(nt-M),lt+2/3*(it-lt),ht+2/3*(nt-ht),lt,ht),V={x:it,y:nt}}else if(xt==="A"){let it=at[ft+5]+ut,nt=at[ft+6]+mt,lt=w(d,M,at[ft],at[ft+1],at[ft+2],at[ft+3],at[ft+4],it,nt);lt?lt.forEach(ht=>rt(...ht)):et(it,nt)}K=xt}K=xt}let Z=x(m.filter(ot=>ot.nodes.length>1),L||[1,0,0,1,0,0]);return Z.forEach(ot=>{let xt=ot.nodes,At=xt.length;xt.forEach((st,at)=>{if(st.handleIn&&st.handleOut){let ft=a(st,st.handleIn),J=a(st.handleOut,st);Math.abs(Math.atan2(r(ft,J),n(ft,J)))<.08?st.type=Math.abs(Math.hypot(ft.x,ft.y)-Math.hypot(J.x,J.y))<.5?"symmetric":"smooth":st.type="corner"}else if(st.handleIn||st.handleOut){let ft=ot.closed||at>0?xt[(at-1+At)%At]:null,J=ot.closed||at<At-1?xt[(at+1)%At]:null,ut=st.handleIn?a(st,st.handleIn):ft?a(st,ft):null,mt=st.handleOut?a(st.handleOut,st):J?a(J,st):null;ut&&mt&&Math.hypot(ut.x,ut.y)>1e-6&&Math.hypot(mt.x,mt.y)>1e-6&&Math.abs(Math.atan2(r(ut,mt),n(ut,mt)))<.08?st.type="smooth":st.type="corner"}})}),Z}let $=(B,L=0,m=0)=>s(B.x-L)+" "+s(B.y-m),k=(B,L,m=0,F=0)=>B.handleOut||L.handleIn?" C "+$(B.handleOut||B,m,F)+" "+$(L.handleIn||L,m,F)+" "+$(L,m,F):" L "+$(L,m,F);function O(B,L=0,m=0){let F=B.nodes;if(!F.length)return"";let d="M "+$(F[0],L,m);for(let M=1;M<F.length;M++)d+=k(F[M-1],F[M],L,m);if(B.closed){let M=F[F.length-1],v=F[0];(M.handleOut||v.handleIn)&&(d+=k(M,v,L,m)),d+=" Z"}return d}let S=(B,L=0,m=0)=>B.subs.map(F=>O(F,L,m)).join(" ");function R(B){let L=F=>parseFloat(B.getAttribute(F))||0,m=B.tagName;if(m==="path")return B.getAttribute("d")||"";if(m==="rect"){let F=L("x"),d=L("y"),M=L("width"),v=L("height"),D=L("rx"),N=L("ry");return D||(D=N),N||(N=D),D=Math.min(D,M/2),N=Math.min(N,v/2),D?`M${F+D} ${d}H${F+M-D}A${D} ${N} 0 0 1 ${F+M} ${d+N}V${d+v-N}A${D} ${N} 0 0 1 ${F+M-D} ${d+v}H${F+D}A${D} ${N} 0 0 1 ${F} ${d+v-N}V${d+N}A${D} ${N} 0 0 1 ${F+D} ${d}Z`:`M${F} ${d}H${F+M}V${d+v}H${F}Z`}if(m==="circle"||m==="ellipse"){let F=L("cx"),d=L("cy"),M=L(m==="circle"?"r":"rx"),v=L(m==="circle"?"r":"ry");return`M${F-M} ${d}A${M} ${v} 0 1 0 ${F+M} ${d}A${M} ${v} 0 1 0 ${F-M} ${d}Z`}if(m==="line")return`M${L("x1")} ${L("y1")}L${L("x2")} ${L("y2")}`;if(m==="polyline"||m==="polygon"){let F=u(B.getAttribute("points")||""),d="";for(let M=0;M+1<F.length;M+=2)d+=(M?"L":"M")+F[M]+" "+F[M+1];return d+(m==="polygon"?"Z":"")}return null}function g(B){let L=new DOMParser().parseFromString(B,"image/svg+xml"),m=L.querySelector("svg");if(!m||L.querySelector("parsererror"))return{viewBox:[0,0,100,100],objects:[],unsupported:!1,error:!0};let F=(m.getAttribute("viewBox")||"").split(/[\s,]+/).map(Number);(F.length!==4||F.some(isNaN)||F[2]<=0||F[3]<=0)&&(F=[0,0,parseFloat(m.getAttribute("width"))||100,parseFloat(m.getAttribute("height"))||100]);let d=[],M=new Set,v=new Set,D=0,N=!1,V=new Map;m.querySelectorAll("linearGradient,radialGradient").forEach(Y=>{let Z=Y.getAttribute("id");Z&&V.set(Z,Y)});let K=Y=>(Y.getAttribute("href")||Y.getAttribute("xlink:href")||"").replace(/^#/,""),W=(Y,Z)=>{for(let ot=Y,xt=0;ot&&xt<6;xt++){let At=ot.getAttribute(Z);if(At!=null)return At;let st=K(ot);ot=st?V.get(st):null}return null},H=Y=>{for(let Z=Y,ot=0;Z&&ot<6;ot++){let xt=Array.from(Z.children).filter(st=>st.tagName==="stop");if(xt.length)return xt.map(st=>{let at=(st.getAttribute("offset")||"0").trim(),ft=st.getAttribute("style")||"",J=ut=>{let mt=ft.match(new RegExp("(?:^|;)\\s*"+ut+"\\s*:\\s*([^;]+)"));return mt?mt[1].trim():st.getAttribute(ut)};return{offset:Math.max(0,Math.min(1,at.endsWith("%")?parseFloat(at)/100:parseFloat(at)||0)),color:J("stop-color")||"#000000",op:J("stop-opacity")!=null?parseFloat(J("stop-opacity")):1}});let At=K(Z);Z=At?V.get(At):null}return[]},et=(Y,Z,ot)=>{let xt=/^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(Z||"");if(!xt)return;let At=V.get(xt[1]),st=At&&H(At);if(!st||!st.length){N=!0;return}let at=W(At,"data-sy"),ft=At.tagName==="radialGradient",J=(W(At,"gradientUnits")||"objectBoundingBox")!=="userSpaceOnUse",ut=W(At,"gradientTransform"),mt=ut&&!at?T(ut):[1,0,0,1,0,0],it=J?h({objects:[Y]}):null;if(J&&!it){N=!0;return}let nt=(bt,Ct)=>{let Tt=W(At,bt);if(Tt==null)return Ct;let yt=parseFloat(Tt);return isNaN(yt)?Ct:String(Tt).trim().endsWith("%")?yt/100:yt},lt=(bt,Ct)=>{let Tt=mt[0]*bt+mt[2]*Ct+mt[4],yt=mt[1]*bt+mt[3]*Ct+mt[5];if(it)Tt=it[0]+Tt*(it[2]-it[0]),yt=it[1]+yt*(it[3]-it[1]);else{let pt=ot[0]*Tt+ot[2]*yt+ot[4];yt=ot[1]*Tt+ot[3]*yt+ot[5],Tt=pt}return[Tt,yt]},ht=W(At,"data-base-color")||st[Math.floor(st.length/2)].color,gt=typeof mn=="function"?mn(ht):ht;if(Y.fill=gt,ft){let bt=lt(nt("cx",.5),nt("cy",.5)),Ct=Math.sqrt(Math.abs(mt[0]*mt[3]-mt[1]*mt[2]))*(it?(it[2]-it[0]+(it[3]-it[1]))/2:Math.sqrt(Math.abs(ot[0]*ot[3]-ot[1]*ot[2]))||1);if(Y.grad={type:"radial",base:gt,cx:bt[0],cy:bt[1],r:nt("r",.5)*Ct,stops:st},at!=null&&(Y.grad.sy=parseFloat(at)||1),W(At,"fx")!=null||W(At,"fy")!=null){let Tt=lt(nt("fx",nt("cx",.5)),nt("fy",nt("cy",.5)));Y.grad.fx=Tt[0],Y.grad.fy=Tt[1]}}else{let bt=lt(nt("x1",0),nt("y1",0)),Ct=lt(nt("x2",1),nt("y2",0));Y.grad={type:"linear",base:gt,x1:bt[0],y1:bt[1],x2:Ct[0],y2:Ct[1],stops:st}}let ct=W(At,"spreadMethod");Y.grad&&(ct==="reflect"||ct==="repeat")&&(Y.grad.spread=ct)},rt=(Y,Z)=>{let ot=Y.getAttribute("style");if(ot){let xt=ot.match(new RegExp("(?:^|;)\\s*"+Z+"\\s*:\\s*([^;]+)"));if(xt)return xt[1].trim()}return Y.getAttribute(Z)},dt=(Y,Z,ot,xt)=>{let At=Y.tagName;if(!At||["defs","clipPath","mask","style","title","desc","metadata"].includes(At))return;let st={...Z};["fill","stroke","stroke-width","fill-rule"].forEach(gt=>{let ct=rt(Y,gt);ct!=null&&ct!=="inherit"&&(st[gt]=ct)});let at=rt(Y,"opacity");at!=null&&!isNaN(parseFloat(at))&&(st.opacity=(st.opacity??1)*parseFloat(at));let ft=Y.getAttribute("transform")?C(xt,T(Y.getAttribute("transform"))):xt;if(At==="g"){let gt=Y.getAttribute("id")||t();Y.getAttribute("data-container")==="frame"&&v.add(gt),Array.from(Y.children).forEach(ct=>dt(ct,st,gt,ft));return}if(At==="image"){let gt=Y.getAttribute("href")||Y.getAttribute("xlink:href")||Y.getAttributeNS("http://www.w3.org/1999/xlink","href"),ct=parseFloat(Y.getAttribute("width")),bt=parseFloat(Y.getAttribute("height"));if(!gt||!(ct>0)||!(bt>0))return;let Ct=f(gt,ct,bt,parseFloat(Y.getAttribute("x"))||0,parseFloat(Y.getAttribute("y"))||0,Y.getAttribute("id")||"image-"+ ++D,Y.getAttribute("preserveAspectRatio")||"xMidYMid meet",ft),Tt=Ct.name,yt=Tt,pt=2;for(;M.has(Tt);)Tt=yt+"-"+pt++;M.add(Tt),d.push({...Ct,name:Tt,opacity:st.opacity??1,group:ot});return}let J=R(Y);if(J==null)return;let ut=G(J,ft);if(!ut.length)return;let mt=Y.getAttribute("id")||"path-"+ ++D,it=mt,nt=2;for(;M.has(mt);)mt=it+"-"+nt++;M.add(mt);let lt=Math.sqrt(Math.abs(ft[0]*ft[3]-ft[1]*ft[2]))||1,ht={id:t(),name:mt,type:"path",fill:st.fill||"#000000",stroke:st.stroke||"none",strokeWidth:(parseFloat(st["stroke-width"]??"1")||0)*lt,opacity:st.opacity??1,fillRule:st["fill-rule"]==="evenodd"?"evenodd":"nonzero",group:ot,subs:ut};/^url\(/.test(ht.fill)&&(et(ht,ht.fill,ft),ht.grad||(ht.fill="#808080")),/^url\(/.test(ht.stroke)&&(ht.stroke="#808080",N=!0),d.push(ht)};return Array.from(m.children).forEach(Y=>dt(Y,{},null,[1,0,0,1,0,0])),d.forEach(Y=>{Y.group&&(v.has(Y.group)||/^Frame-\d+$/.test(Y.group))&&(Y.containerType="frame",Y.name===Y.group+"-bg"&&(Y.isAutoFrame=!0,Y.isFrameBg=!0))}),{viewBox:F,objects:d,unsupported:N||!!m.querySelector("pattern,text,use,filter,clipPath,mask")}}function f(B,L,m,F,d,M,v,D){let N="M"+F+" "+d+"L"+(F+L)+" "+d+"L"+(F+L)+" "+(d+m)+"L"+F+" "+(d+m)+"Z";return{id:t(),name:M||"image",type:"image",fill:"#000000",stroke:"none",strokeWidth:0,opacity:1,fillRule:"nonzero",group:null,img:{href:B,w:L,h:m,par:v||"none"},subs:G(N,D||[1,0,0,1,0,0])}}function o(B){let L=B.img,m=B.subs[0]&&B.subs[0].nodes;if(!L||!m||m.length<2)return null;if(m.length===4&&!m.some(D=>D.handleIn||D.handleOut)){let D=m[0],N=m[1],V=m[3];return[(N.x-D.x)/L.w,(N.y-D.y)/L.w,(V.x-D.x)/L.h,(V.y-D.y)/L.h,D.x,D.y]}let F=1e18,d=1e18,M=-1e18,v=-1e18;return m.forEach(D=>{F=Math.min(F,D.x),M=Math.max(M,D.x),d=Math.min(d,D.y),v=Math.max(v,D.y)}),[(M-F)/L.w,0,0,(v-d)/L.h,F,d]}function h(B,L){let m=1e18,F=1e18,d=-1e18,M=-1e18,v=(D,N,V)=>{D-V<m&&(m=D-V),D+V>d&&(d=D+V),N-V<F&&(F=N-V),N+V>M&&(M=N+V)};return B.objects.forEach(D=>{if(L&&!L.has(D.id))return;let N=D.stroke!=="none"?(D.strokeWidth||0)/2:0;D.subs.forEach(V=>{let K=V.nodes,W=K.length;K.forEach(H=>v(H.x,H.y,N));for(let H=0;H<(V.closed?W:W-1);H++){let et=K[H],rt=K[(H+1)%W];if(et.handleOut||rt.handleIn)for(let dt=1;dt<16;dt++){let Y=c(et,rt,dt/16);v(Y.x,Y.y,N)}}})}),m>d?null:[m,F,d,M]}let A=B=>!!(B&&B.grad&&B.grad.base===B.fill),U=(B,L,m=0,F=0)=>{let d=D=>Math.round(D*1e4)/1e4,M=B.spread&&B.spread!=="pad"?' spreadMethod="'+B.spread+'"':"",v=B.stops.map(D=>'<stop offset="'+d(D.offset)+'" stop-color="'+b(D.color)+'"'+(D.op!=null&&D.op!==1?' stop-opacity="'+d(D.op)+'"':"")+"/>").join("");if(B.type==="radial"){let D=B.fx!=null?' fx="'+d(B.fx-m)+'" fy="'+d(B.fy-F)+'"':"",N=B.sy!=null&&Math.abs(B.sy-1)>.01?' data-sy="'+d(B.sy)+'" gradientTransform="matrix(1 0 0 '+d(B.sy)+" 0 "+d((B.cy-F)*(1-B.sy))+')"':"";return'<radialGradient id="'+L+'" gradientUnits="userSpaceOnUse" cx="'+d(B.cx-m)+'" cy="'+d(B.cy-F)+'" r="'+d(B.r)+'"'+D+N+M+">"+v+"</radialGradient>"}return'<linearGradient id="'+L+'" gradientUnits="userSpaceOnUse" x1="'+d(B.x1-m)+'" y1="'+d(B.y1-F)+'" x2="'+d(B.x2-m)+'" y2="'+d(B.y2-F)+'"'+M+">"+v+"</linearGradient>"};function P(B,L){L=L||{},B.objects.some(Z=>Z.hidden)&&(B={...B,objects:B.objects.filter(Z=>!Z.hidden)}),L.area==="sel"&&L.only&&(B={...B,objects:B.objects.filter(Z=>L.only.has(Z.id))});let[m,F,d,M]=B.viewBox,v="",D=null,N=!1,V="",K=0,W=new Set,H=new Set;if(L.area==="content"||L.area==="sel"){let Z=h(B);Z&&Z[2]>Z[0]&&Z[3]>Z[1]&&(m=Math.floor(Z[0]*100)/100,F=Math.floor(Z[1]*100)/100,d=Math.ceil((Z[2]-m)*100)/100,M=Math.ceil((Z[3]-F)*100)/100)}let et=m,rt=F;d=Math.max(1,s(d)),M=Math.max(1,s(M));let dt=Z=>{Z=String(Z||"path").replace(/[^\w\-.:]/g,"-"),/^[A-Za-z_]/.test(Z)||(Z="id-"+Z);let ot=Z,xt=2;for(;W.has(ot);)ot=Z+"-"+xt++;return W.add(ot),ot},Y=Z=>Math.round(Z*1e6)/1e6;return L.bg&&L.bg.mode==="solid"&&(v+='<rect x="0" y="0" width="'+d+'" height="'+M+'" fill="'+b(L.bg.color||"#ffffff")+'"/>'),B.objects.forEach(Z=>{if(Z.group!==D){if(D&&(v+="</g>"),Z.group){let xt=Z.containerType==="frame"||Z.isAutoFrame||Z.isFrameBg||/^frame/i.test(Z.group);v+="<g"+(H.has(Z.group)?"":' id="'+b(Z.group)+'"')+(xt?' data-container="frame"':"")+">",H.add(Z.group)}D=Z.group}if(Z.img){let xt=o(Z);if(!xt)return;N=!0;let At=[xt[0],xt[1],xt[2],xt[3],xt[4]-et,xt[5]-rt];v+='<image id="'+dt(Z.name)+'" href="'+b(Z.img.href)+'" xlink:href="'+b(Z.img.href)+'" x="0" y="0" width="'+Y(Z.img.w)+'" height="'+Y(Z.img.h)+'" preserveAspectRatio="'+b(Z.img.par||"none")+'" transform="matrix('+At.map(Y).join(" ")+')"'+(Z.opacity!==1?' opacity="'+s(Z.opacity)+'"':"")+"/>";return}let ot=b(Z.fill);if(A(Z)){let xt="grad-"+ ++K;V+=U(Z.grad,xt,et,rt),ot="url(#"+xt+")"}v+='<path id="'+dt(Z.name)+'" fill="'+ot+'"'+(Z.stroke!=="none"&&Z.strokeWidth>0?' stroke="'+b(Z.stroke)+'" stroke-width="'+s(Z.strokeWidth)+'"':"")+(Z.opacity!==1?' opacity="'+s(Z.opacity)+'"':"")+(Z.fillRule==="evenodd"?' fill-rule="evenodd"':"")+' d="'+S(Z,et,rt)+'"/>'}),D&&(v+="</g>"),`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"`+(N?' xmlns:xlink="http://www.w3.org/1999/xlink"':"")+' version="1.1" width="'+d+'" height="'+M+'" viewBox="0 0 '+d+" "+M+'">'+(V?"<defs>"+V+"</defs>":"")+v+"</svg>"}function c(B,L,m){if(!B.handleOut&&!L.handleIn)return e(B,L,m);let F=B.handleOut||i(B),d=L.handleIn||i(L),M=1-m;return{x:M*M*M*B.x+3*M*M*m*F.x+3*M*m*m*d.x+m*m*m*L.x,y:M*M*M*B.y+3*M*M*m*F.y+3*M*m*m*d.y+m*m*m*L.y}}let E=B=>{let L=new TextEncoder().encode(B),m="";for(let F=0;F<L.length;F+=32768)m+=String.fromCharCode.apply(null,L.subarray(F,F+32768));return btoa(m)},q=B=>(E(B).match(/.{1,100}/g)||[]).map(L=>"%SVGPeak-Data: "+L).join(`
`)+`
`,Q=B=>{let L=mn(B||"#000000");return[1,3,5].map(m=>(parseInt(L.slice(m,m+2),16)/255).toFixed(4)).join(" ")},tt=B=>{let L=B.fill&&B.fill!=="none",m=B.stroke&&B.stroke!=="none"&&B.strokeWidth>0;return{f:L,s:m}};function j(B,L,m,F,d){let M="";return B.subs.forEach(v=>{let D=v.nodes,N=D.length;if(!N)return;M+=L(D[0]);let V=v.closed?N:N-1;for(let K=0;K<V;K++){let W=D[K],H=D[(K+1)%N];if(W.handleOut||H.handleIn){let et=W.handleOut||W,rt=H.handleIn||H;M+=F(et,rt,H)}else K<N-1&&(M+=m(H))}v.closed&&(M+=d())}),M}function z(B,L){L=L||{};let m=P(B,L),F=g(m),[d,M,v,D]=F.viewBox,N=`%!PS-Adobe-3.0 EPSF-3.0
%%Creator: SVGPeak Auto Trace
%%BoundingBox: 0 0 `+Math.ceil(v)+" "+Math.ceil(D)+`
%%HiResBoundingBox: 0 0 `+s(v)+" "+s(D)+`
%%LanguageLevel: 2
%%Pages: 1
%%EndComments
`;return N+=q(m),N+=`gsave
0 `+s(D)+` translate 1 -1 scale
`+s(-d)+" "+s(-M)+` translate
`,L.bg&&L.bg.mode==="solid"&&(N+=Q(L.bg.color)+` setrgbcolor
`+s(d)+" "+s(M)+" "+s(v)+" "+s(D)+` rectfill
`),F.objects.forEach(V=>{if(V.img)return;let{f:K,s:W}=tt(V);if(!K&&!W)return;N+=`newpath
`+j(V,et=>s(et.x)+" "+s(et.y)+` moveto
`,et=>s(et.x)+" "+s(et.y)+` lineto
`,(et,rt,dt)=>s(et.x)+" "+s(et.y)+" "+s(rt.x)+" "+s(rt.y)+" "+s(dt.x)+" "+s(dt.y)+` curveto
`,()=>`closepath
`);let H=V.fillRule==="evenodd"?"eofill":"fill";K&&W?N+="gsave "+Q(V.fill)+" setrgbcolor "+H+` grestore
`+Q(V.stroke)+" setrgbcolor "+s(V.strokeWidth)+` setlinewidth stroke
`:K?N+=Q(V.fill)+" setrgbcolor "+H+`
`:N+=Q(V.stroke)+" setrgbcolor "+s(V.strokeWidth)+` setlinewidth stroke
`}),N+`grestore
showpage
%%EOF
`}function X(B,L){L=L||{};let m=P(B,L),F=g(m),[d,M,v,D]=F.viewBox,N=[],V=`q
1 0 0 -1 `+s(-d)+" "+s(D+M)+` cm
`;L.bg&&L.bg.mode==="solid"&&(V+=Q(L.bg.color)+` rg
`+s(d)+" "+s(M)+" "+s(v)+" "+s(D)+` re f
`),F.objects.forEach(Y=>{if(Y.img)return;let{f:Z,s:ot}=tt(Y);if(!Z&&!ot)return;let xt=Y.opacity!=null&&Y.opacity<1,At=0;xt&&(N.push(s(Y.opacity)),At=N.length,V+=`q
/GS`+At+` gs
`),Z&&(V+=Q(Y.fill)+` rg
`),ot&&(V+=Q(Y.stroke)+" RG "+s(Y.strokeWidth)+` w
`),V+=j(Y,at=>s(at.x)+" "+s(at.y)+` m
`,at=>s(at.x)+" "+s(at.y)+` l
`,(at,ft,J)=>s(at.x)+" "+s(at.y)+" "+s(ft.x)+" "+s(ft.y)+" "+s(J.x)+" "+s(J.y)+` c
`,()=>`h
`);let st=Y.fillRule==="evenodd";V+=(Z&&ot?st?"B*":"B":Z?st?"f*":"f":"S")+`
`,xt&&(V+=`Q
`)}),V+=`Q
`;let K=N.length?"<< /ExtGState << "+N.map((Y,Z)=>"/GS"+(Z+1)+" << /Type /ExtGState /ca "+Y+" /CA "+Y+" >>").join(" ")+" >> >>":"<< >>",W="[0 0 "+s(v)+" "+s(D)+"]",H=[`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`,`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`,`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox `+W+" /ArtBox "+W+" /Contents 4 0 R /Resources "+K+` >>
endobj
`,`4 0 obj
<< /Length `+V.length+` >>
stream
`+V+`endstream
endobj
`,`5 0 obj
<< /Producer (SVGPeak Auto Trace) /Creator (SVGPeak) >>
endobj
`],et=`%PDF-1.4
`+q(m),rt=[];H.forEach(Y=>{rt.push(et.length),et+=Y});let dt=et.length;return et+=`xref
0 `+(H.length+1)+`
0000000000 65535 f 
`,rt.forEach(Y=>{et+=String(Y).padStart(10,"0")+` 00000 n 
`}),et+`trailer
<< /Size `+(H.length+1)+` /Root 1 0 R /Info 5 0 R >>
startxref
`+dt+`
%%EOF
`}return{parseSVG:g,exportEPS:z,exportAI:X}})(),St=(t,e,a)=>t<e?e:t>a?a:t,We=()=>new Promise(t=>{let e=!1,a=()=>{e||(e=!0,t())};Dn(()=>setTimeout(a,0)),setTimeout(a,90)}),ze=0,He=async(t=14)=>{performance.now()-ze>=t&&(await We(),ze=performance.now())},tn=t=>new Promise(e=>setTimeout(e,t)),an=new Float32Array(256),Xe=new Float32Array(256);for(let t=0;t<256;t++){let e=t/255;an[t]=e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),Xe[t]=Math.pow(t,2.2)}function de(t,e,a){let l,n,r,s=t|0,i=e|0,_=a|0;t===s&&e===i&&a===_&&(s|i|_)>=0&&(s|i|_)<256?(l=an[s],n=an[i],r=an[_]):(l=t/255,n=e/255,r=a/255,l=l<=.04045?l/12.92:Math.pow((l+.055)/1.055,2.4),n=n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4),r=r<=.04045?r/12.92:Math.pow((r+.055)/1.055,2.4));let u=(l*.4124564+n*.3575761+r*.1804375)*1.05211106,b=l*.2126729+n*.7151522+r*.072175,C=(l*.0193339+n*.119192+r*.9503041)*.918417016,T=.008856451679035631,I=903.2962962962963,p=u>T?Math.cbrt(u):(I*u+16)/116,x=b>T?Math.cbrt(b):(I*b+16)/116,w=C>T?Math.cbrt(C):(I*C+16)/116;return[116*x-16,500*(p-x),200*(x-w)]}function ia(t,e,a){let l=Math.hypot(e,a),n=Math.atan2(a,e)*(180/Math.PI);return n<0&&(n+=360),[t,l,n]}function De(t,e,a,l,n,r){let s=Math.hypot(e,a),i=Math.hypot(n,r),_=.5*(s+i),u=Math.pow(_,7),b=6103515625,C=.5*(1-Math.sqrt(u/(u+b))),T=(1+C)*e,I=(1+C)*n,p=Math.hypot(T,a),x=Math.hypot(I,r),w=p<1e-7?0:Math.atan2(a,T)*(180/Math.PI);w<0&&(w+=360);let y=x<1e-7?0:Math.atan2(r,I)*(180/Math.PI);y<0&&(y+=360);let G=l-t,$=x-p,k=0;if(p*x>1e-8){let B=y-w;Math.abs(B)<=180?k=B:B>180?k=B-360:k=B+360}let O=2*Math.sqrt(p*x)*Math.sin(k*Math.PI/360),S=.5*(t+l),R=.5*(p+x),g=w+y;p*x>1e-8&&(Math.abs(w-y)<=180?g=.5*(w+y):w+y<360?g=.5*(w+y+360):g=.5*(w+y-360));let f=Math.PI/180,o=1-.17*Math.cos((g-30)*f)+.24*Math.cos(2*g*f)+.32*Math.cos((3*g+6)*f)-.2*Math.cos((4*g-63)*f),h=30*Math.exp(-Math.pow((g-275)/25,2)),A=Math.pow(R,7),U=2*Math.sqrt(A/(A+b)),P=S-50,c=P*P,E=1+.015*c/Math.sqrt(20+c),q=1+.045*R,Q=1+.015*R*o,tt=-Math.sin(2*h*f)*U,j=G/E,z=$/q,X=O/Q;return Math.sqrt(Math.max(0,j*j+z*z+X*X+tt*z*X))}function Wt(t,e,a,l,n,r){let s=t-l,i=e-n,_=a-r,u=(t+l)*.5;return(2+u/256)*s*s+4*i*i+(2+(255-u)/256)*_*_}let _e=(t,e,a)=>"#"+[t,e,a].map(l=>St(Math.round(l),0,255).toString(16).padStart(2,"0")).join(""),un=t=>{let e=String(t||"#000000").replace("#",""),a=e.length===3?e.split("").map(l=>l+l).join(""):e.padEnd(6,"0");return[parseInt(a.slice(0,2),16)||0,parseInt(a.slice(2,4),16)||0,parseInt(a.slice(4,6),16)||0]};function $a(t){return new Promise((e,a)=>{let l=new Image;if(l.crossOrigin="anonymous",l.onload=()=>e({img:l,w:l.naturalWidth||l.width,h:l.naturalHeight||l.height}),l.onerror=a,t instanceof File||t instanceof Blob){let n=URL.createObjectURL(t);l.onload=()=>{URL.revokeObjectURL(n),e({img:l,w:l.naturalWidth||l.width,h:l.naturalHeight||l.height})},l.src=n}else l.src=t})}function Xa(t,e,a){let l=Ue.createElement("canvas");l.width=e,l.height=a;let n=l.getContext("2d",{willReadFrequently:!0});return n.imageSmoothingEnabled=!0,n.imageSmoothingQuality="high",n.drawImage(t,0,0,e,a),n.getImageData(0,0,e,a)}function Fo(t,e=840){let a=Math.min(1,e/Math.max(t.w,t.h)),l=Math.max(16,Math.round(t.w*a)),n=Math.max(16,Math.round(t.h*a));return{data:Xa(t.img,l,n),w:l,h:n,scale:1/a,k:a}}async function ko(t,e,a=1.4,l=22,n,r={}){if(r&&r.skipIfClean)return;let{data:s,w:i,h:_}=t,u=new Uint8ClampedArray(s.data),b=s.data,C=St(r&&r.radius||(a<=1.15?1:2),1,3),T=r&&r.wedgeGuardThr||780,I=new Float32Array((2*C+1)*(2*C+1)),p=1/(2*a*a),x=1/(2*l*l*9),w=0;for(let k=-C;k<=C;k++)for(let O=-C;O<=C;O++)I[w++]=Math.exp(-(O*O+k*k)*p);let y=[1,1,0,-1,-1,-1,0,1],G=[0,1,1,1,0,-1,-1,-1],$=Math.max(12,Math.floor(_/8));for(let k=0;k<_;k++){for(let O=0;O<i;O++){let S=k*i+O;if(e&&e[S])continue;let R=S*4,g=u[R],f=u[R+1],o=u[R+2],h=0,A=0;for(let tt=0;tt<8;tt++){let z=St(k+G[tt],0,_-1)*i+St(O+y[tt],0,i-1);if(e&&e[z])continue;let X=z*4;Wt(g,f,o,u[X],u[X+1],u[X+2])<T&&(h++,A|=1<<tt)}if(h<=3)continue;if(h===4){let tt=A|A<<8,j=!1;for(let z=0;z<8;z++)if((tt>>z&15)===15){j=!0;break}if(j)continue}if(O>=2&&O<i-2&&k>=2&&k<_-2){let tt=.299*g+.587*f+.114*o,j=!1;for(let[z,X]of[[1,0],[0,1],[1,1],[1,-1]]){let B=((k-X)*i+(O-z))*4,L=((k+X)*i+(O+z))*4,m=((k-2*X)*i+(O-2*z))*4,F=((k+2*X)*i+(O+2*z))*4,d=Math.max(.299*u[B]+.587*u[B+1]+.114*u[B+2],.299*u[m]+.587*u[m+1]+.114*u[m+2]),M=Math.max(.299*u[L]+.587*u[L+1]+.114*u[L+2],.299*u[F]+.587*u[F+1]+.114*u[F+2]),v=Math.min(.299*u[B]+.587*u[B+1]+.114*u[B+2],.299*u[m]+.587*u[m+1]+.114*u[m+2]),D=Math.min(.299*u[L]+.587*u[L+1]+.114*u[L+2],.299*u[F]+.587*u[F+1]+.114*u[F+2]);if(tt<d-3.8&&tt<M-3.8||tt>v+5.5&&tt>D+5.5){j=!0;break}}if(j)continue}let U=0,P=0,c=0,E=0,q=0,Q=h<=5?x*2.8:x;for(let tt=-C;tt<=C;tt++){let z=St(k+tt,0,_-1)*i;for(let X=-C;X<=C;X++){let B=St(O+X,0,i-1),L=z+B,m=I[q++];if(e&&e[L])continue;let F=L*4,d=u[F],M=u[F+1],v=u[F+2],D=Wt(g,f,o,d,M,v),N=m*Math.exp(-D*Q);U+=d*N,P+=M*N,c+=v*N,E+=N}}E>1e-6&&(b[R]=Math.round(U/E),b[R+1]=Math.round(P/E),b[R+2]=Math.round(c/E))}k%$===0&&n&&await n(k/_)}}function Ye(t,e,a=!1){if(!a&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuBuildEdgeField){let x=xe.gpuBuildEdgeField(t,e);if(x)return x}let{data:l,w:n,h:r}=t,s=l.data,i=n*r,_=new Float32Array(i),u=new Float32Array(i),b=new Float32Array(i);for(let x=0;x<i;x++){let w=x*4,y=s[w],G=s[w+1],$=s[w+2];_[x]=.299*y+.587*G+.114*$,u[x]=(y-G)*.55,b[x]=(.5*(y+G)-$)*.45}let C=new Float32Array(i),T=new Float32Array(i),I=new Float32Array(i),p=(x,w,y)=>{let G=St(y-1,0,r-1)*n,$=St(y,0,r-1)*n,k=St(y+1,0,r-1)*n,O=St(w-1,0,n-1),S=St(w,0,n-1),R=St(w+1,0,n-1),g=(-3*x[G+O]-10*x[$+O]-3*x[k+O]+3*x[G+R]+10*x[$+R]+3*x[k+R])/32,f=(-3*x[G+O]-10*x[G+S]-3*x[G+R]+3*x[k+O]+10*x[k+S]+3*x[k+R])/32;return[g,f]};for(let x=0;x<r;x++)for(let w=0;w<n;w++){let y=x*n+w;if(e&&e[y])continue;let[G,$]=p(_,w,x),[k,O]=p(u,w,x),[S,R]=p(b,w,x),g=G*G+k*k+S*S,f=$*$+O*O+R*R,o=G*$+k*O+S*R,h=g+f;if(h>1e-6){let A=Math.hypot(g-f,2*o),U=Math.max(0,.5*(h+A)),P=Math.sqrt(U),c=.5*Math.atan2(2*o,g-f),E=Math.cos(c),q=Math.sin(c),Q=Math.abs(G)>=Math.abs(k)&&Math.abs(G)>=Math.abs(S)?G:Math.abs(k)>=Math.abs(S)?k:S,tt=Math.abs($)>=Math.abs(O)&&Math.abs($)>=Math.abs(R)?$:Math.abs(O)>=Math.abs(R)?O:R;E*Q+q*tt<0&&(E=-E,q=-q),C[y]=E*P,T[y]=q*P,I[y]=P}}return{lum:_,gx:C,gy:T,mag:I}}function ca(t,e,a,l){let n=Math.max(4,Math.floor(e/l)),r=Math.max(4,Math.floor(a/l)),s=n*r,i=new Float32Array(s),_=new Float32Array(s),u=new Float32Array(s),b=new Float32Array(s),C=new Float32Array(s),T=new Float32Array(s),I=new Float32Array(s),p=new Float32Array(s),x=new Uint16Array(s);for(let w=0;w<r;w++){let y=w*l,G=Math.min(a,y+l);for(let $=0;$<n;$++){let k=$*l,O=Math.min(e,k+l),S=0,R=0,g=0,f=0,o=0,h=0;for(let j=y;j<G;j++){let z=j*e;for(let X=k;X<O;X++){let B=(z+X)*4,L=t[B+3];f+=L,o++,L>=32&&(S+=t[B],R+=t[B+1],g+=t[B+2],h++)}}let A=w*n+$,U=h>0?S/h:0,P=h>0?R/h:0,c=h>0?g/h:0,E=o>0?f/o:0;i[A]=U,_[A]=P,u[A]=c,b[A]=E,p[A]=.299*U+.587*P+.114*c,x[A]=Math.round(U)>>4<<8|Math.round(P)>>4<<4|Math.round(c)>>4;let[q,Q,tt]=de(U,P,c);C[A]=q,T[A]=Q,I[A]=tt}}return{sw:n,sh:r,rArr:i,gArr:_,bArr:u,aArr:b,LArr:C,caArr:T,cbArr:I,gray:p,qcol:x,step:l}}function la(t,e){if(!t||!t.length)return{q10:8,q25:10.5,q50:14,q90:24,mean:14};let a=t.map((s,i)=>({v:s,w:e&&e[i]||1})).sort((s,i)=>s.v-i.v),l=0,n=0;for(let s of a)l+=s.w,n+=s.v*s.w;if(l<=0)return{q10:8,q25:10.5,q50:14,q90:24,mean:14};let r=s=>{let i=s*l,_=0;for(let u of a)if(_+=u.w,_>=i)return+u.v.toFixed(2);return+a[a.length-1].v.toFixed(2)};return{q10:r(.1),q25:r(.25),q50:r(.5),q90:r(.9),mean:+(n/l).toFixed(2)}}function Wa(t,e,a,l,n){let r=t&&t.length?t:[],s=e&&e.plateauModes||[],i=e&&e.flatPixelFrac||0,_=e&&e.gradPixelFrac||0,u=100,b=0,C=200,T=0,I=0,p=0,x=0,w=[],y=!1,G=0,$=0,k=s.length>=2?s:r;for(let tt of k){let j=tt.L??50,z=tt.a??0,X=tt.b2??tt.b??0,B=tt.count||tt.cnt||1;$+=B;let[,L,m]=ia(j,z,X);j<u&&(u=j),j>b&&(b=j),L<C&&(C=L),L>T&&(T=L);let F=L<9.5?L/9.5*.18:1,d=Math.log2(1+B)*Math.pow(Math.max(1,L),.85)*F,M=m*Math.PI/180;if(I+=Math.cos(M)*d,p+=Math.sin(M)*d,x+=d,L<9.5||j<=14||j>=94)y=!0,G+=B;else{let v=null;for(let D of w){let N=Math.abs(m-D.meanHue);if(N>180&&(N=360-N),N<=28){v=D;break}}if(v){let D=v.weight+B,N=v.meanHue*Math.PI/180,V=Math.cos(N)*v.weight+Math.cos(M)*B,K=Math.sin(N)*v.weight+Math.sin(M)*B,W=Math.atan2(K,V)*(180/Math.PI);W<0&&(W+=360),v.meanHue=W,v.weight=D,v.shades++}else w.push({meanHue:m,weight:B,shades:1})}}let O=w.filter(tt=>tt.weight>=Math.max(2,$*.0035)),S=Math.max(1,O.length+(y&&(G>=$*.04||O.length===0)?1:0)),R=x>1e-5?Math.hypot(I,p)/x:1,g=O.length<=1?St(.78+R*.22,0,1):St(R*(1/Math.sqrt(O.length)),0,1),f=Math.max(s.length,r.length),o=k.length>1?+(b-u).toFixed(1):0,h=k.length>1?+(T-C).toFixed(1):0,A=St(i+(s.length>=2?.18:0),0,1),U=r.filter(tt=>(tt.cnt||tt.count||0)<Math.max(6,n*.0025)).length,P=St(U/Math.max(1,r.length)*.55+l*.45*(1-A*.6),0,1),c="flat",E=St(a*.65+St(_*8.5,0,1)*.35,0,1);E>=.32||e&&e.hasSmoothGradient&&i<.42?c="gradient":E>=.14||e&&e.hasSmoothGradient?c="mixed":c="flat";let q="MIXED_COLOR_STRUCTURE",Q=S<=2&&g>=.68||e&&e.isSingleFamilyMultiShade;return P>=.48&&A<.38?q="FAMILY_NOISE":Q&&c==="flat"&&f>=3&&A>=.35?q="DISCRETE_FAMILY_SHADES":Q&&(c==="gradient"||E>=.22)?q="FAMILY_GRADIENT":!Q&&c==="flat"?q="MULTI_FAMILY_FLAT":!Q&&c==="gradient"&&(q="MULTI_FAMILY_GRADIENT"),{colorFamilyCount:S,surfaceMode:c,colorStructureMode:q,familyCoherence:+g.toFixed(2),shadeLevelCount:f,lightnessSpread:o,chromaSpread:h,plateauSupport:+A.toFixed(2),gradientContinuity:+E.toFixed(2),familyNoiseRatio:+P.toFixed(2)}}function fa(t,e,a,l){let{data:n,w:r,h:s}=t,i=n.data,_=Math.max(1,Math.floor(Math.max(r,s)/320)),u=Math.max(_+1,Math.floor(Math.max(r,s)/150)),b=ca(i,r,s,_),C=ca(i,r,s,u),{sw:T,sh:I,rArr:p,gArr:x,bArr:w,aArr:y,LArr:G,caArr:$,cbArr:k,gray:O,qcol:S}=b,R=0,g=0,f=0,o=0,h=Math.min(48,Math.floor(Math.min(r,s)*.22)),A=[[r>>1,s>>1],[r>>2,s>>2],[r*3>>2,s>>2],[r>>2,s*3>>2],[r*3>>2,s*3>>2]];for(let[Lt,_t]of A){let Qt=St(Lt-h,1,r-2),Re=St(Lt+h,1,r-2),Ae=St(_t-h,1,s-2),Ie=St(_t+h,1,s-2);for(let $e=Ae;$e<=Ie;$e+=2){let dn=$e*r;for(let nn=Qt;nn<=Re;nn+=2){let Nn=dn+nn,Ve=Nn*4;if(i[Ve+3]<64)continue;g++;let Ne=.299*i[Ve]+.587*i[Ve+1]+.114*i[Ve+2],qn=.299*i[Ve-4]+.587*i[Ve-3]+.114*i[Ve-2],jn=.299*i[Ve+4]+.587*i[Ve+5]+.114*i[Ve+6],On=.299*i[Ve-r*4]+.587*i[Ve-r*4+1]+.114*i[Ve-r*4+2],Rn=.299*i[Ve+r*4]+.587*i[Ve+r*4+1]+.114*i[Ve+r*4+2],no=Math.hypot(jn-qn,Rn-On)*.5,oa=Math.abs(4*Ne-qn-jn-On-Rn);no<5.5&&(f+=oa,o++);let aa=Ne>qn+9&&Ne>jn+9||Ne<qn-9&&Ne<jn-9,yo=Ne>On+9&&Ne>Rn+9||Ne<On-9&&Ne<Rn-9;(aa||yo)&&R++}}}let U=0,P=0,c=0,E=0,q=0,Q=0,tt=0,j=0,z=0,X=0,B=0,L=0,m=0,F=0,d=0,M=0,v=0,D=new Uint32Array(4096),N=new Float64Array(4096),V=new Float64Array(4096),K=new Float64Array(4096),W=0,H=(Lt,_t)=>Lt<0||_t<0||Lt>=T||_t>=I?0:O[_t*T+Lt],et=(Lt,_t)=>Lt<0||_t<0||Lt>=T||_t>=I?0:G[_t*T+Lt],rt=(Lt,_t)=>Lt<0||_t<0||Lt>=T||_t>=I?0:$[_t*T+Lt],dt=(Lt,_t)=>Lt<0||_t<0||Lt>=T||_t>=I?0:k[_t*T+Lt];for(let Lt=1;Lt<I-1;Lt++)for(let _t=1;_t<T-1;_t++){let Qt=Lt*T+_t;if(y[Qt]<64)continue;let Re=-3*H(_t-1,Lt-1)-10*H(_t-1,Lt)-3*H(_t-1,Lt+1)+3*H(_t+1,Lt-1)+10*H(_t+1,Lt)+3*H(_t+1,Lt+1),Ae=-3*H(_t-1,Lt-1)-10*H(_t,Lt-1)-3*H(_t+1,Lt-1)+3*H(_t-1,Lt+1)+10*H(_t,Lt+1)+3*H(_t+1,Lt+1),Ie=(rt(_t+1,Lt)-rt(_t-1,Lt))*8.5,$e=(rt(_t,Lt+1)-rt(_t,Lt-1))*8.5,dn=(dt(_t+1,Lt)-dt(_t-1,Lt))*8.5,nn=(dt(_t,Lt+1)-dt(_t,Lt-1))*8.5,Nn=Math.hypot(Re,Ae)/8,Ve=Math.hypot(Ie,$e,dn,nn)/8,Ne=Math.max(Nn,Ve*.85);if(P+=Ne,Ne>32){U++;let Je=Math.atan2(Ae,Re),Ze=Math.abs(Je*(180/Math.PI))%90;(Ze<=11||Ze>=79)&&F++,Math.abs(Re)>95&&Math.abs(Ae)>95&&v++;let Bn=-Math.sin(Je),En=Math.cos(Je),pn=St(Math.round(_t-Bn),1,T-2),Sn=St(Math.round(Lt-En),1,I-2),Pn=St(Math.round(_t+Bn),1,T-2),Cn=St(Math.round(Lt+En),1,I-2);if((pn!==_t||Sn!==Lt)&&(Pn!==_t||Cn!==Lt)){let Lo=H(pn+1,Sn)-H(pn-1,Sn),oo=H(pn,Sn+1)-H(pn,Sn-1),ao=H(Pn+1,Cn)-H(Pn-1,Cn),So=H(Pn,Cn+1)-H(Pn,Cn-1);if(Math.hypot(Lo,oo)>12&&Math.hypot(ao,So)>12){let Lr=Math.atan2(oo,Lo),Sr=Math.atan2(So,ao),qa=Oa=>Math.atan2(Math.sin(Oa),Math.cos(Oa)),Po=qa(Je-Lr),Co=qa(Sr-Je),ra=.5*Math.abs(Po+Co),ja=Math.abs(Po-Co);ra<.034&&ja<=.075&&Math.abs(Po)<=.055&&Math.abs(Co)<=.055?d++:ra>=.034&&ra<=.52&&ja<=.16&&Po*Co>=-.002&&M++}}}Ne>50&&m++;let qn=Math.abs(4*et(_t,Lt)-et(_t-1,Lt)-et(_t+1,Lt)-et(_t,Lt-1)-et(_t,Lt+1)),jn=Math.abs(4*rt(_t,Lt)-rt(_t-1,Lt)-rt(_t+1,Lt)-rt(_t,Lt-1)-rt(_t,Lt+1)),On=Math.abs(4*dt(_t,Lt)-dt(_t-1,Lt)-dt(_t+1,Lt)-dt(_t,Lt-1)-dt(_t,Lt+1)),Rn=Math.abs(4*H(_t,Lt)-H(_t-1,Lt)-H(_t+1,Lt)-H(_t,Lt-1)-H(_t,Lt+1)),no=Math.hypot(qn,jn*.8,On*.8);if(Ne<11){c+=Rn,E++;let Je=Ne<=10.5&&no<=Math.max(1.35,Math.hypot(et(_t+1,Lt)-et(_t-1,Lt),rt(_t+1,Lt)-rt(_t-1,Lt),dt(_t+1,Lt)-dt(_t-1,Lt))*.62);if(Ne<4.8&&Rn<5.2&&no<4.5||Je){let Ze=S[Qt];D[Ze]++,N[Ze]+=p[Qt],V[Ze]+=x[Qt],K[Ze]+=w[Qt],W++}}let oa=Math.hypot(et(_t+1,Lt)-et(_t-1,Lt),rt(_t+1,Lt)-rt(_t-1,Lt),dt(_t+1,Lt)-dt(_t-1,Lt))*.5,aa=Math.hypot(et(_t,Lt+1)-et(_t,Lt-1),rt(_t,Lt+1)-rt(_t,Lt-1),dt(_t,Lt+1)-dt(_t,Lt-1))*.5,yo=Math.hypot(oa,aa);if(Ne>=1.15||yo>=.85){X++;let Je=et(_t-1,Lt)<=et(_t,Lt)+.35&&et(_t,Lt)<=et(_t+1,Lt)+.35||et(_t-1,Lt)>=et(_t,Lt)-.35&&et(_t,Lt)>=et(_t+1,Lt)-.35||rt(_t-1,Lt)<=rt(_t,Lt)+.35&&rt(_t,Lt)<=rt(_t+1,Lt)+.35,Ze=et(_t,Lt-1)<=et(_t,Lt)+.35&&et(_t,Lt)<=et(_t,Lt+1)+.35||et(_t,Lt-1)>=et(_t,Lt)-.35&&et(_t,Lt)>=et(_t,Lt+1)-.35||dt(_t,Lt-1)<=dt(_t,Lt)+.35&&dt(_t,Lt)<=dt(_t,Lt+1)+.35;Ne<=16.5&&no<=Math.max(.85,yo*.72)&&(Je||Ze)&&z++}let Qe=H(_t,Lt),Mo=rt(_t,Lt),vo=dt(_t,Lt),vr=Math.hypot(Mo-rt(_t-1,Lt),vo-dt(_t-1,Lt))+Math.hypot(Mo-rt(_t+1,Lt),vo-dt(_t+1,Lt)),Ar=Math.hypot(Mo-rt(_t,Lt-1),vo-dt(_t,Lt-1))+Math.hypot(Mo-rt(_t,Lt+1),vo-dt(_t,Lt+1)),Va=Qe>H(_t-1,Lt)+9&&Qe>H(_t+1,Lt)+9||Qe<H(_t-1,Lt)-9&&Qe<H(_t+1,Lt)-9||vr>18,Na=Qe>H(_t,Lt-1)+9&&Qe>H(_t,Lt+1)+9||Qe<H(_t,Lt-1)-9&&Qe<H(_t,Lt+1)-9||Ar>18;if(Va||Na){B++;let Je=Va&&(Math.abs(Qe-H(_t,Lt-1))<7.5||Math.abs(Qe-H(_t,Lt+1))<7.5),Ze=Na&&(Math.abs(Qe-H(_t-1,Lt))<7.5||Math.abs(Qe-H(_t+1,Lt))<7.5);(Je||Ze)&&L++}let Ao=S[Qt];for(let[Je,Ze]of[[1,0],[0,1],[1,1],[-1,1]]){let Bn=_t+Je,En=Lt+Ze;if(Bn<0||Bn>=T||En<0||En>=I)continue;let pn=S[En*T+Bn];if(pn===Ao)q++;else{let Sn=(Ao>>8&15)-(pn>>8&15),Pn=(Ao>>4&15)-(pn>>4&15),Cn=(Ao&15)-(pn&15),Lo=Sn*Sn+Pn*Pn+Cn*Cn,oo=H(Bn,En),ao=H(_t-Je,Lt-Ze),So=Qe>Math.min(ao,oo)+4&&Qe<Math.max(ao,oo)-4;Lo<=45||So?Q++:tt++}j++}}let Y=0,Z=0,ot=C.sw,xt=C.sh;for(let Lt=1;Lt<xt-1;Lt++)for(let _t=1;_t<ot-1;_t++){let Qt=Lt*ot+_t;if(C.aArr[Qt]<64)continue;let Re=C.LArr[Qt+1]-C.LArr[Qt-1],Ae=C.LArr[Qt+ot]-C.LArr[Qt-ot],Ie=Math.hypot(Re,Ae)*.5;if(Ie>=1){Z++;let $e=Math.abs(4*C.LArr[Qt]-C.LArr[Qt-1]-C.LArr[Qt+1]-C.LArr[Qt-ot]-C.LArr[Qt+ot]);Ie<=14&&$e<Ie*.78&&Y++}}let At=Z>8?St(Y/Z,0,1):0,st=Math.max(1,T*I),at=U/st,ft=E?c/E*.7+(o?f/o*.3:0):0,J=Math.max(1,Q+tt),ut=Q/J,mt=tt/J,it=St(m/Math.max(1,U)*.65+mt*.35,0,1),nt=X>8?St(z/X,0,1):0,lt=St(nt*.62+At*.38,0,1),ht=0,gt=0,ct=0,bt=0;for(let Lt=8;Lt<I-8;Lt+=2)for(let _t=8;_t<T-8;_t+=2){let Qt=Math.abs(H(_t+1,Lt)-H(_t,Lt))+Math.abs(H(_t,Lt+1)-H(_t,Lt));Qt<.35||Qt>16||(_t%8===0||Lt%8===0?(ht+=Qt,gt++):(ct+=Qt,bt++))}let Ct=gt>=16&&bt>=32?ht/gt/Math.max(.5,ct/bt):1,Tt=ft/9+Math.max(0,Ct-1.12)*1.35,yt=Tt<.85?"high":Tt<1.95?"medium":"low",pt=St(Tt/3,0,1),Mt=St((B/st*.65+(g?R/g*.35:0))*6.8,0,1),vt=B>0?St(L/B,0,1):.5,Ft=St(Mt*(.35+.65*vt)*(1-pt*.42),0,1),wt=Ft,Et=new Float64Array(64),Dt=0;for(let Lt=0;Lt<O.length;Lt++)y[Lt]<64||(Et[St(O[Lt]/4|0,0,63)]++,Dt++);let Yt=0;if(Dt>0){for(let Lt=0;Lt<64;Lt++)if(Et[Lt]>0){let _t=Et[Lt]/Dt;Yt-=_t*Math.log2(_t)}}let Xt=0,Pt=[],Rt=Math.max(2,Math.floor(W*45e-5));for(let Lt=0;Lt<4096;Lt++){let _t=D[Lt];if(_t>0&&W>0){let Qt=_t/W;Xt-=Qt*Math.log2(Qt)}if(_t>=Rt){let Qt=N[Lt]/_t,Re=V[Lt]/_t,Ae=K[Lt]/_t,[Ie,$e,dn]=de(Qt,Re,Ae);Pt.push({r:Qt,g:Re,b:Ae,L:Ie,a:$e,b2:dn,cnt:_t})}}Pt.sort((Lt,_t)=>_t.cnt-Lt.cnt);let Gt=[];for(let Lt of Pt){let _t=!1;for(let Qt of Gt)if(De(Lt.L,Lt.a,Lt.b2,Qt.L0,Qt.a0,Qt.b0)<=4.2){let Ae=Qt.cnt+Lt.cnt;Qt.r=(Qt.r*Qt.cnt+Lt.r*Lt.cnt)/Ae,Qt.g=(Qt.g*Qt.cnt+Lt.g*Lt.cnt)/Ae,Qt.b=(Qt.b*Qt.cnt+Lt.b*Lt.cnt)/Ae,Qt.L=(Qt.L*Qt.cnt+Lt.L*Lt.cnt)/Ae,Qt.a=(Qt.a*Qt.cnt+Lt.a*Lt.cnt)/Ae,Qt.b2=(Qt.b2*Qt.cnt+Lt.b2*Lt.cnt)/Ae,Qt.cnt=Ae,_t=!0;break}_t||Gt.push({...Lt,L0:Lt.L,a0:Lt.a,b0:Lt.b2})}let Ut=Ro(t,null,null);Ut&&Ut.hasSmoothGradient?lt=St(Math.max(lt,St(Ut.gradPixelFrac*6.5,.28,.92)),0,1):Ut&&!Ut.hasSmoothGradient&&(Ut.flatPixelFrac>=.28||(Ut.plateauModes||[]).length>=10&&Ut.gradPixelFrac<.035)?lt=Math.min(lt*.22,.07):Ut&&Ut.flatPixelFrac<.22&&it<.32&&Ut.gradPixelFrac>=.035&&(lt=St(Math.max(lt,(1-Ut.flatPixelFrac)*.55),0,1));for(let Lt of Ut.plateauModes||[]){let _t=!1;for(let Qt of Gt)if(De(Lt.L,Lt.a,Lt.b2,Qt.L,Qt.a,Qt.b2)<=3.2){_t=!0;break}_t||Gt.push({r:Lt.r,g:Lt.g,b:Lt.b,L:Lt.L,a:Lt.a,b2:Lt.b2,L0:Lt.L,a0:Lt.a,b0:Lt.b2,cnt:Math.max(4,Math.round(Lt.count/Math.max(1,_*_)))})}if(Ut&&!Ut.hasSmoothGradient&&Ut.flatPixelFrac>=.45&&(Ut.plateauModes||[]).length>=2){let Lt=Ut.plateauModes;for(let _t=Gt.length-1;_t>=0;_t--){let Qt=Gt[_t];if(!Lt.some(Ae=>De(Qt.L,Qt.a,Qt.b2,Ae.L,Ae.a,Ae.b2)<=3.8)&&Qt.cnt<W*.025){let Ae=!1;for(let Ie=0;Ie<Lt.length&&!Ae;Ie++)for(let $e=Ie+1;$e<Lt.length&&!Ae;$e++)Oe(Qt.r,Qt.g,Qt.b,Lt[Ie],Lt[$e])&&(Ae=!0);Ae&&Gt.length>Lt.length&&Gt.splice(_t,1)}}}let qt=Math.max(2,Gt.length,(Ut.plateauModes||[]).length),Vt=Gt.filter(Lt=>Lt.cnt>=Math.max(4,W*.012)),Bt=Gt.filter(Lt=>Lt.cnt<Math.max(4,W*.012)),Ot=[],kt=[],It=[];for(let Lt=0;Lt<Math.min(32,Gt.length);Lt++){let _t=1/0,Qt=1/0;for(let Re=0;Re<Gt.length;Re++){if(Lt===Re)continue;let Ae=Math.hypot(Gt[Lt].L-Gt[Re].L,Gt[Lt].a-Gt[Re].a,Gt[Lt].b2-Gt[Re].b2),Ie=De(Gt[Lt].L,Gt[Lt].a,Gt[Lt].b2,Gt[Re].L,Gt[Re].a,Gt[Re].b2);Ae<_t&&(_t=Ae),Ie<Qt&&(Qt=Ie)}_t<1/0&&(Ot.push(_t),kt.push(Qt),It.push(Math.sqrt(Gt[Lt].cnt||1)))}let Kt=la(Ot,It),Jt=la(kt,It),zt=Kt.mean,ue=Jt.mean,ge=new Set,Fe=Math.max(1,Math.floor(r*s/48e3));for(let Lt=0;Lt<r*s;Lt+=Fe){let _t=Lt*4;i[_t+3]>=64&&ge.add(i[_t]>>3<<10|i[_t+1]>>3<<5|i[_t+2]>>3)}let Nt=Math.max(qt,ge.size),jt=Wa(Gt,Ut,lt,pt,W),te=new Uint8Array(T*I),he=0,le=0,ne=St(Math.max(F,d*.9)/Math.max(1,U),0,1),se=St(M/Math.max(1,U),0,1),ae=St(Math.max(ne,ne*.65+se*.88),0,1),Se=new Int32Array(T*I);for(let Lt=0;Lt<T*I;Lt++){if(te[Lt]||y[Lt]<64)continue;he++;let _t=S[Lt],Qt=0,Re=0;for(Se[Re++]=Lt,te[Lt]=1;Qt<Re;){let Ae=Se[Qt++],Ie=Ae%T,$e=Ae/T|0,dn=[Ie>0?Ae-1:-1,Ie<T-1?Ae+1:-1,$e>0?Ae-T:-1,$e<I-1?Ae+T:-1];for(let nn of dn)nn>=0&&!te[nn]&&y[nn]>=64&&S[nn]===_t&&(te[nn]=1,Se[Re++]=nn)}Re<=3&&le++}let ke=St(le/Math.max(1,he),0,1),ye=St(v/Math.max(1,U),0,1),qe=e&&e.semiFrac>.002,ee=Ft>=.28&&at>=.16&&pt<=.22&&vt>=.45&&(Ut.flatPixelFrac>=.1||it>=.18),oe=(Yt>5.15?2:0)+(qt>36&&jt.surfaceMode!=="flat"?2:0)+(lt>.28?1.5:0)-(ee?2.2:0),Me=(!qe&&ut<.08&&qt<=16&&Nt<=48?3:0)+(mt>.92?2:0),ce=(qe||ut>=.08?3:1)+(Yt<=5.4?1:0)+(jt.surfaceMode==="flat"?1.5:0)+(ee?2:0),ve;!ee&&oe>=Me&&oe>=ce&&oe>=3.2&&jt.surfaceMode!=="flat"?ve="photo":Me>ce?ve="aliased":ve="blended";let me=St((jt.surfaceMode==="flat"?.45:.1)+(qt<=16?.28:qt<=26?.14:.04)+it*.22+ae*.22-lt*.35,.05,1),ie=St(.32+(jt.colorStructureMode==="MULTI_FAMILY_FLAT"||jt.colorStructureMode==="DISCRETE_FAMILY_SHADES"?.32:.14)+Ft*.32+(ee?.28:0)+(1-Math.abs(lt-.22))*.18,.08,1),Le=St((jt.surfaceMode==="gradient"?.42:jt.surfaceMode==="mixed"?.22:.04)+lt*.38+(Yt>5?(Yt-4.8)*.25:0)-(jt.surfaceMode==="flat"?.35:0)-(ee?.28:0),.02,1);jt.surfaceMode==="flat"&&(Ut.flatPixelFrac>=.32||!Ut.hasSmoothGradient&&Vt.length<=4&&ae>=.4)?(Le*=.25,qt<=14&&(ne>=.22||ae>=.38&&lt<=.06&&Ut.flatPixelFrac>=.55)?(me+=.42,ie*=.62):ie+=.28):ee?(Le*=.36,ie+=.35):ve!=="photo"&&Ut.flatPixelFrac>=.25&&Yt<5.1&&(Le*=.42,ie+=.3);let Ge=me+ie+Le||1,Ht={flat:+(me/Ge).toFixed(3),illustration:+(ie/Ge).toFixed(3),photo:+(Le/Ge).toFixed(3)},re=[["flat",Ht.flat],["illustration",Ht.illustration],["photo",Ht.photo]].sort((Lt,_t)=>_t[1]-Lt[1]),je=re[0][0],fn=+St(.52+(re[0][1]-re[1][1])*.95,.45,.99).toFixed(2),en={geometryPriority:+St(it*.42+ae*.36+Ht.flat*.28,.1,.98).toFixed(2),detailProtection:+St(Ft*.55+(1-pt)*.2+(jt.colorStructureMode==="DISCRETE_FAMILY_SHADES"?.25:.1),.15,.98).toFixed(2),noiseSuppression:+St(pt*.65+(jt.colorStructureMode==="FAMILY_NOISE"?.28:0)+(ke>.35?.15:0),.05,.96).toFixed(2),gradientPreservation:+St(jt.gradientContinuity*.6+(jt.surfaceMode!=="flat"?.28:0)+(jt.isSingleFamilyMultiShade||jt.colorStructureMode==="DISCRETE_FAMILY_SHADES"?.25:0),.05,.98).toFixed(2),alphaSensitivity:+St((e&&e.hasAlpha?.65:.1)+(e&&e.semiFrac>.005?.3:0),.08,.98).toFixed(2),topologyProtection:+St(.45+ye*.3+Ft*.25,.25,.98).toFixed(2)},sn=Math.max(a||r,l||s),wn=sn<=512?"small":sn<=1500?"medium":sn<=3e3?"large":"uhd",yn=[{stage:"1. Input & Multiskala",val:`${r}\xD7${s} px (Skala 1:${_} & 1:${u})`,desc:`Alpha ${e&&e.hasAlpha?Math.round(e.transparentFrac*100)+"%":"Opaque"} \xB7 Full-res patch aktif`},{stage:"2. Distribusi Warna",val:`${qt} Efektif (${Vt.length} Dom / ${Bt.length} Minor)`,desc:`\u0394E00 Q25=${Jt.q25} \xB7 Q50=${Jt.q50} \xB7 Q90=${Jt.q90}`},{stage:"3. Struktur Tepi",val:`Ketajaman ${Math.round(it*100)}% \xB7 Kepadatan ${(at*100).toFixed(1)}%`,desc:`Lurus ${Math.round(ne*100)}% \xB7 Simpang ${Math.round(ye*100)}%`},{stage:"4. Noise & Tekstur",val:`Noise ${Math.round(pt*100)}% \xB7 Blok JPEG ${Ct.toFixed(2)}\xD7`,desc:`Detail Nyata ${Math.round(Ft*100)}% (Koherensi ${Math.round(vt*100)}%)`},{stage:"5. Topologi Region",val:`${he} Komponen \xB7 Island ${(ke*100).toFixed(0)}%`,desc:`${Ut.plateauModes.length} Plateau Solid (${Math.round(Ut.flatPixelFrac*100)}% area)`},{stage:"6. Gradasi & Nada",val:`Permukaan: ${jt.surfaceMode.toUpperCase()}`,desc:`Kontinuitas L*a*b* ${Math.round(lt*100)}% \xB7 ${jt.colorStructureMode}`},{stage:"7. Geometri & Stroke",val:`Prioritas Geometri ${Math.round(en.geometryPriority*100)}%`,desc:`Proteksi Detail ${Math.round(en.detailProtection*100)}% \xB7 Topologi ${Math.round(en.topologyProtection*100)}%`},{stage:"8. Resolver & Validasi",val:`Keyakinan ${Math.round(fn*100)}% (${je.toUpperCase()})`,desc:`Bobot A:${Math.round(Ht.flat*100)}% B:${Math.round(Ht.illustration*100)}% C:${Math.round(Ht.photo*100)}%`}];return{type:ve,quality:yt,noise:+pt.toFixed(2),edgeDensity:+at.toFixed(3),blendFrac:ut,sharpFrac:mt,edgeSharpness:+it.toFixed(2),gradientContinuity:+lt.toFixed(2),microDetailDensity:+wt.toFixed(2),meaningfulDetailDensity:+Ft.toFixed(2),coherenceRatio:+vt.toFixed(2),straightEdgeRatio:+ne.toFixed(2),circularArcRatio:+se.toFixed(2),analyticGeometryRatio:+ae.toFixed(2),junctionDensity:+ye.toFixed(2),islandRatio:+ke.toFixed(2),entropy:+Yt.toFixed(2),colorEntropy:+Xt.toFixed(2),nColors:Nt,effectiveColors:qt,dominantClusterCount:Vt.length,minorClusterCount:Bt.length,meanNearestDeltaE:zt,meanNearestDeltaE00:ue,de76Quantiles:Kt,de00Quantiles:Jt,blockiness:+Ct.toFixed(2),profileId:je,profileWeights:Ht,confidence:fn,adaptiveAttributes:en,familyColorProfile:jt,colorFamilyCount:jt.colorFamilyCount,surfaceMode:jt.surfaceMode,colorStructureMode:jt.colorStructureMode,profiler8Stages:yn,maxSide:sn,resBucket:wn,label:{blended:"Artwork with Blended Edges",aliased:"Artwork without Blended Edges",photo:"Photograph"}[ve],qlabel:{high:"High",medium:"Medium",low:"Low"}[yt]}}function ro(t,e=800,a=800,l="auto"){let n=t||{},r=Math.max(e||n.maxSide||800,a||n.maxSide||800),s=r<=512?"small":r<=1500?"medium":r<=3e3?"large":"uhd",i={small:"\u2264 512 px (Proteksi Detail Mikro Ketat)",medium:"513\u20131500 px (Kalibrasi Standar)",large:"1501\u20133000 px (Skala Resolusi Tinggi)",uhd:"> 3000 px (Multi-Skala UHD)"}[s],_=!!(l&&l!=="auto"),u=_?l:n.profileId||"illustration",b=n.effectiveColors||12,C=n.noise!=null?n.noise:.2,T=n.edgeSharpness!=null?n.edgeSharpness:.6,I=n.gradientContinuity!=null?n.gradientContinuity:.12,p=n.meaningfulDetailDensity!=null?n.meaningfulDetailDensity:n.microDetailDensity!=null?n.microDetailDensity:.15,x=n.meanNearestDeltaE!=null?n.meanNearestDeltaE:12,w=n.meanNearestDeltaE00!=null?n.meanNearestDeltaE00:8.5,y=n.de76Quantiles&&n.de76Quantiles.q25||x*.8,G=_?{flat:u==="flat"?1:0,illustration:u==="illustration"?1:0,photo:u==="photo"?1:0}:n.profileWeights||{flat:u==="flat"?.7:.15,illustration:u==="illustration"?.7:.2,photo:u==="photo"?.7:.1},$=n.adaptiveAttributes||{geometryPriority:u==="flat"?.82:.55,detailProtection:p>.22?.78:.58,noiseSuppression:C,gradientPreservation:I,alphaSensitivity:.5,topologyProtection:.65},k=n.familyColorProfile||{colorFamilyCount:2,surfaceMode:I>.26?"gradient":"flat",colorStructureMode:"MIXED_COLOR_STRUCTURE",familyCoherence:.5,shadeLevelCount:b,lightnessSpread:45,chromaSpread:30,plateauSupport:.6,gradientContinuity:I,familyNoiseRatio:C*.5},O={flat:{id:"flat",code:"Profil A",title:"Profil A \u2014 Ikon, Logo & Ilustrasi Flat",shortTitle:"Profil A (Flat / Logo)",desc:"Prioritas bentuk geometris akurat, sudut C\u2070 tegas, warna solid bersih, dan jumlah node minimal.",bilateralRadius:1,sigmaSpatial:1.15,sigmaColor:13,wedgeGuardThr:620,skipBilateralIfClean:!0,targetKMax:12,layerDifference:7.4,sensitivity:"medium",qtVarThr:135,snapPasses:4,complexity:54,mrfBetaScale:1.08,mrfIters:16,minPixels:4,sliverRatioThr:.03,smoothMethod:"hybrid",smoothness:52,despeckleJitter:68,lineStraighten:82,axisSnap:!0,axisSnapDeg:2.8,extremumAlign:!0,cornerMode:"typo",cornerAngle:42,lineCurveSensitivity:80,apexSharpness:88,cornerRoundness:60,protectStemCaps:!0,nodeDensity:66},illustration:{id:"illustration",code:"Profil B",title:"Profil B \u2014 Ilustrasi Berwarna & Kontur Organik",shortTitle:"Profil B (Ilustrasi)",desc:"Prioritas mempertahankan bentuk organik, garis jari/line-art tipis, gradasi lembut pipi/rambut, dan kurva mulus.",bilateralRadius:1,sigmaSpatial:1.18,sigmaColor:14,wedgeGuardThr:540,skipBilateralIfClean:!1,targetKMax:28,layerDifference:3.8,sensitivity:"high",qtVarThr:145,snapPasses:3,complexity:68,mrfBetaScale:.92,mrfIters:14,minPixels:4,sliverRatioThr:.014,smoothMethod:"hybrid",smoothness:54,despeckleJitter:64,lineStraighten:52,axisSnap:!1,axisSnapDeg:2,extremumAlign:!0,cornerMode:"typo",cornerAngle:46,lineCurveSensitivity:72,apexSharpness:78,cornerRoundness:68,protectStemCaps:!0,nodeDensity:60},photo:{id:"photo",code:"Profil C",title:"Profil C \u2014 Foto & Lukisan Gradasi Kompleks",shortTitle:"Profil C (Foto / Lukisan)",desc:"Prioritas pengelompokan tonal/gradasi yang koheren, penapisan edge-preserving, dan kendali jumlah poligon.",bilateralRadius:2,sigmaSpatial:1.75,sigmaColor:25,wedgeGuardThr:880,skipBilateralIfClean:!1,targetKMax:26,layerDifference:5.8,sensitivity:"medium",qtVarThr:340,snapPasses:3,complexity:70,mrfBetaScale:1.12,mrfIters:14,minPixels:6,sliverRatioThr:.022,smoothMethod:"hybrid",smoothness:60,despeckleJitter:70,lineStraighten:42,axisSnap:!1,axisSnapDeg:2,extremumAlign:!0,cornerMode:"organic",cornerAngle:50,lineCurveSensitivity:64,apexSharpness:72,cornerRoundness:80,protectStemCaps:!1,nodeDensity:52}},S=O.flat,R=O.illustration,g=O.photo,f=j=>S[j]*G.flat+R[j]*G.illustration+g[j]*G.photo,o={...O[u]||R,sigmaSpatial:+f("sigmaSpatial").toFixed(2),sigmaColor:Math.round(f("sigmaColor")),wedgeGuardThr:Math.round(f("wedgeGuardThr")),qtVarThr:Math.round(f("qtVarThr")),complexity:Math.round(f("complexity")),mrfBetaScale:+f("mrfBetaScale").toFixed(2),mrfIters:Math.round(f("mrfIters")),smoothness:Math.round(f("smoothness")),despeckleJitter:Math.round(f("despeckleJitter")),lineStraighten:Math.round(f("lineStraighten")),axisSnapDeg:+f("axisSnapDeg").toFixed(1),cornerAngle:Math.round(f("cornerAngle")),lineCurveSensitivity:Math.round(f("lineCurveSensitivity")),apexSharpness:Math.round(f("apexSharpness")),cornerRoundness:Math.round(f("cornerRoundness")),nodeDensity:Math.round(f("nodeDensity"))},h=St((y-8.5)*.14,-.9,1.1),A=$.noiseSuppression*1.45,U=$.gradientPreservation*1.35,P=$.detailProtection*.85,c=f("layerDifference")+h+A-U-P;if(k.colorStructureMode==="DISCRETE_FAMILY_SHADES")c=Math.min(c,St(y*.52,3.4,5.4)),o.targetKMax=St(Math.round(Math.max(b,k.shadeLevelCount)*1.2+3),6,28),o.sensitivity="high";else if(k.colorStructureMode==="FAMILY_GRADIENT"||k.colorStructureMode==="MULTI_FAMILY_GRADIENT"){c=St(c-1.05,2.6,4.4);let j=Math.max(b,Math.round(20+I*16));o.targetKMax=St(Math.round(j*1.22+6),24,38),o.sensitivity="high",o.enableGradientFitting=!0}else if(k.colorStructureMode==="FAMILY_NOISE")c=St(c+1.1,6.4,9.2),o.targetKMax=St(Math.round(b*.85+2),4,18);else if(k.colorStructureMode==="MULTI_FAMILY_FLAT"){let j=Math.max(b,k.shadeLevelCount);c=j>=24?St(c*.78,3.6,5.2):St(c,4.4,6.8),o.targetKMax=St(Math.round(j*1.15+3),6,44)}else o.targetKMax=St(Math.round(b*(u==="photo"?.96:1.15)+3),4,32);if(o.layerDifference=+St(c,3.2,9.5).toFixed(2),o.layerDifference00=+St(o.layerDifference*.68,2.2,6.8).toFixed(2),k.surfaceMode==="flat"&&$.noiseSuppression<.18&&T>.7)o.skipBilateral=!0,o.sigmaColor=10;else{o.skipBilateral=!1;let j=$.noiseSuppression*14,z=$.detailProtection*8;o.sigmaColor=Math.round(St(o.sigmaColor+j-z,10,34)),o.sigmaSpatial=+St(o.sigmaSpatial+$.noiseSuppression*.28-$.detailProtection*.2,1,2.1).toFixed(2)}o.snapPasses=$.geometryPriority>.65?4:u==="photo"?3:4;let E=Math.round(f("minPixels"));s==="small"?E=u==="photo"?3:2:(s==="large"||s==="uhd")&&(E=Math.round(E*1.25)),$.detailProtection>=.62||k.colorStructureMode==="DISCRETE_FAMILY_SHADES"?(E=Math.max(2,E-1),o.complexity=St(o.complexity+Math.round($.detailProtection*12),42,88)):$.noiseSuppression>=.58&&k.surfaceMode!=="flat"&&(E=St(E+2,3,10),o.complexity=St(o.complexity-6,36,82)),o.minPixels=St(E,2,12);let q=(n.circularArcRatio||0)>(n.straightEdgeRatio||0)*1.12&&(n.straightEdgeRatio||0)<.3;$.geometryPriority>=.72?(o.smoothness=St(o.smoothness-5,42,64),q?(o.lineStraighten=St(Math.round(30+(n.straightEdgeRatio||.2)*70),28,48),o.axisSnap=!1):(o.lineStraighten=St(Math.round(o.lineStraighten+$.geometryPriority*12),68,94),o.axisSnap=!0)):q&&(o.lineStraighten=St(Math.round(28+(n.straightEdgeRatio||.2)*65),26,46),o.axisSnap=!1),$.detailProtection>=.65&&u==="flat"?(o.smoothness=St(o.smoothness-4,44,70),o.nodeDensity=St(o.nodeDensity+6,54,76)):($.noiseSuppression>=.55||u!=="flat")&&(o.despeckleJitter=St(o.despeckleJitter+5,68,88));let Q=+Math.pow(10,-.8+o.smoothness/100*2.25).toFixed(2),tt=+Math.max(.08,.38-o.nodeDensity/100*.28).toFixed(2);return{id:o.id,forced:_,code:o.code,title:o.title,shortTitle:o.shortTitle,desc:o.desc,resBucket:s,resBucketLabel:i,maxSide:r,confidence:n.confidence??.85,profileWeights:G,adaptiveAttributes:$,familyColorProfile:k,profiler8Stages:n.profiler8Stages||[],metrics:{effectiveColors:b,rawColors:n.nColors||b,colorEntropy:n.colorEntropy||n.entropy||0,edgeDensity:n.edgeDensity||0,edgeSharpness:T,microDetailDensity:p,meaningfulDetailDensity:p,gradientContinuity:I,noiseLevel:C,meanNearestDeltaE:x,meanNearestDeltaE00:w,de00Quantiles:n.de00Quantiles||{q10:5,q25:7,q50:9,q90:18},colorFamilyCount:k.colorFamilyCount,surfaceMode:k.surfaceMode,colorStructureMode:k.colorStructureMode},keyParams:{layerDifference:o.layerDifference,layerDifference00:o.layerDifference00,filterSpeckle:o.minPixels,smoothingStrength:o.smoothness,smoothingLambda:Q,bezierTolerance:tt,nodeDensity:o.nodeDensity,bilateralSigmaColor:o.skipBilateral?0:o.sigmaColor,targetKMax:o.targetKMax},params:o}}function ua(t){let e=t.data,a=t.width*t.height,l=0,n=0,r=Math.max(1,Math.floor(a/8e4)),s=0;for(let i=3;i<e.length;i+=4*r){let _=e[i];s++,_<128?l++:_<252&&n++}return{hasAlpha:l>0||n>0,transparentFrac:l/Math.max(1,s),semiFrac:n/Math.max(1,s),binary:n/Math.max(1,s+l)<.015}}function _o(t,e,a,l=!1){if(!l&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline!=="off"&&typeof xe<"u"&&xe.gpuFlattenAlpha){let T=xe.gpuFlattenAlpha(t,e,a);if(T)return T}let{data:n,w:r,h:s}=t,i=n.data,_=new Uint8ClampedArray(i),u=e==="custom"?un(a||"#ffffff"):[255,255,255],b=new Uint8Array(r*s),C=new Uint8Array(r*s);for(let T=3,I=0;T<i.length;T+=4,I++)C[I]=i[T];t.origAlpha=C;for(let T=0;T<r*s;T++){let I=T*4,p=C[T]/255;if(e==="keep"){let x=T%r,w=T/r|0,y=!1;if(p>=.25&&p<.45)for(let $=-1;$<=1&&!y;$++){let k=w+$;if(!(k<0||k>=s))for(let O=-1;O<=1;O++){let S=x+O;if(!(S<0||S>=r)&&C[k*r+S]>=210){y=!0;break}}}if(p<(y?.25:.4)){b[T]=1,i[I]=i[I+1]=i[I+2]=i[I+3]=0;continue}if(p<.98){let $=0,k=0,O=0,S=0;for(let R=-3;R<=3;R++){let g=w+R;if(g<0||g>=s)continue;let f=g*r;for(let o=-3;o<=3;o++){let h=x+o;if(h<0||h>=r)continue;let A=f+h;if(C[A]>=245){let U=1/(o*o+R*R+.5),P=A*4;$+=_[P]*U,k+=_[P+1]*U,O+=_[P+2]*U,S+=U}}}if(S>0){let R=$/S,g=k/S,f=O/S;i[I]=St(Math.round(R*.88+_[I]*.12),0,255),i[I+1]=St(Math.round(g*.88+_[I+1]*.12),0,255),i[I+2]=St(Math.round(f*.88+_[I+2]*.12),0,255)}else i[I]=_[I],i[I+1]=_[I+1],i[I+2]=_[I+2];i[I+3]=255;continue}}i[I]=Math.round(_[I]*p+u[0]*(1-p)),i[I+1]=Math.round(_[I+1]*p+u[1]*(1-p)),i[I+2]=Math.round(_[I+2]*p+u[2]*(1-p)),i[I+3]=255}return b}function wo(t,e=0){if(!t.length)return null;let a=e%3,l=["L","a","b"][a];t.sort((r,s)=>r[l]-s[l]);let n=t.length>>1;return{p:t[n],ax:a,k:l,l:wo(t.slice(0,n),e+1),r:wo(t.slice(n+1),e+1)}}function so(t,e,a,l,n){if(!t)return n;let r=t.p,s=e-r.L,i=a-r.a,_=l-r.b,u=s*s+i*i+_*_;u<n.d&&(n.d=u,n.i=r.i);let b=t.ax===0?e:t.ax===1?a:l,C=r[t.k],T=b<C?t.l:t.r,I=b<C?t.r:t.l;so(T,e,a,l,n);let p=b-C;return p*p<n.d&&so(I,e,a,l,n),n}function Ro(t,e,a=null){if(!t||!t.data)return{plateauModes:[],isSingleFamilyMultiShade:!1,hasSmoothGradient:!1,gradPixelFrac:0,flatPixelFrac:0,gradSamples:[]};let l=(e?2:1)+(a?4:0);if(t._plateauAnalysis&&t._plateauCacheKey===l)return t._plateauAnalysis;let{w:n,h:r}=t,s=t.rawRgba&&t.rawRgba.length===n*r*4?t.rawRgba:t.data.data,i=a?a.mag:null,_=Math.max(n,r)>560?Math.max(1,Math.floor(Math.max(n,r)/480)):1,u=_*_,b=new Map,C=[],T=0,I=0,p=0,x=Math.max(1,Math.floor(n*r/u/6e3));for(let c=2;c<r-2;c+=_){let E=c*n;for(let q=2;q<n-2;q+=_){let Q=E+q;if(e&&e[Q])continue;T+=u;let tt=0;if(i)tt=i[Q];else{let L=(Q-1)*4,m=(Q+1)*4,F=(Q-n)*4,d=(Q+n)*4,M=.299*(s[m]-s[L])+.587*(s[m+1]-s[L+1])+.114*(s[m+2]-s[L+2]),v=.299*(s[d]-s[F])+.587*(s[d+1]-s[F+1])+.114*(s[d+2]-s[F+2]);tt=.5*Math.hypot(M,v)}let j=Q*4,z=s[j],X=s[j+1],B=s[j+2];if(tt<=3.4){let L=0,m=0,F=0;for(let d=-1;d<=1;d++){let M=(c+d)*n;for(let v=-1;v<=1;v++){if(v===0&&d===0)continue;let D=M+q+v;if(e&&e[D])continue;let N=D*4;Wt(z,X,B,s[N],s[N+1],s[N+2])<=54&&(L++,d===0&&m++,v===0&&F++)}}if(L>=6){let d=(Q-2)*4,M=(Q+2)*4,v=(Q-2*n)*4,D=(Q+2*n)*4,N=Wt(s[d],s[d+1],s[d+2],s[M],s[M+1],s[M+2]),V=Wt(s[v],s[v+1],s[v+2],s[D],s[D+1],s[D+2]),K=L>=7&&N<=90&&V<=90,W=tt<=2.2&&m===2&&F===2&&N<=42&&Wt(z,X,B,s[d],s[d+1],s[d+2])<=42&&Wt(z,X,B,s[M],s[M+1],s[M+2])<=42,H=tt<=2.2&&m===2&&F===2&&V<=42&&Wt(z,X,B,s[v],s[v+1],s[v+2])<=42&&Wt(z,X,B,s[D],s[D+1],s[D+2])<=42,et=Y=>.299*s[Y*4]+.587*s[Y*4+1]+.114*s[Y*4+2],rt=Y=>{let Z=0,ot=0;for(let At=0;At+1<Y.length;At++){let st=Y[At+1]-Y[At];st>=.9?Z++:st<=-.9&&ot++}return Math.abs(Y[Y.length-1]-Y[0])>=3&&(Z>=3&&ot===0||ot>=3&&Z===0)},dt=H&&rt([et(Q-2),et(Q-1),et(Q),et(Q+1),et(Q+2)])||W&&rt([et(Q-2*n),et(Q-n),et(Q),et(Q+n),et(Q+2*n)]);if((K||W||H)&&!dt){I+=u;let Y=z>>1<<14|X>>1<<7|B>>1,Z=b.get(Y);Z||(Z={rSum:0,gSum:0,bSum:0,count:0},b.set(Y,Z)),Z.rSum+=z*u,Z.gSum+=X*u,Z.bSum+=B*u,Z.count+=u;continue}}}if(tt>=.65&&tt<=16){if(i&&(i[Q-2]>18||i[Q+2]>18||i[Q-2*n]>18||i[Q+2*n]>18))continue;let L=(m,F)=>{if(e&&(e[Q-m]||e[Q+m]||e[Q-F]||e[Q+F]))return!1;let d=(Q-m)*4,M=(Q+m)*4,v=(Q-F)*4,D=(Q+F)*4;if(Wt(z,X,B,(s[d]+s[M])*.5,(s[d+1]+s[M+1])*.5,(s[d+2]+s[M+2])*.5)>18||Wt(z,X,B,(s[v]+s[D])*.5,(s[v+1]+s[D+1])*.5,(s[v+2]+s[D+2])*.5)>38)return!1;let K=Wt(s[v],s[v+1],s[v+2],s[D],s[D+1],s[D+2]),W=Wt(s[d],s[d+1],s[d+2],s[M],s[M+1],s[M+2]);if(K>40){if(W>K*.5)return!1;let H=Wt(z,X,B,s[v],s[v+1],s[v+2]),et=Wt(z,X,B,s[D],s[D+1],s[D+2]);if(H<K*.08||et<K*.08)return!1}return!0};if(L(1,2)&&L(n,2*n)){let m=(Q-1)*4,F=(Q+1)*4,d=(Q-n)*4,M=(Q+n)*4,v=(Q-2)*4,D=(Q+2)*4,N=(Q-2*n)*4,V=(Q+2*n)*4,K=Wt(s[m],s[m+1],s[m+2],s[F],s[F+1],s[F+2])+Wt(s[d],s[d+1],s[d+2],s[M],s[M+1],s[M+2]),W=Wt(s[v],s[v+1],s[v+2],s[D],s[D+1],s[D+2])+Wt(s[N],s[N+1],s[N+2],s[V],s[V+1],s[V+2]);if(K>=20&&W>=56&&W>=K*1.95){let H=p;if(p+=u,Math.floor(p/x)>Math.floor(H/x)&&C.length<6e3){let[et,rt,dt]=de(z,X,B);C.push({r:z,g:X,b:B,L:et,a:rt,b2:dt,pureCore:!0,isGradCore:!0})}}}}}}let w=I/Math.max(1,T),y=p/Math.max(1,T),G=y>=.045||y>=.02&&w<.28&&p>=260,$=[];b.forEach(c=>{let E=c.rSum/c.count,q=c.gSum/c.count,Q=c.bSum/c.count,[tt,j,z]=de(E,q,Q);$.push({r:E,g:q,b:Q,L:tt,a:j,b2:z,count:c.count})}),$.sort((c,E)=>E.count-c.count);let k=t.w*t.h<=15e4,O=[],S=G||k?16:10.5,R=k?3.5:2.45;for(let c of $){let E=null;for(let q of O){let Q=(c.L-q.L0)**2+(c.a-q.a0)**2+(c.b2-q.b0)**2,tt=De(c.L,c.a,c.b2,q.L0,q.a0,q.b0);if(Q<=S||tt<=R){E=q;break}}if(E){let q=E.count+c.count;E.r=(E.r*E.count+c.r*c.count)/q,E.g=(E.g*E.count+c.g*c.count)/q,E.b=(E.b*E.count+c.b*c.count)/q,E.L=(E.L*E.count+c.L*c.count)/q,E.a=(E.a*E.count+c.a*c.count)/q,E.b2=(E.b2*E.count+c.b2*c.count)/q,E.count=q}else O.push({r:c.r,g:c.g,b:c.b,L:c.L,a:c.a,b2:c.b2,L0:c.L,a0:c.a,b0:c.b2,rPeak:Math.round(c.r),gPeak:Math.round(c.g),bPeak:Math.round(c.b),count:c.count})}O.sort((c,E)=>E.count-c.count);let g=G?Math.max(16,Math.round(T*.0022)):Math.max(16,Math.min(200,Math.round(T*24e-5))),f=O.filter(c=>c.count>=g);if(!G&&f.length>2)for(let c=0;c<2;c++)for(let E=f.length-1;E>=1;E--){let q=f[E],Q=Math.hypot(q.a,q.b2);for(let tt=0;tt<E;tt++){let j=f[tt],z=Math.hypot(j.a,j.b2),X=De(q.L,q.a,q.b2,j.L,j.a,j.b2),B=Math.hypot(q.r-j.r,q.g-j.g,q.b-j.b),L=Q>=14&&z>=14&&(q.a*j.a+q.b2*j.b2)/(Q*z)>=.94,m=t.w*t.h<=15e4,F=m&&q.a>=8&&j.a>=8&&q.b2>=18&&j.b2>=18&&Math.abs(q.L-j.L)<=8.5&&B<=32,d=L&&X<=(m?4.65:4.68)&&(m||Math.abs(q.L-j.L)<=4.8||Math.min(Q,z)>=48),M=m?25:Math.min(q.L,j.L)>=52||Math.min(Q,z)>=50?23.5:16;if(X<=3.85||B<=M||d||F){let v=j.count+q.count;j.r=(j.r*j.count+q.r*q.count)/v,j.g=(j.g*j.count+q.g*q.count)/v,j.b=(j.b*j.count+q.b*q.count)/v;let[D,N,V]=de(j.r,j.g,j.b);j.L=D,j.a=N,j.b2=V,j.count=v,f.splice(E,1);break}}}let o=f.filter((c,E)=>{if(E<4||c.count>=T*52e-5)return!0;for(let q=0;q<Math.min(E,6);q++)if(!(f[q].count<c.count*8))for(let Q=q+1;Q<Math.min(E,6);Q++){if(f[Q].count<c.count*8)continue;let tt=Oe(c.r,c.g,c.b,f[q],f[Q]);if(tt&&tt.perpD2<=180)return!1}return!0}).map(c=>{let E=Math.round(c.r),q=Math.round(c.g),Q=Math.round(c.b),[tt,j,z]=de(E,q,Q);return{r:E,g:q,b:Q,L:tt,a:j,b2:z,count:c.count,hex:_e(E,q,Q),verifiedPlateau:!0}});if(C.length>0&&o.length>0){let c=C.length,E=C.filter(Q=>{for(let tt=0;tt<o.length;tt++){let j=o[tt];if((Q.L-j.L)**2+(Q.a-j.a)**2+(Q.b2-j.b2)**2<=16)return!1}return!0}),q=E.length/Math.max(1,c);C.length=0;for(let Q=0;Q<E.length;Q++)C.push(E[Q]);p=Math.round(p*q)}let h=p/Math.max(1,T),A=h>=.045||h>=.02&&w<.28&&p>=260&&h>=w*.15,U=!1;if(o.length>=4&&!A){let c=0,E=0,q=0;for(let Q of o){let tt=Math.hypot(Q.a,Q.b2);tt>=8&&(c++,E+=Q.a/tt*Q.count,q+=Q.b2/tt*Q.count)}if(c<=1)U=!0;else{let Q=Math.hypot(E,q)||1,tt=E/Q,j=q/Q,z=0;for(let X of o){let B=Math.hypot(X.a,X.b2);(B<9.5||X.L<=24||X.L>=88||(X.a*tt+X.b2*j)/B>=.72)&&z++}z>=Math.max(4,Math.ceil(o.length*.75))&&(U=!0)}}let P={plateauModes:o,isSingleFamilyMultiShade:U,hasSmoothGradient:A,gradPixelFrac:+h.toFixed(4),flatPixelFrac:+w.toFixed(4),gradSamples:C};return t._plateauAnalysis=P,t._plateauCacheKey=l,P}function Bo(t,e,a,l=32e3){let{data:n,w:r,h:s}=t,i=n.data,_=a?a.mag:null,u=[],b=Math.max(1,Math.floor(r*s/l)),C=(x,w,y)=>{if(_&&_[y]>16)return!0;let G=y*4,$=i[G],k=i[G+1],O=i[G+2],S=_?_[y]:0;if(S<=2.2&&x>=1&&x<r-1&&w>=1&&w<s-1){let f=0;for(let o of[y-1,y+1,y-r,y+r]){if(e&&e[o])continue;let h=o*4;Wt($,k,O,i[h],i[h+1],i[h+2])<=42&&f++}if(f>=3)return!1}let R=S>3.2,g=(f,o)=>{let h=y-o*f,A=y+o*f;if(e&&(e[h]||e[A]))return!1;let U=h*4,P=A*4,c=i[U],E=i[U+1],q=i[U+2],Q=i[P],tt=i[P+1],j=i[P+2],z=Wt(c,E,q,Q,tt,j);if(z<420)return!1;if(o>=2){let V=y-f,K=y+f,W=V*4,H=K*4,et=Wt(i[W],i[W+1],i[W+2],i[H],i[H+1],i[H+2]),rt=Wt(c,E,q,i[W],i[W+1],i[W+2]),dt=Wt(i[H],i[H+1],i[H+2],Q,tt,j);if(rt>=.035*z&&dt>=.035*z&&et<=.42*z)return!1}else if(o===1&&S<=11&&x>=2&&x<r-2&&w>=2&&w<s-2){let V=y-2*f,K=y+2*f;if(!(e&&(e[V]||e[K]))){let W=V*4,H=K*4,et=Wt(i[W],i[W+1],i[W+2],i[H],i[H+1],i[H+2]);if(et>180&&z<=.42*et)return!1}}let X=.299*$+.587*k+.114*O,B=.299*c+.587*E+.114*q,L=.299*Q+.587*tt+.114*j;if(X<Math.min(B,L)-3.5&&(z<=2200||X<=22)||X>Math.max(B,L)+4&&z<=2200)return!1;let m=c-Q,F=E-tt,d=q-j,M=m*m+F*F+d*d;if(M<100)return!1;let v=(($-Q)*m+(k-tt)*F+(O-j)*d)/M,D=R?-.24:.03,N=R?1.24:.97;if(v>D&&v<N){let V=St(v,0,1),K=Q+V*m,W=tt+V*F,H=j+V*d;if(Wt($,k,O,K,W,H)<=z*.22+560){if(v>=.03&&v<=.97)return!0;let rt=Math.min(Wt($,k,O,c,E,q),Wt($,k,O,Q,tt,j));if(rt>14&&rt<z*.28)return!0}}return!1};for(let f of[1,2,3])if(x>=f&&x<r-f&&g(1,f)||w>=f&&w<s-f&&g(r,f)||x>=f&&x<r-f&&w>=f&&w<s-f&&(g(r+1,f)||g(r-1,f)))return!0;return!1},T=(x,w,y)=>{let G=_?_[y]:0;if(G>24)return{coherent:!1,pureCore:!1,isGradCore:!1};let $=y*4,k=i[$],O=i[$+1],S=i[$+2],R=Math.max(k,O,S)-Math.min(k,O,S),g=.299*k+.587*O+.114*S,f=0,o=0,h=0,A=0,U=G,P=0;for(let j=-1;j<=1;j++){let z=w+j;if(!(z<0||z>=s))for(let X=-1;X<=1;X++){if(X===0&&j===0)continue;let B=x+X;if(B<0||B>=r)continue;let L=z*r+B;if(e&&e[L])continue;let m=_?_[L]:0;m>U&&(U=m);let F=L*4,d=i[F],M=i[F+1],v=i[F+2],D=.299*d+.587*M+.114*v;D>P&&(P=D);let N=Wt(k,O,S,d,M,v);N<240&&o++,m<=15&&N<150&&(f++,j===0&&h++,X===0&&A++)}}let c=G<=16&&f>=5&&h>=1&&A>=1,E=c&&f>=7&&U<7;if(E&&x>=2&&x<r-2&&w>=2&&w<s-2)for(let j of[y-2,y+2,y-2*r,y+2*r]){if(e&&e[j]||_&&_[j]>12){E=!1;break}let z=j*4;if(Wt(k,O,S,i[z],i[z+1],i[z+2])>220){E=!1;break}}if(c)return{coherent:!0,pureCore:E,isGradCore:!1};let q=t._plateauAnalysis&&t._plateauAnalysis.plateauModes?t._plateauAnalysis.plateauModes:[],Q=!!(t._plateauAnalysis&&t._plateauAnalysis.hasSmoothGradient),tt=()=>{for(let j=0;j<q.length;j++)for(let z=j+1;z<q.length;z++)if(Oe(k,O,S,q[j],q[z]))return!0;return!1};if(Q&&R>=22&&f>=4&&G<=14&&U<=16&&!tt())return{coherent:!0,pureCore:!0,isGradCore:!0,isCreaseCore:!1};if(g<=24&&o>=3&&(P-g>=22||G<=14)&&!tt())return{coherent:!0,pureCore:!0,isGradCore:!1,isCreaseCore:!0};if(x>=2&&x<r-2&&w>=2&&w<s-2&&o>=2&&!tt())for(let[j,z]of[[1,0],[0,1],[1,1],[1,-1]]){let X=((w-2*z)*r+(x-2*j))*4,B=((w+2*z)*r+(x+2*j))*4;if(Wt(i[X],i[X+1],i[X+2],i[B],i[B+1],i[B+2])>2e3&&g>22)continue;let m=.299*i[X]+.587*i[X+1]+.114*i[X+2],F=.299*i[B]+.587*i[B+1]+.114*i[B+2],d=((w-j)*r+(x+z))*4,M=((w+j)*r+(x-z))*4,v=Wt(k,O,S,i[d],i[d+1],i[d+2]),D=Wt(k,O,S,i[M],i[M+1],i[M+2]);if(g<Math.min(m,F)-4.2&&Math.min(v,D)<=160&&Math.max(v,D)<=260)return{coherent:!0,pureCore:!0,isGradCore:!1,isCreaseCore:!0}}if(Q&&x>=2&&x<r-2&&w>=2&&w<s-2&&U<=16){let j=(y-1)*4,z=(y+1)*4,X=(y-r)*4,B=(y+r)*4,L=Wt(k,O,S,(i[j]+i[z])*.5,(i[j+1]+i[z+1])*.5,(i[j+2]+i[z+2])*.5),m=Wt(k,O,S,(i[X]+i[B])*.5,(i[X+1]+i[B+1])*.5,(i[X+2]+i[B+2])*.5);if(L<=22&&m<=22){let F=(y-2)*4,d=(y+2)*4,M=(y-2*r)*4,v=(y+2*r)*4,D=Wt(k,O,S,(i[F]+i[d])*.5,(i[F+1]+i[d+1])*.5,(i[F+2]+i[d+2])*.5),N=Wt(k,O,S,(i[M]+i[v])*.5,(i[M+1]+i[v+1])*.5,(i[M+2]+i[v+2])*.5);if(D<=46&&N<=46)return{coherent:!0,pureCore:!0,isGradCore:!0}}}return{coherent:!1,pureCore:!1,isGradCore:!1}},I=new Uint32Array(4096),p=Math.max(48,Math.floor(l*.045));for(let x=0;x<r*s;x+=b){if(e&&e[x])continue;let w=x%r,y=x/r|0,G=x*4,$=i[G],k=i[G+1],O=i[G+2],S=$>>4<<8|k>>4<<4|O>>4;if(I[S]>=p)continue;let R=!1;if(w>=2&&w<r-2&&y>=2&&y<s-2)for(let[c,E]of[[1,0],[0,1],[1,1],[1,-1]]){let q=((y-c)*r+(w+E))*4,Q=((y+c)*r+(w-E))*4;if(Wt($,k,O,i[q],i[q+1],i[q+2])>180&&Wt($,k,O,i[Q],i[Q+1],i[Q+2])>180)continue;let tt=((y-2*E)*r+(w-2*c))*4,j=((y+2*E)*r+(w+2*c))*4;if(Wt(i[tt],i[tt+1],i[tt+2],i[j],i[j+1],i[j+2])>900)continue;let z=(i[tt]+i[j])*.5,X=(i[tt+1]+i[j+1])*.5,B=(i[tt+2]+i[j+2])*.5,L=Wt($,k,O,z,X,B);if(L<4200)continue;let m=((y-E)*r+(w-c))*4,F=((y+E)*r+(w+c))*4;if(L>=Wt(i[m],i[m+1],i[m+2],z,X,B)*.96&&L>=Wt(i[F],i[F+1],i[F+2],z,X,B)*.96){R=!0;break}}let g=!1,f=!1,o=!1,h=!1;if(R)g=!0,f=!0;else{if(C(w,y,x))continue;let c=T(w,y,x);if(!c.coherent)continue;g=c.coherent,f=c.pureCore,o=c.isGradCore,h=c.isCreaseCore}I[S]++;let[A,U,P]=de($,k,O);if(u.push({r:$,g:k,b:O,L:A,a:U,b2:P,pureCore:f,isGradCore:o,isCreaseCore:!!h}),u.length>=l)break}if(u.length<64)for(let x=0;x<r*s;x+=Math.max(1,b)){if(e&&e[x])continue;let w=x%r,y=x/r|0;if(_&&_[x]>16||C(w,y,x))continue;let G=x*4,[$,k,O]=de(i[G],i[G+1],i[G+2]);if(u.push({r:i[G],g:i[G+1],b:i[G+2],L:$,a:k,b2:O,pureCore:!1,isGradCore:!1}),u.length>=l)break}if(u.length<16)for(let x=0;x<r*s;x+=Math.max(1,b)){if(e&&e[x])continue;let w=x*4,[y,G,$]=de(i[w],i[w+1],i[w+2]);u.push({r:i[w],g:i[w+1],b:i[w+2],L:y,a:G,b2:$,pureCore:!1,isGradCore:!1})}return u}function Xn(t,e,a=null){let l=t.length;if(!l)return[];let n=new Uint32Array(4096),r=new Uint32Array(4096),s=new Uint16Array(l),i=-1,_=0;for(let p=0;p<l;p++){let x=t[p],w=x.r>>4<<8|x.g>>4<<4|x.b>>4;s[p]=w;let y=++n[w],G=x.pureCore?++r[w]:r[w],$=y+G*2;$>i&&(i=$,_=p)}let u=[];if(a&&a.length>0)for(let p=0;p<Math.min(e,a.length);p++){let x=a[p];u.push({r:x.r,g:x.g,b:x.b,L:x.L,a:x.a,b2:x.b2,pureCore:!0,verifiedPlateau:!0})}if(u.length||u.push(t[_]),e>=6&&l>=64){let p=-1,x=1/0,w=-1,y=-1/0,G=-1,$=-1/0,k=-1,O=-1/0,S=-1,R=-1/0;for(let f=0;f<l;f++){let o=t[f];if(!o.pureCore&&!o.isGradCore&&!o.isCreaseCore)continue;o.L<x&&(x=o.L,p=f),o.L>y&&(y=o.L,w=f);let h=o.a*1.25+o.b2*.95+(o.L>45?o.L*.35:-20);if(h>$&&o.L>48&&($=h,G=f),o.L>=68&&o.L<=92&&o.a>=10.5&&o.b2>=-4&&o.b2<=22){let A=o.a*1.8-Math.abs(o.L-82)*.25+n[s[f]]*.08;A>O&&(O=A,k=f)}if(o.isCreaseCore&&o.L>=32&&o.L<=78&&o.a>=4.5){let A=o.a*1.4+n[s[f]]*.25;A>R&&(R=A,S=f)}}let g=(f,o=5,h=!1)=>{if(f<0||u.length>=e)return;let A=t[f],U=1/0;for(let P of u){let c=De(A.L,A.a,A.b2,P.L,P.a,P.b2);c<U&&(U=c)}if(!(U<=o)){for(let P=0;P<u.length;P++)for(let c=P+1;c<u.length;c++)if(Oe(A.r,A.g,A.b,u[P],u[c]))return;u.push({...A,verifiedPlateau:!!h})}};g(p,5,!1),g(w,5,!1),g(G,5,!1),g(k,3.4,!0),g(S,3.6,!0)}let b=new Float64Array(l).fill(1/0);for(let p=0;p<u.length-1;p++){let x=u[p];for(let w=0;w<l;w++){let y=t[w],G=(y.L-x.L)**2+(y.a-x.a)**2+(y.b2-x.b2)**2;G<b[w]&&(b[w]=G)}}let C=(p,x)=>{if(u.length<2||p.isGradCore||Math.hypot(p.a,p.b2)>=18||p.pureCore&&r[x]>=Math.max(8,l*.002))return!1;for(let y=0;y<u.length;y++){let G=u[y];for(let $=y+1;$<u.length;$++){let k=u[$];if(Oe(p.r,p.g,p.b,G,k))return!0;let O=G.L-k.L,S=G.a-k.a,R=G.b2-k.b2,g=O*O+S*S+R*R;if(g>=36){let f=((p.L-k.L)*O+(p.a-k.a)*S+(p.b2-k.b2)*R)/g;if(f>.08&&f<.92){let o=k.L+f*O,h=k.a+f*S,A=k.b2+f*R;if((p.L-o)**2+(p.a-h)**2+(p.b2-A)**2<=Math.min(42,14+g*.012))return!0}}}}return!1},T=new Float64Array(l),I=new Float32Array(l);for(let p=0;p<l;p++){let x=t[p],w=s[p],y=x.isGradCore?Math.max(2.2,Math.log2(2+n[w])):Math.log2(1+n[w]+r[w]*2),G=x.pureCore?1:r[w]>0?.45:.08;T[p]=y*G,I[p]=Math.hypot(x.a,x.b2)}for(let p=u.length;p<e;p++){let x=u[u.length-1],w=!1;for(let $=0;$<u.length;$++)if(u[$].L<14.5){w=!0;break}let y=0,G=-1;for(let $=0;$<l;$++){let k=t[$],O=(k.L-x.L)**2+(k.a-x.a)**2+(k.b2-x.b2)**2;O<b[$]&&(b[$]=O);let S=b[$];if(S<=0)continue;let R=1,g=I[$];if(g>=15){let A=-1,U=0;for(let P=0;P<u.length;P++){let c=u[P],E=Math.hypot(c.a,c.b2);if(E>=12){let q=(k.a*c.a+k.b2*c.b2)/(g*E);q>A&&(A=q),q>=.94&&U++}}A<.88?R=4.2:U>=(k.isGradCore?10:4)?R=.18:U>=(k.isGradCore?7:3)&&(R=.42)}else k.L<14.5&&!w&&(R=3.8);let f=S*T[$]*R;if(f<=G)continue;let o=C(k,s[$])?.06:1,h=f*o;h>G&&(G=h,y=$)}u.push(t[y])}return u}function Wn(t,e,a,l=18){let n=t.length,r=a.map(C=>({r:C.r,g:C.g,b:C.b,L:C.L,a:C.a,b2:C.b2,verifiedPlateau:!!C.verifiedPlateau})),s=new Int32Array(n),i=new Float64Array(e),_=new Float64Array(e),u=new Float64Array(e),b=1/0;for(let C=0;C<l;C++){for(let x=0;x<e;x++)i[x]=r[x].L,_[x]=r[x].a,u[x]=r[x].b2;let T=Array.from({length:e},()=>({r:0,g:0,b:0,L:0,a:0,b2:0,n:0,gradN:0,creaseN:0})),I=0;for(let x=0;x<n;x++){let w=t[x],y=w.L,G=w.a,$=w.b2,k=1/0,O=0;for(let R=0;R<e;R++){let g=y-i[R],f=G-_[R],o=$-u[R],h=g*g+f*f+o*o;h<k&&(k=h,O=R)}s[x]=O,I+=k;let S=T[O];S.r+=w.r,S.g+=w.g,S.b+=w.b,S.L+=y,S.a+=G,S.b2+=$,S.n++,w.isGradCore&&S.gradN++,w.isCreaseCore&&S.creaseN++}let p=0;for(let x=0;x<e;x++){let w=T[x];if(!w.n)continue;let y=w.r/w.n,G=w.g/w.n,$=w.b/w.n,k=w.L/w.n,O=w.a/w.n,S=w.b2/w.n;p+=Math.hypot(k-r[x].L,O-r[x].a,S-r[x].b2),r[x]={r:y,g:G,b:$,L:k,a:O,b2:S,count:w.n,isGradCluster:w.gradN>=Math.max(4,w.n*.24),isCreaseCluster:w.creaseN>=Math.max(8,t.length*.0012)&&w.creaseN>=w.n*.18,verifiedPlateau:r[x].verifiedPlateau||w.creaseN>=Math.max(10,t.length*.0015)&&w.creaseN>=w.n*.22}}if(b=I,p<e*.08)break}return{cents:r,sse:b,asg:s}}function ha(t,e,a,l=null,n=null){if(!t||!t.data||!a||a.length<=2)return a;let{data:r,w:s,h:i}=t,_=r.data,u=l?l.mag:null,b=n||t._plateauAnalysis||{plateauModes:[],hasSmoothGradient:!1},C=b.plateauModes||[],T=a.map(R=>({...R})),I=R=>{if(R.verifiedPlateau)return!0;for(let g of C)if((R.L-g.L)**2+(R.a-g.a)**2+(R.b2-g.b2)**2<=12.25)return!0;return!1},p=Math.max(1,Math.floor(Math.min(s,i)/260)),x=Math.ceil(s/p),w=Math.ceil(i/p),y=x*w,G=new Uint8Array(y),$=new Float32Array(y),k=new Float32Array(y),O=new Float32Array(y);for(let R=0;R<w;R++){let g=Math.min(i-1,R*p);for(let f=0;f<x;f++){let o=Math.min(s-1,f*p),h=g*s+o;if(e&&e[h])continue;let A=R*x+f;G[A]=1;let U=h*4,[P,c,E]=de(_[U],_[U+1],_[U+2]);$[A]=P,k[A]=c,O[A]=E}}let S=new Int16Array(y);for(let R=0;R<3&&T.length>2;R++){let g=T.length,f=new Float32Array(g),o=new Float32Array(g),h=new Float32Array(g);for(let X=0;X<g;X++)f[X]=T[X].L,o[X]=T[X].a,h[X]=T[X].b2;for(let X=0;X<y;X++){if(!G[X]){S[X]=-1;continue}let B=$[X],L=k[X],m=O[X],F=1/0,d=0;for(let M=0;M<g;M++){let v=B-f[M],D=L-o[M],N=m-h[M],V=v*v+D*D+N*N;V<F&&(F=V,d=M)}S[X]=d}let A=new Int32Array(g),U=new Int32Array(g),P=new Int32Array(g),c=new Int32Array(g),E=new Int32Array(g),q=Array.from({length:g},()=>new Map),Q=0;for(let X=1;X<w-1;X++){let B=Math.min(i-1,X*p);for(let L=1;L<x-1;L++){let m=X*x+L,F=S[m];if(F<0)continue;A[F]++,Q++;let d=Math.min(s-1,L*p),M=B*s+d,v=S[m-1],D=S[m+1],N=S[m-x],V=S[m+x],K=!u||u[M]<11;if(u&&u[M]>=.15&&u[M]<=16&&B>=1&&B<i-1&&d>=1&&d<s-1){let W=M*4,H=(M-1)*4,et=(M+1)*4,rt=(M-s)*4,dt=(M+s)*4,Y=Wt(_[W],_[W+1],_[W+2],(_[H]+_[et])*.5,(_[H+1]+_[et+1])*.5,(_[H+2]+_[et+2])*.5),Z=Wt(_[W],_[W+1],_[W+2],(_[rt]+_[dt])*.5,(_[rt+1]+_[dt+1])*.5,(_[rt+2]+_[dt+2])*.5);Y<=28&&Z<=28&&c[F]++}if(v===F&&D===F&&N===F&&V===F&&K)U[F]++,L>=2&&L<x-2&&X>=2&&X<w-2&&S[m-2]===F&&S[m+2]===F&&S[m-2*x]===F&&S[m+2*x]===F&&S[m-x-1]===F&&S[m-x+1]===F&&S[m+x-1]===F&&S[m+x+1]===F&&P[F]++;else{let W=(H,et)=>{if(H>=0&&et>=0&&H!==F&&et!==F&&H!==et){E[F]++;let rt=H<et?H*64+et:et*64+H;q[F].set(rt,(q[F].get(rt)||0)+1)}};W(v,D),W(N,V),L>=2&&L<x-2&&W(S[m-2],S[m+2]),X>=2&&X<w-2&&W(S[m-2*x],S[m+2*x])}}}for(let X=0;X<g;X++)T[X].gridTot=A[X],T[X].coreCount=U[X],T[X].deepCoreCount=P[X];let tt=(X,B,L)=>{if(Oe(X.r,X.g,X.b,B,L))return!0;let m=B.L-L.L,F=B.a-L.a,d=B.b2-L.b2,M=m*m+F*F+d*d;if(M<24)return!1;let v=((X.L-L.L)*m+(X.a-L.a)*F+(X.b2-L.b2)*d)/M;if(v<=.04||v>=.96)return!1;let D=L.L+v*m,N=L.a+v*F,V=L.b2+v*d;return(X.L-D)**2+(X.a-N)**2+(X.b2-V)**2<=Math.min(42,12+M*.014)},j=new Uint8Array(g);for(let X=0;X<g;X++){if(A[X]===0){j[X]=1;continue}if(I(T[X])||T[X].isGradCluster||b.hasSmoothGradient&&c[X]>=Math.max(8,A[X]*.25))continue;let B=Math.hypot(T[X].a,T[X].b2);if(B>=16){let M=!1,v=!1;for(let D=0;D<g;D++){if(D===X||j[D]||A[D]<=A[X])continue;let N=Math.hypot(T[D].a,T[D].b2);if(N>=12&&(T[X].a*T[D].a+T[X].b2*T[D].b2)/(B*N)>=.88){M=!0;break}}if(!M){for(let D=0;D<g&&!v;D++)if(!(D===X||j[D]||A[D]<A[X]*2))for(let N=D+1;N<g&&!v;N++)N===X||j[N]||A[N]<A[X]*2||tt(T[X],T[D],T[N])&&(v=!0);if(!v)continue}}let L=U[X]/Math.max(1,A[X]),m=P[X]/Math.max(1,A[X]),F=A[X]/Math.max(1,Q);if(m>=.22||L>=.28&&F>=.03||P[X]>=Math.max(64,Q*.008))continue;let d=!1;if(q[X].forEach((M,v)=>{if(d)return;let D=v>>6,N=v&63;j[D]||j[N]||M>=Math.max(2,A[X]*.1)&&A[D]+A[N]>A[X]*1.8&&tt(T[X],T[D],T[N])&&(d=!0)}),!d&&(m<.18||L<.38)&&F<.12){for(let M=0;M<g&&!d;M++)if(!(M===X||j[M]||A[M]<A[X]*1.6))for(let v=M+1;v<g&&!d;v++)v===X||j[v]||A[v]<A[X]*1.6||tt(T[X],T[M],T[v])&&(d=!0)}if(!d&&(m<.15||L<.28))for(let M=0;M<g&&!d;M++){if(M===X||j[M]||A[M]<A[X]*3)continue;(T[X].L-T[M].L)**2+(T[X].a-T[M].a)**2+(T[X].b2-T[M].b2)**2<324&&(d=!0)}d&&(j[X]=1)}let z=T.filter((X,B)=>!j[B]);if(z.length===T.length||z.length<2)break;T=z}return T}function Eo(t,e){return!e||!e.length||!t||!t.length?t:t.map(a=>{let l=new Map,n=-1,r=0;for(let s=0;s<e.length;s++){let i=e[s];if((i.L-a.L)**2+(i.a-a.a)**2+(i.b2-a.b2)**2<=12.25){let u=i.r<<16|i.g<<8|i.b,b=i.pureCore?2:1,C=(l.get(u)||0)+b;l.set(u,C),C>r&&(r=C,n=u)}}if(n>=0&&r>=Math.max(3,(a.count||0)*.16)){let s=n>>16&255,i=n>>8&255,_=n&255,[u,b,C]=de(s,i,_);return{...a,r:s,g:i,b:_,L:u,a:b,b2:C}}return a})}function io(t,e,a={},l=null){!l&&t&&t.data&&(l=Ye(t,e));let n=Ro(t,e,l),{plateauModes:r,isSingleFamilyMultiShade:s,hasSmoothGradient:i,gradSamples:_}=n,u=Bo(t,e,l,24e3);if(i&&_&&_.length&&(u=u.concat(_)),!u.length)return{palette:[{r:0,g:0,b:0,hex:"#000000"}],K:1,auto:!1};if(a.colorMode==="two"){let j=Xn(u,2,r.slice(0,2)),{cents:z}=Wn(u,2,j,20);return{palette:Eo(z,u).map(B=>({r:Math.round(B.r),g:Math.round(B.g),b:Math.round(B.b),hex:_e(B.r,B.g,B.b)})),K:2,auto:!1}}let b=(j,z)=>{if(!z||z<2||j.length<=z)return j;let X=j.map(B=>{if(B.L==null){let[L,m,F]=de(B.r,B.g,B.b);return{...B,L,a:m,b2:F,count:B.count||1}}return{...B,count:B.count||1}});for(;X.length>z;){let B=0,L=1,m=1/0;for(let W=0;W<X.length;W++)for(let H=W+1;H<X.length;H++){let et=De(X[W].L,X[W].a,X[W].b2,X[H].L,X[H].a,X[H].b2),rt=Math.min(X[W].count||1,X[H].count||1),dt=et*(1+.18*Math.log(1+rt));dt<m&&(m=dt,B=W,L=H)}let F=X[B],d=X[L],M=(F.count||1)>=(d.count||1)?F:d,v=M===F?d:F,D=(M.count||1)+(v.count||1);M.r=Math.round((M.r*(M.count||1)+v.r*(v.count||1))/D),M.g=Math.round((M.g*(M.count||1)+v.g*(v.count||1))/D),M.b=Math.round((M.b*(M.count||1)+v.b*(v.count||1))/D);let[N,V,K]=de(M.r,M.g,M.b);M.L=N,M.a=V,M.b2=K,M.hex=_e(M.r,M.g,M.b),M.count=D,X.splice(M===F?L:B,1)}return X};if(a.colorMode==="custom"&&a.paletteColors&&a.paletteColors.length){let j=[],z=a.paletteItems&&a.paletteItems.length===a.paletteColors.length?a.paletteItems:null;for(let B=0;B<a.paletteColors.length;B++){let L=a.paletteColors[B],m=z?z[B]:null;if(m&&m.grad&&m.grad.stops&&m.grad.stops.length>=2&&a.gradientMode!=="off")m.grad.stops.forEach((F,d)=>{let[M,v,D]=un(F.color||L),[N,V,K]=de(M,v,D);j.push({r:M,g:v,b:D,L:N,a:V,b2:K,hex:_e(M,v,D),isGradCluster:!0,_userGradGroup:B+1,_userGradPrimary:d===0,userGrad:m.grad})});else{let[F,d,M]=un(L),[v,D,N]=de(F,d,M);j.push({r:F,g:d,b:M,L:v,a:D,b2:N,hex:_e(F,d,M),_userGradGroup:m?B+1:0})}}let X=j.some(B=>B.userGrad);return j._hasSmoothGradient=X||i,{palette:j,K:j.length,auto:!1,hasSmoothGradient:j._hasSmoothGradient}}if(a.fixedK&&a.targetColors){let j=St(a.targetColors,2,48),z=Xn(u,j,r),{cents:X}=Wn(u,j,z,18),B=Eo(X,u);return{palette:B.map(L=>({r:Math.round(L.r),g:Math.round(L.g),b:Math.round(L.b),hex:_e(L.r,L.g,L.b)})),K:B.length,auto:!1}}let C=St(a.targetColors||Math.max((a.adaptiveKMax||16)+6,r.length,16),2,44);if(!i&&r.length>=2&&a.colorMode!=="unlimited"){let j=r.map(m=>({...m})),z=Xn(u,Math.min(28,j.length+4),j);for(let m=j.length;m<z.length;m++){let F=z[m],d=j.reduce((v,D)=>Math.min(v,De(F.L,F.a,F.b2,D.L,D.a,D.b2)),1/0),M=j.reduce((v,D)=>Math.min(v,Math.hypot(F.r-D.r,F.g-D.g,F.b-D.b)),1/0);if(d>=5.5&&M>=28){let v=0,D=0,N=0,V=0,K=0,W=0,H=0,et=0;for(let rt=0;rt<u.length;rt++){let dt=u[rt];(dt.L-F.L)**2+(dt.a-F.a)**2+(dt.b2-F.b2)**2<=18&&(v++,dt.pureCore&&D++,N+=dt.r,V+=dt.g,K+=dt.b,W+=dt.L,H+=dt.a,et+=dt.b2)}if(v>=Math.max(18,Math.round(u.length*.004))&&D>=Math.max(10,v*.55)){let rt=Math.round(N/v),dt=Math.round(V/v),Y=Math.round(K/v);j.push({r:rt,g:dt,b:Y,L:W/v,a:H/v,b2:et/v,count:v,hex:_e(rt,dt,Y),verifiedPlateau:!0})}}}let X=t.w*t.h<=15e4,B=[];for(let m of j){let F=Math.hypot(m.a,m.b2);B.find(M=>{let v=Math.hypot(M.a,M.b2),D=De(m.L,m.a,m.b2,M.L,M.a,M.b2),N=Math.hypot(m.r-M.r,m.g-M.g,m.b-M.b);if(X)return D<(s?2.4:3.6)||N<24.5;let K=F>=14&&v>=14&&(m.a*M.a+m.b2*M.b2)/(F*v)>=.94&&(Math.abs(m.L-M.L)<=4.8||Math.min(F,v)>=48)?4.68:3.85,W=Math.min(m.L,M.L)>=52||Math.min(F,v)>=50?23.5:16;return D<=K||N<=W})||B.push(m)}if(B.length>C){let m=b(B,C);B.length=0,m.forEach(F=>B.push(F))}let L=B.length>=2?B:j.slice(0,C);return a.maxColorEnabled&&a.maxColors>=2&&L.length>a.maxColors&&(L=b(L,a.maxColors)),L._isSingleFamilyMultiShade=s,L._hasSmoothGradient=!1,{palette:L,K:L.length,auto:!0,bic:0}}let T=a.colorMode==="unlimited",I=T||i||s?"high":a.sensitivity||"medium",p=T||i||s?2.4:{low:48,medium:28,high:15}[I]||28,x=T||i||s?.82:{low:4.8,medium:3.1,high:1.95}[I]||3.1,w=a.imageType==="photo"?.85:a.imageType==="blended"?1.05:1.35,y=x*w,G=T?a.imageType==="photo"?34:a.imageType==="aliased"?18:26:i?Math.max(18,a.adaptiveKMax||22,r.length+12):Math.max(r.length+2,a.adaptiveKMax||(a.imageType==="photo"?24:a.imageType==="aliased"?12:18)),$=St(a.targetColors||G,2,40),k=u.length,O=i?1150:480,S=Xn(u,$,r),R=Math.max(2,i?Math.min($,Math.max(15,r.length+10)):r.length),g=4096,f=u;if(k>g){f=[];let j=k/g;for(let z=0;z<g;z++)f.push(u[Math.min(k-1,Math.floor(z*j))])}let o=f.length,h=null;for(let j=R;j<=Math.min(S.length,$);j++){let z=Wn(f,j,S.slice(0,j),10),X=z.sse/Math.max(1,o),B=O*Math.log(X+p)+y*j*Math.log(O);if(!h)h={K:j,bic:B,cents:z.cents,sse:z.sse,mse:X};else if(B<h.bic){let L=(h.mse-X)/Math.max(1e-4,h.mse);(i||s||h.mse>p*.72||L>=.08)&&(h={K:j,bic:B,cents:z.cents,sse:z.sse,mse:X})}if(h&&j>h.K+(T||i?8:5))break}if(h&&f!==u){let j=Wn(u,h.K,h.cents,14);h.cents=j.cents,h.sse=j.sse,h.mse=j.sse/Math.max(1,k)}for(let j of r)h.cents.reduce((X,B)=>Math.min(X,(j.L-B.L)**2+(j.a-B.a)**2+(j.b2-B.b2)**2),1/0)>10.5&&h.cents.push({r:j.r,g:j.g,b:j.b,L:j.L,a:j.a,b2:j.b2,count:j.count,verifiedPlateau:!0});let A=T||i?4e-4:.001,U=h.cents.filter(j=>j.verifiedPlateau||j.isGradCluster||(j.count||1)>=Math.max(4,u.length*A)).sort((j,z)=>(z.count||0)-(j.count||0)),P=Eo(ha(t,e,U.length?U:h.cents,l,n),u),c=i||s?3.2:a.layerDifference!=null?a.layerDifference:T?4.8:a.imageType==="photo"?6.4:7,E=c*c,q=[];for(let j of P){let z=Math.hypot(j.a,j.b2),X=0,B=0;for(let m of q){let F=Math.hypot(m.a,m.b2);z>=18&&F>=18&&(j.a*m.a+j.b2*m.b2)/(z*F)>=.92&&X++,m.L<15.5&&B++}q.find(m=>{let F=(j.L-m.L)**2+(j.a-m.a)**2+(j.b2-m.b2)**2,d=De(j.L,j.a,j.b2,m.L,m.a,m.b2),M=Math.hypot(m.a,m.b2),v=z>=15&&M>=15&&(j.a*m.a+j.b2*m.b2)/(z*M)<.85,D=z<16&&M<16&&!i;if(D&&j.L<16&&m.L<16&&Math.max(j.a,m.a)<18&&d<12.5){if(j.L<m.L){m.r=Math.round(.6*j.r+.4*m.r),m.g=Math.round(.6*j.g+.4*m.g),m.b=Math.round(.6*j.b+.4*m.b);let[W,H,et]=de(m.r,m.g,m.b);m.L=W,m.a=H,m.b2=et,m.hex=_e(m.r,m.g,m.b)}return!0}if(D&&j.L<15.5&&m.L<15.5&&B>=2&&d<12.5)return!0;if(v)return d<2;if(d<Math.max(2.5,c*.72)||F<E&&d<c*.82)return!0;let N=z>=18&&M>=18&&(j.a*m.a+j.b2*m.b2)/(z*M)>=.92,V=z>=22&&M>=22&&(j.a*m.a+j.b2*m.b2)/(z*M)>=.96;if(!i&&!s&&V&&d<Math.max(5.8,c*.88))return!0;if(!i&&!s){if(N&&X>=3&&d<7.2||N&&X>=2&&d<4.5)return!0}else if(N&&X>=10&&d<3.2)return!0;let K=(j.coreCount||0)>=12&&(j.coreCount||0)>=(j.gridTot||0)*.3;if(!T&&!i&&!s&&!j.verifiedPlateau&&!j.isGradCluster&&!K&&(j.count||0)<(m.count||1)*.85&&(z<9.5&&M<9.5||N)){let H=Math.max(c*1.85,13.8);if(F<=H*H)return!0}return!1})||q.push({r:Math.round(j.r),g:Math.round(j.g),b:Math.round(j.b),L:j.L,a:j.a,b2:j.b2,count:j.count||1,hex:_e(j.r,j.g,j.b),verifiedPlateau:!!j.verifiedPlateau,isGradCluster:!!j.isGradCluster})}if(a.colorMode!=="two"&&q.length<$)for(let j of h.cents){if(q.length>=$)break;if((j.count||0)<3)continue;let z=1/0;for(let B of q){let L=De(j.L,j.a,j.b2,B.L,B.a,B.b2);L<z&&(z=L)}if(z<14.5)continue;let X=!1;for(let B=0;B<q.length&&!X;B++)for(let L=B+1;L<q.length&&!X;L++)Oe(j.r,j.g,j.b,q[B],q[L])&&(X=!0);X||q.push({r:Math.round(j.r),g:Math.round(j.g),b:Math.round(j.b),L:j.L,a:j.a,b2:j.b2,hex:_e(j.r,j.g,j.b),count:j.count||1,isGradCluster:!1,verifiedPlateau:!1})}let Q=q.length?q:h.cents.map(j=>({r:Math.round(j.r),g:Math.round(j.g),b:Math.round(j.b),hex:_e(j.r,j.g,j.b)})),tt=a.gradientMode==="on"||a.gradientMode!=="off"&&i;return a.maxColorEnabled&&a.maxColors>=2&&!tt&&Q.length>a.maxColors&&(Q=b(Q,a.maxColors)),Q._isSingleFamilyMultiShade=s,Q._hasSmoothGradient=i,{palette:Q,K:Q.length,auto:!0,bic:h.bic,hasSmoothGradient:i,isSingleFamilyMultiShade:s}}function Ha(t,e,a=null,l=28){let n=Bo(t,e,a,4500);if(!n.length)return["#000000","#ffffff"];let r=St(l,4,Math.min(28,n.length)),s=Xn(n,r),{cents:i}=Wn(n,r,s,8),_=i.filter(b=>(b.count||0)>0).sort((b,C)=>(C.count||0)-(b.count||0)),u=[];for(let b of _){let C=_e(b.r,b.g,b.b).toLowerCase();!u.find(I=>(b.L-I.L)**2+(b.a-I.a)**2+(b.b2-I.b2)**2<18)&&!u.some(I=>I.hex===C)&&u.push({hex:C,L:b.L,a:b.a,b2:b.b2,count:b.count||1})}return u.map(b=>b.hex)}function Ka(t,e,a=[],l=[]){let n=a.map(i=>String(i||"").toLowerCase()),r=n.map(i=>{let[_,u,b]=un(i),[C,T,I]=de(_,u,b);return{hex:i,r:_,g:u,b,L:C,a:T,b2:I}}),s=(i,_,u)=>{if(!r.length)return 1/0;let b=1/0;for(let C of r){let T=(i-C.L)**2+(_-C.a)**2+(u-C.b2)**2;T<b&&(b=T)}return b};for(let i of[55,18,2,0])for(let _ of l||[]){let u=_.toLowerCase();if(n.includes(u))continue;let[b,C,T]=un(u),[I,p,x]=de(b,C,T);if(s(I,p,x)>=i)return u}if(t&&t.data){let i=Bo(t,e,null,12e3),_=null,u=-1;for(let b=0;b<i.length;b++){let C=i[b],T=s(C.L,C.a,C.b2);T>u&&(u=T,_=C)}if(_){let b=0,C=0,T=0,I=0;for(let x=0;x<i.length;x++){let w=i[x];(w.L-_.L)**2+(w.a-_.a)**2+(w.b2-_.b2)**2<=64&&(b+=w.r,C+=w.g,T+=w.b,I++)}let p=I>0?_e(b/I,C/I,T/I).toLowerCase():_e(_.r,_.g,_.b).toLowerCase();if(!n.includes(p))return p}}return l&&l[0]||"#4f46e5"}function za(t,e,a,l,n,r){let s=(n||[]).length,i=(r||[]).length,_=Math.max(t,e),u=ro(l,t,e,"auto"),b={id:"auto",title:"Fully Automatic (Adaptive Profile)",badge:`Rekomendasi Sistem \xB7 ${u.shortTitle}`,reason:`Image Profiler mengenali gambar sebagai ${u.title} (${l.effectiveColors||s} warna efektif CIE-Lab, entropi ${l.colorEntropy||l.entropy} bit, resolusi ${u.resBucketLabel}). Racikan adaptif diterapkan otomatis: layer_difference \u0394E=${u.keyParams.layerDifference}, filter_speckle=${u.keyParams.filterSpeckle}px, smoothing \u03BB=${u.keyParams.smoothingLambda}, dan bezier_tolerance \u03B5=${u.keyParams.bezierTolerance}px.`},C=Math.min(1,2048/_),T=Math.max(16,Math.round(t*C)),I=Math.max(16,Math.round(e*C)),p=Math.max(T,I),x=Math.min(p,Math.min(1280,Math.max(360,Math.round(p*.78)))),w=Math.min(1,x/_),y=Math.max(16,Math.round(t*w)),G=Math.max(16,Math.round(e*w)),$=Math.min(x,Math.min(800,Math.max(240,Math.round(p*.58)))),k=Math.min(1,$/_),O=Math.max(16,Math.round(t*k)),S=Math.max(16,Math.round(e*k)),R=Math.min($,Math.min(480,Math.max(160,Math.round(_*.42)))),g=Math.min(1,R/_),f=Math.max(16,Math.round(t*g)),o=Math.max(16,Math.round(e*g)),h;_>2200?h={id:"low",title:"Resolusi Rendah",reason:`Dimensi asli cukup besar (${t}\xD7${e} px). Resolusi Rendah (${f}\xD7${o} px) mempercepat komputasi MRF dan menghasilkan kurva yang lebih halus.`,origW:T,origH:I,highW:y,highH:G,medW:O,medH:S,lowW:f,lowH:o}:_>1650?h={id:"medium",title:"Resolusi Sedang",reason:`Dimensi asli cukup besar (${t}\xD7${e} px). Resolusi Sedang (${O}\xD7${S} px) memberikan keseimbangan terbaik antara ketajaman detail dan kecepatan MRF.`,origW:T,origH:I,highW:y,highH:G,medW:O,medH:S,lowW:f,lowH:o}:_>1250?h={id:"high",title:"Resolusi Tinggi",reason:`Dimensi gambar (${t}\xD7${e} px) cukup besar. Resolusi Tinggi (${y}\xD7${G} px) menjaga ketajaman detail dengan waktu komputasi yang jauh lebih efisien.`,origW:T,origH:I,highW:y,highH:G,medW:O,medH:S,lowW:f,lowH:o}:h={id:"original",title:"Resolusi Asli",reason:`Dimensi gambar (${t}\xD7${e} px) sangat ideal untuk di-trace pada Resolusi Asli guna mempertahankan ketajaman sudut C\u2070 dan presisi sub-piksel maksimal.`,origW:T,origH:I,highW:y,highH:G,medW:O,medH:S,lowW:f,lowH:o};let A;s<=2||l.nColors<=14&&s<=2?A={id:"two",title:"Two Colors",reason:`Gambar didominasi 2 warna kontras tinggi (${n.slice(0,2).join(" & ")}). Mode Two Colors menghasilkan pemisahan biner paling tajam.`}:l.type==="photo"&&l.entropy>5.45&&i>=18?A={id:"unlimited",title:"Unlimited Colors",reason:`Fotografi dengan variasi rona kompleks (entropi ${l.entropy} bit). Unlimited Colors mengalokasikan spektrum warna paling kaya.`}:A={id:"auto",title:"Automatic Colors",reason:`Sistem mendeteksi ${s} warna utama bersih di ruang CIE-Lab dengan pemangkasan klaster halo anti-aliasing otomatis.`};let U=l.type,P="keep",c=l.quality,E=l.type==="photo"||l.edgeDensity>.12?"tinggi":"medium";return{recPipe:b,recRes:h,recColor:A,recType:U,recAlpha:P,recQual:c,recDetail:E,adaptiveProfile:u}}function Oe(t,e,a,l,n){if(!l||!n)return null;let r=l.r-n.r,s=l.g-n.g,i=l.b-n.b,_=r*r+s*s+i*i;if(_<120)return null;let u=((t-n.r)*r+(e-n.g)*s+(a-n.b)*i)/_;if(u<=.02||u>=.98)return null;let b=Wt(l.r,l.g,l.b,n.r,n.g,n.b);if(b<320)return null;let C=Math.min(5400,680+b*.022),T=n.r+u*r,I=n.g+u*s,p=n.b+u*i,x=Wt(t,e,a,T,I,p);if(x>C*5.5)return null;let w=St(u,.02,.98),y=1-w,G=Math.sqrt(w*l.r*l.r+y*n.r*n.r),$=Math.sqrt(w*l.g*l.g+y*n.g*n.g),k=Math.sqrt(w*l.b*l.b+y*n.b*n.b),O=Wt(t,e,a,G,$,k);if(O<x&&(x=O),x>C*.85){let g=l.r|0,f=l.g|0,o=l.b|0,h=n.r|0,A=n.g|0,U=n.b|0,P=l.r===g&&(g&-256)===0?Xe[g]:Math.pow(l.r,2.2),c=l.g===f&&(f&-256)===0?Xe[f]:Math.pow(l.g,2.2),E=l.b===o&&(o&-256)===0?Xe[o]:Math.pow(l.b,2.2),q=n.r===h&&(h&-256)===0?Xe[h]:Math.pow(n.r,2.2),Q=n.g===A&&(A&-256)===0?Xe[A]:Math.pow(n.g,2.2),tt=n.b===U&&(U&-256)===0?Xe[U]:Math.pow(n.b,2.2),j=1/2.2,z=Math.pow(w*P+y*q,j),X=Math.pow(w*c+y*Q,j),B=Math.pow(w*E+y*tt,j),L=Wt(t,e,a,z,X,B);L<x&&(x=L)}if(x>C)return null;let S=Wt(t,e,a,l.r,l.g,l.b),R=Wt(t,e,a,n.r,n.g,n.b);return{t:u,perpD2:x,abD2:b,dA:S,dB:R,target:u>=.5?0:1,closest:S<=R?0:1}}function Hn(t,e,a,l,n,r){if(!l||!n||!r)return null;let s=l.r-r.r,i=l.g-r.g,_=l.b-r.b,u=n.r-r.r,b=n.g-r.g,C=n.b-r.b,T=t-r.r,I=e-r.g,p=a-r.b,x=s*s+i*i+_*_,w=u*u+b*b+C*C,y=s*u+i*b+_*C,G=x*w-y*y;if(G<1e4)return null;let $=s*T+i*I+_*p,k=u*T+b*I+C*p,O=(w*$-y*k)/G,S=(x*k-y*$)/G,R=1-O-S;if(O<-.08||S<-.08||R<-.08)return null;O=Math.max(0,O),S=Math.max(0,S),R=Math.max(0,R);let g=O+S+R||1;if(O/=g,S/=g,R/=g,(O>.04?1:0)+(S>.04?1:0)+(R>.04?1:0)<2)return null;let o=O*l.r+S*n.r+R*r.r-t,h=O*l.g+S*n.g+R*r.g-e,A=O*l.b+S*n.b+R*r.b-a,U=o*o+h*h+A*A,P=Wt(l.r,l.g,l.b,n.r,n.g,n.b),c=Math.max(x,w,P);if(U>Math.max(480,c*.052))return null;let E=O>=S&&O>=R?0:S>=R?1:2;return{wA:O,wB:S,wC:R,domSlot:E,perpD2:U,maxSpan:c}}function cn(t,e,a,l,n,r=!1){let{w:s,h:i}=t,_=s*i,u=t.data.data,b=e&&e.rawRgba&&e.rawRgba.length===_*4?e.rawRgba:e&&e.data&&e.data.data?e.data.data:u,C=n||Ye(t,a),T=C.gx,I=C.gy,p=C.mag,x=l.length,w=l.map((c,E)=>{let[q,Q,tt]=de(c.r,c.g,c.b);return{r:c.r,g:c.g,b:c.b,L:q,a:Q,b2:tt,i:E}}),y=wo(w.map(c=>({L:c.L,a:c.a,b:c.b2,i:c.i}))),G=new Float32Array(x*x),$=new Uint8Array(x*x*x);for(let c=0;c<x;c++)for(let E=0;E<x;E++){let q=Wt(w[c].r,w[c].g,w[c].b,w[E].r,w[E].g,w[E].b),Q=(w[c].L-w[E].L)**2+(w[c].a-w[E].a)**2+(w[c].b2-w[E].b2)**2;G[c*x+E]=.55*q+.45*(Q*18)}let k=!!(l._hasSmoothGradient||l._isSingleFamilyMultiShade);for(let c=0;c<x;c++){let E=w[c],q=!!(l[c]&&(l[c].verifiedPlateau||l[c].isGradCluster));for(let Q=0;Q<x;Q++)if(Q!==c)for(let tt=Q+1;tt<x;tt++){if(tt===c)continue;let j=Oe(E.r,E.g,E.b,w[Q],w[tt]),z=k||q?3600:225,X=q?Math.min(360,120+(j?j.abD2*.0025:0)):Math.min(1400,420+(j?j.abD2*.008:0));j&&j.abD2>=z&&j.perpD2<=X&&($[c*x*x+Q*x+tt]=1,$[c*x*x+tt*x+Q]=1)}}if(!r&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuBuildSegmentationTables&&x<=64){let c=xe.gpuBuildSegmentationTables(t,b,u,a,w,C);if(c){let{nxArr:E,nyArr:q,cohArr:Q,cornerArr:tt,flankA:j,flankB:z,flankAlpha:X,flankPerp:B,thinStrokeLab:L,rawNearestFlt:m,rawNearestRaw:F}=c;return{w:s,h:i,K:x,fltD:u,rawD:b,gx:T,gy:I,mag:p,palLab:w,tree:y,palDist2:G,palIsMidBlend:$,nxArr:E,nyArr:q,cohArr:Q,cornerArr:tt,flankA:j,flankB:z,flankAlpha:X,flankPerp:B,thinStrokeLab:L,rawNearestFlt:m,rawNearestRaw:F,nearestLabAt:(M,v)=>{if(L[v]>=0)return L[v];if(M===u&&m)return m[v];if(M===b&&F)return F[v];let D=v*4,N=M[D],V=M[D+1],K=M[D+2];if(x===2){let rt=Wt(N,V,K,w[0].r,w[0].g,w[0].b),dt=Wt(N,V,K,w[1].r,w[1].g,w[1].b);return rt<=dt?0:1}let[W,H,et]=de(N,V,K);return so(y,W,H,et,{d:1/0,i:0}).i},gpuAccelerated:!0}}}let O=new Float32Array(_),S=new Float32Array(_),R=new Float32Array(_),g=new Float32Array(_);for(let c=0;c<i;c++){let E=Math.max(0,c-1)*s,q=c*s,Q=Math.min(i-1,c+1)*s;for(let tt=0;tt<s;tt++){let j=q+tt;if(a&&a[j]||p[j]<1.5)continue;let z=Math.max(0,tt-1),X=Math.min(s-1,tt+1),B=E+z,L=E+tt,m=E+X,F=q+z,d=j,M=q+X,v=Q+z,D=Q+tt,N=Q+X,V=(T[B]*T[B]+2*T[L]*T[L]+T[m]*T[m]+2*T[F]*T[F]+4*T[d]*T[d]+2*T[M]*T[M]+T[v]*T[v]+2*T[D]*T[D]+T[N]*T[N])*.0625,K=(T[B]*I[B]+2*T[L]*I[L]+T[m]*I[m]+2*T[F]*I[F]+4*T[d]*I[d]+2*T[M]*I[M]+T[v]*I[v]+2*T[D]*I[D]+T[N]*I[N])*.0625,W=(I[B]*I[B]+2*I[L]*I[L]+I[m]*I[m]+2*I[F]*I[F]+4*I[d]*I[d]+2*I[M]*I[M]+I[v]*I[v]+2*I[D]*I[D]+I[N]*I[N])*.0625,H=V+W;if(H>.001){let et=V-W,rt=Math.hypot(et,2*K),dt=Math.max(0,.5*(H-rt));R[j]=rt/H*(rt/H),g[j]=Math.sqrt(dt);let Y=.5*Math.atan2(2*K,et),Z=Math.cos(Y),ot=Math.sin(Y);Z*T[j]+ot*I[j]<0&&(Z=-Z,ot=-ot),O[j]=Z,S[j]=ot}}}let f=new Int16Array(_).fill(-1);for(let c=2;c<i-2;c++){let E=c*s;for(let q=2;q<s-2;q++){let Q=E+q;if(a&&a[Q])continue;let tt=Q*4,j=b[tt],z=b[tt+1],X=b[tt+2],B=[[1,0],[0,1],[1,1],[1,-1]];for(let L=0;L<4;L++){let m=B[L][0],F=B[L][1],d=(c-2*F)*s+(q-2*m),M=(c+2*F)*s+(q+2*m);if(a&&(a[d]||a[M]))continue;let v=d*4,D=M*4;if(Wt(b[v],b[v+1],b[v+2],b[D],b[D+1],b[D+2])>1800)continue;let V=.5*(b[v]+b[D]),K=.5*(b[v+1]+b[D+1]),W=.5*(b[v+2]+b[D+2]),H=Wt(j,z,X,V,K,W);if(H<1650)continue;let et=(c-F)*s+(q-m),rt=(c+F)*s+(q+m),dt=Wt(b[et*4],b[et*4+1],b[et*4+2],V,K,W),Y=Wt(b[rt*4],b[rt*4+1],b[rt*4+2],V,K,W);if(H<Math.max(dt,Y)*.9)continue;let Z=(c-m)*s+(q+F),ot=(c+m)*s+(q-F),xt=Wt(b[Z*4],b[Z*4+1],b[Z*4+2],V,K,W),At=Wt(b[ot*4],b[ot*4+1],b[ot*4+2],V,K,W),st=Wt(j,z,X,b[Z*4],b[Z*4+1],b[Z*4+2]),at=Wt(j,z,X,b[ot*4],b[ot*4+1],b[ot*4+2]);if(Math.max(xt,At)<H*.42||Math.min(st,at)>H*.45)continue;let ft=0,J=1/0;for(let it=0;it<x;it++){let nt=Wt(V,K,W,w[it].r,w[it].g,w[it].b);nt<J&&(J=nt,ft=it)}let ut=-1,mt=1/0;for(let it=0;it<x;it++){if(it===ft)continue;let nt=w[it];if(Wt(nt.r,nt.g,nt.b,V,K,W)<1800)continue;let ht=nt.r-V,gt=nt.g-K,ct=nt.b-W,bt=ht*ht+gt*gt+ct*ct;if(bt<200)continue;let Ct=St(((j-V)*ht+(z-K)*gt+(X-W)*ct)/bt,0,1.15);if(Ct<.36)continue;let Tt=Math.min(1,Ct),yt=V+Tt*ht,pt=K+Tt*gt,Mt=W+Tt*ct,vt=Wt(j,z,X,yt,pt,Mt),Ft=Wt(j,z,X,nt.r,nt.g,nt.b),wt=vt+Ft*.28;wt<mt&&vt<=H*.28+480&&(mt=wt,ut=it)}if(ut>=0){f[Q]=ut;break}}}}let o=(c,E)=>{if(f[E]>=0)return f[E];let q=E*4,Q=c[q],tt=c[q+1],j=c[q+2];if(x===2){let m=Wt(Q,tt,j,w[0].r,w[0].g,w[0].b),F=Wt(Q,tt,j,w[1].r,w[1].g,w[1].b);return m<=F?0:1}let[z,X,B]=de(Q,tt,j),L=Math.hypot(X,B);if(L>=10&&x<=24){let m=0,F=1/0;for(let d=0;d<x;d++){let M=w[d],v=z-M.L,D=X-M.a,N=B-M.b2,V=v*v+D*D+N*N,K=Math.hypot(M.a,M.b2);if(K>=12){let W=(X*M.a+B*M.b2)/(L*K);W<.88&&(V+=(.88-W)*L*K*4.2)}V<F&&(F=V,m=d)}return m}return so(y,z,X,B,{d:1/0,i:0}).i},h=new Int16Array(_).fill(-1),A=new Int16Array(_).fill(-1),U=new Float32Array(_).fill(.5),P=new Float32Array(_);for(let c=1;c<i-1;c++)for(let E=1;E<s-1;E++){let q=c*s+E,Q=p[q];if(a&&a[q]||Q<4.5)continue;let tt=O[q],j=S[q];if(tt===0&&j===0)continue;let z=-1,X=1/0,B=-1,L=1/0,m=-1,F=-1;for(let Z=1;Z<=4;Z++){let ot=St(Math.round(E+tt*Z),0,s-1),At=St(Math.round(c+j*Z),0,i-1)*s+ot;if(!(a&&a[At])){let J=p[At]+Z*1.1;J<X&&(X=J,z=At),m<0&&f[At]>=0&&(m=At,F=f[At])}let st=St(Math.round(E-tt*Z),0,s-1),ft=St(Math.round(c-j*Z),0,i-1)*s+st;if(!(a&&a[ft])){let J=p[ft]+Z*1.1;J<L&&(L=J,B=ft),m<0&&f[ft]>=0&&(m=ft,F=f[ft])}}if(z<0||B<0||z===B)continue;let d=o(u,z),M=o(u,B);if(d===M&&F>=0&&F!==d)M=F,B=m;else if(p[z]>Q*.65||p[B]>Q*.65)continue;if(d===M||d<0||M<0)continue;let v=q*4,D=b[v],N=b[v+1],V=b[v+2],K=Oe(D,N,V,w[d],w[M]);if(K||(K=Oe((D+u[v])*.5,(N+u[v+1])*.5,(V+u[v+2])*.5,w[d],w[M])),!K)continue;let W=z*4,H=B*4,et={r:u[W],g:u[W+1],b:u[W+2]},rt={r:u[H],g:u[H+1],b:u[H+2]},dt=Oe(D,N,V,et,rt),Y=dt?.6*dt.t+.4*K.t:K.t;h[q]=d,A[q]=M,U[q]=St(Y,0,1),P[q]=dt?Math.min(K.perpD2,dt.perpD2):K.perpD2}return{w:s,h:i,K:x,fltD:u,rawD:b,gx:T,gy:I,mag:p,palLab:w,tree:y,palDist2:G,palIsMidBlend:$,nxArr:O,nyArr:S,cohArr:R,cornerArr:g,flankA:h,flankB:A,flankAlpha:U,flankPerp:P,thinStrokeLab:f,nearestLabAt:o}}function Kn(t,e,a,l,n=null,r=4,s=null,i=!1){if(!l||l.length<2)return a;let _=s||a._segCtx||t._segCtx||cn(t,t,e,l,n,i);if(!i&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuLocalNeighborhoodEdgeSnap&&l.length<=64&&xe.gpuLocalNeighborhoodEdgeSnap(t,e,a,l,r,_))return a;let{w:u,h:b,K:C,rawD:T,mag:I,palLab:p,palIsMidBlend:x,flankA:w,flankB:y,flankAlpha:G}=_,$=new Uint8Array(u*b),k=3;for(let O=0;O<r;O++){$.fill(0);for(let R=1;R<b-1;R++)for(let g=1;g<u-1;g++){let f=R*u+g;if(e&&e[f])continue;let o=a[f];if(o<0||I&&I[f]>14&&O===0)continue;let h=0;if(a[f-1]===o&&h++,a[f+1]===o&&h++,a[f-u]===o&&h++,a[f+u]===o&&h++,h>=3){let A=f*4,U=p[o];Wt(T[A],T[A+1],T[A+2],U.r,U.g,U.b)<1450&&($[f]=1)}}let S=new Int16Array(a);for(let R=1;R<b-1;R++)for(let g=1;g<u-1;g++){let f=R*u+g;if(e&&e[f]||$[f])continue;let o=a[f];if(o<0)continue;let h=a[f-1],A=a[f+1],U=a[f-u],P=a[f+u];if(h===o&&A===o&&U===o&&P===o)continue;let c=f*4,E=T[c],q=T[c+1],Q=T[c+2],tt=p[o],j=Wt(E,q,Q,tt.r,tt.g,tt.b),z=w[f],X=y[f];if(z>=0&&X>=0&&z!==o&&X!==o&&x[o*C*C+z*C+X]){let N=Oe(E,q,Q,p[z],p[X]);if(N&&j>N.perpD2*.45){S[f]=G[f]>=.5?z:X;continue}}let B=new Map,L=new Map;for(let N=-k;N<=k;N++){let V=R+N;if(V<0||V>=b)continue;let K=V*u;for(let W=-k;W<=k;W++){let H=g+W;if(H<0||H>=u)continue;let et=K+H,rt=a[et];rt<0||(B.set(rt,(B.get(rt)||0)+1),$[et]&&L.set(rt,(L.get(rt)||0)+4))}}if(B.size<2)continue;let m=[...B.keys()].sort((N,V)=>{let K=(L.get(N)||0)+(B.get(N)||0);return(L.get(V)||0)+(B.get(V)||0)-K}),F=L.get(o)||0,d=B.get(o)||0,M=-1,v=1/0,D=Math.min(m.length,4);for(let N=0;N<D;N++){let V=m[N];for(let K=N+1;K<D;K++){let W=m[K];if(!((B.get(V)||0)+(B.get(W)||0)<5)){if(V!==o&&W!==o){let H=x[o*C*C+V*C+W]===1,et=Oe(E,q,Q,p[V],p[W]);if(et&&!(!H&&j<et.perpD2*2.5+1200)){let rt=(L.get(V)||0)+(L.get(W)||0);(H&&(F<=8||d<=22)&&rt>=8||F===0&&d<=10&&rt>=10&&j>et.perpD2*1.65)&&et.perpD2<v&&(v=et.perpD2,M=et.t>=.5?V:W)}}if(F===0&&d<=10)for(let H=K+1;H<D;H++){let et=m[H];if(V===o||W===o||et===o||(L.get(V)||0)+(L.get(W)||0)+(L.get(et)||0)<12)continue;let dt=Hn(E,q,Q,p[V],p[W],p[et]),Y=Hn(tt.r,tt.g,tt.b,p[V],p[W],p[et]);dt&&(Y||j>dt.perpD2*1.6+450)&&dt.perpD2<v&&(v=dt.perpD2,M=dt.domSlot===0?V:dt.domSlot===1?W:et)}}}}M>=0&&M!==o&&(S[f]=M)}a.set(S)}return a}function co(t,e,a,l,n=null,r=null,s=null){let i=cn(t,s||t,e,a,n),{w:_,h:u,K:b,fltD:C,rawD:T,mag:I,palLab:p,tree:x,palIsMidBlend:w,flankA:y,flankB:G,flankAlpha:$}=i,k=new Int16Array(_*u).fill(-2),O=new Int16Array(_*u).fill(-1);if(i.rawNearestFlt&&i.rawNearestFlt.length===_*u){if(O.set(i.rawNearestFlt),e)for(let o=0;o<_*u;o++)e[o]&&(O[o]=-1)}else for(let o=0;o<_*u;o++)e&&e[o]||(O[o]=i.nearestLabAt(C,o));let S=(o,h=!0)=>{let A=h?T:C,U=o*4,P=h?i.nearestLabAt(T,o):O[o];if(i.thinStrokeLab&&i.thinStrokeLab[o]>=0)return i.thinStrokeLab[o];let c=y[o],E=G[o];if(c>=0&&E>=0&&P!==c&&P!==E){if(w[P*b*b+c*b+E])return $[o]>=.5?c:E;let q=Oe(T[U],T[U+1],T[U+2],p[c],p[E]),Q=Wt(T[U],T[U+1],T[U+2],p[P].r,p[P].g,p[P].b);if(q&&q.perpD2<Q*.85)return $[o]>=.5?c:E}return P},R=[[0,0,_,u]],g=2,f=[];for(;R.length;){let[o,h,A,U]=R.pop(),P=A-o,c=U-h;if(P<=0||c<=0)continue;let E=0,q=0,Q=0,tt=0,j=!1,z=0;for(let v=h;v<U;v++){let D=v*_;for(let N=o;N<A;N++){let V=D+N;if(e&&e[V]){j=!0;continue}let K=V*4;E+=C[K],q+=C[K+1],Q+=C[K+2],tt++,I&&I[V]>z&&(z=I[V])}}if(!tt){for(let v=h;v<U;v++)for(let D=o;D<A;D++)k[v*_+D]=-1;continue}let X=E/tt,B=q/tt,L=Q/tt,m=0,F=0;for(let v=h;v<U;v++){let D=v*_;for(let N=o;N<A;N++){let V=D+N;if(e&&e[V])continue;let K=V*4,W=C[K]-X,H=C[K+1]-B,et=C[K+2]-L,rt=W*W+H*H+et*et;m+=rt,rt>F&&(F=rt)}}m/=tt;let d=Math.max(18,Math.min(48,l*.16)),M=Math.max(42,Math.min(96,l*.32));if(!j&&z<7.5&&m<d&&F<M&&P<=32&&c<=32){let v=(h+(c>>1))*_+(o+(P>>1)),D=O[v]>=0?O[v]:i.nearestLabAt(C,v),N=O[h*_+o],V=O[h*_+(A-1)],K=O[(U-1)*_+o],W=O[(U-1)*_+(A-1)];if(N===D&&V===D&&K===D&&W===D){for(let H=h;H<U;H++)for(let et=o;et<A;et++)k[H*_+et]=D;r&&f.push([o,h,P,c,D]);continue}}if(P<=g&&c<=g){let v=-1;for(let D=h;D<U;D++)for(let N=o;N<A;N++){let V=D*_+N,K=e&&e[V]?-1:S(V,!0);k[V]=K,v<0&&K>=0&&(v=K)}r&&v>=0&&f.push([o,h,P,c,v])}else{let v=o+(P>>1),D=h+(c>>1);P>g&&c>g?R.push([o,h,v,D],[v,h,A,D],[o,D,v,U],[v,D,A,U]):P>g?R.push([o,h,v,U],[v,h,A,U]):R.push([o,h,A,D],[o,D,A,U])}}if(r&&f.length){f.sort((h,A)=>A[2]*A[3]-h[2]*h[3]);let o=Math.min(f.length,4800);for(let h=0;h<o;h++)r.push(f[h])}for(let o=0;o<k.length;o++)k[o]===-2&&(k[o]=S(o,!0));return Kn(t,e,k,a,n,2,i),t._segCtx=i,k._segCtx=i,k._rawNearestSnapshot=O,k}function In(t,e,a,l,n,r,s){if(r===s)return!1;let i=(T,I)=>{let p=0,x=0,w=new Int8Array(9),y=new Int8Array(9),G=($,k)=>{if($===0&&k===0)return I;let O=l+$,S=n+k;return O<0||S<0||O>=e||S>=a?!1:t[S*e+O]===T};for(let $=-1;$<=1;$++)for(let k=-1;k<=1;k++){let O=1<<($+1)*3+(k+1);if(p&O||!G(k,$))continue;x++;let S=0,R=0;for(w[R]=k,y[R]=$,R++,p|=O;S<R;){let g=w[S],f=y[S];S++;for(let[o,h]of[[1,0],[-1,0],[0,1],[0,-1]]){let A=g+o,U=f+h;if(A<-1||A>1||U<-1||U>1)continue;let P=1<<(U+1)*3+(A+1);p&P||!G(A,U)||(p|=P,w[R]=A,y[R]=U,R++)}}}return x},_=i(r,!0);if(i(r,!1)>_)return!0;let b=i(s,!1),C=i(s,!0);return b>=2&&C<b}function Mn(t,e,a,l,n={},r){let s=!!(n&&n.forceCpu),i=n.segCtx||a._segCtx||t._segCtx||cn(t,n.rawWork||t,e,l,n.edgeField,s);if(!s&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuSegmentMRF&&l.length<=64&&xe.gpuSegmentMRF(t,e,a,l,n,i,r))return a;let{w:_,h:u,K:b,fltD:C,rawD:T,mag:I,palLab:p,palDist2:x,palIsMidBlend:w,nxArr:y,nyArr:G,cohArr:$,cornerArr:k,flankA:O,flankB:S,flankAlpha:R,flankPerp:g}=i,f=n.beta||1350,o=n.maxIter||20,h=o===1&&typeof n.iterIndex=="number",A=[1,-1,0,0,1,-1,1,-1],U=[0,0,1,-1,1,1,-1,-1],P=[1,1,1,1,.707,.707,.707,.707],c=new Float32Array(8),E=new Int16Array(8),q=new Int16Array(16),Q=1/(2*1350),tt=i.thinStrokeLab,j=(z,X,B)=>{if(tt&&tt[z]>=0)return X===tt[z]?0:B*6.5+18e3;let L=z*4,m=p[X],d=(I?I[z]:0)>5.5,M=d?T[L]:C[L],v=d?T[L+1]:C[L+1],D=d?T[L+2]:C[L+2],N=Wt(M,v,D,m.r,m.g,m.b),V=Math.hypot(m.a,m.b2);if(V>=12&&Math.max(M,v,D)-Math.min(M,v,D)>=22){let[,H,et]=de(M,v,D),rt=Math.hypot(H,et);if(rt>=10){let dt=(H*m.a+et*m.b2)/(rt*V);dt<.88&&(N+=(.88-dt)*rt*V*75)}}let K=O[z],W=S[z];if(K>=0&&W>=0){let H=R[z],et=g[z],rt=x[K*b+W],dt=Math.min(rt*.28,B*3);if(X===K){let Y=et*.65+(1-H)*(1-H)*dt;return Math.min(N,Y)}if(X===W){let Y=et*.65+H*H*dt;return Math.min(N,Y)}if(w[X*b*b+K*b+W]&&N>et*.5)return N+B*3.6+rt*.25}return N};for(let z=0;z<o;z++){let X=h?n.iterIndex:z,B=h?n.totalIters||18:o,L=h?1:.55+.55*(X/Math.max(1,B-1)),m=f*L,F=0,d=X&3,M=d===1||d===2,v=d===1||d===3;for(let D=0;D<u;D++){let N=M?u-1-D:D;for(let V=0;V<_;V++){let K=v?_-1-V:V,W=N*_+K;if(e&&e[W])continue;let H=a[W];if(H<0)continue;let et=!1,rt=0,dt=0,Y=1;q[0]=H;for(let Tt=0;Tt<8;Tt++){let yt=K+A[Tt],pt=N+U[Tt];if(yt<0||pt<0||yt>=_||pt>=u){E[Tt]=-2;continue}let Mt=a[pt*_+yt];if(E[Tt]=Mt,Mt===H)Tt<4?rt++:dt++;else if(Mt>=0){et=!0;let vt=!1;for(let Ft=0;Ft<Y;Ft++)if(q[Ft]===Mt){vt=!0;break}vt||(q[Y++]=Mt)}}if(!et)continue;let Z=W*4,ot=T[Z],xt=T[Z+1],At=T[Z+2],st=y[W],at=G[W],ft=$[W],J=ft>.15&&(st!==0||at!==0);for(let Tt=0;Tt<8;Tt++){if(E[Tt]===-2){c[Tt]=0;continue}let pt=((N+U[Tt])*_+(K+A[Tt]))*4,Mt=Wt(ot,xt,At,T[pt],T[pt+1],T[pt+2]),vt=1;if(J){let Ft=Tt<4?1:1.41421356;vt=.74+.56*Math.abs((A[Tt]*-at+U[Tt]*st)/Ft)}c[Tt]=P[Tt]*vt*(.14+.86*Math.exp(-Mt*Q))}let ut=O[W],mt=S[W];if(ut>=0){let Tt=!1;for(let yt=0;yt<Y;yt++)if(q[yt]===ut){Tt=!0;break}Tt||(q[Y++]=ut)}if(mt>=0){let Tt=!1;for(let yt=0;yt<Y;yt++)if(q[yt]===mt){Tt=!0;break}Tt||(q[Y++]=mt)}let it=Wt(ot,xt,At,p[H].r,p[H].g,p[H].b),nt=j(W,H,m);if(ut>=0&&mt>=0&&ft>.25&&g[W]<320&&rt>=1&&rt+dt>=2&&(H===ut&&R[W]>=.505||H===mt&&R[W]<=.495))continue;let ht=a._detailProt||null,gt=k[W]>5.5&&rt+dt>=1&&it<1100||!!(ht&&ht[W]),ct=rt+dt>=1&&it<480||gt,bt=H,Ct=1/0;for(let Tt=0;Tt<Y;Tt++){let yt=q[Tt],pt=yt===H?nt:j(W,yt,m);if(ct&&yt!==H&&pt>nt*1.95+420)continue;let Mt=pt;for(let vt=0;vt<8;vt++){let Ft=E[vt];if(Ft!==-2&&Ft!==yt){let wt=Ft>=0&&yt>=0?Math.min(m,x[yt*b+Ft]*.24+120):m;Mt+=wt*c[vt]}}Mt<Ct&&(Ct=Mt,bt=yt)}if(bt!==H){if(n.topology!==!1&&X>=1&&In(a,_,u,K,N,H,bt)&&!(ut>=0&&mt>=0&&H!==ut&&H!==mt&&w[H*b*b+ut*b+mt]))continue;a[W]=bt,F++}}}if(a._lastMrfChanged=F,r&&r((z+1)/o,F),!h&&z>=6&&F<Math.max(4,_*u*12e-5))break}return a}function lo(t,e,a,l,n=null,r=null){let s=Math.max(2,l||4),i=n&&n.rawRgba&&n.rawRgba.length===e*a*4?n.rawRgba:n&&n.data?n.data.data:null,_=new Int32Array(e*a).fill(-1),u=[],b=new Map;for(let x=0;x<e*a;x++){if(t[x]<0||_[x]>=0)continue;let w=t[x],y=u.length,G=[x];_[x]=y;let $=[],k=0,O=0;for(;G.length;){let f=G.pop();$.push(f);let o=f%e,h=f/e|0;k+=o,O+=h;for(let A=-1;A<=1;A++){let U=h+A;if(!(U<0||U>=a))for(let P=-1;P<=1;P++){if(P===0&&A===0)continue;let c=o+P;if(c<0||c>=e)continue;let E=U*e+c;t[E]===w&&_[E]<0&&(_[E]=y,G.push(E))}}}let S=k/$.length,R=O/$.length,g={id:y,lab:w,cells:$,cx:S,cy:R};if(u.push(g),$.length>=2&&$.length<=Math.max(s*4,24)){let f=b.get(w);f||(f=[],b.set(w,f)),f.push(g)}}u.sort((x,w)=>x.cells.length-w.cells.length);let C=Math.max(1,Math.hypot(e,a)/Math.hypot(720,720)),T=Math.pow(C,.58),I=Math.max(s*9,Math.round(48*C*C)),p=t._detailProt||null;for(let x of u){if(x.cells.length>=I)continue;if(p&&x.cells.length>=Math.max(5,s)){let f=0;for(let o of x.cells)p[o]&&f++;if(f*3>=x.cells.length||f>=10)continue}let w=new Map,y=0;for(let f of x.cells){let o=f%e,h=f/e|0,A=[o>0?f-1:-1,o<e-1?f+1:-1,h>0?f-e:-1,h<a-1?f+e:-1];for(let U of A){if(U<0){y++;continue}let P=t[U];P!==x.lab&&(y++,P>=0&&w.set(P,(w.get(P)||0)+1))}}let G=-1,$=0;if(w.forEach((f,o)=>{f>$&&($=f,G=o)}),G<0)continue;let k=2*x.cells.length/Math.max(1,y),O=$/Math.max(1,y),S=w.size>=2&&O<.88&&k<2.15*T&&x.cells.length<=I||w.size>=3&&O<.56&&k<2.45*T&&x.cells.length<=I,R=w.size>=2&&x.cells.length<=Math.max(s*4,Math.round(28*C*C))||S;if(!R&&x.cells.length>=s)continue;if(!R&&x.cells.length>=2&&i&&r&&r[x.lab]&&r[G]){let f=r[x.lab],o=r[G],h=0,A=0;for(let P of x.cells){let c=P*4;h+=Wt(i[c],i[c+1],i[c+2],f.r,f.g,f.b),A+=Wt(i[c],i[c+1],i[c+2],o.r,o.g,o.b)}if(h/=x.cells.length,A/=x.cells.length,x.cells.length>=Math.max(26,s)&&k>=1.65&&w.size===1&&h<140&&A>3600)continue;let U=b.get(x.lab);if(x.cells.length>=Math.max(12,s>>1)&&k>=1.55&&U&&U.length>=3&&h<130&&A>3800){let P=0;for(let c=0;c<U.length;c++){let E=U[c];if(E.id!==x.id&&Math.hypot(E.cx-x.cx,E.cy-x.cy)<=32&&(P++,P>=2))break}if(P>=2)continue}}if(R&&i&&r&&r[x.lab]){let f=r[x.lab],o=1/0,h=[...w.keys()];w.forEach((U,P)=>{if(r[P]){let c=Wt(f.r,f.g,f.b,r[P].r,r[P].g,r[P].b);c<o&&(o=c)}});let A=!1;for(let U=0;U<h.length&&!A;U++)for(let P=U+1;P<h.length&&!A;P++){if(Oe(f.r,f.g,f.b,r[h[U]],r[h[P]])){A=!0;break}for(let c=P+1;c<h.length&&!A;c++)if(Hn(f.r,f.g,f.b,r[h[U]],r[h[P]],r[h[c]])){A=!0;break}}if(!A&&x.cells.length<=28&&h.length>=2){let U=1/0,P=0;for(let c of x.cells){let E=c*4;P+=Wt(i[E],i[E+1],i[E+2],f.r,f.g,f.b)}P/=x.cells.length;for(let c=0;c<h.length;c++){let E=r[h[c]];for(let q=c+1;q<h.length;q++){let Q=r[h[q]],tt=E.r-Q.r,j=E.g-Q.g,z=E.b-Q.b,X=tt*tt+j*j+z*z;if(X<400)continue;let B=0;for(let L of x.cells){let m=L*4,F=St(((i[m]-Q.r)*tt+(i[m+1]-Q.g)*j+(i[m+2]-Q.b)*z)/X,0,1);B+=Wt(i[m],i[m+1],i[m+2],Q.r+F*tt,Q.g+F*j,Q.b+F*z)}B/=x.cells.length,B<U&&(U=B)}}U<=P*1.35+480&&(A=!0)}if(!A&&x.cells.length>=Math.max(8,s)&&o>650)continue}let g=G;if(i&&r&&w.size>=2){let f=1/0;w.forEach((o,h)=>{let A=r[h];if(!A)return;let U=0;for(let c of x.cells){let E=c*4;U+=Wt(i[E],i[E+1],i[E+2],A.r,A.g,A.b)}let P=U/x.cells.length*(1.15-.3*(o/Math.max(1,y)));P<f&&(f=P,g=h)})}for(let f of x.cells)t[f]=g;x.lab=g}return t}function Do(t,e,a,l,n,r,s=null,i=!1){if(!l||!l.data||!n||n.length<3)return t;let _=s||t._segCtx||l._segCtx||cn(l,l,r,n,null,i);if(!i&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuErodeSandwichedRibbons&&n.length<=64&&xe.gpuErodeSandwichedRibbons(t,e,a,l,n,r,_))return t;let{K:u,rawD:b,palLab:C,palIsMidBlend:T}=_,I=(x,w,y)=>{for(let G=-2;G<=1;G++){let $=w+G;if(!($<0||$+1>=a))for(let k=-2;k<=1;k++){let O=x+k;if(O<0||O+1>=e)continue;let S=$*e+O;if(t[S]===y&&t[S+1]===y&&t[S+e]===y&&t[S+e+1]===y)return!0}}return!1},p=t._detailProt||null;for(let x=0;x<2;x++){let w=new Int16Array(t);for(let y=2;y<a-2;y++)for(let G=2;G<e-2;G++){let $=y*e+G;if(r&&r[$]||p&&p[$])continue;let k=t[$];if(k<0)continue;let O=_.mag?_.mag[$]:0,S=!1;if(O<3.8&&I(G,y,k)){let m=t[$-1],F=t[$+1],d=t[$-e],M=t[$+e];if((m!==k&&F!==k&&m>=0&&F>=0&&T[k*u*u+m*u+F]||d!==k&&M!==k&&d>=0&&M>=0&&T[k*u*u+d*u+M])&&(S=!0),!S)continue}let R=-1,g=-1,f=99,o=(m,F)=>{let d=-1,M=-1,v=5,D=5;for(let N=1;N<=3;N++){let V=y-F*N,K=G-m*N;if(K<0||K>=e||V<0||V>=a)break;let W=t[V*e+K];if(W!==k&&W>=0){d=W,v=N;break}}for(let N=1;N<=3;N++){let V=y+F*N,K=G+m*N;if(K<0||K>=e||V<0||V>=a)break;let W=t[V*e+K];if(W!==k&&W>=0){M=W,D=N;break}}if(d>=0&&M>=0&&d!==M){let N=v+D,K=T[k*u*u+d*u+M]===1?N-1.5:N;K<f&&(f=K,R=d,g=M)}};if(o(1,0),o(0,1),o(1,1),o(1,-1),R<0||g<0)continue;let h=C[R],A=C[g],U=C[k];if(!h||!A||!U)continue;let P=$*4,c=b[P],E=b[P+1],q=b[P+2],Q=.299*c+.587*E+.114*q,tt=.299*h.r+.587*h.g+.114*h.b,j=.299*A.r+.587*A.g+.114*A.b,z=.299*U.r+.587*U.g+.114*U.b;if(Q>Math.max(tt,j)+6||Q<Math.min(tt,j)-6||z>Math.max(tt,j)+8||z<Math.min(tt,j)-8)continue;let X=Wt(c,E,q,U.r,U.g,U.b),B=Oe(c,E,q,h,A),L=T[k*u*u+R*u+g]===1;B&&(L||X>B.perpD2*2.5+900)&&(w[$]=B.t>=.5?R:g)}t.set(w)}return t}function fo(t,e,a,l,n,r,s=!1){if(!s&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuResolveCheckerboardSaddles&&n&&n.length<=64&&xe.gpuResolveCheckerboardSaddles(t,e,a,l,n,r))return t;let i=l&&l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l&&l.data?l.data.data:null,_=t._segCtx&&t._segCtx.thinStrokeLab||l&&l._segCtx&&l._segCtx.thinStrokeLab,u=t._detailProt||null;for(let b=0;b<a-1;b++)for(let C=0;C<e-1;C++){let T=b*e+C,I=T+1,p=T+e,x=p+1;if(r&&(r[T]||r[I]||r[p]||r[x]))continue;let w=t[T],y=t[I],G=t[p],$=t[x];if(!(w<0||y<0)&&w===$&&y===G&&w!==y)if(i&&n&&n[w]&&n[y]){let k=n[w],O=n[y],S=_&&(_[T]===w||_[x]===w)||u&&(u[T]||u[x]),R=_&&(_[I]===y||_[p]===y)||u&&(u[I]||u[p]),g=S&&!R?[[I,y,w],[p,y,w]]:R&&!S?[[T,w,y],[x,w,y]]:[[T,w,y],[x,w,y],[I,y,w],[p,y,w]],f=0,o=0;for(let E=Math.max(0,b-1);E<=Math.min(a-1,b+2);E++)for(let q=Math.max(0,C-1);q<=Math.min(e-1,C+2);q++){if(q>=C&&q<=C+1&&E>=b&&E<=b+1)continue;let Q=t[E*e+q];Q===w?f++:Q===y&&o++}let h=.299*k.r+.587*k.g+.114*k.b,A=.299*O.r+.587*O.g+.114*O.b,U=T,P=y,c=1/0;for(let[E,q,Q]of g){let tt=E%e,j=E/e|0;if(In(t,e,a,tt,j,q,Q))continue;let z=E*4,X=Q===w?k:O,B=q===w?k:O,L=Wt(i[z],i[z+1],i[z+2],X.r,X.g,X.b)-Wt(i[z],i[z+1],i[z+2],B.r,B.g,B.b);f>=4&&o>=4&&(Q===w?h>A:A>h)&&(L-=950),L<c&&(c=L,U=E,P=Q)}t[U]=P}else t[T]=y}return t}function Io(t,e,a,l,n,r,s=!1){if(!l||!l.data||!n||!s&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuAbsorbBoundaryParasites&&n.length<=64&&xe.gpuAbsorbBoundaryParasites(t,e,a,l,n,r))return t;let i=l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l.data.data,_=t._detailProt||null;for(let u=0;u<2;u++){let b=new Int16Array(t);for(let C=1;C<a-1;C++)for(let T=1;T<e-1;T++){let I=C*e+T;if(r&&r[I]||_&&_[I])continue;let p=t[I];if(p<0)continue;let x=[I-1,I+1,I-e,I+e],w=0,y=-1,G=new Map;for(let f=0;f<4;f++){let o=t[x[f]];o===p?(w++,y=f):o>=0&&G.set(o,(G.get(o)||0)+2)}if(w>1)continue;let $=0;for(let[f,o]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let h=t[(C+o)*e+(T+f)];h===p?$++:h>=0&&G.set(h,(G.get(h)||0)+1)}let k=-1,O=0;if(G.forEach((f,o)=>{f>O&&(O=f,k=o)}),k<0||O<6)continue;let S=I*4,R=n[p]?Wt(i[S],i[S+1],i[S+2],n[p].r,n[p].g,n[p].b):1/0,g=n[k]?Wt(i[S],i[S+1],i[S+2],n[k].r,n[k].g,n[k].b):1/0;if(w===1&&n[p]&&n[k]){let f=y===0?-1:y===1?1:0,o=y===2?-1:y===3?1:0,h=St(T+f,1,e-2),A=St(C+o,1,a-2),U=o,P=f,c=0;for(let E=-1;E<=1;E++)t[(A+P*E)*e+(h+U*E)]===p&&c++;if(c>=2&&R<=g*.85)continue}w+$>=1&&R<g*.45&&R<600||In(t,e,a,T,C,p,k)||(b[I]=k)}t.set(b)}return fo(t,e,a,l,n,r),t}function Go(t,e,a,l,n,r,s){let i=l&&l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l&&l.data?l.data.data:null;if(!i||!n||n.length<2)return null;let _=e*a,u=n.map(I=>de(I.r,I.g,I.b)),b=new Uint8Array(_),C=new Int32Array(_),T=[];for(let I=0;I<_;I++){if(b[I]||t[I]<0)continue;let p=t[I],x=0,w=0;for(C[w++]=I,b[I]=1;x<w;){let V=C[x++],K=V%e;K>0&&!b[V-1]&&t[V-1]===p&&(b[V-1]=1,C[w++]=V-1),K<e-1&&!b[V+1]&&t[V+1]===p&&(b[V+1]=1,C[w++]=V+1),V>=e&&!b[V-e]&&t[V-e]===p&&(b[V-e]=1,C[w++]=V-e),V<_-e&&!b[V+e]&&t[V+e]===p&&(b[V+e]=1,C[w++]=V+e)}let y=w;if(y>s)continue;let G=new Map,$=0,k=0,O=0,S=!1,R=e,g=-1,f=a,o=-1;for(let V=0;V<y;V++){let K=C[V];if(r&&r[K]){S=!0;break}let W=K%e,H=K/e|0;W<R&&(R=W),W>g&&(g=W),H<f&&(f=H),H>o&&(o=H);let et=[W>0?K-1:-1,W<e-1?K+1:-1,H>0?K-e:-1,H<a-1?K+e:-1];for(let rt=0;rt<4;rt++){let dt=et[rt];if(dt<0){k++;continue}let Y=t[dt];Y!==p&&($++,Y<0?O++:G.set(Y,(G.get(Y)||0)+1))}}if(S||!G.size)continue;let h=-1,A=0,U=-1,P=0;G.forEach((V,K)=>{V>A?(U=h,P=A,A=V,h=K):V>P&&(P=V,U=K)});let c=n[p],E=n[h];if(!c||!E)continue;let q=Wt(c.r,c.g,c.b,E.r,E.g,E.b),Q=0;for(let V=0;V<y;V++){let K=C[V]*4;Q+=Wt(i[K],i[K+1],i[K+2],E.r,E.g,E.b)-Wt(i[K],i[K+1],i[K+2],c.r,c.g,c.b)}let tt=g-R+1,j=o-f+1,z=$+k,X=0,B=0,L=0;if(y<=96&&tt<=16&&j<=16){for(let et=0;et<y;et++){let rt=C[et]*4;X+=.299*i[rt]+.587*i[rt+1]+.114*i[rt+2]}let V=Math.max(0,R-3),K=Math.min(e-1,g+3),W=Math.max(0,f-3),H=Math.min(a-1,o+3);for(let et=W;et<=H;et+=2)for(let rt=V;rt<=K;rt+=2){if(rt>=R-1&&rt<=g+1&&et>=f-1&&et<=o+1)continue;let dt=(et*e+rt)*4;B+=.299*i[dt]+.587*i[dt+1]+.114*i[dt+2],L++}}let m=L>0?Math.abs(X/y-B/L):0,F=0,d=0,M=0,v=Math.max(1,Math.floor(y/96));for(let V=0;V<y;V+=v){let K=C[V],W=K%e,H=K/e|0;if(W<3||W>=e-3||H<3||H>=a-3)continue;M++;let et=K*4,rt=.299*i[et]+.587*i[et+1]+.114*i[et+2],dt=0;for(let[Y,Z]of[[1,0],[0,1],[1,1],[1,-1]])for(let ot of[2,3]){let xt=((H-ot*Z)*e+(W-ot*Y))*4,At=((H+ot*Z)*e+(W+ot*Y))*4,st=.299*i[xt]+.587*i[xt+1]+.114*i[xt+2],at=.299*i[At]+.587*i[At+1]+.114*i[At+2],ft=Math.min(st-rt,at-rt),J=Math.min(rt-st,rt-at),ut=Math.max(ft,J*.85);ut>dt&&(dt=ut)}dt>=3.8&&(F++,d+=dt)}let D=M>0?F/M:0,N=F>0?d/F:0;T.push({lab:p,S:h,S2:U,A:y,cells:Int32Array.from(C.subarray(0,y)),domFrac:A/Math.max(1,$),twoNbFrac:(A+P)/Math.max(1,$),dE2:U>=0?Math.hypot(u[p][0]-u[U][0],u[p][1]-u[U][1],u[p][2]-u[U][2]):999,border:k,voidE:O,dE:Math.hypot(u[p][0]-u[h][0],u[p][1]-u[h][1],u[p][2]-u[h][2]),dE00:De(u[p][0],u[p][1],u[p][2],u[h][0],u[h][1],u[h][2]),support:Q/y/Math.max(1,q),thick:2*y/Math.max(1,z),fill:y/(tt*j),minDim:Math.min(tt,j),aspect:Math.max(tt,j)/Math.min(tt,j),localLumSpike:m,creaseFrac:D,valleyDrop:N})}return T}function da(t){if(t.localLumSpike>=13&&t.A>=3&&t.A<=160&&t.fill>=.28&&t.aspect<=4.2&&(t.domFrac==null||t.domFrac>=.85)||(t.domFrac==null||t.domFrac>=.92)&&t.A>=4&&t.A<=64&&t.dE>=16&&t.support>=.18||(t.domFrac==null||t.domFrac>=.85)&&t.A>=12&&t.minDim>=2&&t.thick>=1.4&&t.fill>=.28&&t.support>=.42&&(t.dE00>=2.8||t.dE>=4.5)||t.creaseFrac>=.25&&t.A>=5&&(t.valleyDrop>=4||t.dE>=7.5)&&t.support>=.16&&(t.domFrac==null||t.domFrac>=.78)||t.A>=12&&t.aspect>=2.2&&t.thick<=4&&t.dE>=13.5&&t.support>=.24&&(t.domFrac==null||t.domFrac>=.8))return!0;if((t.domFrac!=null?t.domFrac:1)<.88&&(t.A<36||t.thick<1.95||t.fill<.45||t.aspect>3.2))return!1;let e=(t.dE00!=null?t.dE00>=8:t.dE>=12)||t.dE>=16&&t.support>=.36,a=(t.domFrac==null||t.domFrac>=.85)&&t.A>=12&&t.minDim>=2&&t.aspect<=6.5&&t.support>=.36&&(t.dE00!=null?t.dE00>=9:t.dE>=13);return t.A>=10&&t.minDim>=2&&t.fill>=.38&&t.aspect<=3.8&&t.thick>=1.25&&e&&t.support>=.36||a}function zn(t,e,a,l,n,r){let s=Go(t,e,a,l,n,r,4800);if(!s)return t._detailProt=null,null;let i=new Uint8Array(e*a),_=!1;for(let I of s)if(da(I)){for(let p=0;p<I.cells.length;p++)i[I.cells[p]]=1;_=!0}let u=t._segCtx&&t._segCtx.thinStrokeLab||l&&l._segCtx&&l._segCtx.thinStrokeLab;if(u)for(let I=1;I<a-1;I++)for(let p=1;p<e-1;p++){let x=I*e+p;if(u[x]>=0&&t[x]===u[x]){let w=0;for(let y of[x-1,x+1,x-e,x+e,x-e-1,x-e+1,x+e-1,x+e+1])t[y]===t[x]&&w++;w>=2&&(i[x]=1,_=!0)}}let b=l&&l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l&&l.data?l.data.data:null,C=t._segCtx&&t._segCtx.palIsMidBlend||l&&l._segCtx&&l._segCtx.palIsMidBlend,T=n?n.length:0;if(b&&n&&T>=2)for(let I=3;I<a-3;I++)for(let p=3;p<e-3;p++){let x=I*e+p;if(i[x]||r&&r[x])continue;let w=t[x];if(w<0||!n[w])continue;let y=x*4,G=b[y],$=b[y+1],k=b[y+2],O=n[w],S=Wt(G,$,k,O.r,O.g,O.b);if(S>1600)continue;let R=!1;for(let[g,f]of[[1,0],[0,1],[1,1],[1,-1]]){let o=-1,h=-1;for(let A=1;A<=4;A++){let U=t[(I-f*A)*e+(p-g*A)];if(U!==w&&U>=0){o=U;break}}for(let A=1;A<=4;A++){let U=t[(I+f*A)*e+(p+g*A)];if(U!==w&&U>=0){h=U;break}}if(o>=0&&o===h&&n[o]){let A=n[o],U=Wt(G,$,k,A.r,A.g,A.b);if(S*1.45<U&&U>900){R=!0;break}}}R&&(i[x]=1,_=!0)}return t._detailProt=_?i:null,t._detailProt}function pa(t,e,a,l,n,r){if(!n||n.length<2)return 0;let s=Math.max(1,Math.hypot(e,a)/Math.hypot(720,720)),i=Math.pow(s,.58),_=St(Math.round(e*a*18e-5),48,520),u=t._detailProt||null,b=0;for(let C=0;C<4;C++){let T=Go(t,e,a,l,n,r,_);if(!T||!T.length)break;T.sort((p,x)=>p.A-x.A);let I=0;for(let p of T){if(p.voidE>0||da(p))continue;let x=(!p.domFrac||p.domFrac<.82)&&p.S>=0&&p.S2>=0&&p.twoNbFrac>=.84&&Math.min(p.dE,p.dE2)<13.5&&Math.max(p.dE,p.dE2)>(p.A<=18&&p.thick<=1.45?15:18)&&p.A<=Math.round(52*s*s)&&p.thick<=2.25*i;if(u){let O=0;for(let R=0;R<p.cells.length;R++)u[p.cells[R]]&&O++;if(!(p.domFrac>=.85&&p.A<=10&&p.dE<14&&p.support<.35||x)&&(O*3>=p.cells.length||O>=8))continue}let w=p.domFrac>=.82;if(!w&&x){let O=p.domFrac>=.6&&p.A<=28||p.dE<=p.dE2?p.S:p.S2,S=!0;for(let R=0;R<p.cells.length;R++)if(t[p.cells[R]]!==p.lab){S=!1;break}if(S){for(let R=0;R<p.cells.length;R++)t[p.cells[R]]=O;I++;continue}}if(w&&p.A>=12&&p.thick>=1.45&&p.support>=.38&&(p.dE00>=2.8||p.dE>=4.5))continue;let y=p.A<=8*s?.38:p.A<=24*s?.3:p.A<=64*s?.22:.16,G=w&&p.dE<16&&p.support<y,$=w&&p.dE<22&&p.support<.28||p.domFrac>=.45&&p.creaseFrac<.18&&p.thick<1.85*i&&p.support<.3||p.domFrac>=.5&&p.creaseFrac<.18&&p.A<=24*s*s&&p.support<.32;if(!G&&!$)continue;let k=!0;for(let O=0;O<p.cells.length;O++)if(t[p.cells[O]]!==p.lab){k=!1;break}if(k){for(let O=0;O<p.cells.length;O++)t[p.cells[O]]=p.S;I++}}if(b+=I,!I)break}return b}function uo(t,e,a,l,n,r,s,i){let _=Math.pow(Math.max(1,Math.max(e,a)/720),.52),u=St(Math.min(7,Math.max(i||4,Math.round((i||4)*_))),2,7);return zn(t,e,a,l,n,r),Uo(t,e,a,l,n,r,s),Do(t,e,a,l,n,r,s),pa(t,e,a,l,n,r),zn(t,e,a,l,n,r),ma(t,e,a,l,n),lo(t,e,a,u,l,n),Io(t,e,a,l,n,r),fo(t,e,a,l,n,r),zn(t,e,a,l,n,r),lo(t,e,a,u,l,n),fo(t,e,a,l,n,r),t}function Uo(t,e,a,l,n,r,s=null,i=!1){if(!l||!l.data||!n)return t;if(!i&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuMorphCleanStrokes&&n.length<=64){let T=s||t._segCtx||l._segCtx||cn(l,l,r,n,null,!1);if(xe.gpuMorphCleanStrokes(t,e,a,l,n,r,T))return t}let _=l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l.data.data,u=new Int16Array(t),b=t._detailProt||null;for(let T=1;T<a-1;T++)for(let I=1;I<e-1;I++){let p=T*e+I;if(r&&r[p]||b&&b[p])continue;let x=t[p],w=t[p-1],y=t[p+1],G=t[p-e],$=t[p+e],k=-1;if(w>=0&&w===y&&w!==x&&G!==w&&$!==w?k=w:G>=0&&G===$&&G!==x&&w!==G&&y!==G&&(k=G),k>=0&&n[k]&&n[x]){let O=0;for(let S=-1;S<=1;S++)for(let R=-1;R<=1;R++)R===0&&S===0||t[(T+S)*e+(I+R)]===k&&O++;if(O>=3){let S=p*4,R=Wt(_[S],_[S+1],_[S+2],n[k].r,n[k].g,n[k].b),g=Wt(_[S],_[S+1],_[S+2],n[x].r,n[x].g,n[x].b);R<=g*1.25+420&&!In(t,e,a,I,T,x,k)&&(u[p]=k)}}}t.set(u);let C=new Int16Array(t);for(let T=1;T<a-1;T++)for(let I=1;I<e-1;I++){let p=T*e+I;if(r&&r[p]||b&&b[p])continue;let x=t[p];if(x<0)continue;let w=[p-1,p+1,p-e,p+e],y=0,G=-1,$=new Map;for(let tt=0;tt<4;tt++){let j=t[w[tt]];j===x?(y++,G=tt):j>=0&&$.set(j,($.get(j)||0)+2)}if(y>1)continue;let k=0,O=0,S=G===0?-1:G===1?1:0,R=G===2?-1:G===3?1:0;for(let[tt,j]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let z=(T+j)*e+(I+tt),X=t[z];X===x?(k++,y===1&&tt*S+j*R<=0&&O++):X>=0&&$.set(X,($.get(X)||0)+1)}if(y===0&&k>=1||y===1&&(O>0||k>=1))continue;let g=-1,f=0;if($.forEach((tt,j)=>{tt>f&&(f=tt,g=j)}),g<0||!n[g]||!n[x])continue;let o=p*4,h=_[o],A=_[o+1],U=_[o+2],P=n[x],c=n[g],E=Wt(h,A,U,P.r,P.g,P.b),q=Wt(h,A,U,c.r,c.g,c.b),Q=E>q*1.15;(y===0&&Q||y===1&&k===0&&E>q*1.35)&&(C[p]=g)}return t.set(C),Do(t,e,a,l,n,r,s),Io(t,e,a,l,n,r),t}function ma(t,e,a,l=null,n=null){let r=l&&l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l&&l.data?l.data.data:null,s=new Int32Array(e*a).fill(-1),i=[];for(let b=0;b<e*a;b++){if(t[b]<0||s[b]>=0)continue;let C=t[b],T=i.length,I=[b];s[b]=T;let p=[],x=0,w=new Map;for(;I.length;){let k=I.pop();p.push(k);let O=k%e,S=k/e|0,R=[O>0?k-1:-1,O<e-1?k+1:-1,S>0?k-e:-1,S<a-1?k+e:-1];for(let g=0;g<4;g++){let f=R[g];if(f<0){x++;continue}let o=t[f];o!==C?(x++,o>=0&&w.set(o,(w.get(o)||0)+1)):s[f]<0&&(s[f]=T,I.push(f))}}let y=p.length,G=y/Math.max(1,x*x),$=2*y/Math.max(1,x);i.push({id:T,lab:C,cells:p,area:y,perim:x,sliverRatio:G,meanWidth:$,nbCounts:w})}let _=Math.max(280,Math.round(e*a*.0055));i.sort((b,C)=>b.area-C.area);let u=t._detailProt||null;for(let b of i){if(b.area>_||b.nbCounts.size===0)continue;if(u&&b.area>=6){let g=0;for(let f of b.cells)u[f]&&g++;if(g*3>=b.cells.length||g>=8)continue}let C=[...b.nbCounts.entries()].sort((g,f)=>f[1]-g[1]),T=C[0][0],I=C.length>=2&&C[1][1]>=Math.max(2,b.perim*.08),p=!1,x=!1;if(n&&n._hasSmoothGradient&&b.meanWidth>=2.2&&b.area>=48&&C.length>=2){let g=n[C[0][0]],f=n[C[1][0]];g&&f&&Wt(g.r,g.g,g.b,f.r,f.g,f.b)<2600&&(p=!0)}if(!p&&I&&n){let g=n[b.lab],f=Math.min(C.length,3),o=C[0][0],h=C[1][0];if(g){let P=.299*g.r+.587*g.g+.114*g.b;for(let c=0;c<f&&!x;c++)for(let E=c+1;E<f&&!x;E++){let q=n[C[c][0]],Q=n[C[E][0]];if(q&&Q){let tt=.299*q.r+.587*q.g+.114*q.b,j=.299*Q.r+.587*Q.g+.114*Q.b;if(b.area>=8&&(P<Math.min(tt,j)-3||P>Math.max(tt,j)+4)){p=!0;break}if(Oe(g.r,g.g,g.b,q,Q)&&(x=!0,o=C[c][0],h=C[E][0]),!x&&C.length>=3)for(let z=E+1;z<Math.min(C.length,4);z++){let X=n[C[z][0]];if(X&&Hn(g.r,g.g,g.b,q,Q,X)){x=!0,o=C[c][0],h=C[E][0];break}}}}}if(!x&&!p&&b.area<=18&&r&&C.length>=2){let P=0,c=0,E=0;for(let j of b.cells){let z=j*4;P+=r[z],c+=r[z+1],E+=r[z+2]}P/=b.cells.length,c/=b.cells.length,E/=b.cells.length;let q=n[C[0][0]],Q=n[C[1][0]],tt=C.length>=3?n[C[2][0]]:null;(q&&Q&&Oe(P,c,E,q,Q)||q&&Q&&tt&&Hn(P,c,E,q,Q,tt))&&(x=!0)}let A=n[o],U=n[h];if(g&&A&&U&&r){let P=0,c=0;for(let q of b.cells){let Q=q*4;P+=Wt(r[Q],r[Q+1],r[Q+2],g.r,g.g,g.b),c+=Math.min(Wt(r[Q],r[Q+1],r[Q+2],A.r,A.g,A.b),Wt(r[Q],r[Q+1],r[Q+2],U.r,U.g,U.b))}let E=P/Math.max(1,b.cells.length);P<c*.48&&E<220&&b.area>=14&&(p=!0)}}if(p)continue;let w=Math.max(1,Math.hypot(e,a)/Math.hypot(720,720)),y=Math.pow(w,.58),G=w*w,$=I&&x&&(b.sliverRatio<.044&&b.meanWidth<2.15*y||b.area<=110*G&&b.sliverRatio<.05&&b.meanWidth<2.05*y),k=x&&b.area<=55*G&&b.sliverRatio<.026&&b.meanWidth<1.55*y;if(!$&&!k)continue;let O=new Set(b.cells),S=b.cells.slice(),R=0;for(;S.length&&R++<10;){let g=[],f=[];for(let o of S){let h=o%e,A=o/e|0,U=[h>0?o-1:-1,h<e-1?o+1:-1,A>0?o-e:-1,A<a-1?o+e:-1],P=-1,c=1/0,E=o*4;for(let q of U){if(q<0||O.has(q))continue;let Q=t[q];if(Q<0||Q===b.lab)continue;let tt=r&&n&&n[Q]?Wt(r[E],r[E+1],r[E+2],n[Q].r,n[Q].g,n[Q].b):0;tt<c&&(c=tt,P=Q)}P>=0?f.push([o,P]):g.push(o)}if(!f.length){for(let o of g)t[o]=T;break}for(let[o,h]of f)t[o]=h,O.delete(o);S=g}}return t}function xa(t,e,a=null){if(!t||t.length<6)return{pts:t,juncFlags:e,vkeys:a};let l=t.slice(),n=e?e.slice():new Array(t.length).fill(0),r=a?a.slice():new Array(t.length).fill(0);for(let s=0;s<3;s++){let i=l.length;if(i<6)break;let _=new Uint8Array(i);for(let u=1;u<=3;u++)if(!(i<=u+4))for(let b=0;b<i;b++){let C=!1;for(let y=1;y<=u;y++){let G=(b+y)%i;if(_[G]||n[G]){C=!0;break}}if(C)continue;let T=l[b],I=l[(b+u+1)%i],p=Math.hypot(I[0]-T[0],I[1]-T[1]),x=0;for(let y=0;y<=u;y++){let G=l[(b+y)%i],$=l[(b+y+1)%i];x+=Math.hypot($[0]-G[0],$[1]-G[1])}if(p<(u===1?.62:u===2?.78:.88)&&x>Math.max(1.32+u*.35,p*2.25))for(let y=1;y<=u;y++)_[(b+y)%i]=1}if(_.some(u=>u===1)){let u=[],b=[],C=[];for(let T=0;T<i;T++)_[T]||(u.push(l[T]),b.push(n[T]),C.push(r[T]));u.length>=4&&(l=u,n=b,r=C)}else break}return{pts:l,juncFlags:n,vkeys:r}}function Ya(t,e,a){let l=t.length;if(l<2||!e||e.length!==l)return{pts:t,vkeys:e,juncFlags:a};let n=-1,r=1/0;for(let s=0;s<l;s++)a&&a[s]&&e[s]<r&&(r=e[s],n=s);if(n<0)for(let s=0;s<l;s++)e[s]<r&&(r=e[s],n=s);return n<=0?{pts:t,vkeys:e,juncFlags:a}:{pts:t.slice(n).concat(t.slice(0,n)),vkeys:e.slice(n).concat(e.slice(0,n)),juncFlags:a&&a.slice(n).concat(a.slice(0,n))}}function Vo(t,e,a,l,n,r={}){let s=performance.now(),i=e+1,_=a+1,u=new Float64Array(i*_),b=new Float64Array(i*_),C=new Uint8Array(i*_),T=new Uint8Array(i*_);for(let g=0;g<=a;g++)for(let f=0;f<=e;f++){let o=g*i+f;u[o]=f,b[o]=g}let I=(g,f)=>g<0||f<0||g>=e||f>=a?-1:t[f*e+g];for(let g=0;g<=a;g++)for(let f=0;f<=e;f++){let o=I(f-1,g-1),h=I(f,g-1),A=I(f-1,g),U=I(f,g),P=0;o!==h&&P++,h!==U&&P++,U!==A&&P++,A!==o&&P++,C[g*i+f]=P}r.aa!==!1&&l&&l.data&&No(u,b,C,T,t,e,a,l,n,r.forceCpu===!0);let p=new Map,x=(g,f,o,h,A)=>{let U=o*i+f,P=A*i+h,c=p.get(g);c||(c=new Map,p.set(g,c));let E=c.get(U);E||(E=[],c.set(U,E)),E.push({k1:P,ex:h,ey:A,ang:Math.atan2(A-o,h-f)})};for(let g=0;g<a;g++)for(let f=0;f<e;f++){let o=t[g*e+f];o<0||((g===0||t[(g-1)*e+f]!==o)&&x(o,f+1,g,f,g),(f===e-1||t[g*e+f+1]!==o)&&x(o,f+1,g+1,f+1,g),(g===a-1||t[(g+1)*e+f]!==o)&&x(o,f,g+1,f+1,g+1),(f===0||t[g*e-1+f]!==o)&&x(o,f,g,f,g+1))}let w=[];p.forEach((g,f)=>{let o=new Set;g.forEach((h,A)=>{for(let U=0;U<h.length;U++){let P=A*8+U;if(o.has(P))continue;let c=[],E=[],q=[],Q=A,tt=U,j=h[U].ang,z=0;for(;z++<5e5;){o.add(Q*8+tt),c.push([u[Q],b[Q]]),E.push(Q),q.push(C[Q]>=3?1:0);let B=g.get(Q)[tt].k1;if(B===A&&c.length>2)break;let L=g.get(B);if(!L)break;let m=-1,F=-1/0,d=-1/0,M=Math.cos(j),v=Math.sin(j);for(let D=0;D<L.length;D++){if(o.has(B*8+D))continue;let N=L[D],V=Math.cos(N.ang),K=Math.sin(N.ang),W=M*K-v*V,H=M*V+v*K;(W>F+1e-9||Math.abs(W-F)<1e-9&&H>d)&&(F=W,d=H,m=D)}if(m<0)break;j=L[m].ang,Q=B,tt=m}if(c.length>=3){let X=xa(c,q,E),B=Ya(X.pts,X.vkeys,X.juncFlags),L=B.pts.length;if(L>=8&&B.juncFlags){for(let m=0;m<L;m++)if(B.juncFlags[m]){let F=Math.min(3,L>>2),d=Math.min(5,L>>2),M=B.pts[(m-F+L)%L],v=B.pts[m],D=B.pts[(m+F)%L],N=B.pts[(m-d+L)%L],V=B.pts[(m+d)%L],K=v[0]-M[0],W=v[1]-M[1],H=D[0]-v[0],et=D[1]-v[1],rt=v[0]-N[0],dt=v[1]-N[1],Y=V[0]-v[0],Z=V[1]-v[1],ot=Math.abs(Math.atan2(K*et-W*H,K*H+W*et)),xt=Math.abs(Math.atan2(rt*Z-dt*Y,rt*Y+dt*Z)),At=ot<=.62&&xt<=.66;if(!At&&L>=16&&xt<=.82){let st=[];for(let ft=-6;ft<=6;ft++)st.push(B.pts[(m+ft+L)%L]);let at=Te(st);at&&at.r>=2.5&&at.r<=380&&at.rms<=.3&&(At=!0)}B.juncFlags[m]=At?2:1}}w.push({label:f,pts:B.pts,vkeys:B.vkeys,juncFlags:B.juncFlags})}}})});let y=22,G=[];for(let g of w){let f=0,o=0,h=0,A=g.pts,U=A.length;for(let q=0;q<U;q++){let Q=A[(q+1)%U];f+=A[q][0]*Q[1]-Q[0]*A[q][1],o+=Math.hypot(Q[0]-A[q][0],Q[1]-A[q][1]),g.juncFlags&&g.juncFlags[q]&&h++}g.area=f*.5;let P=Math.abs(g.area),c=P/Math.max(1e-6,o*o),E=2*P/Math.max(1e-6,o);P<y&&c<.01&&E<.9||h>=2&&P<1.8&&E<1.15||P>.55&&U>=3&&G.push(g)}let $=new Set,k=G.slice().sort((g,f)=>Math.abs(g.area)-Math.abs(f.area));for(let g of k){let f=g.pts,o=f.length;if(o<8)continue;let h=Te(f);if(!h||h.r<1.15||h.r>480)continue;if(o<16){let D=g.juncFlags&&g.juncFlags.some(K=>K>0),V=Math.abs(g.area)/(Math.PI*h.r*h.r);if(!D&&h.r<=3.2&&V>=.76&&V<=1.26&&h.rms<=Math.max(.28,h.r*.13)&&(g.isTrueCircle=!0,g.circleFit={cx:h.cx,cy:h.cy,r:h.r},g.vkeys&&g.vkeys.length===o))for(let K=0;K<o;K++){let W=g.vkeys[K];if(W>=0&&!$.has(W)){let H=u[W]-h.cx,et=b[W]-h.cy,rt=Math.hypot(H,et)||1;u[W]=h.cx+H/rt*h.r,b[W]=h.cy+et/rt*h.r,$.add(W)}}continue}let A=f.map((D,N)=>({idx:N,d:Math.abs(Math.hypot(D[0]-h.cx,D[1]-h.cy)-h.r)})).sort((D,N)=>D.d-N.d),U=Math.max(12,Math.floor(o*.8)),P=A.slice(0,U).map(D=>f[D.idx]),c=Te(P)||h,E=1/0,q=-1/0,Q=1/0,tt=-1/0,j=0,z=[];for(let D=0;D<o;D++){let N=f[D];N[0]<E&&(E=N[0]),N[0]>q&&(q=N[0]),N[1]<Q&&(Q=N[1]),N[1]>tt&&(tt=N[1]);let V=Math.abs(Math.hypot(N[0]-c.cx,N[1]-c.cy)-c.r);z.push(V),V>j&&(j=V)}z.sort((D,N)=>D-N);let X=z[Math.floor(o*.8)],L=Math.abs(g.area)/(Math.PI*c.r*c.r),m=q-E,F=tt-Q,d=m>0&&F>0?m/F:0,M=0,v=St(Math.round(o/18),3,6);for(let D=0;D<o;D++){let N=!1;if(g.juncFlags){for(let Z=-v;Z<=v;Z++)if(g.juncFlags[(D+Z+o)%o]){N=!0;break}}if(N)continue;let V=f[(D-v+o)%o],K=f[D],W=f[(D+v)%o],H=K[0]-V[0],et=K[1]-V[1],rt=W[0]-K[0],dt=W[1]-K[1];Math.abs(Math.atan2(H*dt-et*rt,H*rt+et*dt))>1.18&&M++}if(M<=2&&d>=.87&&d<=1.14&&L>=.9&&L<=1.1&&c.rms<=Math.max(.38,c.r*.024)&&X<=Math.max(.62,c.r*.036)&&j<=Math.max(2.65,c.r*.13)){if(g.isTrueCircle=!0,g.circleFit={cx:c.cx,cy:c.cy,r:c.r},g.juncFlags)for(let D=0;D<o;D++)g.juncFlags[D]&&(g.juncFlags[D]=2);if(g.vkeys&&g.vkeys.length===o)for(let D=0;D<o;D++){let N=g.vkeys[D];if(N>=0&&!$.has(N)){let V=u[N]-c.cx,K=b[N]-c.cy,W=Math.hypot(V,K)||1;u[N]=c.cx+V/W*c.r,b[N]=c.cy+K/W*c.r,$.add(N)}}}}let O=(g,f,o=7)=>{let h=[g],A=g,U=-1,P=S?S.get(g):null;if(!P)return h;for(let c of P)if(!f.has(c)){U=c;break}if(U<0)return h;for(let c=1;c<=o&&(h.push(U),C[U]===2);c++){let E=S.get(U);if(!E||E.length!==2)break;let q=E[0]===A?E[1]:E[0];if(f.has(q))break;A=U,U=q}return h},S=new Map;for(let g of G){let f=g.vkeys;if(!(!f||f.length<3))for(let o=0;o<f.length;o++){let h=f[o],A=f[(o+1)%f.length],U=S.get(h);U||(U=[],S.set(h,U)),U.includes(A)||U.push(A);let P=S.get(A);P||(P=[],S.set(A,P)),P.includes(h)||P.push(h)}}for(let g of k){if(!g.isTrueCircle||!g.circleFit||!g.juncFlags||!g.vkeys)continue;let{cx:f,cy:o,r:h}=g.circleFit;if(h<8||h>80)continue;let A=g.pts.length,U=g.juncFlags,P=g.vkeys,c=new Set(P),E=[];for(let q=0;q<A;q++)U[q]&&E.push(q);if(!(E.length<2))for(let q=0;q<E.length;q++){let Q=E[q],tt=E[(q+1)%E.length],j=(tt-Q+A)%A;if(j<4||j>26)continue;let z=E[(q-1+E.length)%E.length],X=E[(q+2)%E.length],B=(Q-z+A)%A,L=(X-tt+A)%A;if(B<j*1.12||L<j*1.12)continue;let m=P[Q],F=P[tt],d=Math.atan2(b[m]-o,u[m]-f),M=Math.atan2(b[F]-o,u[F]-f),v=Math.atan2(Math.sin(M-d),Math.cos(M-d)),D=Math.abs(v)*h;if(D<4||D>25.5)continue;let N=d+.5*v,V=St(3.2/Math.max(3.2,D),.14,.34),K=N-.5*v*V,W=N+.5*v*V,H=u[m],et=b[m],rt=u[F],dt=b[F];for(let st=0;st<=j;st++){let at=st/j,ft=K+(W-K)*at,J=P[(Q+st)%A];u[J]=f+h*Math.cos(ft),b[J]=o+h*Math.sin(ft)}let Y=u[m]-H,Z=b[m]-et,ot=u[F]-rt,xt=b[F]-dt,At=(st,at,ft)=>{let J=O(st,c,64);if(J.length<5)return;let ut=Math.min(J.length,32),mt=[];for(let nt=Math.min(5,J.length-1);nt<J.length;nt++)mt.push([u[J[nt]],b[J[nt]]]);let it=mt.length>=6?Te(mt):null;if(it&&it.r>=15&&it.r<=240&&it.rms<=.36){let nt=[u[st],b[st]],lt=J[ut-1],ht=[u[lt],b[lt]],gt=Math.hypot(nt[0]-it.cx,nt[1]-it.cy),ct=Math.hypot(ht[0]-it.cx,ht[1]-it.cy),bt=Math.atan2(nt[1]-it.cy,nt[0]-it.cx),Ct=Math.atan2(ht[1]-it.cy,ht[0]-it.cx),Tt=Math.atan2(Math.sin(Ct-bt),Math.cos(Ct-bt));for(let yt=1;yt<ut-1;yt++){let pt=J[yt];if($.has(pt)||C[pt]!==2)break;let Mt=yt/(ut-1),vt=Mt*Mt*(3-2*Mt),Ft=bt+Tt*Mt,wt=gt*(1-vt)+ct*vt,Et=it.cx+wt*Math.cos(Ft),Dt=it.cy+wt*Math.sin(Ft);u[pt]=Et*(1-vt)+u[pt]*vt,b[pt]=Dt*(1-vt)+b[pt]*vt}}else for(let nt=1;nt<ut-1;nt++){let lt=J[nt];if($.has(lt)||C[lt]!==2)break;let ht=nt/(ut-1),gt=(1-ht)*(1-ht)*(1+2*ht);u[lt]+=at*gt,b[lt]+=ft*gt}};At(m,Y,Z),At(F,ot,xt)}}for(let g of G)if(!(!g.vkeys||g.vkeys.length!==g.pts.length))for(let f=0;f<g.pts.length;f++){let o=g.vkeys[f];o>=0&&(g.pts[f][0]=u[o],g.pts[f][1]=b[o])}for(let g of k)if(g.isTrueCircle&&g.pts.length>=16){let f=Te(g.pts);f&&f.r>=2.5&&(g.circleFit={cx:f.cx,cy:f.cy,r:f.r})}for(let g of G){if(g.isTrueCircle||!g.juncFlags||!g.vkeys||g.pts.length<24)continue;let f=g.pts,o=f.length,h=g.juncFlags,A=g.vkeys,U=[];for(let P=0;P<o;P++)h[P]&&U.push(P);if(!(U.length<2))for(let P=0;P<U.length;P++){let c=U[P],E=U[(P+1)%U.length],q=(E-c+o)%o;if(q<2||q>18)continue;let Q=!1;for(let d=1;d<q;d++)if($.has(A[(c+d)%o])){Q=!0;break}if(Q)continue;let tt=U[(P-1+U.length)%U.length],j=U[(P+2)%U.length],z=Math.min(18,Math.max(0,(c-tt+o)%o-1)),X=Math.min(18,Math.max(0,(j-E+o)%o-1));if(z<6||X<6)continue;let B=[];for(let d=z;d>=1;d--)B.push(f[(c-d+o)%o]);for(let d=1;d<=X;d++)B.push(f[(E+d)%o]);let L=Te(B),m=be(B);if(!L||L.r<8||L.r>320||L.rms>.3||m&&L.rms>=m.rms*.65)continue;let F=0;for(let d=0;d<=q;d++){let M=f[(c+d)%o],v=Math.abs(Math.hypot(M[0]-L.cx,M[1]-L.cy)-L.r);v>F&&(F=v)}if(F<=1.25){h[c]=2,h[E]=2;for(let d=0;d<=q;d++){let M=(c+d)%o,v=A[M];if(v>=0&&!$.has(v)){let D=u[v]-L.cx,N=b[v]-L.cy,V=Math.hypot(D,N)||1;u[v]=L.cx+D/V*L.r,b[v]=L.cy+N/V*L.r}}}}}for(let g of G){if(!g.juncFlags||!g.vkeys||g.pts.length<20)continue;let f=g.pts,o=f.length,h=g.juncFlags,A=g.vkeys,U=[];for(let P=0;P<o;P++)h[P]&&U.push(P);if(!(U.length<2))for(let P=0;P<U.length;P++){let c=U[P],E=U[(P+1)%U.length],q=(E-c+o)%o;if(q<2||q>22)continue;let Q=U[(P-1+U.length)%U.length],tt=U[(P+2)%U.length],j=Math.min(18,Math.max(0,(c-Q+o)%o-1)),z=Math.min(18,Math.max(0,(tt-E+o)%o-1));if(j<5||z<5)continue;let X=[];for(let L=j;L>=1;L--)X.push([u[A[(c-L+o)%o]],b[A[(c-L+o)%o]]]);for(let L=1;L<=z;L++)X.push([u[A[(E+L)%o]],b[A[(E+L)%o]]]);let B=be(X);if(B&&B.rms<=.16&&B.maxDev<=.28){let L=0;for(let m=0;m<=q;m++){let F=A[(c+m)%o],d=Math.abs((u[F]-B.c[0])*B.d[1]-(b[F]-B.c[1])*B.d[0]);d>L&&(L=d)}if(L<=1.35){h[c]=2,h[E]=2;for(let m=0;m<=q;m++){let F=A[(c+m)%o];if(F>=0&&!$.has(F)){let d=(u[F]-B.c[0])*B.d[0]+(b[F]-B.c[1])*B.d[1];u[F]=B.c[0]+B.d[0]*d,b[F]=B.c[1]+B.d[1]*d}}}}else{let L=X.length>=6?Te(X):null;if(L&&L.r>=14&&L.r<=360&&L.rms<=.28&&(!B||L.rms<B.rms*.65)){let m=0;for(let F=0;F<=q;F++){let d=A[(c+F)%o],M=Math.abs(Math.hypot(u[d]-L.cx,b[d]-L.cy)-L.r);M>m&&(m=M)}if(m<=1.65){h[c]=2,h[E]=2;let F=A[c],d=A[E],M=Math.atan2(b[F]-L.cy,u[F]-L.cx),v=Math.atan2(b[d]-L.cy,u[d]-L.cx),D=Math.atan2(Math.sin(v-M),Math.cos(v-M)),N=Math.abs(D)*L.r;if(N>=3.5&&N<=22){let V=M+.5*D,K=St(2.4/Math.max(2.4,N),.14,.32),W=V-.5*D*K,H=V+.5*D*K,et=new Set(A),rt=u[F],dt=b[F],Y=u[d],Z=b[d];for(let ft=0;ft<=q;ft++){let J=ft/q,ut=W+(H-W)*J,mt=A[(c+ft)%o];mt>=0&&!$.has(mt)&&(u[mt]=L.cx+L.r*Math.cos(ut),b[mt]=L.cy+L.r*Math.sin(ut))}let ot=u[F]-rt,xt=b[F]-dt,At=u[d]-Y,st=b[d]-Z,at=(ft,J,ut)=>{let mt=O(ft,et,18);for(let it=1;it<mt.length-1;it++){let nt=mt[it];if($.has(nt)||C[nt]!==2)break;let lt=it/(mt.length-1),ht=(1-lt)*(1-lt);u[nt]+=J*ht,b[nt]+=ut*ht}};at(F,ot,xt),at(d,At,st)}}}}}}let R=new Map;for(let g=0;g<G.length;g++){let f=G[g];if(f.area<25||f.pts.length<14||!f.vkeys)continue;let o=f.pts.length,h=f.vkeys;for(let A=0;A<o;A++){let U=h[A];if(C[U]!==2)continue;let P=[u[h[(A-3+o)%o]],b[h[(A-3+o)%o]]],c=[u[U],b[U]],E=[u[h[(A+3)%o]],b[h[(A+3)%o]]],q=c[0]-P[0],Q=c[1]-P[1],tt=Math.hypot(q,Q),j=E[0]-c[0],z=E[1]-c[1],X=Math.hypot(j,z);if(tt<1.5||X<1.5)continue;let B=Math.atan2(q*z-Q*j,q*j+Q*z);if(Math.abs(B)<.52)continue;let L=!0;for(let V=-2;V<=2;V++){if(V===0)continue;let K=(A+V+o)%o,W=h[K],H=[u[h[(K-3+o)%o]],b[h[(K-3+o)%o]]],et=[u[W],b[W]],rt=[u[h[(K+3)%o]],b[h[(K+3)%o]]];if(Math.abs(Math.atan2((et[0]-H[0])*(rt[1]-et[1])-(et[1]-H[1])*(rt[0]-et[0]),(et[0]-H[0])*(rt[0]-et[0])+(et[1]-H[1])*(rt[1]-et[1])))>Math.abs(B)+1e-4){L=!1;break}}if(!L)continue;let m=[],F=[],d=Math.min(13,Math.max(5,o>>2)),M=d>=6?2:1;for(let V=M;V<=d;V++){let K=h[(A-V+o)%o],W=h[(A+V)%o];m.push([u[K],b[K]]),F.push([u[W],b[W]])}let v=be(m),D=be(F);if(!v||!D)continue;let N=R.get(f.label);N||(N=[],R.set(f.label,N)),N.push({li:g,i:A,vk:U,pt:c,armIn:m,armOut:F,flIn:v,flOut:D})}}R.forEach(g=>{let f=new Uint8Array(g.length);for(let o=0;o<g.length;o++){if(f[o])continue;let h=g[o],A=-1,U=16.5;for(let P=o+1;P<g.length;P++){if(f[P])continue;let c=g[P];if(h.li===c.li&&Math.min((h.i-c.i+G[h.li].pts.length)%G[h.li].pts.length,(c.i-h.i+G[h.li].pts.length)%G[h.li].pts.length)<10)continue;let E=Math.hypot(c.pt[0]-h.pt[0],c.pt[1]-h.pt[1]);if(E<1.8||E>U)continue;let q=(tt,j,z,X,B)=>{if(!tt||!z||tt.rms>.3||z.rms>.3||tt.span<2.2||z.span<2.2)return null;let L=tt.d[0]*z.d[0]+tt.d[1]*z.d[1];if(Math.abs(L)<.86)return null;let m=j.slice().reverse().concat(X),F=be(m),d=m.length>=6?Te(m):null,M=!!(F&&F.rms<=.26&&F.maxDev<=.44),v=!M&&!!(d&&d.r>=10&&d.r<=520&&d.rms<=.34);return!M&&!v?null:{veinA:tt,veinB:z,flEnv:M?F:null,cfEnv:v?d:null,isAOutVein:B}},Q=q(h.flOut,h.armIn,c.flIn,c.armOut,!0)||q(h.flIn,h.armOut,c.flOut,c.armIn,!1);Q&&(U=E,A=P,h._match=Q)}if(A>=0&&h._match){let P=g[A],{veinA:c,veinB:E,flEnv:q,cfEnv:Q}=h._match;f[o]=1,f[A]=1;let tt=(z,X)=>{let B=u[z.vk],L=b[z.vk];if(q){let m=X.d[0]*q.d[1]-X.d[1]*q.d[0];if(Math.abs(m)>.18){let F=q.c[0]-X.c[0],d=q.c[1]-X.c[1],M=(F*q.d[1]-d*q.d[0])/m,v=X.c[0]+X.d[0]*M,D=X.c[1]+X.d[1]*M;Math.hypot(v-B,D-L)<=1.25&&(u[z.vk]=v,b[z.vk]=D,T[z.vk]=1)}}else if(Q){let m=X.c[0]-Q.cx,F=X.c[1]-Q.cy,d=m*X.d[0]+F*X.d[1],M=m*m+F*F-Q.r*Q.r,v=d*d-M;if(v>=0){let D=Math.sqrt(v),N=-d-D,V=-d+D,K=[X.c[0]+X.d[0]*N,X.c[1]+X.d[1]*N],W=[X.c[0]+X.d[0]*V,X.c[1]+X.d[1]*V],H=Math.hypot(K[0]-B,K[1]-L)<=Math.hypot(W[0]-B,W[1]-L)?K:W;Math.hypot(H[0]-B,H[1]-L)<=1.25&&(u[z.vk]=H[0],b[z.vk]=H[1],T[z.vk]=1)}}};tt(h,c),tt(P,E);let j=(z,X,B)=>{let L=G[z.li];if(!L||!L.vkeys)return;let m=L.vkeys.length,F=B?1:-1;for(let d=1;d<=2;d++){let M=L.vkeys[(z.i+F*d+m)%m];if(M>=0&&C[M]===2&&!$.has(M)){let D=(u[M]-X.c[0])*X.d[0]+(b[M]-X.c[1])*X.d[1],N=X.c[0]+X.d[0]*D,V=X.c[1]+X.d[1]*D;Math.hypot(N-u[M],V-b[M])<=.65&&(u[M]=N,b[M]=V)}let v=L.vkeys[(z.i-F*d+m)%m];if(v>=0&&C[v]===2&&!$.has(v)){if(q){let D=(u[v]-q.c[0])*q.d[0]+(b[v]-q.c[1])*q.d[1],N=q.c[0]+q.d[0]*D,V=q.c[1]+q.d[1]*D;Math.hypot(N-u[v],V-b[v])<=.65&&(u[v]=N,b[v]=V)}else if(Q){let D=u[v]-Q.cx,N=b[v]-Q.cy,V=Math.hypot(D,N)||1,K=Q.cx+D/V*Q.r,W=Q.cy+N/V*Q.r;Math.hypot(K-u[v],W-b[v])<=.65&&(u[v]=K,b[v]=W)}}}};j(h,c,h._match.isAOutVein),j(P,E,!h._match.isAOutVein)}}});for(let g of G)if(!(!g.vkeys||g.vkeys.length!==g.pts.length))for(let f=0;f<g.pts.length;f++){let o=g.vkeys[f];o>=0&&(g.pts[f][0]=u[o],g.pts[f][1]=b[o])}return{loops:G,vxCoord:u,vyCoord:b,vValence:C,GW:i,GH:_,ms:performance.now()-s}}function Qa(t,e,a){let l=Math.max(Math.abs(e),Math.abs(a)),n=Math.min(Math.abs(e),Math.abs(a)),r=St(t,0,1);if(l<1e-6)return 0;let s=n/(2*l),i;return r<s&&n>1e-5?i=-(l+n-Math.sqrt(Math.max(0,8*l*n*r))):r>1-s&&n>1e-5?i=+(l+n-Math.sqrt(Math.max(0,8*l*n*(1-r)))):i=2*l*(r-.5),St(i,-.72,.72)}function No(t,e,a,l,n,r,s,i,_,u=!1){let b=i.rawRgba&&i.rawRgba.length===r*s*4?i.rawRgba:i.data.data,C=r+1,T=s+1,I=(S,R)=>S<0||R<0||S>=r||R>=s?-1:n[R*r+S],p=new Map,x=(S,R)=>{let g=p.get(S);g||(g=[],p.set(S,g)),g.includes(R)||g.push(R)};for(let S=0;S<s;S++)for(let R=0;R<r;R++){let g=n[S*r+R];if(S>0&&n[(S-1)*r+R]!==g){let f=S*C+R,o=S*C+(R+1);x(f,o),x(o,f)}if(R>0&&n[S*r+R-1]!==g){let f=S*C+R,o=(S+1)*C+R;x(f,o),x(o,f)}}let w=(S,R,g)=>{let f=[S],o=R,h=S;for(let A=1;A<=g&&(f.push(o),a[o]===2);A++){let U=p.get(o);if(!U||U.length!==2)break;let P=U[0]===h?U[1]:U[0];h=o,o=P}return f},y=new Float32Array(C*T),G=new Float32Array(C*T);for(let S=1;S<s;S++)for(let R=1;R<r;R++){let g=S*C+R,f=a[g];if(f<2)continue;if(f>=3){l[g]=1;continue}let o=[I(R-1,S-1),I(R,S-1),I(R-1,S),I(R,S)],h=o[0],A=-2,U=0,P=0;for(let at=0;at<4;at++)o[at]===h?U++:(A===-2&&(A=o[at]),o[at]===A&&P++);if(A===-2||U+P<4)continue;let c=0,E=0,q=0,Q=0,tt=0,j=0,z=0,X=0,B=0,L=0,m=0,F=0,d=0,M=0,v=0;for(let at=-3;at<=2;at++){let ft=S+at;if(!(ft<0||ft>=s))for(let J=-3;J<=2;J++){let ut=R+J;if(ut<0||ut>=r)continue;let mt=n[ft*r+ut],it=J+.5,nt=at+.5,lt=it*it+nt*nt,ht=Math.exp(-lt/3);if(mt===h){if(c+=it*ht,E+=nt*ht,q+=ht,lt>=1.5){let gt=(ft*r+ut)*4;X+=b[gt],B+=b[gt+1],L+=b[gt+2],m++}}else if(mt===A){if(Q+=it*ht,tt+=nt*ht,j+=ht,lt>=1.5){let gt=(ft*r+ut)*4;F+=b[gt],d+=b[gt+1],M+=b[gt+2],v++}}else J>=-2&&J<=1&&at>=-2&&at<=1&&z++}}if(q<=0||j<=0)continue;let D=Q/j-c/q,N=tt/j-E/q,V=p.get(g);if(V&&V.length===2){let at=w(g,V[0],3),ft=w(g,V[1],3),J=at[at.length-1],ut=ft[ft.length-1],mt=ut%C-J%C,it=(ut/C|0)-(J/C|0),nt=Math.hypot(mt,it);if(nt>1.5){let lt=-it/nt,ht=mt/nt;lt*D+ht*N<0&&(lt=-lt,ht=-ht);let gt=Math.hypot(D,N)||1;D=.55*(D/gt)+.45*lt,N=.55*(N/gt)+.45*ht}}let K=Math.hypot(D,N);if(K<1e-5)continue;D/=K,N/=K,y[g]=D,G[g]=N;let W=h>=0&&_[h]?_[h]:null,H=A>=0&&_[A]?_[A]:null,et=W?{r:m>=2?.9*(X/m)+.1*W.r:W.r,g:m>=2?.9*(B/m)+.1*W.g:W.g,b:m>=2?.9*(L/m)+.1*W.b:W.b}:null,rt=H?{r:v>=2?.9*(F/v)+.1*H.r:H.r,g:v>=2?.9*(d/v)+.1*H.g:H.g,b:v>=2?.9*(M/v)+.1*H.b:H.b}:null,dt=et&&rt?et.r-rt.r:0,Y=et&&rt?et.g-rt.g:0,Z=et&&rt?et.b-rt.b:0,ot=dt*dt+Y*Y+Z*Z,xt=0,At=0;for(let at=-1;at<=0;at++){let ft=S+at;for(let J=-1;J<=0;J++){let ut=R+J;if(ot>64){let mt=(ft*r+ut)*4,it=b[mt],nt=b[mt+1],lt=b[mt+2],ht=St(((it-rt.r)*dt+(nt-rt.g)*Y+(lt-rt.b)*Z)/ot,0,1);xt+=ht,At++}else if((h===-1||A===-1)&&i.origAlpha){let mt=i.origAlpha[ft*r+ut]/255;xt+=h===-1?1-mt:mt,At++}}}if(z===0&&(U===1&&P===3||U===3&&P===1)&&At===4&&ot>64){let at=(Tt,yt)=>{let pt=(yt*r+Tt)*4;return St(((b[pt]-rt.r)*dt+(b[pt+1]-rt.g)*Y+(b[pt+2]-rt.b)*Z)/ot,0,1)},ft=at(R-1,S-1),J=at(R,S-1),ut=at(R-1,S),mt=at(R,S),it=o[0]!==o[1],nt=o[2]!==o[3],lt=o[0]!==o[2],ht=o[1]!==o[3],gt=it?.5*(ft+J):nt?.5*(ut+mt):.5,ct=lt?.5*(ft+ut):ht?.5*(J+mt):.5,bt=it?o[0]===h?1:-1:o[2]===h?1:-1,Ct=lt?o[0]===h?1:-1:o[1]===h?1:-1;t[g]=R+bt*St(gt-.5,-.42,.42),e[g]=S+Ct*St(ct-.5,-.42,.42)}else{let at=At===4?xt*.25:U*.25,ft=Qa(at,D,N)*(z>0?.65:1);t[g]=R+D*ft,e[g]=S+N*ft}}let $=()=>{for(let S=0;S<=s;S++)for(let R=0;R<=r;R++){if(R>0&&R<r&&S>0&&S<s||(R===0||R===r)&&(S===0||S===s))continue;let g=S*C+R,f=p.get(g);if(!f)continue;let o=-1;for(let P of f){let c=P%C,E=P/C|0;if(c>0&&c<r&&E>0&&E<s){o=P;break}}if(o<0)continue;let h=w(g,o,6);if(h.length<3)continue;let A=[];for(let P=1;P<h.length;P++)A.push([t[h[P]],e[h[P]]]);let U=be(A);if(U){if((S===0||S===s)&&Math.abs(U.d[1])>.25){let P=(S-U.c[1])/U.d[1],c=U.c[0]+U.d[0]*P;Math.abs(c-R)<=.72&&(t[g]=St(c,0,r))}else if((R===0||R===r)&&Math.abs(U.d[0])>.25){let P=(R-U.c[0])/U.d[0],c=U.c[1]+U.d[1]*P;Math.abs(c-S)<=.72&&(e[g]=St(c,0,s))}}}};$();for(let S=1;S<s;S++)for(let R=1;R<r;R++){let g=S*C+R;if(a[g]<3)continue;let f=p.get(g);if(!f||f.length<3)continue;let o=f.map(U=>w(g,U,5)).filter(U=>U.length>=3),h=null,A=.28;for(let U=0;U<o.length;U++)for(let P=U+1;P<o.length;P++){let c=o[U],E=o[P],q=c[Math.min(3,c.length-1)],Q=E[Math.min(3,E.length-1)],tt=t[g]-t[q],j=e[g]-e[q],z=t[Q]-t[g],X=e[Q]-e[g],B=Math.hypot(tt,j),L=Math.hypot(z,X);if(B<.8||L<.8||Math.abs(Math.atan2(tt*X-j*z,tt*z+j*X))>.58)continue;let F=[];for(let M=c.length-1;M>=1;M--)F.push([t[c[M]],e[c[M]]]);for(let M=1;M<E.length;M++)F.push([t[E[M]],e[E[M]]]);let d=be(F);if(d&&d.rms<A){A=d.rms;let M=(R-d.c[0])*d.d[0]+(S-d.c[1])*d.d[1];h=[d.c[0]+d.d[0]*M,d.c[1]+d.d[1]*M]}if(F.length>=5){let M=Te(F);if(M&&M.r>=3&&M.r<=360&&M.rms<A){A=M.rms;let v=R-M.cx,D=S-M.cy,N=Math.hypot(v,D)||1;h=[M.cx+v/N*M.r,M.cy+D/N*M.r]}}}h&&Math.hypot(h[0]-R,h[1]-S)<=.58&&(t[g]=h[0],e[g]=h[1])}let k=new Float64Array(t),O=new Float64Array(e);for(let S=1;S<s;S++)for(let R=1;R<r;R++){let g=S*C+R;if(a[g]!==2)continue;let f=p.get(g);if(!f||f.length!==2)continue;let o=(dt,Y,Z)=>{let ot=[dt,Y],xt=dt,At=Y,st=Y%C-dt%C,at=(Y/C|0)-(dt/C|0);for(let ft=1;ft<Z&&a[At]===2;ft++){let J=p.get(At);if(!J||J.length!==2)break;let ut=J[0]===xt?J[1]:J[0];if(ut===dt)break;let mt=ut%C-At%C,it=(ut/C|0)-(At/C|0);if(mt*st+it*at<=0&&ot.length>=3)break;ot.push(ut),xt=At,At=ut}return ot},h=o(g,f[0],8),A=o(g,f[1],8);if(h.length<3||A.length<3)continue;let U=h.slice(1).reverse().map(dt=>[k[dt],O[dt]]),P=A.slice(1).map(dt=>[k[dt],O[dt]]),c=be(U),E=be(P);if(!c||!E)continue;let q=Math.abs(Math.atan2(c.d[0]*E.d[1]-c.d[1]*E.d[0],c.d[0]*E.d[0]+c.d[1]*E.d[1]));if(q<.42)continue;let Q=[k[h[Math.min(3,h.length-1)]],O[h[Math.min(3,h.length-1)]]],tt=[k[A[Math.min(3,A.length-1)]],O[A[Math.min(3,A.length-1)]]],j=[k[h[Math.min(6,h.length-1)]],O[h[Math.min(6,h.length-1)]]],z=[k[A[Math.min(6,A.length-1)]],O[A[Math.min(6,A.length-1)]]],X=Math.hypot(tt[0]-Q[0],tt[1]-Q[1]),B=Math.hypot(z[0]-j[0],z[1]-j[1]),L=.5*(j[0]+z[0]),m=.5*(j[1]+z[1]),F=Math.hypot(k[g]-L,O[g]-m),d=B>.5?F/B:0;if(q>=2.35&&X<=3.2&&B<=3.8&&B-X<.8)continue;let v=(dt,Y)=>{if(!Y||Y.span<1.45||Y.rms>.15||Y.maxDev>.28)return!1;let Z=dt[0],ot=dt[dt.length-1],xt=dt[dt.length>>1],At=Math.hypot(ot[0]-Z[0],ot[1]-Z[1])||1;return Math.abs((xt[0]-Z[0])*(ot[1]-Z[1])-(xt[1]-Z[1])*(ot[0]-Z[0]))/At<=.024},D=v(U,c),N=v(P,E),V=D&&N,K=U.concat([[k[g],O[g]]],P),W=K.length>=5?Te(K):null,H=.5*(c.rms+E.rms);if(!!!(W&&W.r>=2.2&&W.r<=95&&W.rms<=Math.min(.18,H*.72))&&(V&&q>=.48&&d>=.16||q>=.65&&d>=.24&&B-X>=1.3&&H<=.34)){if(l[g]=1,V){let dt=c.d[0]*E.d[1]-c.d[1]*E.d[0];if(Math.abs(dt)>.12){let Y=E.c[0]-c.c[0],Z=E.c[1]-c.c[1],ot=(Y*E.d[1]-Z*E.d[0])/dt,xt=c.c[0]+c.d[0]*ot,At=c.c[1]+c.d[1]*ot,st=Math.hypot(xt-k[g],At-O[g]),at=Math.hypot(xt-k[f[0]],At-O[f[0]]),ft=Math.hypot(xt-k[f[1]],At-O[f[1]]);st<=at+.15&&st<=ft+.15&&st<=1.15&&(t[g]=St(xt,R-.65,R+.65),e[g]=St(At,S-.65,S+.65),k[g]=t[g],O[g]=e[g])}}else if(D!==N){let dt=D?c:E,Y=(D?A:h).slice(0,4).map(ot=>[k[ot],O[ot]]),Z=be(Y);if(Z){let ot=dt.d[0]*Z.d[1]-dt.d[1]*Z.d[0];if(Math.abs(ot)>.15){let xt=Z.c[0]-dt.c[0],At=Z.c[1]-dt.c[1],st=(xt*Z.d[1]-At*Z.d[0])/ot,at=dt.c[0]+dt.d[0]*st,ft=dt.c[1]+dt.d[1]*st;Math.hypot(at-k[g],ft-O[g])<=.42&&(t[g]=St(at,R-.45,R+.45),e[g]=St(ft,S-.45,S+.45),k[g]=t[g],O[g]=e[g])}}}}}for(let S=1;S<s;S++)for(let R=1;R<r;R++){let g=S*C+R;if(a[g]<3)continue;let f=p.get(g);if(!f||f.length<3)continue;let o=[];for(let tt of f){let j=w(g,tt,8).slice(1);if(j.length>=2){let z=j.map(m=>[k[m],O[m]]),X=z.slice(0,Math.min(4,z.length)),B=be(z),L=be(X)||B;if(B&&L){let m=z[Math.min(2,z.length-1)][0]-R,F=z[Math.min(2,z.length-1)][1]-S,d=L.d[0],M=L.d[1];d*m+M*F<0&&(d=-d,M=-M),o.push({nb:tt,pts:z,fl:B,flNear:L,tx:d,ty:M})}}}let h=null,A=1/0;if(o.length===3)for(let tt=0;tt<3;tt++)for(let j=tt+1;j<3;j++){let z=o[tt],X=o[j],B=z.tx*X.tx+z.ty*X.ty;if(B>-.72)continue;let L=z.pts.slice().reverse().concat(X.pts),m=L.length>=5?Te(L):null,F=be(L),d=m&&m.r>=2.2&&m.r<=420?m.rms:1/0,M=F?F.rms:1/0,v=Math.min(d,M),D=Math.acos(St(-B,-1,1)),N=v+D*.35;if(v<=.34&&N<A){A=N;let V=3-tt-j;h={bA:z,bB:X,bStem:o[V],cf:d<=M*1.05?m:null,fl:F}}}if(h){let{bA:tt,bB:j,bStem:z,cf:X,fl:B}=h,L=tt.pts[0],m=j.pts[0],F=.5*(L[0]+m[0]),d=.5*(L[1]+m[1]);if(z&&z.flNear){let M=z.flNear.c,v=z.flNear.d,D=m[0]-L[0],N=m[1]-L[1],V=Math.hypot(D,N)||1,K=D/V,W=N/V,H=K*v[1]-W*v[0];if(Math.abs(H)>.14){let et=M[0]-F,rt=M[1]-d,dt=St((et*v[1]-rt*v[0])/H,-.45,.45);F+=K*dt,d+=W*dt}}if(X&&X.r>=2.2&&X.r<=420){let M=F-X.cx,v=d-X.cy,D=Math.hypot(M,v)||1;F=X.cx+M/D*X.r,d=X.cy+v/D*X.r}else if(B&&B.rms<=.18){let M=(F-B.c[0])*B.d[0]+(d-B.c[1])*B.d[1];F=B.c[0]+B.d[0]*M,d=B.c[1]+B.d[1]*M}t[g]=St(F,R-.52,R+.52),e[g]=St(d,S-.52,S+.52),k[g]=t[g],O[g]=e[g];continue}let U=.2,P=0,c=.2,E=.2*R,q=.2*S,Q=0;for(let tt of o){let j=tt.flNear;if(j){let z=-j.d[1],X=j.d[0],B=1/(.04+j.rms);U+=B*z*z,P+=B*z*X,c+=B*X*X;let L=z*j.c[0]+X*j.c[1];E+=B*z*L,q+=B*X*L,Q++}}if(Q>=2){let tt=U*c-P*P;if(Math.abs(tt)>1e-6){let j=(c*E-P*q)/tt,z=(U*q-P*E)/tt;t[g]=St(j,R-.5,R+.5),e[g]=St(z,S-.5,S+.5),k[g]=t[g],O[g]=e[g]}}}for(let S=2;S<s-2;S++)for(let R=2;R<r-2;R++){let g=S*C+R;if(a[g]<3)continue;let f=[];for(let o=-1;o<=1;o++)for(let h=-1;h<=1;h++){let A=(S+o)*C+(R+h);a[A]>=3&&f.push(A)}if(f.length>=2){let o=new Set(f),h=[];for(let A of f){let U=p.get(A)||[];for(let P of U){if(o.has(P))continue;let c=w(A,P,10).slice(1);if(c.length>=4){let E=c.slice(1).map(Q=>[k[Q],O[Q]]),q=be(E);q&&q.rms<=.16&&q.span>=3.2&&h.push(q)}}}if(h.length>=4){let A=.05,U=0,P=.05,c=.05*k[g],E=.05*O[g];for(let Q of h){let tt=-Q.d[1],j=Q.d[0],z=1/(.02+Q.rms);A+=z*tt*tt,U+=z*tt*j,P+=z*j*j;let X=tt*Q.c[0]+j*Q.c[1];c+=z*tt*X,E+=z*j*X}let q=A*P-U*U;if(Math.abs(q)>1e-4){let Q=(P*c-U*E)/q,tt=(A*E-U*c)/q;if(Math.hypot(Q-R,tt-S)<=1.25){let j=0;for(let z of h){let X=(Q-z.c[0])*z.d[1]-(tt-z.c[1])*z.d[0];j+=X*X}if(Math.sqrt(j/h.length)<=.38)for(let z of f)t[z]=Q,e[z]=tt,k[z]=Q,O[z]=tt,l[z]=1}}}}}for(let S of[.42,-.44,.38,-.4,.34,-.36]){let R=new Float64Array(t),g=new Float64Array(e);p.forEach((f,o)=>{if(f.length!==2||a[o]!==2||l[o])return;let h=o%C,A=o/C|0;if(h===0||A===0||h===r||A===s)return;let U=f[0],P=f[1],c=l[U]||l[P]||a[U]>=3||a[P]>=3?.3:1,E=.5*(t[U]+t[P]),q=.5*(e[U]+e[P]),Q=(E-t[o])*S*c,tt=(q-e[o])*S*c,j=y[o],z=G[o];if(j!==0||z!==0){let X=-z,B=j,L=Q*j+tt*z,m=Q*X+tt*B,F=t[o]+X*m+j*(L*.4),d=e[o]+B*m+z*(L*.4),M=F-k[o],v=d-O[o];typeof rn<"u"&&(rn._curMaxDim=Math.max(r,s));let D=Math.max(r,s)>=1200?.26:.14,N=Math.max(r,s)>=1200?.4:.36,V=St(M*j+v*z,-D,D),K=St(M*X+v*B,-N,N);R[o]=k[o]+X*K+j*V,g[o]=O[o]+B*K+z*V}else R[o]=St(t[o]+Q,k[o]-.22,k[o]+.22),g[o]=St(e[o]+tt,O[o]-.22,O[o]+.22)}),t.set(R),e.set(g)}$()}function ga(t,e){if(t.length<4)return t;let a=new Uint8Array(t.length);a[0]=a[t.length-1]=1;let l=[[0,t.length-1]];for(;l.length;){let[n,r]=l.pop(),s=-1,i=0,_=t[n][0],u=t[n][1],b=t[r][0],C=t[r][1],T=b-_,I=C-u,p=T*T+I*I;for(let x=n+1;x<r;x++){let w;if(p<1e-12)w=(t[x][0]-_)**2+(t[x][1]-u)**2;else{let y=St(((t[x][0]-_)*T+(t[x][1]-u)*I)/p,0,1),G=_+T*y-t[x][0],$=u+I*y-t[x][1];w=G*G+$*$}w>i&&(i=w,s=x)}i>e*e&&s>0&&(a[s]=1,l.push([n,s],[s,r]))}return t.filter((n,r)=>a[r])}function Ja(t,e=.03){let a=t.length;if(a<12||e<=.015)return t.map(i=>i.slice());let l=0,n=-1;for(let i=0;i<a;i++){let _=(t[i][0]-t[0][0])**2+(t[i][1]-t[0][1])**2;_>n&&(n=_,l=i)}let r=t.slice(l).concat(t.slice(0,l));r.push(r[0].slice());let s=ga(r,e);return s.length>1&&s.pop(),s.length>=4?s:t.map(i=>i.slice())}function Gn(t,e,a=14,l=.45,n=-.473,r=!1){let s=t.length;if(s<5)return t.map(u=>[u[0],u[1]]);if(!r&&s>=512&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuTaubinFilterClosed){let u=xe.gpuTaubinFilterClosed(t,e,a,l,n);if(u)return u}let i=t.map(u=>[u[0],u[1]]),_=(u,b)=>{let C=u.map(T=>[T[0],T[1]]);for(let T=0;T<s;T++){if(e&&e[T])continue;let I=(T-1+s)%s,p=(T+1)%s;C[T][0]=u[T][0]+b*(.5*(u[I][0]+u[p][0])-u[T][0]),C[T][1]=u[T][1]+b*(.5*(u[I][1]+u[p][1])-u[T][1])}return C};for(let u=0;u<a;u++)i=_(i,l),i=_(i,n);return i}function be(t){let e=t.length;if(e<2)return null;let a=0,l=0;for(let p=0;p<e;p++)a+=t[p][0],l+=t[p][1];a/=e,l/=e;let n=0,r=0,s=0;for(let p=0;p<e;p++){let x=t[p][0]-a,w=t[p][1]-l;n+=x*x,r+=w*w,s+=x*w}let i=.5*Math.atan2(2*s,n-r),_=Math.cos(i),u=Math.sin(i),b=t[e-1][0]-t[0][0],C=t[e-1][1]-t[0][1];_*b+u*C<0&&(_=-_,u=-u);let T=0,I=0;for(let p=0;p<e;p++){let x=Math.abs((t[p][0]-a)*u-(t[p][1]-l)*_);x>I&&(I=x),T+=x*x}return{c:[a,l],d:[_,u],rms:Math.sqrt(T/e),maxDev:I,span:Math.hypot(b,C)}}function Te(t){let e=t.length;if(e<4)return null;let a=0,l=0,n=0,r=0,s=0,i=0,_=0,u=0,b=0;for(let O=0;O<e;O++){let S=t[O][0],R=t[O][1],g=S*S,f=R*R;a+=S,l+=R,n+=g,r+=f,s+=S*R,i+=g*S,_+=f*R,u+=g*R,b+=S*f}let C=e*n-a*a,T=e*s-a*l,I=e*r-l*l,p=.5*(e*i+e*b-a*n-a*r),x=.5*(e*u+e*_-l*n-l*r),w=C*I-T*T;if(Math.abs(w)<1e-9)return null;let y=(p*I-x*T)/w,G=(C*x-T*p)/w,$=0;for(let O=0;O<e;O++)$+=Math.hypot(t[O][0]-y,t[O][1]-G);$/=e;let k=0;for(let O=0;O<e;O++){let S=Math.hypot(t[O][0]-y,t[O][1]-G)-$;k+=S*S}return{cx:y,cy:G,r:$,rms:Math.sqrt(k/e)}}function qo(t,e,a){let l=t.length,n=T=>(T%l+l)%l,r=t[e],s=1/0;for(let T of[1,-1]){let I=0,p=e;for(let x=0;x<l;x++){let w=t[n(p)],y=t[n(p+T)];if(I+=Math.hypot(y[0]-w[0],y[1]-w[1]),p+=T,a.has(n(p))){I<s&&(s=I);break}if(I>14)break}}let i=Math.min(6.5,Math.max(2.6,.54*s));if(!(i>=2.6)||s<4.5)return null;let _=(T,I)=>{let p=0,x=e;for(let w=0;w<l;w++){let y=t[n(x)],G=t[n(x+T)],$=Math.hypot(G[0]-y[0],G[1]-y[1]);if(p+$>=I){let k=(I-p)/Math.max($,1e-9);return[y[0]+(G[0]-y[0])*k,y[1]+(G[1]-y[1])*k]}p+=$,x+=T}return null},u=T=>{let I=_(-1,T),p=_(1,T);if(!I||!p)return null;let x=r[0]-I[0],w=r[1]-I[1],y=p[0]-r[0],G=p[1]-r[1];return Math.hypot(x,w)<1e-6||Math.hypot(y,G)<1e-6?null:Math.abs(Math.atan2(x*G-w*y,x*y+w*G))},b=u(Math.min(1.85,i*.48)),C=u(i);return b==null||C==null?null:{t1:b,t3:C,rho:b/Math.max(C,1e-6)}}function jo(t,e,a){let l=t.length,n=b=>(b%l+l)%l,r=b=>{let C=0,T=e;for(let I=0;I<l;I++){let p=t[n(T)],x=t[n(T+b)];if(C+=Math.hypot(x[0]-p[0],x[1]-p[1]),T+=b,a.has(n(T))||C>=30)break}return C},s=Math.min(r(-1),r(1)),i=80,_=(b,C,T)=>{let I=T[0]-C[0],p=T[1]-C[1],x=I*I+p*p||1e-9,w=Math.max(0,Math.min(1,((b[0]-C[0])*I+(b[1]-C[1])*p)/x));return Math.hypot(b[0]-(C[0]+I*w),b[1]-(C[1]+p*w))},u=null;for(let b of[2,4,6,8,10,13]){let C=b+9;if(C>s-1)break;let T=[],I=[];for(let W=b;W<=C;W++)T.push(t[n(e-W)]),I.push(t[n(e+W)]);let p=be(T),x=be(I);if(!p||!x||p.rms>.3||x.rms>.3||p.span<6||x.span<6)continue;let w=p.d[0]*x.d[1]-p.d[1]*x.d[0];if(Math.abs(w)<.08)continue;let y=x.c[0]-p.c[0],G=x.c[1]-p.c[1],$=(y*x.d[1]-G*x.d[0])/w,k=[p.c[0]+p.d[0]*$,p.c[1]+p.d[1]*$],O=W=>{let H=(W.c[0]-k[0])*W.d[0]+(W.c[1]-k[1])*W.d[1]>=0?1:-1;return[W.d[0]*H,W.d[1]*H]},S=O(p),R=O(x),g=Math.acos(Math.max(-1,Math.min(1,S[0]*R[0]+S[1]*R[1]))),f=Math.PI-g;if(f<.35||f>2.95)continue;let o=g/2,h=Math.sin(o),A=Math.tan(o),U=1/h-1;if(!(U>.001)||!(A>.001))continue;let P=Math.min(b+6,Math.floor(s)-1,22),c=[],E=1/0;for(let W=-P;W<=P;W++){let H=t[n(e+W)];c.push(H);let et=Math.hypot(H[0]-k[0],H[1]-k[1]);et<E&&(E=et)}let q=E/U,Q=q/A;if(E<1.25||q<3.2||Q>20||Q>b+6)continue;let tt=Math.hypot(S[0]+R[0],S[1]+R[1])||1,j=[(S[0]+R[0])/tt,(S[1]+R[1])/tt],z=[k[0]+j[0]*(q/h),k[1]+j[1]*(q/h)],X=[k[0]+S[0]*Q,k[1]+S[1]*Q],B=[k[0]+R[0]*Q,k[1]+R[1]*Q],L=f/2,m=k[0]-z[0],F=k[1]-z[1],d=Math.hypot(m,F)||1,M=0,v=0,D=0;for(let W of c){let H=Math.min(_(W,k,[k[0]+S[0]*i,k[1]+S[1]*i]),_(W,k,[k[0]+R[0]*i,k[1]+R[1]*i])),et=Math.min(_(W,X,[X[0]+S[0]*i,X[1]+S[1]*i]),_(W,B,[B[0]+R[0]*i,B[1]+R[1]*i])),rt=W[0]-z[0],dt=W[1]-z[1],Y=Math.hypot(rt,dt)||1e-9;Math.acos(Math.max(-1,Math.min(1,(rt*m+dt*F)/(Y*d))))<=L&&(et=Math.min(et,Math.abs(Y-q)));let ot=Math.min(_(W,X,[X[0]+S[0]*i,X[1]+S[1]*i]),_(W,B,[B[0]+R[0]*i,B[1]+R[1]*i]),_(W,X,B));M+=et*et,v+=H*H,D+=ot*ot}let N=Math.sqrt(M/c.length),V=Math.sqrt(v/c.length),K=Math.sqrt(D/c.length);N<=Math.max(.24,.032*q)&&N<=.48*V&&N<=.8*K&&(!u||N<u.rmsF)&&(u={r:q,t:Q,rmsF:N,rmsW:V})}return u}function ho(t,e=.65,a=null,l=null,n=!1){let r=t.length;if(r<8||e<=.01)return t.map(p=>[p[0],p[1]]);if(!n&&r>=256&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuDespeckleStaircaseClosed){let p=xe.gpuDespeckleStaircaseClosed(t,e,a,l);if(p&&p.length===r)return p}let s=t.map(p=>[p[0],p[1]]),i=t.map(p=>[p[0],p[1]]),_=p=>(p%r+r)%r,u=St(Math.round(2+e*3),2,5),b=St(.32+e*.14,.24,.45),C=-b/(1-.06*b);for(let p=0;p<u;p++){let x=new Uint8Array(r),w=new Float64Array(r),y=new Float64Array(r);for(let G=0;G<r;G++){let $=i[_(G-1)],k=i[G],O=i[_(G+1)],S=k[0]-$[0],R=k[1]-$[1],g=O[0]-k[0],f=O[1]-k[1],o=Math.hypot(S,R),h=Math.hypot(g,f);y[G]=o,o>1e-5&&h>1e-5&&(w[G]=Math.atan2(S*f-R*g,S*g+R*f))}for(let G=0;G<r;G++){if(a&&a[G]||l&&l[G])continue;let $=w[G],k=y[G],O=y[_(G+1)],S=!1;for(let R=1;R<=4;R++)if($*w[_(G-R)]<-.006||$*w[_(G+R)]<-.006){S=!0;break}if(r>=120&&typeof rn<"u"&&rn._curMaxDim>=1200){if(Math.abs($)>=.22&&S&&Math.min(k,O)<=5.5){x[G]=1;for(let R=-2;R<=2;R++){let g=_(G+R);a&&a[g]||l&&l[g]||(x[g]=1)}}}else Math.abs($)>=.25&&S&&Math.min(k,O)<=4.5&&(x[G]=1)}for(let G of[b,C]){let $=i.map(k=>[k[0],k[1]]);for(let k=0;k<r;k++){if(!x[k])continue;let O=i[_(k-1)],S=i[_(k+1)],R=.5*(O[0]+S[0]),g=.5*(O[1]+S[1]),f=i[k][0]+G*(R-i[k][0]),o=i[k][1]+G*(g-i[k][1]);$[k][0]=St(f,s[k][0]-.48,s[k][0]+.48),$[k][1]=St(o,s[k][1]-.48,s[k][1]+.48)}i=$}}let T=0;for(let p=0;p<r;p+=Math.max(1,r>>4))t[p][0]>T&&(T=t[p][0]),t[p][1]>T&&(T=t[p][1]);let I=r>=120&&typeof rn<"u"&&rn._curMaxDim>=1200;if(r>=16&&e>=.15){let p=I?.68:.58,x=new Uint8Array(r);for(let w=0;w<r;w++){if(a&&a[w]||l&&l[w]){x[w]=1;continue}let y=i[_(w-4)],G=i[w],$=i[_(w+4)],k=G[0]-y[0],O=G[1]-y[1],S=$[0]-G[0],R=$[1]-G[1],g=Math.hypot(k,O),f=Math.hypot(S,R);if(g>.5&&f>.5){let o=Math.abs(Math.atan2(k*R-O*S,k*S+O*R)),h=Math.hypot($[0]-y[0],$[1]-y[1])||1,A=Math.hypot(G[0]-.5*(y[0]+$[0]),G[1]-.5*(y[1]+$[1]));o>=.45&&A/h>=.16&&(x[w]=1)}}for(let w of[16,36]){let y=i.map(G=>[G[0],G[1]]);for(let G=0;G<r;G++){if(x[G])continue;let $=0;for(;$<w&&$<r>>2&&!x[_(G-$-1)]&&!x[_(G+$+1)];)$++;if($<4)continue;let k=0;for(let F=-$;F<$;F++){let d=i[_(G+F)],M=i[_(G+F+1)];k+=Math.hypot(M[0]-d[0],M[1]-d[1])}let O=i[_(G-$)],S=i[_(G+$)],R=Math.hypot(S[0]-O[0],S[1]-O[1]);if(R<3||k/R>(I?1.28:1.035))continue;let g=$*.55,f=1/(2*g*g),o=0,h=0,A=0,U=0,P=0,c=0,E=0;for(let F=-$;F<=$;F++){let d=Math.exp(-(F*F)*f),M=F*F,v=i[_(G+F)];o+=d,h+=d*M,A+=d*M*M,U+=d*v[0],P+=d*M*v[0],c+=d*v[1],E+=d*M*v[1]}let q=o*A-h*h;if(Math.abs(q)<1e-9)continue;let Q=(A*U-h*P)/q,tt=(o*P-h*U)/q,j=(A*c-h*E)/q,z=(o*E-h*c)/q,X=(S[0]-O[0])/(2*$),B=(S[1]-O[1])/(2*$),L=0;for(let F=-$;F<=$;F++){let d=i[_(G+F)],M=Q+X*F+tt*F*F,v=j+B*F+z*F*F;L+=(d[0]-M)**2+(d[1]-v)**2}Math.sqrt(L/(2*$+1))<=(I?.54:.42)&&(y[G][0]=St(Q,s[G][0]-p,s[G][0]+p),y[G][1]=St(j,s[G][1]-p,s[G][1]+p))}i=y}}return i}function Oo(t,e=44,a=null,l={}){let n=t.length,r=new Uint8Array(n),s=new Uint8Array(n),i=new Map,_=new Map;if(a)for(let Y=0;Y<n;Y++)a[Y]===1?r[Y]=1:a[Y]===2&&(s[Y]=1);if(n<6){for(let Y=0;Y<n;Y++)r[Y]=1;return{corners:r,smoothKnots:s,apexMap:i,knotTangents:_}}let u=1/0,b=-1/0,C=1/0,T=-1/0;for(let Y=0;Y<n;Y++){let Z=t[Y];Z[0]<u&&(u=Z[0]),Z[0]>b&&(b=Z[0]),Z[1]<C&&(C=Z[1]),Z[1]>T&&(T=Z[1])}let I=Math.hypot(b-u,T-C),p=0;for(let Y=0;Y<n;Y++){let Z=t[Y],ot=t[(Y+1)%n],xt=Math.abs(ot[0]-Z[0]),At=Math.abs(ot[1]-Z[1]);Math.min(xt,At)<=.18*Math.max(xt,At)&&p++}let x=I<=32&&n<=90&&p/n>=.64&&l.cornerMode!=="organic",w=l.cornerMode||"typo",y=(l.lineCurveSensitivity??74)/100,G=(l.apexSharpness??78)/100,$=(l.cornerRoundness??65)/100,k=l.protectStemCaps!==!1,O=l.extremumAlign!==!1,S=Y=>(Y%n+n)%n,R=(Y,Z,ot)=>{let xt=Y[S(Z-ot)],At=Y[Z],st=Y[S(Z+ot)],at=At[0]-xt[0],ft=At[1]-xt[1],J=st[0]-At[0],ut=st[1]-At[1],mt=Math.hypot(at,ft),it=Math.hypot(J,ut);return mt<.2||it<.2?0:Math.atan2(at*ut-ft*J,at*J+ft*ut)},g=new Uint8Array(r),f=new Float64Array(n),o=new Float64Array(n),h=new Float64Array(n);for(let Y=0;Y<n;Y++)f[Y]=R(t,Y,1),o[Y]=R(t,Y,2),h[Y]=R(t,Y,3);let A=w==="organic";for(let Y=0;Y<n;Y++){let Z=A?.72:.58,ot=A?.78:.66,xt=A?.24:.205;if((Math.abs(o[Y])>=Z||Math.abs(h[Y])>=ot)&&Math.abs(f[Y])>=.34){let At=Math.abs(f[S(Y-1)]+f[Y]+f[S(Y+1)]),st=t[S(Y-3)],at=t[S(Y+3)],ft=Math.hypot(at[0]-st[0],at[1]-st[1]),J=Math.hypot(t[Y][0]-.5*(st[0]+at[0]),t[Y][1]-.5*(st[1]+at[1]));At>=(A?.68:.56)&&ft>.5&&J/ft>=xt&&(g[Y]=1)}}let U=0;for(let Y=0;Y<n;Y+=Math.max(1,n>>4))t[Y][0]>U&&(U=t[Y][0]),t[Y][1]>U&&(U=t[Y][1]);let P=n>=120&&typeof rn<"u"&&rn._curMaxDim>=1200,c=P?new Uint8Array(r):g,E=Gn(t,c,2,.42,-.44),q=Gn(t,c,P?5:4,.44,-.46),Q=Gn(t,c,P?10:9,.45,-.473),tt=St(Math.round(n/135),3,6),j=[2,tt,St(tt*2,6,14),St(tt*4,12,26)].filter((Y,Z,ot)=>Y<Math.max(4,n>>2)&&ot.indexOf(Y)===Z);j.length||j.push(2);let z=new Float64Array(n),X=new Float64Array(n),B=new Float64Array(n),L=new Float64Array(n),m=new Float64Array(n),F=new Float64Array(n);for(let Y=0;Y<n;Y++){let Z=g[Y]&&Math.abs(o[Y])>Math.abs(R(E,Y,2))?o[Y]:R(E,Y,2);X[Y]=Z,z[Y]=Math.abs(Z);let ot=Math.max(z[Y],Math.abs(f[Y])*1.35),xt=Math.max(z[Y],Math.abs(R(E,Y,3))*(ot<.18?.35:1),g[Y]?Math.abs(h[Y]):0),At=Math.abs(R(q,Y,tt)),st=ot<.08?.12:ot<.22?ot*1.65:x?z[Y]*1.65:Math.PI;B[Y]=Math.max(g[Y]?Math.abs(h[Y]):0,Math.min(At,st));let at=ot<.1?.12:ot<.25?ot*1.75:x?Math.max(B[Y],z[Y]*1.75):Math.PI,ft=B[Y],J=R(q,Y,tt);for(let Ct of j){let Tt=R(Q,Y,Ct),yt=Ct>3?Math.min(Math.abs(Tt),at):Math.abs(Tt);yt>ft&&(ft=yt,J=Tt)}L[Y]=ft,m[Y]=J;let ut=Math.abs(R(E,Y,2)),mt=Math.abs(R(q,Y,4)),it=Math.hypot(q[S(Y+4)][0]-q[S(Y-4)][0],q[S(Y+4)][1]-q[S(Y-4)][1]),nt=.5*(q[S(Y-4)][0]+q[S(Y+4)][0]),lt=.5*(q[S(Y-4)][1]+q[S(Y+4)][1]),ht=Math.hypot(E[Y][0]-nt,E[Y][1]-lt),gt=it>.8?ht/it:0,bt=Math.sign(R(E,Y,2))===Math.sign(R(q,Y,4))&&gt>=.16&&ut>=.2?Math.max(ut,mt*.95,gt*1.95):Math.max(ut*.75,Math.min(mt*.75,st));F[Y]=Math.min(bt,at)}let M=St(e+(w==="sharp"?-8:w==="organic"?6:-4),18,115),v=Math.min(M,28)*Math.PI/180,D=Math.min(M,38)*Math.PI/180,N=k?St(tt,2,4):St(tt+1,3,6),V=[];for(let Y=0;Y<n;Y++){if(r[Y]){V.push({i:Y,forced:!0,peakVal:Math.PI,sign:1});continue}let Z=Math.max(z[Y],B[Y],L[Y]*.9,F[Y]);if(Z<v)continue;let ot=!0;for(let st=-N;st<=N;st++){if(st===0)continue;let at=S(Y+st);if(Math.max(z[at],B[at],L[at]*.9,F[at])>Z+1e-6){let J=Math.max(z[Y],B[Y]),ut=Math.max(z[at],B[at]);if(k&&Math.abs(st)>=2&&J>=.48&&ut>=.48&&Math.sign(X[Y])===Math.sign(X[at])&&J+ut>=2.55||k&&Math.abs(st)<=2&&g[Y]&&z[Y]>=.65&&z[at]<z[Y]*.85)continue;ot=!1;break}}if(!ot)continue;let xt=Y,At=Math.max(z[Y],Math.abs(R(E,Y,3)),g[Y]?Math.abs(o[Y]):0);for(let st=-3;st<=3;st++){let at=S(Y+st),ft=Math.max(z[at],Math.abs(R(E,at,3)),g[at]?Math.abs(o[at]):0);ft>At+.02&&(At=ft,xt=at)}if(V.length){let st=V[V.length-1],at=S(xt-st.i),ft=Math.max(z[xt],B[xt]),J=Math.max(z[st.i],B[st.i]),ut=k&&at>=2&&ft>=.48&&J>=.48&&Math.sign(X[xt])===Math.sign(X[st.i])&&ft+J>=2.55;if(at<N&&!ut){!st.forced&&Z>st.peakVal&&(V[V.length-1]={i:xt,forced:!1,peakVal:Z,sign:Math.sign(m[xt])||1});continue}}V.push({i:xt,forced:!1,peakVal:Z,sign:Math.sign(m[xt])||1})}let K=(Y,Z)=>{if(!Z||Z.span<(x?2.25:2.65))return!1;let ot=Math.min(.22,.11+Z.span*.0045),xt=Math.min(.4,.2+Z.span*.0085);if(Z.rms>ot||Z.maxDev>xt)return!1;let At=Y.length;if(At>=5){let st=Y[0],at=Y[At-1],ft=Math.hypot(at[0]-st[0],at[1]-st[1])||1,J=(at[0]-st[0])/ft,ut=(at[1]-st[1])/ft,mt=0,it=0,nt=Math.max(1,Math.floor(At*.25)),lt=Math.min(At-2,Math.ceil(At*.75));for(let ct=nt;ct<=lt;ct++)mt+=(Y[ct][0]-st[0])*ut-(Y[ct][1]-st[1])*J,it++;let ht=it>0?Math.abs(mt/it)/ft:0,gt=ft<6.5?Math.max(.036,.14/ft):.022;if(ht>gt)return!1;if(At>=7&&Z.rms>.085){let ct=Te(Y);if(ct&&ct.r>=2.5&&ct.r<=185&&ct.rms<Z.rms*.62)return!1}}return!0};if(V.length>=2){let Y=V[0],Z=V[V.length-1];(Y.i-Z.i+n)%n<N&&(Z.peakVal>Y.peakVal&&(V[0]=Z),V.pop())}if(k&&V.length>=2&&n>=14){let Y=(ot,xt)=>{if(!ot||!xt)return null;let At=ot.d[0]*xt.d[1]-ot.d[1]*xt.d[0];if(Math.abs(At)<.25)return null;let st=xt.c[0]-ot.c[0],at=xt.c[1]-ot.c[1],ft=(st*xt.d[1]-at*xt.d[0])/At;return[ot.c[0]+ot.d[0]*ft,ot.c[1]+ot.d[1]*ft]},Z=[];for(let ot=0;ot<V.length;ot++){let xt=V[ot],At=V[(ot-1+V.length)%V.length],st=V[(ot+1)%V.length],at=(st.i-xt.i+n)%n,ft=xt.i,J=xt.i,ut=!1,mt=Math.min(4,Math.max(2,Math.floor(n*.2)));if(at>0&&at<=mt&&xt.sign===st.sign&&!xt.forced&&!st.forced)ft=xt.i,J=st.i,ut=!0;else if(!xt.forced){for(let Mt=1;Mt<=Math.min(mt,(xt.i-At.i+n)%n-2);Mt++){let vt=S(xt.i-Mt);if(X[vt]*xt.sign<-.25)break;z[vt]>=.28&&Math.sign(X[vt])===xt.sign&&(ft=vt)}for(let Mt=1;Mt<=Math.min(mt,(st.i-xt.i+n)%n-2);Mt++){let vt=S(xt.i+Mt);if(X[vt]*xt.sign<-.25)break;z[vt]>=.28&&Math.sign(X[vt])===xt.sign&&(J=vt)}}let it=(J-ft+n)%n,nt=S(ft+Math.round(it*.5)),lt=ut?V[(ot+2)%V.length]:st,ht=St((ft-At.i+n)%n-1,3,7),gt=St((lt.i-J+n)%n-1,3,7),ct=[],bt=[];for(let Mt=1;Mt<=ht;Mt++){let vt=S(ft-Mt);if(Mt>=3&&z[vt]>=.55)break;ct.push(t[vt])}ct.reverse();for(let Mt=1;Mt<=gt;Mt++){let vt=S(J+Mt);if(Mt>=3&&z[vt]>=.55)break;bt.push(t[vt])}let Ct=be(ct),Tt=be(bt),yt=Ct&&Tt?Ct.d[0]*Tt.d[0]+Ct.d[1]*Tt.d[1]:0,pt=Ct&&Tt?Math.abs((Tt.c[0]-Ct.c[0])*Ct.d[1]-(Tt.c[1]-Ct.c[1])*Ct.d[0]):99;if(Ct&&Tt&&Ct.rms<=.14&&Tt.rms<=.14&&Ct.span>=4.2&&Tt.span>=4.2&&yt<=-.9&&pt>=2.2&&pt<=6.2){let Mt=ft,vt=J;for(let wt=0;wt<=4;wt++){let Et=S(nt-wt);if(Math.abs((t[Et][0]-Ct.c[0])*Ct.d[1]-(t[Et][1]-Ct.c[1])*Ct.d[0])<=.55){Mt=Et;break}}for(let wt=0;wt<=4;wt++){let Et=S(nt+wt);if(Math.abs((t[Et][0]-Tt.c[0])*Tt.d[1]-(t[Et][1]-Tt.c[1])*Tt.d[0])<=.55){vt=Et;break}}let Ft=(vt-Mt+n)%n;if(Ft>=2&&Ft<=8){let wt=[];for(let It=1;It<Ft;It++)wt.push(t[S(Mt+It)]);let Et=wt.length>=2?be(wt):null,Dt=[];for(let It=0;It<=Ft;It++)Dt.push(t[S(Mt+It)]);let Yt=be(Dt),Xt=-Ct.d[1],Pt=Ct.d[0],Rt=t[vt][0]-t[Mt][0],Gt=t[vt][1]-t[Mt][1],Ut=Math.hypot(Rt,Gt)||1,qt=0;for(let It=1;It<Ft;It++){let Kt=t[S(Mt+It)],Jt=Math.abs((Kt[0]-t[Mt][0])*(-Gt/Ut)+(Kt[1]-t[Mt][1])*(Rt/Ut));Jt>qt&&(qt=Jt)}let Vt=[];for(let It=-2;It<=Ft+2;It++)Vt.push(t[S(Mt+It)]);let Bt=Vt.length>=5?Te(Vt):null;if(!(qt>=Math.max(.42,pt*.16)||!!(Bt&&Bt.r>=1.1&&Bt.r<=pt*.85&&Bt.rms<=.22))&&(Et&&Et.rms<=.18&&Et.maxDev<=.28&&Math.abs(Et.d[0]*Xt+Et.d[1]*Pt)>=.82||Yt&&Yt.rms<=.2&&Yt.maxDev<=.32&&Math.abs(Yt.d[0]*Xt+Yt.d[1]*Pt)>=.84)){let It=Yt&&Math.abs(Yt.d[0]*Xt+Yt.d[1]*Pt)>=.9?{c:Yt.c,d:[Xt,Pt]}:Et&&Et.span>=1.2&&Math.abs(Et.d[0]*Xt+Et.d[1]*Pt)>=.85?Et:Yt,Kt=Y(Ct,It),Jt=Y(It,Tt);if(Kt&&Jt&&Math.hypot(Kt[0]-t[Mt][0],Kt[1]-t[Mt][1])<=1.45&&Math.hypot(Jt[0]-t[vt][0],Jt[1]-t[vt][1])<=1.45){for(let zt=1;zt<Ft;zt++){let ue=zt/Ft,ge=S(Mt+zt);t[ge]=[Kt[0]+(Jt[0]-Kt[0])*ue,Kt[1]+(Jt[1]-Kt[1])*ue]}Z.push({i:Mt,forced:!1,peakVal:xt.peakVal,sign:xt.sign,capApex:Kt}),Z.push({i:vt,forced:!1,peakVal:xt.peakVal,sign:xt.sign,capApex:Jt}),ut&&(ot===V.length-1?Z.shift():ot++);continue}}}}Z.push(xt)}V.length=0;for(let ot of Z)V.push(ot)}let W=V.length,H=new Set(V.map(Y=>Y.i));H.delete(-1);let et=[];for(let Y=0;Y<W;Y++){let Z=V[Y],ot=Z.i;if(Z.forced){et.push({i:ot,forced:!0,sharp:!0,apexPt:null,turn:Math.PI,sign:1,leftStraight:!0,rightStraight:!0,isStrokeCap:!1,isCurvCusp:!1});continue}let xt=V[(Y-1+W)%W],At=V[(Y+1)%W],st=W>1?(ot-xt.i+n)%n:n>>1,at=W>1?(At.i-ot+n)%n:n>>1,ft=st<=7?Math.max(2,st):x&&st<=9?St(st-1,2,7):st<=26?St(Math.min(Math.floor(st*.65),st-2),2,16):St(Math.floor(st*.72),2,26),J=at<=7?Math.max(2,at):x&&at<=9?St(at-1,2,7):at<=26?St(Math.min(Math.floor(at*.65),at-2),2,16):St(Math.floor(at*.72),2,26),ut=ft>=18?5:ft>=12?3:ft>=8?2:ft>=6?1:0,mt=J>=18?5:J>=12?3:J>=8?2:J>=6?1:0,it=[],nt=[];for(let Ht=ft;Ht>=ut;Ht--)it.push(E[S(ot-Ht)]);for(let Ht=mt;Ht<=J;Ht++)nt.push(E[S(ot+Ht)]);let lt=be(it),ht=be(nt),gt=K(it,lt),ct=K(nt,ht),bt=[],Ct=[],Tt=St(ft,2,5),yt=St(J,2,5);for(let Ht=Tt;Ht>=0;Ht--)bt.push(t[S(ot-Ht)]);for(let Ht=0;Ht<=yt;Ht++)Ct.push(t[S(ot+Ht)]);let pt=be(bt),Mt=be(Ct),vt=(gt?lt:pt)?.d||[1,0],Ft=(ct?ht:Mt)?.d||[0,1],wt=(gt?lt:pt)?.c||t[ot],Et=(ct?ht:Mt)?.c||t[ot],Dt=Math.abs(Math.atan2(vt[0]*Ft[1]-vt[1]*Ft[0],vt[0]*Ft[0]+vt[1]*Ft[1])),Yt=pt&&Mt?Math.abs(Math.atan2(pt.d[0]*Mt.d[1]-pt.d[1]*Mt.d[0],pt.d[0]*Mt.d[0]+pt.d[1]*Mt.d[1])):Dt,Xt=Math.max(Dt,Yt,B[ot],z[ot]),Pt=Ht=>{let re=t[S(ot-Ht)],je=t[S(ot+Ht)];return Math.hypot(je[0]-re[0],je[1]-re[1])},Rt=Pt(2),Gt=Pt(4),Ut=Pt(6),qt=Pt(Math.min(12,n>>2)),Vt=[.5*(t[S(ot-4)][0]+t[S(ot+4)][0]),.5*(t[S(ot-4)][1]+t[S(ot+4)][1])],Bt=Math.hypot(t[ot][0]-Vt[0],t[ot][1]-Vt[1]),Ot=Gt>.5?Bt/Gt:0,It=!(gt&&ct&&Math.min(lt.span,ht.span)>=5.5&&qt>Gt*1.35||qt>Ut*1.48)&&!Z.capApex&&n>=12&&Xt>=1.95&&Rt<=4.6&&Gt<=5.4&&Ut<=6&&qt<=6.8&&Ut/Math.max(1.3,Rt)<1.52,Kt=[],Jt=St(Math.min(st,at)>>1,3,7);for(let Ht=-Jt;Ht<=Jt;Ht++)Kt.push(q[S(ot+Ht)]);let zt=Te(Kt),ue=.5*((pt?pt.rms:.45)+(Mt?Mt.rms:.45)),ge=Math.max(z[ot],Yt*.85)/Math.max(1e-4,Math.max(B[ot],Dt)),Fe=!!(zt&&zt.r>=1.35&&zt.r<=48&&zt.rms<=Math.max(.2,zt.r*.045)&&zt.rms<ue*.9),Nt=!It&&!Fe&&Ot>=.25&&ge>=.62&&Ut-Rt>=1.6&&Ut>=3.8&&(Yt>=.65||Xt>=.78)&&(!zt||ue<=zt.rms*.92||Yt>=1.18&&z[ot]>=.58),jt=0,te=Math.sign(X[ot])||Z.sign||1;for(let Ht=-4;Ht<=4;Ht++){if(Ht===0)continue;let re=R(t,S(ot+Ht),1);re*te<-.08&&(jt+=Math.abs(re))}let he=!Nt&&jt>=.35&&Ot<.22&&(!gt||!ct),le=vt[0]*Ft[1]-vt[1]*Ft[0],ne=999,se=999,ae=null,Se=999;if(Math.abs(le)>.08&&!It){let Ht=Et[0]-wt[0],re=Et[1]-wt[1],je=(Ht*Ft[1]-re*Ft[0])/le,fn=wt[0]+vt[0]*je,en=wt[1]+vt[1]*je;ne=Math.hypot(t[ot][0]-fn,t[ot][1]-en);let sn=Math.max(.14,(Math.PI-St(Xt,.15,2.85))*.5);se=ne*Math.sin(sn);let wn=1/Math.max(.14,Math.sin(sn))-1;Se=wn>.04?ne/wn:se;let yn=gt&&ct&&lt.span>=5.5&&ht.span>=5.5&&Dt>=.42&&se<=Math.min(3.2,.16*Math.min(lt.span,ht.span));if(Z.capApex)ae=Z.capApex;else if(gt&&ct){let Lt=Xt>1.15&&Xt<1.95&&lt.rms<=.14&&ht.rms<=.14&&Math.max(lt.span,ht.span)>=3.2,_t=Lt?1.65:Xt>.42&&Xt<2.85?Math.min(.85,.45+G*.35):.55;if((se<=1.85||yn||Lt)&&ne<=_t&&G>.05){let Qt=lt.rms<=.22&&ht.rms<=.22?1:Math.min(.95,(.85+G*1.35)/Math.max(1e-6,ne))*Math.min(1,.65+G*.35);ae=[t[ot][0]+(fn-t[ot][0])*Qt,t[ot][1]+(en-t[ot][1])*Qt]}}else if(gt!==ct&&G>.05){let Lt=gt?lt:ht,_t=gt?Mt:pt;if(Lt&&_t){let Qt=Lt.d[0]*_t.d[1]-Lt.d[1]*_t.d[0];if(Math.abs(Qt)>.14){let Re=t[ot][0]-Lt.c[0],Ae=t[ot][1]-Lt.c[1],Ie=(Re*_t.d[1]-Ae*_t.d[0])/Qt,$e=Lt.c[0]+Lt.d[0]*Ie,dn=Lt.c[1]+Lt.d[1]*Ie;if(Math.hypot($e-t[ot][0],dn-t[ot][1])<=.55)ae=[$e,dn];else{let Nn=(t[ot][0]-Lt.c[0])*Lt.d[0]+(t[ot][1]-Lt.c[1])*Lt.d[1],Ve=Lt.c[0]+Lt.d[0]*Nn,Ne=Lt.c[1]+Lt.d[1]*Nn;Math.hypot(Ve-t[ot][0],Ne-t[ot][1])<=.48&&(ae=[Ve,Ne])}}}}else Nt&&ne<=1.25&&G>.05&&(ae=[t[ot][0]+(fn-t[ot][0])*.65,t[ot][1]+(en-t[ot][1])*.65])}else if(It){let Ht=.5*(t[S(ot-2)][0]+t[S(ot+2)][0]),re=.5*(t[S(ot-2)][1]+t[S(ot+2)][1]);ae=[t[ot][0]+(Ht-t[ot][0])*.34,t[ot][1]+(re-t[ot][1])*.34]}let ke=0;for(let Ht=-3;Ht<=3;Ht++)Math.abs(R(q,S(ot+Ht),2))>.11&&ke++;let ye=gt&&ct&&lt.span>=5.5&&ht.span>=5.5&&Dt>=.42&&se<=Math.min(3.2,.16*Math.min(lt.span,ht.span))&&Se<=3.8,qe=2.6-$*.8,ee=!Nt&&!ye&&w!=="sharp"&&!!(zt&&zt.r>=qe&&zt.r<=90&&zt.rms<=Math.max(.35,zt.r*(.042+$*.02))&&(zt.rms<=ue*1.12||ge<.52)&&(Se>1.85-$*.4||Ot<.22)&&ke>=4&&ge<.6-$*.06),oe=!!(zt&&zt.r>=2.2&&zt.r<=24&&zt.rms<=Math.max(.24,zt.r*.042)&&zt.rms<=ue*.78),Me=k&&!oe&&g[ot]&&gt&&ct&&Math.min(st,at)>=4&&Math.min(st,at)<=22&&Math.max(Dt,Yt)>=1.28,ce=!It&&!Me&&w!=="sharp"&&!(gt&&ct)&&!!(zt&&zt.r>=1.4&&zt.r<=90&&zt.rms<=Math.max(.2,zt.r*.045)&&ke>=4&&(zt.rms<=ue*.88||ge<.58)),ve=gt&&!ct||!gt&&ct,me=(38-y*20)*Math.PI/180,ie=!1,Le=null;if(Z.capApex)ie=!0,ae=Z.capApex;else if(It||he||ee||ce)ie=!1;else if(ye||Nt)ie=!0;else if(ve){let Ht=gt?lt.d:ht.d,re=w==="organic"?Math.max(me,.72):me;Math.max(Dt,Yt)>=re&&(se<=(w==="organic"?1.25:1.65)||z[ot]>=(w==="organic"?.52:.34)||Yt>=(w==="organic"?.68:.48))?ie=!0:(ie=!1,Le=[Ht[0],Ht[1]])}else Xt>=D*(w==="organic"?.82:.66)&&(gt&&ct&&Dt>=(w==="organic"?.56:.44)&&(se<=2.25||Se<=2.5||ge>=.44)||Yt>=(w==="organic"?.78:.62)&&ge>=(w==="organic"?.62:.54)&&se<=1.35&&Ot>=.24||Dt>=(w==="organic"?1.02:.88)&&z[ot]>=(w==="organic"?.56:.44)&&Se<=1.65||w==="sharp"&&Xt>=D*.78&&ge>=.4)&&(ie=!0);let Ge=null;if(ie&&w!=="sharp"&&!Z.capApex){let Ht=jo(t,ot,H);if(Ht&&(!ye||Ht.r>=4.2&&Ht.t>=3.8&&Ht.rmsF<=.42*Ht.rmsW)){ie=!1;let re=St(Math.round(Ht.t),3,Math.min(14,Math.min(st,at)-1));re>=3&&(Ge={iL:S(ot-re),iR:S(ot+re),tL:lt?[lt.d[0],lt.d[1]]:null,tR:ht?[ht.d[0],ht.d[1]]:null})}if(ie&&!ye&&!ve&&!Me){let re=qo(E,ot,H);re&&re.t3>=.45&&re.rho<.62&&(ie=!1)}}et.push({i:ot,sharp:ie,apexPt:ie||It?ae:null,lockedTangent:Le,filletShoulders:Ge,turn:Xt,sign:Z.sign,leftStraight:gt,rightStraight:ct,isStrokeCap:It,isCurvCusp:Nt})}if(w!=="sharp"&&et.length>=2){let Y=et.length,Z=new Uint8Array(Y);for(let ot=0;ot<Y;ot++){let xt=et[ot];if(Z[ot]||!xt.sharp||xt.forced)continue;let At=[ot],st=xt.turn;for(let vt=1;vt<Y;vt++){let Ft=et[(ot+vt)%Y],wt=et[(ot+vt-1)%Y];if(!Ft.sharp||Ft.forced||Ft.sign!==xt.sign||(Ft.i-wt.i+n)%n>10||(Ft.i-xt.i+n)%n>20||st+Ft.turn>2.45)break;st+=Ft.turn,At.push((ot+vt)%Y)}for(let vt of At)Z[vt]=1;if(At.length<2)continue;let at=et[At[0]].i,ft=et[At[At.length-1]].i,J=0,ut=!0;for(let vt of At)J+=et[vt].turn,Math.max(z[et[vt].i],B[et[vt].i])<.52&&(ut=!1);let mt=(ft-at+n)%n,it=[],nt=mt>=6?2:1;for(let vt=nt;vt<=mt-nt;vt++)it.push(t[S(at+vt)]);let lt=it.length>=3?be(it):null,ht=t[ft][0]-t[at][0],gt=t[ft][1]-t[at][1],ct=Math.hypot(ht,gt)||1,bt=S(at+Math.round(mt*.5)),Ct=Math.abs((t[bt][0]-t[at][0])*(-gt/ct)+(t[bt][1]-t[at][1])*(ht/ct)),Tt=!!(lt&&lt.rms<=.1&&lt.maxDev<=.18&&Ct<=Math.max(.32,ct*.08));if(At.length===2&&mt<=18&&!Tt){let vt=[];for(let wt=-3;wt<=mt+3;wt++)vt.push(q[S(at+wt)]);let Ft=Te(vt);if(Ft&&Ft.r>=1.5&&Ft.r<=24&&Ft.rms<=Math.max(.24,Ft.r*.045)&&Ct>=Math.max(.3,ct*.12)){for(let wt of At)et[wt].sharp=!1,et[wt].apexPt=null;s[bt]=1,_.set(bt,ln(q,bt,5)),s[at]=1,_.set(at,ln(q,at,4)),s[ft]=1,_.set(ft,ln(q,ft,4));continue}}if(k&&At.length===2&&Tt&&lt){for(let vt of At){let Ft=et[vt].apexPt||t[et[vt].i],wt=(Ft[0]-lt.c[0])*lt.d[0]+(Ft[1]-lt.c[1])*lt.d[1],Et=lt.c[0]+lt.d[0]*wt,Dt=lt.c[1]+lt.d[1]*wt;Math.hypot(Et-t[et[vt].i][0],Dt-t[et[vt].i][1])<=.85&&(et[vt].apexPt=[Et,Dt])}continue}let yt=(at+Math.round((ft-at+n)%n/2))%n,pt=new Set(H);for(let vt of At)pt.delete(et[vt].i);let Mt=!!jo(E,yt,pt);if(!Mt){let vt=qo(E,yt,pt);Mt=!!(vt&&vt.t3>=.5&&vt.rho<.6)}if(Mt)for(let vt of At)et[vt].sharp=!1,et[vt].apexPt=null}}let rt=et.length,dt=new Uint8Array(rt);for(let Y=0;Y<rt;Y++){if(dt[Y])continue;let Z=et[Y],ot=et[(Y+1)%rt],xt=et[(Y-1+rt)%rt],At=et[(Y+2)%rt],st=(ot.i-Z.i+n)%n,at=(Z.i-xt.i+n)%n,ft=(At.i-ot.i+n)%n;if(rt>=3&&st>0&&st<=9&&Z.sign===ot.sign&&!(a&&(a[Z.i]||a[ot.i]))&&at>=Math.max(11,st*2)&&ft>=Math.max(11,st*2)){let J=[],ut=[],mt=Math.min(18,at-2),it=Math.min(18,ft-2);for(let ht=mt;ht>=2;ht--)J.push(t[S(Z.i-ht)]);for(let ht=2;ht<=it;ht++)ut.push(t[S(ot.i+ht)]);let nt=be(J),lt=be(ut);if(nt&&lt&&nt.rms<=.2&&lt.rms<=.2&&nt.span>=6&&lt.span>=6){let ht=nt.d[0],gt=nt.d[1],ct=lt.d[0],bt=lt.d[1],Ct=ht*ct+gt*bt,Tt=ht*bt-gt*ct;if(Ct>-.84&&Math.abs(Tt)>=.32){let yt=lt.c[0]-nt.c[0],pt=lt.c[1]-nt.c[1],Mt=(yt*bt-pt*ct)/Tt,vt=nt.c[0]+ht*Mt,Ft=nt.c[1]+gt*Mt,wt=(Z.i+(st>>1))%n,Et=t[wt];if(Math.hypot(vt-Et[0],Ft-Et[1])<=3.2){r[wt]=1,i.set(wt,[vt,Ft]),dt[Y]=1,dt[(Y+1)%rt]=1;continue}}}}if(rt>=3&&st>0&&st<=6&&Z.sign===ot.sign&&!(a&&(a[Z.i]||a[ot.i]))){let J=(Z.i+(st>>1))%n,ut=t[S(J-6)],mt=t[S(J+6)],it=Math.hypot(t[ot.i][0]-t[Z.i][0],t[ot.i][1]-t[Z.i][1]),nt=Math.hypot(mt[0]-ut[0],mt[1]-ut[1]);if((Z.isCurvCusp||ot.isCurvCusp||it<=3.8&&nt>=it*1.45)&&Z.turn+ot.turn>=1.05){r[J]=1;let lt=[],ht=[];for(let Tt=5;Tt>=1;Tt--)lt.push(t[S(Z.i-Tt)]);for(let Tt=1;Tt<=5;Tt++)ht.push(t[S(ot.i+Tt)]);let gt=be(lt),ct=be(ht),bt=[.5*(t[Z.i][0]+t[ot.i][0]),.5*(t[Z.i][1]+t[ot.i][1])],Ct=null;if(gt&&ct){let Tt=gt.d[0]*ct.d[1]-gt.d[1]*ct.d[0];if(Math.abs(Tt)>.15){let yt=ct.c[0]-gt.c[0],pt=ct.c[1]-gt.c[1],Mt=(yt*ct.d[1]-pt*ct.d[0])/Tt,vt=gt.c[0]+gt.d[0]*Mt,Ft=gt.c[1]+gt.d[1]*Mt;Math.hypot(vt-bt[0],Ft-bt[1])<=1.35&&(Ct=[vt,Ft])}}if(!Ct){let Tt=[.5*(ut[0]+mt[0]),.5*(ut[1]+mt[1])],yt=bt[0]-Tt[0],pt=bt[1]-Tt[1],Mt=Math.hypot(yt,pt)||1;Ct=[bt[0]+yt/Mt*.5,bt[1]+pt/Mt*.5]}i.set(J,Ct),dt[Y]=1,dt[(Y+1)%rt]=1;continue}if(Z.isStrokeCap||ot.isStrokeCap||it<=3.8&&nt<=5.6){s[J]=1,dt[Y]=1,dt[(Y+1)%rt]=1;continue}if(Z.sharp&&ot.sharp||k&&(Z.sharp||ot.sharp||Z.leftStraight||ot.rightStraight)||Z.sharp&&ot.sharp||k&&(Z.sharp||ot.sharp||Z.leftStraight||ot.rightStraight))continue;if(Math.min(at,ft)>st*2.4&&!Z.sharp&&!ot.sharp){s[J]=1,dt[Y]=1,dt[(Y+1)%rt]=1;continue}}}for(let Y=0;Y<rt;Y++){if(dt[Y])continue;let Z=et[Y];if(Z.sharp&&!Z.forced&&a&&n>=16){let ot=!1;for(let xt=-3;xt<=3;xt++){if(xt===0)continue;let At=S(Z.i+xt);if(a[At]&&Math.hypot(t[Z.i][0]-t[At][0],t[Z.i][1]-t[At][1])<=3.4){ot=!0;break}}if(ot)continue}if(Z.sharp)r[Z.i]=1,Z.apexPt&&(!a||!a[Z.i])&&i.set(Z.i,Z.apexPt);else if(Z.filletShoulders){let{iL:ot,iR:xt,tL:At,tR:st}=Z.filletShoulders;r[ot]||(s[ot]=1,At&&_.set(ot,At)),r[xt]||(s[xt]=1,st&&_.set(xt,st))}else(Z.isStrokeCap||Z.lockedTangent)&&(s[Z.i]=1,Z.isStrokeCap&&Z.apexPt&&i.set(Z.i,Z.apexPt),Z.lockedTangent&&_.set(Z.i,Z.lockedTangent))}if(O&&n>=12){let Y=(at,ft,J,ut)=>{let mt=at[ft][J],it=0,nt=0,lt=Math.min(20,n>>2);for(;it<lt&&ut*(at[S(ft-it-1)][J]-mt)<=.045;)it++;for(;nt<lt&&ut*(at[S(ft+nt+1)][J]-mt)<=.045;)nt++;let ht=S(ft+Math.round((nt-it)*.5)),gt=it+nt;return{ei:ht,flatSpan:gt}},Z=at=>{let ft=n;for(let J=0;J<n;J++)if(r[J]||a&&a[J]){let ut=Math.min((at-J+n)%n,(J-at+n)%n);ut<ft&&(ft=ut)}return ft},ot=at=>{let ft=n;for(let J=0;J<n;J++)if(s[J]){let ut=Math.min((at-J+n)%n,(J-at+n)%n);ut<ft&&(ft=ut)}return ft},xt=St(Math.round(n/28),4,12),At=St(Math.round(n/15),7,26),st=[];for(let at=0;at<2;at++)for(let ft of[1,-1])for(let J=0;J<n;J++){let ut=q[J][at],mt=!0;for(let pt=1;pt<=xt;pt++){let Mt=q[S(J-pt)][at],vt=q[S(J+pt)][at];if(ft*(Mt-ut)<-1e-5||ft*(vt-ut)<-1e-5){mt=!1;break}}if(!mt)continue;let{ei:it,flatSpan:nt}=Y(q,J,at,ft);if(nt>14)continue;let lt=Z(it);if(lt<(x?4:8))continue;let ht=Math.min(At,lt-1);if(ht<(x?4:6))continue;let gt=q[it][at],ct=ft*(q[S(it-ht)][at]-gt),bt=ft*(q[S(it+ht)][at]-gt);if(Math.min(ct,bt)<.65||Math.max(ct,bt)<1.1)continue;let Ct=[];for(let pt=-ht;pt<=ht;pt++)Ct.push(q[S(it+pt)]);let Tt=be(Ct),yt=Te(Ct);!Tt||Tt.rms<.14||yt&&yt.rms>Tt.rms*.82||st.push({ei:it,axis:at,sign:ft,prom:Math.min(ct,bt),r:yt?yt.r:99})}st.sort((at,ft)=>ft.prom-at.prom);for(let at of st){let{ei:ft,axis:J,r:ut}=at;if(Z(ft)<(x?4:8)||ot(ft)<(x?6:16))continue;let mt=!1;for(let ht=0;ht<n;ht++)if((s[ht]||r[ht])&&Math.hypot(q[ft][0]-q[ht][0],q[ft][1]-q[ht][1])<(x?3.8:9.5)){mt=!0;break}if(mt)continue;if(ut<=10.5){let ht=ft,gt=-1;for(let ct=-5;ct<=5;ct++){let bt=S(ft+ct),Ct=Math.abs(R(q,bt,4));Ct>gt&&(gt=Ct,ht=bt)}if(ft=ht,Z(ft)<(x?4:8)||ot(ft)<(x?6:14))continue;s[ft]=1,_.set(ft,ln(q,ft,5));continue}s[ft]=1;let it=q[S(ft+4)][0]-q[S(ft-4)][0],nt=q[S(ft+4)][1]-q[S(ft-4)][1],lt=ln(q,ft,6);if(J===1){let ht=[it>=0?1:-1,0];lt[0]*ht[0]>=.985&&ut>=12?_.set(ft,ht):_.set(ft,lt)}else{let ht=[0,nt>=0?1:-1];lt[1]*ht[1]>=.985&&ut>=12?_.set(ft,ht):_.set(ft,lt)}}}if(n>=24)for(let Y=0;Y<n;Y++){let Z=Math.abs(R(q,Y,6));if(Z<1.35)continue;let ot=!0;for(let at=-6;at<=6;at++)if(at!==0&&Math.abs(R(q,S(Y+at),6))>Z+1e-6){ot=!1;break}if(!ot)continue;let xt=!1;for(let at=-10;at<=10;at++){let ft=S(Y+at);if(r[ft]||s[ft]){xt=!0;break}}if(xt)continue;let At=[];for(let at=-6;at<=6;at++)At.push(q[S(Y+at)]);let st=Te(At);st&&st.r>=1.6&&st.r<=14&&st.rms<=Math.max(.28,st.r*.055)&&(s[Y]=1,_.set(Y,ln(q,Y,5)))}return{corners:r,smoothKnots:s,apexMap:i,knotTangents:_}}function ba(t,e=44,a=4,l=null,n={}){return Oo(t,e,l,n).corners}function kn(t,e=!0,a=9){let l=t.length;if(l<2)return[1,0];if(l===2){let S=t[1][0]-t[0][0],R=t[1][1]-t[0][1],g=Math.hypot(S,R)||1;return[S/g,R/g]}let n=e?t[0]:t[l-1],r=[0],s=[n],i=0,_=Math.min(l-1,16);for(let S=1;S<=_;S++){let R=e?t[S-1]:t[l-S],g=e?t[S]:t[l-1-S],f=Math.hypot(g[0]-R[0],g[1]-R[1]);if(!(f<1e-5)&&(i+=f,r.push(i),s.push(g),i>=a&&r.length>=5))break}if(r.length<3){let S=s[s.length-1],R=e?S[0]-n[0]:n[0]-S[0],g=e?S[1]-n[1]:n[1]-S[1],f=Math.hypot(R,g)||1;return[R/f,g/f]}if(s.length>=5){let S=Te(s),R=be(s);if(S&&S.r>=2.2&&S.r<=220&&S.rms<=.16&&(!R||S.rms<R.rms*.65)){let g=n[0]-S.cx,f=n[1]-S.cy,o=Math.hypot(g,f)||1,h=s[Math.min(3,s.length-1)],A=h[0]-n[0],U=h[1]-n[1],P=-f/o,c=g/o;return P*A+c*U<0&&(P=-P,c=-c),e||(P=-P,c=-c),[P,c]}}let u=0,b=0,C=0,T=0,I=0,p=0,x=0;for(let S=1;S<r.length;S++){let R=r[S],g=(s[S][0]-n[0])/R,f=(s[S][1]-n[1])/R,o=Math.min(R,3)*Math.exp(-R/(a*.62));u+=o,b+=o*R,C+=o*R*R,T+=o*g,I+=o*f,p+=o*R*g,x+=o*R*f}let w=u*C-b*b,y,G,$=T/(u||1),k=I/(u||1);if(Math.abs(w)>1e-6){y=(C*T-b*p)/w,G=(C*I-b*x)/w;let S=Math.hypot($,k)||1,R=Math.hypot(y,G)||1;(y*$+G*k)/(R*S)<.92&&(y=.55*(y/R)+.45*($/S),G=.55*(G/R)+.45*(k/S))}else y=$,G=k;e||(y=-y,G=-G);let O=Math.hypot(y,G)||1;return[y/O,G/O]}function ya(t,e,a,l,n,r=.65,s=null,i=!0,_=2.3){let u=t.length,b=new Uint8Array(u);if(u<12||r<=.1)return b;let C=g=>!!(n&&n[g]===1),T=1/0,I=-1/0,p=1/0,x=-1/0;for(let g=0;g<u;g++){let f=t[g];f[0]<T&&(T=f[0]),f[0]>I&&(I=f[0]),f[1]<p&&(p=f[1]),f[1]>x&&(x=f[1])}let w=Math.hypot(I-T,x-p)<=38||u<=115,y=g=>(g%u+u)%u,G=w?6:9,$=.036+r*.018,k=.07+r*.028,O=new Uint8Array(u);for(let g=0;g<u;g++){let f=[],o=!1;for(let q=0;q<G;q++){let Q=y(g+q);if(s&&s[Q]||q>0&&q<G-1&&(e[Q]||C(Q))){o=!0;break}f.push(t[Q])}if(o)continue;let h=be(f);if(!h||h.span<(w?3.2:5.2)||h.rms>$||h.maxDev>k)continue;let A=f[0],U=f[G-1],P=f[G>>1],c=Math.hypot(U[0]-A[0],U[1]-A[1])||1;Math.abs((P[0]-A[0])*(U[1]-A[1])-(P[1]-A[1])*(U[0]-A[0]))/c<=.055&&(O[g]=1)}for(let g=0;g<2;g++)for(let f=0;f<u;f++){if(!O[f]||O[y(f+1)])continue;let o=0,h=!1;for(;o<18&&!O[y(f+1+o)];){let P=y(f+1+o);if(s&&s[P]||e[P]||C(P)){h=!0;break}o++}if(h||o===0||o>16||!O[y(f+1+o)])continue;let A=[];for(let P=-2;P<=o+G+1;P++){let c=y(f+P);if(P>0&&P<o+G&&(e[c]||C(c))){h=!0;break}A.push(t[c])}if(h)continue;let U=be(A);if(U&&U.rms<=$*1.38&&U.maxDev<=k*1.55)for(let P=1;P<=o;P++)O[y(f+P)]=1}let S=new Uint8Array(u),R=[];for(let g=0;g<u;g++){if(!O[g]||S[g])continue;let f=g;for(;O[y(f-1)]&&!S[y(f-1)]&&!e[f]&&!C(f)&&(f=y(f-1),f!==g););let o=y(f+G-1),h=f;for(S[h]=1;O[y(h+1)]&&!S[y(h+1)];){let st=y(h+1);if(e[y(h+G-1)]||C(y(h+G-1)))break;let at=(y(st+G-1)-f+u)%u+1;if(at>=u-2)break;if(at>=22){let ft=Math.min(8,Math.floor(at*.2)),J=[];for(let mt=ft;mt<at-ft;mt++)J.push(t[y(f+mt)]);let ut=be(J);if(!ut||ut.rms>$*1.42||ut.maxDev>k*1.58)break}S[st]=1,h=st,o=y(h+G-1)}let A=(o-f+u)%u+1;if(A<(w?7:14))continue;let U=Math.max(2,Math.floor(A*.2)),P=[];for(let st=U;st<A-U;st++)P.push(t[y(f+st)]);let c=be(P);if(!c||c.rms>.045)continue;let E=Math.max(.085,c.rms*3.4);for(;A<u-4&&!e[f]&&!C(f);){let st=y(f-1);if(e[st]||C(st))break;let at=t[st],ft=t[f],J=Math.abs((at[0]-c.c[0])*c.d[1]-(at[1]-c.c[1])*c.d[0]),ut=ft[0]-at[0],mt=ft[1]-at[1],it=Math.hypot(ut,mt)||1,nt=(ut*c.d[0]+mt*c.d[1])/it;if(J<=E&&nt>=.88)f=st,A++;else break}for(;A<u-4&&!e[o]&&!C(o);){let st=y(o+1);if(e[st]||C(st))break;let at=t[st],ft=t[o],J=Math.abs((at[0]-c.c[0])*c.d[1]-(at[1]-c.c[1])*c.d[0]),ut=at[0]-ft[0],mt=at[1]-ft[1],it=Math.hypot(ut,mt)||1,nt=(ut*c.d[0]+mt*c.d[1])/it;if(J<=E&&nt>=.88)o=st,A++;else break}let q=Math.max(.038,c.rms*1.65);for(;A>10&&!e[f]&&!C(f);){let st=t[f];if(Math.abs((st[0]-c.c[0])*c.d[1]-(st[1]-c.c[1])*c.d[0])>q)f=y(f+1),A--;else break}for(;A>10&&!e[o]&&!C(o);){let st=t[o];if(Math.abs((st[0]-c.c[0])*c.d[1]-(st[1]-c.c[1])*c.d[0])>q)o=y(o-1),A--;else break}let Q=Math.max(.26,c.rms*4.5);for(let st=1;st<=14;st++){let at=y(f-st);if(e[at]||C(at)){let ft=t[at],J=Math.abs((ft[0]-c.c[0])*c.d[1]-(ft[1]-c.c[1])*c.d[0]),ut=J;for(let it=1;it<st;it++){let nt=t[y(at+it)],lt=Math.abs((nt[0]-c.c[0])*c.d[1]-(nt[1]-c.c[1])*c.d[0]);lt>ut&&(ut=lt)}let mt=st<=8&&e[at]?1.35:Q;ut<=mt&&J<=(st<=8?1.15:Q)&&(f=at);break}if(st<=6&&e[y(f+st)]){f=y(f+st);break}}for(let st=1;st<=14;st++){let at=y(o+st);if(e[at]||C(at)){let ft=t[at],J=Math.abs((ft[0]-c.c[0])*c.d[1]-(ft[1]-c.c[1])*c.d[0]),ut=J;for(let it=1;it<st;it++){let nt=t[y(o+it)],lt=Math.abs((nt[0]-c.c[0])*c.d[1]-(nt[1]-c.c[1])*c.d[0]);lt>ut&&(ut=lt)}let mt=st<=8&&e[at]?1.35:Q;ut<=mt&&J<=(st<=8?1.15:Q)&&(o=at);break}if(st<=6&&e[y(o-st)]){o=y(o-st);break}}let tt=null,j=null;if(!e[f]&&!C(f)){let st=[];for(let ft=14;ft>=1;ft--)st.push(t[y(f-ft)]);let at=Te(st);if(at&&at.r>=10&&at.r<=220&&at.rms<=.11){let ft=(at.cx-c.c[0])*c.d[0]+(at.cy-c.c[1])*c.d[1],J=c.c[0]+c.d[0]*ft,ut=c.c[1]+c.d[1]*ft,mt=f,it=1/0;for(let nt=0;nt<=4;nt++){let lt=y(f+nt);if(e[lt])continue;let ht=Math.hypot(t[lt][0]-J,t[lt][1]-ut);ht<it&&(it=ht,mt=lt)}it<=1.5&&(f=mt,tt=[J,ut])}}if(!e[o]&&!C(o)){let st=[];for(let ft=1;ft<=14;ft++)st.push(t[y(o+ft)]);let at=Te(st);if(at&&at.r>=10&&at.r<=220&&at.rms<=.11){let ft=(at.cx-c.c[0])*c.d[0]+(at.cy-c.c[1])*c.d[1],J=c.c[0]+c.d[0]*ft,ut=c.c[1]+c.d[1]*ft,mt=o,it=1/0;for(let nt=-4;nt<=0;nt++){let lt=y(o+nt);if(e[lt])continue;let ht=Math.hypot(t[lt][0]-J,t[lt][1]-ut);ht<it&&(it=ht,mt=lt)}it<=1.5&&(o=mt,j=[J,ut])}}A=(o-f+u)%u+1;let z=!!(e[f]||C(f)),X=!!(e[o]||C(o)),B=z&&X,L=c.rms<=.038&&c.maxDev<=.075,m=B?w?6:9:w||L?8:Math.max(14,Math.min(24,Math.floor(u*.06)));if(A<m)continue;let F=z?2:0,d=X?2:0,M=[];for(let st=F;st<A-d;st++)st===0&&tt?M.push(tt):st===A-1&&j?M.push(j):M.push(t[y(f+st)]);let v=be(M),D=B?w?4.2:7:w||L?6:11.5,N=(A>=28||B&&A>=12&&L)&&c.rms<=.038,V=B?$*1.4:N?$*1.35:$*1.15,K=B?k*1.5:N?Math.max(k*1.6,.165):k*1.25;if(!v||v.span<D||v.rms>V||v.maxDev>K)continue;if(A<12&&!L){let st=!1;if(!z)for(let at=1;at<=14;at++){let ft=y(f-at);if(e[ft]||C(ft)){Math.abs((t[ft][0]-v.c[0])*v.d[1]-(t[ft][1]-v.c[1])*v.d[0])<=.55&&(st=!0);break}}if(!X&&!st)for(let at=1;at<=14;at++){let ft=y(o+at);if(e[ft]||C(ft)){Math.abs((t[ft][0]-v.c[0])*v.d[1]-(t[ft][1]-v.c[1])*v.d[0])<=.55&&(st=!0);break}}if(st)continue}if(!N){let st=St(Math.floor((u-A)*.12),3,6);if(!z){let at=t[y(f-Math.min(5,st))];if(Math.abs((at[0]-v.c[0])*v.d[1]-(at[1]-v.c[1])*v.d[0])<.45){let J=[];for(let mt=st;mt>=0;mt--)J.push(t[y(f-mt)]);let ut=kn(J,!1,st);if(ut[0]*v.d[0]+ut[1]*v.d[1]<.88)continue}}if(!X){let at=t[y(o+Math.min(5,st))];if(Math.abs((at[0]-v.c[0])*v.d[1]-(at[1]-v.c[1])*v.d[0])<.45){let J=[];for(let mt=0;mt<=st;mt++)J.push(t[y(o+mt)]);let ut=kn(J,!0,st);if(ut[0]*v.d[0]+ut[1]*v.d[1]<.88)continue}}}let W=B?6:Math.min(22,Math.max(12,A)),H=[];for(let st=-W;st<0;st++){let at=y(f+st);if(e[at]||C(at))break;H.push(t[at])}for(let st=0;st<A;st++)H.push(t[y(f+st)]);for(let st=A;st<A+W;st++){let at=y(f+st);if(e[at]||C(at))break;H.push(t[at])}let et=H.length>=10?Te(H):null,rt=be(H);if(et&&rt&&et.r>=4&&et.r<480&&et.rms<rt.rms*(B?.58:.72)&&et.rms<=Math.max(.18,et.r*.012))continue;let dt=Math.min(12,Math.max(5,u-A>>2)),Y=t[y(f-dt)],Z=t[y(o+dt)],ot=Math.abs((Y[0]-v.c[0])*v.d[1]-(Y[1]-v.c[1])*v.d[0]),xt=Math.abs((Z[0]-v.c[0])*v.d[1]-(Z[1]-v.c[1])*v.d[0]),At=N?Math.max(.08,v.rms*2.5):Math.max(.15,v.rms*3.8);if(!(ot<At||xt<At)){if(v.span<80&&!N&&!w){let st=Math.min(20,Math.max(10,u-A>>2));if(!z){let at=t[y(f-st)],ft=Math.hypot(at[0]-t[f][0],at[1]-t[f][1])||1,J=Math.abs((at[0]-v.c[0])*v.d[1]-(at[1]-v.c[1])*v.d[0]);if(J<.85||J/ft<.09)continue}if(!X){let at=t[y(o+st)],ft=Math.hypot(at[0]-t[o][0],at[1]-t[o][1])||1,J=Math.abs((at[0]-v.c[0])*v.d[1]-(at[1]-v.c[1])*v.d[0]);if(J<.85||J/ft<.09)continue}}R.push({start:f,end:o,spanLen:A,fl:c,snapStartPt:tt,snapEndPt:j})}}for(let g of R){let{start:f,end:o,spanLen:h,fl:A,snapStartPt:U,snapEndPt:P}=g;U&&!e[f]&&!C(f)&&(t[f]=U),P&&!e[o]&&!C(o)&&(t[o]=P);let c=A.d[0],E=A.d[1],q=t[f],Q=t[o];if((Q[0]-q[0])*c+(Q[1]-q[1])*E<0&&(c=-c,E=-E),i&&!(n&&(n[f]||n[o]))){let z=Math.atan2(E,c)*180/Math.PI,X=[0,90,-90,180,-180];for(let B of X){let L=Math.abs(z-B);L>180&&(L=360-L);let m=.5*A.span*Math.sin(L*Math.PI/180);if(L<=_&&m<=.28){let F=B*Math.PI/180;c=Math.cos(F),E=Math.sin(F);break}}}g.ux=c,g.uy=E;let tt=A.c[0],j=A.c[1];for(let z=0;z<h;z++){let X=y(f+z),B=z===0||z===h-1;if(!e[X]&&!C(X)){let L=t[X],m=(L[0]-tt)*c+(L[1]-j)*E;t[X]=[tt+c*m,j+E*m],B||(a[X]=0,l.delete(X)),b[X]=1}else if(B&&e[X]&&!C(X)){let L=t[X];if(Math.abs((L[0]-tt)*E-(L[1]-j)*c)<=.32){let F=(L[0]-tt)*c+(L[1]-j)*E;t[X]=[tt+c*F,j+E*F],b[X]=1}}}if(!e[f]){let z=!1;for(let X=-8;X<=8;X++){let B=y(f+X);(e[B]||n&&n[B])&&(z=!0),X!==0&&!e[B]&&!(n&&n[B])&&(a[B]=0,l.delete(B))}z||(a[f]=1,l.set(f,[c,E]))}if(!e[o]){let z=!1;for(let X=-8;X<=8;X++){let B=y(o+X);(e[B]||n&&n[B])&&(z=!0),X!==0&&!e[B]&&!(n&&n[B])&&(a[B]=0,l.delete(B))}z||(a[o]=1,l.set(o,[c,E]))}}if(R.length>=2)for(let g=0;g<R.length;g++){let f=R[g],o=R[(g+1)%R.length],h=(o.start-f.end+u)%u;if(h>=2&&h<=Math.max(58,Math.floor(u*.25))){let A=t[f.end],U=t[o.start],P=Math.hypot(U[0]-A[0],U[1]-A[1]),c=f.ux*o.ux+f.uy*o.uy,E=(e[f.end]?1:0)+(e[o.start]?1:0);for(let tt=1;tt<h;tt++)e[y(f.end+tt)]&&E++;if(h<=48&&P<=22&&c<=-.9&&E===0){for(let tt=1;tt<h;tt++){let j=y(f.end+tt);C(j)||(e[j]=0,a[j]=0,l.delete(j))}n&&n[f.end]||(e[f.end]=0,a[f.end]=1,l.set(f.end,[f.ux,f.uy])),n&&n[o.start]||(e[o.start]=0,a[o.start]=1,l.set(o.start,[o.ux,o.uy]));continue}let q=!1,Q=[];for(let tt=0;tt<=h;tt++){let j=y(f.end+tt);if(tt>0&&tt<h&&(e[j]||C(j))){q=!0;break}Q.push(t[j])}if(!q&&(c>=-.5||P<=22)){let tt=Te(Q);if(tt&&tt.r>=2&&tt.r<=260&&tt.rms<=Math.max(.32,tt.r*.025))for(let j=1;j<h;j++){let z=y(f.end+j);a[z]=0,l.delete(z)}}}}return b}function Yn(t,e,a,l,n,r={}){let s=t?t.length:0,i=Math.abs(e||0);if(s<6)return{localLambda:a*.35,localTol:Math.max(.05*n,l*.6),localAdv:r};let _=0,u=0,b=0,C=0;for(let O=0;O<s;O++){let S=t[(O-1+s)%s],R=t[O],g=t[(O+1)%s],f=R[0]-S[0],o=R[1]-S[1],h=g[0]-R[0],A=g[1]-R[1];(Math.abs(f)<.08||Math.abs(o)<.08)&&_++;let U=Math.hypot(f,o),P=Math.hypot(h,A);if(U>.1&&P>.1){let c=Math.atan2(f*A-o*h,f*h+o*A);Math.abs(c)>.55&&u++,c*C<-.04&&b++,C=c}}let T=_/s,I=b/s,p=i<36||s<20?.42:i<140||s<42?.72:1,x=T>.68&&s<=400&&u>=3?.78:I>.32?1.16:1,w=a*p*x,y=r.protectStemCaps===!0&&r.cornerMode==="typo",G=i<64||s<24?y?.78:1.45:i<220||s<48?y?.86:1.22:T>.72&&s<=400?.92:1.08,$=Math.max(.1*n,l*G),k={...r,lineStraighten:T>.65?Math.min(94,(r.lineStraighten??58)+12):r.lineStraighten??58};return{localLambda:w,localTol:$,localAdv:k}}function Qn(t,e={}){let a=t.length;if(a<5){let d=new Uint8Array(a).fill(1);return{pts:t.map(M=>M.slice()),corners:d,smoothKnots:new Uint8Array(a),knotTangents:new Map,straightSpanFlags:new Uint8Array(a)}}let l=d=>!!(e.juncFlags&&e.juncFlags[d]===1),n=e.juncFlags&&e.juncFlags.some(d=>d===1);if((e.isTrueCircle||!n)&&a>=8){let d=Te(t);if(d&&d.r>=(e.isTrueCircle?1.1:1.65)&&d.r<=500){let M=1/0,v=-1/0,D=1/0,N=-1/0,V=0,K=0;for(let Y=0;Y<a;Y++){let Z=t[Y],ot=t[(Y+1)%a];Z[0]<M&&(M=Z[0]),Z[0]>v&&(v=Z[0]),Z[1]<D&&(D=Z[1]),Z[1]>N&&(N=Z[1]);let xt=Math.abs(Math.hypot(Z[0]-d.cx,Z[1]-d.cy)-d.r);xt>V&&(V=xt),K+=Z[0]*ot[1]-ot[0]*Z[1]}let W=Math.abs(K)*.5,H=W/(Math.PI*d.r*d.r),et=v-M,rt=N-D,dt=et>0&&rt>0?et/rt:0;if(e.isTrueCircle||dt>=.88&&dt<=1.13&&H>=.91&&H<=1.09&&d.rms<=Math.max(.32,d.r*.025)&&V<=Math.max(.75,d.r*.055))return{pts:t.map((Z,ot)=>{if(e.juncFlags&&e.juncFlags[ot])return[Z[0],Z[1]];let xt=Z[0]-d.cx,At=Z[1]-d.cy,st=Math.hypot(xt,At)||1;return[d.cx+xt/st*d.r,d.cy+At/st*d.r]}),corners:new Uint8Array(a),smoothKnots:new Uint8Array(a),knotTangents:new Map,straightSpanFlags:new Uint8Array(a),isTrueCircle:!0,circleFit:{cx:d.cx,cy:d.cy,r:d.r}};if(e.protectStemCaps&&a>=12&&a<=26&&Math.min(et,rt)>=1.8&&Math.min(et,rt)<=4.2&&Math.max(et,rt)>=4.5&&Math.max(et,rt)<=10.5){let Y=W/Math.max(1e-4,et*rt),Z=0;for(let ot=0;ot<a;ot++){let xt=t[ot],At=t[(ot+1)%a],st=Math.abs(At[0]-xt[0]),at=Math.abs(At[1]-xt[1]);Math.min(st,at)<=.35*Math.max(st,at)&&Z++}if(Y>=.75&&Z/a>=.65){let ot=[],xt=[],At=[],st=[];for(let bt of t)bt[0]<=M+et*.28&&ot.push(bt[0]),bt[0]>=v-et*.28&&xt.push(bt[0]),bt[1]<=D+rt*.28&&At.push(bt[1]),bt[1]>=N-rt*.28&&st.push(bt[1]);let at=bt=>{if(!bt.length)return 0;let Ct=bt.slice().sort((Tt,yt)=>Tt-yt);return Ct[Ct.length>>1]},ft=ot.length?at(ot):M,J=xt.length?at(xt):v,ut=At.length?at(At):D,mt=st.length?at(st):N,it=[[ft,ut],[J,ut],[J,mt],[ft,mt]],nt=[];for(let bt of it){let Ct=0,Tt=1/0;for(let yt=0;yt<a;yt++){if(nt.includes(yt))continue;let pt=Math.hypot(t[yt][0]-bt[0],t[yt][1]-bt[1]);pt<Tt&&(Tt=pt,Ct=yt)}nt.push(Ct)}let lt=nt.map((bt,Ct)=>({ci:bt,pt:it[Ct]})).sort((bt,Ct)=>bt.ci-Ct.ci),ht=t.map(bt=>[bt[0],bt[1]]),gt=new Uint8Array(a),ct=new Uint8Array(a).fill(1);for(let bt=0;bt<4;bt++){let Ct=lt[bt],Tt=lt[(bt+1)%4];gt[Ct.ci]=1,ht[Ct.ci]=[Ct.pt[0],Ct.pt[1]];let yt=(Tt.ci-Ct.ci+a)%a;for(let pt=1;pt<yt;pt++){let Mt=pt/yt,vt=(Ct.ci+pt)%a;ht[vt]=[Ct.pt[0]+(Tt.pt[0]-Ct.pt[0])*Mt,Ct.pt[1]+(Tt.pt[1]-Ct.pt[1])*Mt]}}return{pts:ht,corners:gt,smoothKnots:new Uint8Array(a),knotTangents:new Map,straightSpanFlags:ct}}}if(dt>=.52&&dt<=1.95&&a>=10&&a<=95&&Math.min(et,rt)>=2.2){let Y=.5*(M+v),Z=.5*(D+N),ot=Math.max(1.5,et*.5),xt=Math.max(1.5,rt*.5),At=W/(Math.PI*ot*xt);if(At>=.89&&At<=1.09){let st=0,at=0,ft=Math.min(ot,xt);for(let ut=0;ut<a;ut++){let mt=(t[ut][0]-Y)/ot,it=(t[ut][1]-Z)/xt,nt=Math.hypot(mt,it),lt=Math.abs(nt-1)*ft;st+=lt*lt,lt>at&&(at=lt)}if(Math.sqrt(st/a)<=Math.max(.28,ft*.055)&&at<=Math.max(.68,ft*.145)){let ut=t.map(ct=>{let bt=(ct[0]-Y)/ot,Ct=(ct[1]-Z)/xt,Tt=Math.hypot(bt,Ct)||1,yt=Y+bt/Tt*ot,pt=Z+Ct/Tt*xt;return[ct[0]*.35+yt*.65,ct[1]*.35+pt*.65]}),mt=new Uint8Array(a),it=new Map,nt=0,lt=0,ht=0,gt=0;for(let ct=1;ct<a;ct++)ut[ct][1]<ut[nt][1]&&(nt=ct),ut[ct][1]>ut[lt][1]&&(lt=ct),ut[ct][0]<ut[ht][0]&&(ht=ct),ut[ct][0]>ut[gt][0]&&(gt=ct);for(let ct of[nt,gt,lt,ht])mt[ct]=1,it.set(ct,ln(ut,ct,4));return{pts:ut,corners:new Uint8Array(a),smoothKnots:mt,knotTangents:it,straightSpanFlags:new Uint8Array(a)}}}}}}let r=t.map(d=>[d[0],d[1]]),s=e.detectCorners===!1?{corners:new Uint8Array(a),smoothKnots:new Uint8Array(a),apexMap:new Map,knotTangents:new Map}:Oo(r,e.cornerAngle||44,e.juncFlags,e),{corners:i,smoothKnots:_,apexMap:u,knotTangents:b}=s,C=r.map((d,M)=>u.has(M)?u.get(M).slice():[d[0],d[1]]);u.forEach((d,M)=>{if(!i[M])return;let v=Math.hypot(d[0]-r[M][0],d[1]-r[M][1]);if(v<.2)return;let D=v>1.6?Math.min(10,Math.max(6,Math.floor(a/32))):v>1.2?Math.min(8,Math.max(4,Math.floor(a/40))):Math.min(5,Math.max(2,Math.floor(a/52))),N=v>1.2?Math.min(2.4,v*.95):.42,V=C[(M-D+a)%a],K=C[(M+D)%a];for(let W=1;W<D;W++){let H=W/D,et=(M-W+a)%a,rt=(M+W)%a;if(!i[et]&&!(e.juncFlags&&e.juncFlags[et])){let dt=d[0]+(V[0]-d[0])*H,Y=d[1]+(V[1]-d[1])*H,Z=v>1.2?1-H*.15:(1-H*.45)*Math.min(.65,v/1.1),ot=C[et][0]*(1-Z)+dt*Z,xt=C[et][1]*(1-Z)+Y*Z,At=ot-r[et][0],st=xt-r[et][1],at=Math.hypot(At,st);at>N&&(ot=r[et][0]+At/at*N,xt=r[et][1]+st/at*N),C[et]=[ot,xt]}if(!i[rt]&&!(e.juncFlags&&e.juncFlags[rt])){let dt=d[0]+(K[0]-d[0])*H,Y=d[1]+(K[1]-d[1])*H,Z=v>1.2?1-H*.15:(1-H*.45)*Math.min(.65,v/1.1),ot=C[rt][0]*(1-Z)+dt*Z,xt=C[rt][1]*(1-Z)+Y*Z,At=ot-r[rt][0],st=xt-r[rt][1],at=Math.hypot(At,st);at>N&&(ot=r[rt][0]+At/at*N,xt=r[rt][1]+st/at*N),C[rt]=[ot,xt]}}});let T=(e.despeckleJitter??72)/100,I=T>.02?ho(C,T*.65,e.juncFlags,i):C,p=(e.lineStraighten??58)/100,x=.34+p*.36,w=.015+p*.016,y=e.axisSnap!==!1,G=e.axisSnapDeg??2.2,$=new Uint8Array(a),k=(d,M,v,D)=>{let N=Math.min(16,Math.max(7,v)),V=[];for(let H=N;H>=1;H--){let et=(d-H+a)%a;if(i[et]||l(et))break;V.push(I[et])}V.reverse();for(let H=0;H<=v;H++)V.push(I[(d+H)%a]);for(let H=1;H<=N;H++){let et=(M+H)%a;if(i[et]||l(et))break;V.push(I[et])}if(V.length<Math.max(10,v+5))return!1;let K=Te(V),W=be(V);return!K||K.r<3||K.r>480?!1:K.rms<=Math.max(.26,K.r*.012)&&(!W||K.rms<W.rms*.68)},O=[];for(let d=0;d<a;d++)(i[d]||l(d))&&O.push(d);if(O.length>=2&&p>.12){let d=O.length,M=new Array(d).fill(null);for(let v=0;v<d;v++){let D=O[v],N=O[(v+1)%d],V=(N-D+a)%a;if(V<6)continue;let K=I[D],W=I[N];if(Math.hypot(W[0]-K[0],W[1]-K[1])<4.5)continue;let et=V>=20?Math.min(10,Math.floor(V*.16)):Math.max(2,Math.floor(V*.2)),rt=[];for(let At=et;At<=V-et;At++)rt.push(I[(D+At)%a]);if(rt.length<4)continue;let dt=be(rt);if(!dt||dt.rms>.22||dt.maxDev>.45)continue;let Y=[];for(let At=0;At<=V;At++)Y.push(I[(D+At)%a]);let Z=V>=8?Te(Y):null,ot=be(Y);!!(Z&&Z.r>=3&&Z.r<=500&&ot&&Z.rms<ot.rms*.62&&dt.rms>.1)||(M[v]=dt)}for(let v=0;v<d;v++){let D=M[(v-1+d)%d],N=M[v],V=O[v];if(!(e.juncFlags&&e.juncFlags[V])&&D&&N){let K=D.d[0]*N.d[1]-D.d[1]*N.d[0];if(Math.abs(K)>=.25){let W=N.c[0]-D.c[0],H=N.c[1]-D.c[1],et=(W*N.d[1]-H*N.d[0])/K,rt=D.c[0]+D.d[0]*et,dt=D.c[1]+D.d[1]*et;Math.hypot(rt-I[V][0],dt-I[V][1])<=3.4&&(I[V]=[rt,dt])}}}for(let v=0;v<O.length;v++){let D=O[v],N=O[(v+1)%O.length],V=(N-D+a)%a;if(V<2)continue;let K=I[D],W=I[N],H=Math.hypot(W[0]-K[0],W[1]-K[1]);if(H<3)continue;let et=(W[0]-K[0])/H,rt=(W[1]-K[1])/H,dt=0,Y=0,Z=0,ot=0,xt=0,At=0,st=!1,at=V>=20?Math.min(12,Math.floor(V*.14)):V>=8?2:1;for(let vt=1;vt<V;vt++){let Ft=(D+vt)%a,wt=I[Ft],Et=(wt[0]-K[0])*rt-(wt[1]-K[1])*et,Dt=Math.abs(Et);_[Ft]&&Dt>.48&&(st=!0),vt>=at&&vt<=V-at?(Dt>dt&&(dt=Dt),Z+=Dt*Dt,xt+=Et,At+=Dt,ot++):Dt>Y&&(Y=Dt)}let ft=ot>0?Math.sqrt(Z/ot):Y,J=ot>0?Math.abs(xt/ot):0,mt=(At>1e-5?Math.abs(xt)/At:0)>=.58&&(dt>.24||J>.14)||dt>.36,it=!!((i[D]||l(D))&&(i[N]||l(N)));if(st&&!(it&&!mt&&dt<=.28&&ft<=.16))continue;let nt=[];for(let vt=0;vt<=V;vt++)nt.push(I[(D+vt)%a]);let lt=V>=6?Te(nt):null,ht=mt||!!(lt&&lt.r>=2&&lt.r<=750&&lt.rms<ft*.85&&dt>.1)||H<26&&k(D,N,V,ft),gt=[];for(let vt=at;vt<=V-at;vt++)gt.push(I[(D+vt)%a]);let ct=gt.length>=3?be(gt):null,bt=!ht&&V<=16&&H<=11&&dt<=.28&&ft<=.15;if(ct&&ct.rms<=.085&&ct.maxDev<=.16&&V>=5){let vt=Math.abs((K[0]-ct.c[0])*ct.d[1]-(K[1]-ct.c[1])*ct.d[0]),Ft=Math.abs((W[0]-ct.c[0])*ct.d[1]-(W[1]-ct.c[1])*ct.d[0]);if(vt<=1.35&&Ft<=1.35&&!(e.juncFlags&&(e.juncFlags[D]||e.juncFlags[N]))){let wt=(K[0]-ct.c[0])*ct.d[0]+(K[1]-ct.c[1])*ct.d[1],Et=(W[0]-ct.c[0])*ct.d[0]+(W[1]-ct.c[1])*ct.d[1];I[D]=[ct.c[0]+ct.d[0]*wt,ct.c[1]+ct.d[1]*wt],I[N]=[ct.c[0]+ct.d[0]*Et,ct.c[1]+ct.d[1]*Et],K[0]=I[D][0],K[1]=I[D][1],W[0]=I[N][0],W[1]=I[N][1],dt=ct.maxDev,Y=Math.min(Y,.25)}}let Ct=!!((i[D]||l(D))&&(i[N]||l(N))),Tt=!!(M[v]&&Ct),yt=Ct?Math.min(.85,Math.max(.42,H*.026)):Math.min(.28,Math.max(.18,H*.008)),pt=Ct?.38:.12,Mt=Tt?2.45:Ct?1.15:.38;if(!ht&&dt<=yt&&(ft<=pt||ct&&ct.rms<=pt*.8)&&Y<=Mt||bt)for(let vt=1;vt<V;vt++){let Ft=(D+vt)%a,wt=I[Ft],Et=St((wt[0]-K[0])*et+(wt[1]-K[1])*rt,0,H);I[Ft]=[K[0]+et*Et,K[1]+rt*Et],_[Ft]=0,b.delete(Ft),$[Ft]=1}}}let S=ya(I,i,_,b,e.juncFlags,p,$,y,G);for(let d=0;d<a;d++)S[d]&&($[d]=1);if(p>.12){let d=[];for(let M=0;M<a;M++)(i[M]||_[M]||e.juncFlags&&e.juncFlags[M])&&d.push(M);for(let M=0;M<d.length;M++){let v=d[M],D=d[(M+1)%d.length],N=(D-v+a)%a;if(N<2)continue;let V=I[v],K=I[D],W=K[0]-V[0],H=K[1]-V[1],et=Math.hypot(W,H);if(et<3.5)continue;let rt=W/et,dt=H/et,Y=0,Z=0,ot=0,xt=i[v]&&N>=8?2:1,At=i[D]&&N>=8?2:1;for(let it=xt;it<=N-At;it++){let nt=I[(v+it)%a],lt=Math.abs((nt[0]-V[0])*dt-(nt[1]-V[1])*rt);lt>Y&&(Y=lt),Z+=lt*lt,ot++}let st=Math.sqrt(Z/Math.max(1,ot)),at=!!((i[v]||l(v))&&(i[D]||l(D))),ft=!!$[(v+(N>>1))%a],J=at||ft?Math.max(.22,Math.min(x,et*w)):.09,ut=at||ft?.14:.05;if(!(et<28&&!ft?k(v,D,N,st):!1)&&Y<=J&&st<=ut){if(y&&!(e.juncFlags&&(e.juncFlags[v]||e.juncFlags[D]))){let it=Math.atan2(H,W)*180/Math.PI,nt=at&&et>=14?[0,45,-45,90,-90,135,-135,180,-180]:[0,90,-90,180,-180],lt=null,ht=et<=8.5?Math.max(G,5.5):G;for(let gt of nt){let ct=Math.abs(it-gt);ct>180&&(ct=360-ct),ct<=ht&&(ht=ct,lt=gt)}if(lt!==null&&ht>.02){let gt=lt*Math.PI/180,ct=Math.cos(gt),bt=Math.sin(gt),Ct=.5*(V[0]+K[0]),Tt=.5*(V[1]+K[1]),yt=(V[0]-Ct)*ct+(V[1]-Tt)*bt,pt=(K[0]-Ct)*ct+(K[1]-Tt)*bt;Math.hypot(Ct+ct*yt-V[0],Tt+bt*yt-V[1])<=.28&&(I[v]=[Ct+ct*yt,Tt+bt*yt],I[D]=[Ct+ct*pt,Tt+bt*pt],V=I[v],K=I[D],W=K[0]-V[0],H=K[1]-V[1],et=Math.hypot(W,H)||1,rt=W/et,dt=H/et)}}for(let it=1;it<N;it++){let nt=(v+it)%a,lt=I[nt],ht=(lt[0]-V[0])*rt+(lt[1]-V[1])*dt;I[nt]=[V[0]+rt*ht,V[1]+dt*ht],$[nt]=1}!i[v]&&_[v]&&b.set(v,[rt,dt]),!i[D]&&_[D]&&b.set(D,[rt,dt])}}}if(p>.12){let d=[];for(let M=0;M<a;M++)(i[M]||_[M]||e.juncFlags&&e.juncFlags[M])&&d.push(M);for(let M=0;M<d.length;M++){let v=d[M],D=d[(M+1)%d.length],N=(D-v+a)%a;if(N<2)continue;let V=!0;for(let Z=1;Z<N;Z++)if(!$[(v+Z)%a]){V=!1;break}if(!V)continue;let K=I[v],W=I[D],H=W[0]-K[0],et=W[1]-K[1],rt=Math.hypot(H,et);if(rt<1e-5)continue;let dt=H/rt,Y=et/rt;for(let Z=1;Z<N;Z++){let ot=(v+Z)%a,xt=I[ot],At=(xt[0]-K[0])*dt+(xt[1]-K[1])*Y;I[ot]=[K[0]+dt*At,K[1]+Y*At]}}}let R=new Uint8Array(a);if(O.length>=2)for(let d=0;d<O.length;d++){let M=O[d],v=O[(d+1)%O.length],D=(v-M+a)%a;if(D<12)continue;let N=!1;for(let Z=1;Z<D;Z++)if($[(M+Z)%a]){N=!0;break}if(N)continue;let V=Math.min(3,Math.max(1,Math.floor(D*.08))),K=[];for(let Z=V;Z<=D-V;Z++)K.push(I[(M+Z)%a]);if(K.length<8)continue;let W=Te(K),H=be(K);if(!W||W.r<5||W.r>480)continue;let et=Math.atan2(I[M][1]-W.cy,I[M][0]-W.cx),rt=Math.atan2(I[v][1]-W.cy,I[v][0]-W.cx);if(Math.abs(Math.atan2(Math.sin(rt-et),Math.cos(rt-et)))<.45)continue;let Y=0;for(let Z=V;Z<=D-V;Z++){let ot=I[(M+Z)%a],xt=Math.abs(Math.hypot(ot[0]-W.cx,ot[1]-W.cy)-W.r);xt>Y&&(Y=xt)}if(W.rms<=Math.max(.24,W.r*.01)&&Y<=Math.max(.52,W.r*.024)&&(!H||W.rms<H.rms*.52)){for(let Z=1;Z<D;Z++){let ot=(M+Z)%a,xt=I[ot][0]-W.cx,At=I[ot][1]-W.cy,st=Math.hypot(xt,At)||1;I[ot]=[W.cx+xt/st*W.r,W.cy+At/st*W.r],R[ot]=1}for(let Z of[M,v])if(!(e.juncFlags&&e.juncFlags[Z])){let ot=I[Z][0]-W.cx,xt=I[Z][1]-W.cy,At=Math.hypot(ot,xt)||1;Math.abs(At-W.r)<=.75&&(I[Z]=[W.cx+ot/At*W.r,W.cy+xt/At*W.r])}}}let g=new Uint8Array(a);for(let d=0;d<a;d++)(i[d]||$[d]||R[d]||e.juncFlags&&e.juncFlags[d])&&(g[d]=1);let f=T>.02?ho(I,T*.85,e.juncFlags,g):I,o=e.smoothMethod||"hybrid",h=St((e.lambda||2.8)*.18,.05,.85),A=o==="cg"?2:St(Math.round(4+Math.log10(1+h)*5),4,9),U=Gn(f,g,A,.38,-.392);for(let d=0;d<a;d++)if(g[d])U[d][0]=I[d][0],U[d][1]=I[d][1];else{let M=g[(d-1+a)%a]||g[(d+1)%a]?.24:.56,v=U[d][0]-I[d][0],D=U[d][1]-I[d][1],N=Math.hypot(v,D);N>M&&(U[d][0]=I[d][0]+v/N*M,U[d][1]=I[d][1]+D/N*M)}if(o==="taubin")return{pts:U,corners:i,smoothKnots:_,knotTangents:b,straightSpanFlags:$};if(!e.forceCpu&&a>=192&&typeof $t<"u"&&$t&&$t.useGpu&&$t.gpuPipeline==="full"&&typeof xe<"u"&&xe.gpuElasticaRelaxClosed){let d=xe.gpuElasticaRelaxClosed(U,I,g,_,h,Math.min(e.iters||16,16));if(d&&d.length===a)return{pts:d,corners:i,smoothKnots:_,knotTangents:b,straightSpanFlags:$}}let P=new Float64Array(2*a),c=new Float64Array(2*a);for(let d=0;d<a;d++)c[2*d]=P[2*d]=U[d][0],c[2*d+1]=P[2*d+1]=U[d][1];let E=0,q=Math.min(e.iters||16,16),Q=d=>(d%a+a)%a,tt=d=>{let M=0;for(let v=0;v<a;v++){let D=g[v]?64:_[v]?3.5:1.8,N=d[2*v]-P[2*v],V=d[2*v+1]-P[2*v+1];M+=D*(N*N+V*V);let K=Q(v+1),W=d[2*K]-d[2*v],H=d[2*K+1]-d[2*v+1];if(M+=E*(W*W+H*H),!g[v]){let et=Q(v-1),rt=d[2*et]-2*d[2*v]+d[2*K],dt=d[2*et+1]-2*d[2*v+1]+d[2*K+1],Y=g[et]||g[K]?.15:1,Z=(_[v]?h*.65:h)*Y;M+=Z*(rt*rt+dt*dt)}}return M},j=(d,M)=>{for(let v=0;v<a;v++){let D=g[v]?64:_[v]?3.5:1.8;M[2*v]=2*D*(d[2*v]-P[2*v]),M[2*v+1]=2*D*(d[2*v+1]-P[2*v+1])}for(let v=0;v<a;v++){let D=Q(v-1),N=Q(v+1);for(let W=0;W<2;W++){let H=d[2*N+W]-d[2*v+W],et=2*E*H;g[v]||(M[2*v+W]-=et),g[N]||(M[2*N+W]+=et)}if(g[v])continue;let V=g[D]||g[N]?.15:1,K=(_[v]?h*.65:h)*V;for(let W=0;W<2;W++){let H=d[2*D+W]-2*d[2*v+W]+d[2*N+W],et=2*K*H;g[D]||(M[2*D+W]+=et),M[2*v+W]-=2*et,g[N]||(M[2*N+W]+=et)}}},z=new Float64Array(2*a),X=new Float64Array(2*a),B=new Float64Array(2*a),L=new Float64Array(2*a);j(c,z);for(let d=0;d<2*a;d++)X[d]=-z[d];let m=tt(c);for(let d=0;d<q;d++){let M=0;for(let H=0;H<2*a;H++)M+=z[H]*X[H];if(M>=0){for(let H=0;H<2*a;H++)X[H]=-z[H];M=0;for(let H=0;H<2*a;H++)M+=z[H]*X[H]}let v=Math.min(1,1/(1+4*h)),D=m,N=!1;for(let H=0;H<10;H++){for(let et=0;et<2*a;et++)L[et]=c[et]+v*X[et];if(D=tt(L),D<=m+1e-4*v*M){N=!0;break}v*=.5}if(!N)break;for(let H=0;H<a;H++){if(g[H])c[2*H]=I[H][0],c[2*H+1]=I[H][1];else{let et=g[Q(H-1)]||g[Q(H+1)]?.12:.28,rt=L[2*H]-I[H][0],dt=L[2*H+1]-I[H][1],Y=Math.hypot(rt,dt);Y>et?(c[2*H]=I[H][0]+rt/Y*et,c[2*H+1]=I[H][1]+dt/Y*et):(c[2*H]=L[2*H],c[2*H+1]=L[2*H+1])}B[2*H]=z[2*H],B[2*H+1]=z[2*H+1]}j(c,z);let V=0,K=0;for(let H=0;H<2*a;H++){let et=z[H]-B[H];V+=z[H]*et,K+=B[H]*B[H]}let W=K>1e-18?Math.max(0,V/K):0;for(let H=0;H<2*a;H++)X[H]=-z[H]+W*X[H];if(Math.abs(m-D)<1e-7*Math.max(1,Math.abs(m)))break;m=D}let F=[];for(let d=0;d<a;d++)F.push([c[2*d],c[2*d+1]]);return{pts:F,corners:i,smoothKnots:_,knotTangents:b,straightSpanFlags:$}}function vn(t,e,a,l,n){let r=1-n,s=r*r,i=n*n;return[s*r*t[0]+3*s*n*e[0]+3*r*i*a[0]+i*n*l[0],s*r*t[1]+3*s*n*e[1]+3*r*i*a[1]+i*n*l[1]]}function Ma(t,e,a,l,n){let r=1-n;return[3*(r*r*(e[0]-t[0])+2*r*n*(a[0]-e[0])+n*n*(l[0]-a[0])),3*(r*r*(e[1]-t[1])+2*r*n*(a[1]-e[1])+n*n*(l[1]-a[1]))]}function va(t,e,a,l,n){let r=1-n;return[6*(r*(a[0]-2*e[0]+t[0])+n*(l[0]-2*a[0]+e[0])),6*(r*(a[1]-2*e[1]+t[1])+n*(l[1]-2*a[1]+e[1]))]}function An(t,e,a,l,n,r){let s=new Float64Array(e.length);s[0]=0,s[e.length-1]=1;for(let i=1;i<e.length-1;i++){let _=e[i],u=vn(a,l,n,r,_),b=Ma(a,l,n,r,_),C=va(a,l,n,r,_),T=u[0]-t[i][0],I=u[1]-t[i][1],p=T*b[0]+I*b[1],x=b[0]*b[0]+b[1]*b[1]+T*C[0]+I*C[1],w=Math.abs(x)>1e-12?_-p/x:_;s[i]=St(w,s[i-1]+1e-5,1-1e-5)}return s}function ln(t,e,a=8){let l=t.length,n=0,r=0,s=Math.min(a,Math.max(1,l>>2));for(let _=1;_<=s;_++){let u=Math.exp(-(_*_)/(2*(s*.6)**2)),b=t[(e+_)%l],C=t[(e-_+l*2)%l];n+=u*(b[0]-C[0]),r+=u*(b[1]-C[1])}let i=Math.hypot(n,r)||1;return[n/i,r/i]}function Aa(t,e,a=6){let l=t.length,n=0,r=0,s=Math.min(a,l-1);for(let _=1;_<=s;_++){let u=Math.exp(-(_*_)/(2*(s*.55)**2)),b=Math.min(l-1,e+_),C=Math.max(0,e-_);b>C&&(n+=u*(t[b][0]-t[C][0])/(b-C),r+=u*(t[b][1]-t[C][1])/(b-C))}let i=Math.hypot(n,r)||1;return[n/i,r/i]}function Ln(t,e=null,a=null,l=!1){let n=t.length;if(n<2)return null;let r=t[0],s=t[n-1],i=new Float64Array(n),_=0;for(let m=1;m<n;m++)_+=Math.hypot(t[m][0]-t[m-1][0],t[m][1]-t[m-1][1]),i[m]=_;if(_<1e-9)return null;for(let m=0;m<n;m++)i[m]/=_;let u=Math.hypot(s[0]-r[0],s[1]-r[1]),b=u>1e-6?(s[0]-r[0])/u:1,C=u>1e-6?(s[1]-r[1])/u:0,T=0,I=0,p=0;for(let m=1;m<n-1;m++){let F=(t[m][0]-r[0])*C-(t[m][1]-r[1])*b;p+=F,F>T&&(T=F),F<I&&(I=F)}let x=Math.min(T,-I),w=Math.max(T,-I),y=p>=0?1:-1,G=T>=.2&&I>=-.12?1:I<=-.2&&T<=.12?-1:x<=.35&&w>=.12?y:0;if(l&&u>=4.5){let m=Math.max(T,-I),F=!e||Math.abs(e[0]*C-e[1]*b)<.12,d=!a||Math.abs(a[0]*C-a[1]*b)<.12;if(m<=.22&&F&&d){let M=[r[0]+(s[0]-r[0])/3,r[1]+(s[1]-r[1])/3],v=[r[0]+2*(s[0]-r[0])/3,r[1]+2*(s[1]-r[1])/3];return{P0:r,P1:M,P2:v,P3:s,err:m,sse:m*m*n,at:n>>1,isLine:!0,tL:[b,C],tR:[-b,-C]}}}let $=null,k=null,O=null;if(n>=5&&u>1.5){let m=Te(t);if(m&&m.r>=1.8&&m.r<=500&&m.rms<=Math.max(.16,m.r*.015)){let F=r[0]-m.cx,d=r[1]-m.cy,M=Math.hypot(F,d)||1,v=s[0]-m.cx,D=s[1]-m.cy,N=Math.hypot(v,D)||1,V=t[n>>1],W=(r[0]-m.cx)*(V[1]-m.cy)-(r[1]-m.cy)*(V[0]-m.cx)>=0?1:-1;$=[-d/M*W,F/M*W],k=[D/N*W,-v/N*W];let H=Math.acos(St((F*v+d*D)/(M*N),-1,1));H>.08&&H<2.2&&(O=4/3*m.r*Math.tan(H/4))}}let S=$&&!e,R=k&&!a,g=u>18&&_/u<1.02?St(u*.24,10.5,28):9.5,f=e?[e[0],e[1]]:S?$:kn(t,!0,g),o=R?[-k[0],-k[1]]:kn(t,!1,g),h=a?[a[0],a[1]]:R?k:[-o[0],-o[1]],A=(m,F)=>{if(!G)return m;let d=m[0]*C-m[1]*b;if(G*d<-.01){if(F&&$)return $;if(!F&&k)return k;let M=m[0]*b+m[1]*C,v=Math.abs(d)*.5*G,D=M*b+v*C,N=M*C-v*b,V=Math.hypot(D,N)||1;return[D/V,N/V]}return m};f=A(f,!0),h=A(h,!1);let U=O||_/3,P=O?.06:.004,c=(m,F=f,d=h)=>{let M=P,v=0,D=P,N=P*U,V=P*U;for(let dt=0;dt<n;dt++){let Y=m[dt],Z=1-Y,ot=Z*Z*Z,xt=3*Z*Z*Y,At=3*Z*Y*Y,st=Y*Y*Y,at=F[0]*xt,ft=F[1]*xt,J=d[0]*At,ut=d[1]*At;M+=at*at+ft*ft,v+=at*J+ft*ut,D+=J*J+ut*ut;let mt=t[dt][0]-(r[0]*(ot+xt)+s[0]*(At+st)),it=t[dt][1]-(r[1]*(ot+xt)+s[1]*(At+st));N+=at*mt+ft*it,V+=J*mt+ut*it}let K=M*D-v*v,W=Math.max(.08*u,.06*_),H=Math.min(.58*_,Math.max(.64*u,.52*_)),et=Math.abs(K)>1e-9?(N*D-V*v)/K:U,rt=Math.abs(K)>1e-9?(M*V-v*N)/K:U;return(et<W||et>H)&&(et=St(et,W,H),D>1e-9&&(rt=St((V-v*et)/D,W,H))),(rt<W||rt>H)&&(rt=St(rt,W,H),M>1e-9&&(et=St((N-v*rt)/M,W,H))),[[r[0]+F[0]*et,r[1]+F[1]*et],[s[0]+d[0]*rt,s[1]+d[1]*rt]]},E=1/0,q=-1/0,Q=1/0,tt=-1/0;for(let m=0;m<n;m++){let F=t[m];F[0]<E&&(E=F[0]),F[0]>q&&(q=F[0]),F[1]<Q&&(Q=F[1]),F[1]>tt&&(tt=F[1])}let j=(m,F,d)=>{let M=0,v=0,D=n>>1;for(let N=1;N<n-1;N++){let V=vn(r,F,d,s,m[N]),K=(V[0]-t[N][0])**2+(V[1]-t[N][1])**2;v+=K,K>M&&(M=K,D=N)}for(let N of[.2,.35,.5,.65,.8]){let V=vn(r,F,d,s,N),K=Math.max(0,E-V[0],V[0]-q),W=Math.max(0,Q-V[1],V[1]-tt),H=Math.hypot(K,W);if(H>.28){let et=(H*2.5)**2;v+=et*4,et>M&&(M=et)}}return{err:Math.sqrt(M),sse:v,at:D}},z=(m,F)=>{if(u<1.5)return!0;let d=(m[0]-r[0])*C-(m[1]-r[1])*b,M=(F[0]-r[0])*C-(F[1]-r[1])*b;if(x<=Math.max(.85,u*.035)&&d*M<-1e-4||G&&(G*d<-.005||G*M<-.005))return!1;for(let K of[.25,.5,.75]){let W=vn(r,m,F,s,K);if(W[0]<E-.35||W[0]>q+.35||W[1]<Q-.35||W[1]>tt+.35)return!1}let v=(m[0]-r[0])*b+(m[1]-r[1])*C,D=(s[0]-F[0])*b+(s[1]-F[1])*C,N=e?-.05*u:.02*u,V=a?-.05*u:.02*u;return v>=N&&D>=V&&v<=.82*u&&D<=.82*u};if(O){let m=[r[0]+f[0]*O,r[1]+f[1]*O],F=[s[0]+h[0]*O,s[1]+h[1]*O];i=An(t,i,r,m,F,s),i=An(t,i,r,m,F,s)}if(x<=Math.max(.85,u*.035)&&u>1.5){let m=f[0]*C-f[1]*b,F=-h[0]*C- -h[1]*b;if(m*F>1e-4&&w>=.12){let d=(M,v)=>{let D=v?-1:1,N=D*M[0]*C-D*M[1]*b;if(N*y*D>0){let V=Math.max(.2,D*M[0]*b+D*M[1]*C),K=-y*D*Math.min(Math.abs(N)*.35,.18*V),W=D*(V*b+K*C),H=D*(V*C-K*b),et=Math.hypot(W,H)||1;return[W/et,H/et]}return M};f=d(f,!1),h=d(h,!0)}}let[X,B]=c(i),L=j(i,X,B);if(O){let m=[r[0]+f[0]*O,r[1]+f[1]*O],F=[s[0]+h[0]*O,s[1]+h[1]*O],d=j(i,m,F);d.err<=L.err*1.05&&(X=m,B=F,L=d)}if(L.err>.015&&L.err<18&&n>=4)for(let m=0;m<10;m++){let F=An(t,i,r,X,B,s),[d,M]=c(F),v=j(F,d,M);if(v.err<L.err&&z(d,M))i=F,X=d,B=M,L=v;else break}if((!e||!a)&&L.err>.14&&n>=6){let m=M=>{if(e&&!a){let D=.001,N=0,V=0,K=.001,W=.001*U,H=.001*h[0]*U,et=.001*h[1]*U;for(let At=0;At<n;At++){let st=M[At],at=1-st,ft=at*at*at,J=3*at*at*st,ut=3*at*st*st,mt=st*st*st,it=t[At][0]-(ft+J)*r[0]-(ut+mt)*s[0],nt=t[At][1]-(ft+J)*r[1]-(ut+mt)*s[1];D+=J*J,N+=J*ut*f[0],V+=J*ut*f[1],K+=ut*ut,W+=J*(f[0]*it+f[1]*nt),H+=ut*it,et+=ut*nt}let rt=D-(N*N+V*V)/K,dt=St(Math.abs(rt)>1e-9?(W-(N*H+V*et)/K)/rt:U,.08*u,.78*_),Y=(H-N*dt)/K,Z=(et-V*dt)/K,ot=Math.hypot(Y,Z)||1,xt=St(ot,.08*u,.78*_)/ot;return[[r[0]+dt*f[0],r[1]+dt*f[1]],[s[0]+Y*xt,s[1]+Z*xt]]}else if(!e&&a){let D=.001,N=0,V=0,K=.001,W=.001*f[0]*U,H=.001*f[1]*U,et=.001*U;for(let At=0;At<n;At++){let st=M[At],at=1-st,ft=at*at*at,J=3*at*at*st,ut=3*at*st*st,mt=st*st*st,it=t[At][0]-(ft+J)*r[0]-(ut+mt)*s[0],nt=t[At][1]-(ft+J)*r[1]-(ut+mt)*s[1];D+=J*J,N+=J*ut*h[0],V+=J*ut*h[1],K+=ut*ut,W+=J*it,H+=J*nt,et+=ut*(h[0]*it+h[1]*nt)}let rt=K-(N*N+V*V)/D,dt=St(Math.abs(rt)>1e-9?(et-(N*W+V*H)/D)/rt:U,.08*u,.78*_),Y=(W-N*dt)/D,Z=(H-V*dt)/D,ot=Math.hypot(Y,Z)||1,xt=St(ot,.08*u,.78*_)/ot;return[[r[0]+Y*xt,r[1]+Z*xt],[s[0]+dt*h[0],s[1]+dt*h[1]]]}else{let D=.001,N=0,V=.001,K=.001*f[0]*U,W=.001*f[1]*U,H=.001*h[0]*U,et=.001*h[1]*U;for(let ft=0;ft<n;ft++){let J=M[ft],ut=1-J,mt=ut*ut*ut,it=3*ut*ut*J,nt=3*ut*J*J,lt=J*J*J,ht=t[ft][0]-(mt+it)*r[0]-(nt+lt)*s[0],gt=t[ft][1]-(mt+it)*r[1]-(nt+lt)*s[1];D+=it*it,N+=it*nt,V+=nt*nt,K+=it*ht,W+=it*gt,H+=nt*ht,et+=nt*gt}let rt=D*V-N*N;if(Math.abs(rt)<1e-9)return null;let dt=(V*K-N*H)/rt,Y=(V*W-N*et)/rt,Z=(D*H-N*K)/rt,ot=(D*et-N*W)/rt,xt=Math.hypot(dt,Y)||1,At=Math.hypot(Z,ot)||1,st=St(xt,.08*u,.78*_)/xt,at=St(At,.08*u,.78*_)/At;return[[r[0]+dt*st,r[1]+Y*st],[s[0]+Z*at,s[1]+ot*at]]}},F=new Float64Array(n);for(let M=1;M<n;M++)F[M]=F[M-1]+Math.hypot(t[M][0]-t[M-1][0],t[M][1]-t[M-1][1]);for(let M=0;M<n;M++)F[M]/=_;let d=m(F);if(d&&z(d[0],d[1])){let[M,v]=d,D=j(F,M,v),N=F,V=M,K=v,W=D;for(let H=0;H<10;H++){let et=An(t,F,r,M,v,s),rt=m(et);if(!rt||!z(rt[0],rt[1]))break;let dt=j(et,rt[0],rt[1]);F=et,M=rt[0],v=rt[1],D=dt,dt.err<W.err&&(N=et,V=M,K=v,W=dt)}if(F=N,M=V,v=K,D=W,D.err<L.err*.96&&z(M,v)){i=F,X=M,B=v,L=D;let H=X[0]-r[0],et=X[1]-r[1],rt=Math.hypot(H,et)||1,dt=B[0]-s[0],Y=B[1]-s[1],Z=Math.hypot(dt,Y)||1;e||(f=[H/rt,et/rt]),a||(h=[dt/Z,Y/Z])}}}if(!O&&L.err>.14&&L.err<5.5&&n>=6){let m=(M,v)=>{let D=Math.cos(v),N=Math.sin(v);return[M[0]*D-M[1]*N,M[0]*N+M[1]*D]},F=e?[-.04,-.02,.02,.04]:[-.32,-.2,-.12,-.06,-.03,.03,.06,.12,.2,.32],d=a?[-.04,-.02,.02,.04]:[-.32,-.2,-.12,-.06,-.03,.03,.06,.12,.2,.32];for(let M=0;M<2;M++){let v=!1;for(let D of F){let N=m(f,D),[V,K]=c(i,N,h);if(!z(V,K))continue;let W=An(t,i,r,V,K,s),[H,et]=c(W,N,h);if(!z(H,et))continue;let rt=j(W,H,et);rt.err<L.err-.003&&(f=N,i=W,X=H,B=et,L=rt,v=!0)}for(let D of d){let N=m(h,D),[V,K]=c(i,f,N);if(!z(V,K))continue;let W=An(t,i,r,V,K,s),[H,et]=c(W,f,N);if(!z(H,et))continue;let rt=j(W,H,et);rt.err<L.err-.003&&(h=N,i=W,X=H,B=et,L=rt,v=!0)}if(!v||L.err<=.14)break}}return{P0:r,P1:X,P2:B,P3:s,err:L.err,sse:L.sse,at:L.at,tL:f,tR:h,pts:t,lockL:!!e,lockR:!!a}}function po(t,e,a=0,l=null,n=null,r=!1){let s=t.length;if(s<2)return[];if(s===2){let[p,x]=t,w=x[0]-p[0],y=x[1]-p[1],G=Math.hypot(w,y)||1;return[{P0:p,P1:[p[0]+w/3,p[1]+y/3],P2:[p[0]+2*w/3,p[1]+2*y/3],P3:x,isLine:r,tL:[w/G,y/G],tR:[-w/G,-y/G],pts:t,lockL:!!l,lockR:!!n}]}let i=Ln(t,l,n,r);if(!i)return[];let u=Math.hypot(t[s-1][0]-t[0][0],t[s-1][1]-t[0][1])>12&&s>10?1.18:1.06,b=(a===0?Math.max(e*1.45,.32):a===1?Math.max(e*1.28,.28):Math.max(e*1.15,.24))*u;if(i.err<=b||a>=5||s<=6)return[i];let C=St(i.at,2,s-2),T=St(Math.round(Math.min(C,s-1-C)*.45),8,28),I=Aa(t,C,T);return[...po(t.slice(0,C+1),e,a+1,l,[-I[0],-I[1]],!1),...po(t.slice(C),e,a+1,I,n,!1)]}function La(t,e){let a=t.length;if(a<2)return t;for(let l=0;l<a;l++){if(e&&e[l])continue;let n=t[l],r=t[(l+1)%a];if(n.isLine&&r.isLine)continue;let s=n.P3;if(n.isLine&&!r.isLine){let P=n.P3[0]-n.P0[0],c=n.P3[1]-n.P0[1],E=Math.hypot(P,c),q=Math.hypot(r.P1[0]-s[0],r.P1[1]-s[1]);if(E>1e-4&&q>1e-4){let Q=P/E,tt=c/E;(r.P1[0]-s[0])*Q+(r.P1[1]-s[1])*tt>.65*q&&(r.P1=[s[0]+Q*q,s[1]+tt*q])}continue}if(!n.isLine&&r.isLine){let P=r.P3[0]-r.P0[0],c=r.P3[1]-r.P0[1],E=Math.hypot(P,c),q=Math.hypot(s[0]-n.P2[0],s[1]-n.P2[1]);if(E>1e-4&&q>1e-4){let Q=P/E,tt=c/E;(s[0]-n.P2[0])*Q+(s[1]-n.P2[1])*tt>.65*q&&(n.P2=[s[0]-Q*q,s[1]-tt*q])}continue}let i=s[0]-n.P2[0],_=s[1]-n.P2[1],u=r.P1[0]-s[0],b=r.P1[1]-s[1],C=Math.hypot(i,_),T=Math.hypot(u,b);if(C<1e-4||T<1e-4)continue;let I=Math.hypot(n.P3[0]-n.P0[0],n.P3[1]-n.P0[1])||1,p=Math.hypot(r.P3[0]-r.P0[0],r.P3[1]-r.P0[1])||1,x=i/C,w=_/C,y=u/T,G=b/T;if(x*y+w*G<.55)continue;let $=Math.sqrt(I),k=Math.sqrt(p),O=x*$+y*k,S=w*$+G*k,R=Math.hypot(O,S);if(R<1e-4)continue;let g=O/R,f=S/R,o=[s[0]-g*C,s[1]-f*C],h=[s[0]+g*T,s[1]+f*T],A=Math.min(.85,I*.08),U=Math.min(.85,p*.08);Math.hypot(o[0]-n.P2[0],o[1]-n.P2[1])<=A&&(n.P2=o),Math.hypot(h[0]-r.P1[0],h[1]-r.P1[1])<=U&&(r.P1=h)}return t}function Jn(t,e,a={}){let{pts:l,corners:n,smoothKnots:r,knotTangents:s,juncFlags:i}=t,_=l.length;if(_<3)return[];let u=i&&i.some(o=>o===1);if(t.isTrueCircle||!u&&_>=8){let o=t.circleFit||Te(l);if(o&&o.r>=(t.isTrueCircle?1.1:1.85)){let h=0,A=0,U=1/0,P=-1/0,c=1/0,E=-1/0;for(let B=0;B<_;B++){let L=l[B],m=l[(B+1)%_];L[0]<U&&(U=L[0]),L[0]>P&&(P=L[0]),L[1]<c&&(c=L[1]),L[1]>E&&(E=L[1]);let F=Math.abs(Math.hypot(L[0]-o.cx,L[1]-o.cy)-o.r);F>h&&(h=F),A+=L[0]*m[1]-m[0]*L[1]}let Q=Math.abs(A)*.5/(Math.PI*o.r*o.r),tt=P-U,j=E-c,z=tt>0&&j>0?tt/j:0,X=o.rms!=null?o.rms:0;if(t.isTrueCircle||z>=.88&&z<=1.13&&Q>=.91&&Q<=1.09&&X<=Math.max(.32,o.r*.025)&&h<=Math.max(.75,o.r*.055)){let B=o.cx,L=o.cy,m=o.r,F=A>=0?1:-1,d=[];if(i)for(let D=0;D<_;D++)i[D]&&d.push(D);if(d.length===0){let D=.552284749831*m,N=[B,L-m],V=[B+F*m,L],K=[B,L+m],W=[B-F*m,L];return[{P0:N,P1:[B+F*D,L-m],P2:[B+F*m,L-D],P3:V,isLine:!1,isTrueCircleArc:!0,tL:[F,0],tR:[0,-1],startSharp:!1,endSharp:!1,spanIdx:0},{P0:V,P1:[B+F*m,L+D],P2:[B+F*D,L+m],P3:K,isLine:!1,isTrueCircleArc:!0,tL:[0,1],tR:[F,0],startSharp:!1,endSharp:!1,spanIdx:0},{P0:K,P1:[B-F*D,L+m],P2:[B-F*m,L+D],P3:W,isLine:!1,isTrueCircleArc:!0,tL:[-F,0],tR:[0,1],startSharp:!1,endSharp:!1,spanIdx:0},{P0:W,P1:[B-F*m,L-D],P2:[B-F*D,L-m],P3:N,isLine:!1,isTrueCircleArc:!0,tL:[0,-1],tR:[-F,0],startSharp:!1,endSharp:!1,spanIdx:0}]}let M=[],v=d.length;for(let D=0;D<v;D++){let N=d[D],V=d[(D+1)%v],K=l[N],W=l[V],H=Math.atan2(K[1]-L,K[0]-B),et=Math.atan2(W[1]-L,W[0]-B),rt=(et-H)*F;for(;rt<=1e-5;)rt+=2*Math.PI;for(;rt>2*Math.PI+1e-5;)rt-=2*Math.PI;let dt=Math.max(1,Math.ceil(rt/(Math.PI*.52))),Y=rt/dt*F,Z=4/3*Math.tan(Math.abs(Y)*.25)*m;for(let ot=0;ot<dt;ot++){let xt=H+ot*Y,At=ot===dt-1?et:H+(ot+1)*Y,st=ot===0?[K[0],K[1]]:[B+m*Math.cos(xt),L+m*Math.sin(xt)],at=ot===dt-1?[W[0],W[1]]:[B+m*Math.cos(At),L+m*Math.sin(At)],ft=-F*Math.sin(xt),J=F*Math.cos(xt),ut=-F*Math.sin(At),mt=F*Math.cos(At),it=[st[0]+Z*ft,st[1]+Z*J],nt=[at[0]-Z*ut,at[1]-Z*mt];M.push({P0:st,P1:it,P2:nt,P3:at,isLine:!1,isTrueCircleArc:!0,tL:[ft,J],tR:[-ut,-mt],startSharp:!1,endSharp:!1,spanIdx:D})}}return M}}}let b=(a.lineStraighten??56)/100,C=a.extremumAlign!==!1,T=[];if(i)for(let o=0;o<_;o++)i[o]&&T.push(o);let I=o=>{if(T.length===0)return 0;for(let h=T.length-1;h>=0;h--)if(o>=T[h])return h;return 0},p=[];for(let o=0;o<_;o++){let h=i?i[o]:0,A=h===1,U=h===2&&!(n&&n[o]);if(n&&n[o]||A)p.push({i:o,sharp:!0,isJunc:h>0,extremum:!1});else if(r&&r[o]||U){let P=s&&s.get(o),c=P||ln(l,o,7);!P&&C&&(Math.abs(c[1])<.045?c=[c[0]<0?-1:1,0]:Math.abs(c[0])<.045&&(c=[0,c[1]<0?-1:1])),p.push({i:o,sharp:!1,isJunc:h>0,extremum:!U&&!!P,t:c,locked:!!P||U})}}if(p.length===0){let o=0,h=0,A=0,U=0;for(let E=1;E<_;E++)l[E][0]<l[o][0]&&(o=E),l[E][0]>l[h][0]&&(h=E),l[E][1]<l[A][1]&&(A=E),l[E][1]>l[U][1]&&(U=E);let P=[o,h,A,U].sort((E,q)=>E-q),c=[];for(let E of P)(!c.length||E-c[c.length-1]>=_/12&&_-E+c[0]>=_/12)&&c.push(E);c.length<2&&c.push((c[0]+(_>>1))%_),p=c.map(E=>{let q=ln(l,E,7);return C&&(Math.abs(q[1])<.045?q=[q[0]<0?-1:1,0]:Math.abs(q[0])<.045&&(q=[0,q[1]<0?-1:1])),{i:E,sharp:!1,isJunc:!1,extremum:!0,t:q,locked:!1}})}else if(p.length===1){let o=(p[0].i+(_>>1))%_;p.push({i:o,sharp:!1,isJunc:!1,extremum:!0,t:ln(l,o,7)}),p.sort((h,A)=>h.i-A.i)}let x=[],w=[],y=[];for(let o=0;o<p.length;o++){let h=p[o],A=p[(o+1)%p.length],U=I(h.i),P=[];for(let X=h.i;P.push(l[X]),!(X===A.i&&P.length>1||P.length>_+2);X=(X+1)%_);if(P.length<2)continue;let c=P[0],E=P[P.length-1],q=Math.hypot(E[0]-c[0],E[1]-c[1]);if(q>1e-6){let X=(E[0]-c[0])/q,B=(E[1]-c[1])/q,L=0,m=0,F=0;for(let H=1;H<P.length-1;H++){let et=(P[H][0]-c[0])*B-(P[H][1]-c[1])*X,rt=Math.abs(et);rt>L&&(L=rt),m+=et,F+=rt}let d=F>1e-5&&Math.abs(m)/F>=.6&&L>.2,M=(h.i+Math.floor((A.i-h.i+_)%_*.5))%_,v=!!(t.straightSpanFlags&&t.straightSpanFlags[M])&&!d,D=Math.min(Math.abs(X),Math.abs(B))<=.12,N=h.sharp&&A.sharp,V=v?Math.max(D?.42:.28+b*.16,e*1.05):N&&q>=3.5&&!d?Math.min(.24,Math.max(.16,e*.85)):.075,K=h.sharp||!h.t||Math.abs(h.t[0]*B-h.t[1]*X)<=.16,W=A.sharp||!A.t||Math.abs(A.t[0]*B-A.t[1]*X)<=.16;if(L<=V&&K&&W){x.push({P0:c,P1:[c[0]+(E[0]-c[0])/3,c[1]+(E[1]-c[1])/3],P2:[c[0]+2*(E[0]-c[0])/3,c[1]+2*(E[1]-c[1])/3],P3:E,isLine:!0,tL:[X,B],tR:[-X,-B],startSharp:h.sharp,endSharp:A.sharp,spanIdx:U}),w.push(A.sharp),y.push(A.extremum);continue}}if(P.length>=10&&q>=8){let X=Te(P),B=be(P);if(X&&X.r>=5*(e/.18)&&X.r<=600&&X.rms<=Math.max(.24,e*1.25)&&(!B||X.rms<B.rms*.48)){let L=0;for(let V=0;V<P.length;V++){let K=Math.abs(Math.hypot(P[V][0]-X.cx,P[V][1]-X.cy)-X.r);K>L&&(L=K)}let m=Math.atan2(c[1]-X.cy,c[0]-X.cx),F=Math.atan2(E[1]-X.cy,E[0]-X.cx),d=P[P.length>>1],M=Math.atan2(d[1]-X.cy,d[0]-X.cx),v=Math.atan2(Math.sin(F-m),Math.cos(F-m)),D=Math.atan2(Math.sin(M-m),Math.cos(M-m));v*D<0&&(v+=v>0?-2*Math.PI:2*Math.PI);let N=Math.abs(v);if(L<=Math.max(.55,e*2.6)&&N>=.42&&N<=Math.PI*1.65){let V=v>=0?1:-1,K=Math.max(1,Math.ceil(N/(Math.PI*.52))),W=v/K,H=X.r,et=4/3*Math.tan(Math.abs(W)*.25)*H;for(let rt=0;rt<K;rt++){let dt=m+rt*W,Y=rt===K-1?F:m+(rt+1)*W,Z=rt===0?[c[0],c[1]]:[X.cx+H*Math.cos(dt),X.cy+H*Math.sin(dt)],ot=rt===K-1?[E[0],E[1]]:[X.cx+H*Math.cos(Y),X.cy+H*Math.sin(Y)],xt=-V*Math.sin(dt),At=V*Math.cos(dt),st=-V*Math.sin(Y),at=V*Math.cos(Y),ft=[Z[0]+et*xt,Z[1]+et*At],J=[ot[0]-et*st,ot[1]-et*at];x.push({P0:Z,P1:ft,P2:J,P3:ot,isLine:!1,isTrueCircleArc:!0,tL:[xt,At],tR:[-st,-at],startSharp:rt===0?h.sharp:!1,endSharp:rt===K-1?A.sharp:!1,spanIdx:U}),w.push(rt===K-1?A.sharp:!1),y.push(!1)}continue}}}let Q=h.sharp?null:h.t,tt=A.sharp?null:A.t,j=tt?[-tt[0],-tt[1]]:null,z=po(P,e,0,Q,j,h.sharp&&A.sharp);for(let X=0;X<z.length;X++){let B=z[X];B.startSharp=X===0?h.sharp:!1,B.endSharp=X===z.length-1?A.sharp:!1,B.spanIdx=U,x.push(B),w.push(X===z.length-1?A.sharp:!1),y.push(X===z.length-1?A.extremum:!1)}}if(b>.15)for(let o=0;o<x.length;o++){let h=x[o];if(h.isLine)continue;let A=!!(h.startSharp&&h.endSharp),U=h.P3[0]-h.P0[0],P=h.P3[1]-h.P0[1],c=Math.hypot(U,P);if(c<2)continue;let E=U/c,q=P/c,Q=(h.P1[0]-h.P0[0])*q-(h.P1[1]-h.P0[1])*E,tt=(h.P2[0]-h.P0[0])*q-(h.P2[1]-h.P0[1])*E,j=Math.max(Math.abs(Q),Math.abs(tt)),z=h.pts&&h.pts.length>=4?h.pts.reduce((L,m)=>Math.max(L,Math.abs((m[0]-h.P0[0])*q-(m[1]-h.P0[1])*E)),0):j,X=!!(t.straightSpanFlags&&h.pts&&h.pts.length>=2);(A?c>=8&&z<=Math.min(.18,e*.75)&&j<=Math.max(.2,e*.72):X&&c>=14&&z<=Math.min(.12,e*.6)&&j<=Math.max(.24,c*.012))&&(h.P1=[h.P0[0]+U/3,h.P0[1]+P/3],h.P2=[h.P0[0]+2*U/3,h.P0[1]+2*P/3],h.isLine=!0,h.tL=[E,q],h.tR=[-E,-q])}let G=(o,h)=>{let A=[];for(let U=h;U<=16;U++)A.push(vn(o.P0,o.P1,o.P2,o.P3,U/16));return A},$=(o,h)=>o.pts&&h.pts&&o.pts.length>=2&&h.pts.length>=2?o.pts.concat(h.pts.slice(1)):G(o,0).concat(G(h,1)),k=(o,h,A,U,P,c=null)=>{let E=h[0]-o[0],q=h[1]-o[1],Q=Math.hypot(E,q)||1,tt=E/Q,j=q/Q;return{P0:[o[0],o[1]],P1:[o[0]+E/3,o[1]+q/3],P2:[o[0]+2*E/3,o[1]+2*q/3],P3:[h[0],h[1]],err:0,sse:0,isLine:!0,tL:[tt,j],tR:[-tt,-j],startSharp:!!A,endSharp:!!U,spanIdx:P,pts:c||[o,h],lockL:!0,lockR:!0}},O=(o,h,A)=>{let U=A[0]-h[0],P=A[1]-h[1],c=Math.hypot(U,P);if(c<1e-6)return 0;let E=U/c,q=P/c,Q=0;for(let tt=0;tt<o.length;tt++){let j=Math.abs((o[tt][0]-h[0])*q-(o[tt][1]-h[1])*E);j>Q&&(Q=j)}return Q},S=e*e*4.5,R=Math.max(.28+b*.2,e*1.05),g=!0,f=0;for(;g&&f++<8&&x.length>2;){g=!1;let o=[],h=[],A=[];for(let U=0;U<x.length;U++){if(U===x.length-1||x[U].spanIdx!==x[U+1].spanIdx){o.push(x[U]),h.push(w[U]),A.push(y[U]);continue}let P=x[U],c=x[U+1],E=Math.hypot(P.P3[0]-P.P0[0],P.P3[1]-P.P0[1]),q=Math.hypot(c.P3[0]-c.P0[0],c.P3[1]-c.P0[1]),Q=$(P,c),tt=O(Q,P.P0,c.P3);if(P.isLine&&c.isLine&&!w[U]&&tt<=R||!w[U]&&(P.isLine||c.isLine)&&Math.min(E,q)<2.2&&tt<=.14){o.push(k(P.P0,c.P3,P.startSharp,c.endSharp,P.spanIdx,Q)),h.push(w[U+1]),A.push(y[U+1]),U++,g=!0;continue}if(w[U]){o.push(P),h.push(w[U]),A.push(y[U]);continue}if(P.isLine!==c.isLine){if(Math.min(E,q)<Math.max(3.2,e*7)){let L=Ln(Q,P.isLine?null:P.lockL?P.tL:null,c.isLine?null:c.lockR?c.tR:null,!1);if(L&&L.err<=e*1.15){L.startSharp=P.startSharp,L.endSharp=c.endSharp,L.spanIdx=P.spanIdx,o.push(L),h.push(w[U+1]),A.push(y[U+1]),U++,g=!0;continue}}o.push(P),h.push(w[U]),A.push(y[U]);continue}let z=Math.acos(St(-(P.tL[0]*c.tR[0]+P.tL[1]*c.tR[1]),-1,1)),B=!(y[U]&&(P.lockR||c.lockL)&&z>=.65)&&(!y[U]||z<1.15&&Math.min(E,q)<7.5);if(z<1.95&&B){let L=!y[U]&&Math.min(E,q)>=35&&z<.25,m=!P.startSharp&&P.lockL&&!L?P.tL:null,F=!c.endSharp&&c.lockR&&!L?c.tR:null,d=Ln(Q,m,F,!1),M=y[U]?e*.78:Math.max(e*1.45,.34),v=(P.sse||0)+(c.sse||0)+2*S,D=(d?d.sse||0:1/0)+S;if(d&&d.err<=M&&(D<=v*1.35||!y[U]&&d.err<=M)){d.startSharp=P.startSharp,d.endSharp=c.endSharp,d.spanIdx=P.spanIdx,d.lockL=P.lockL,d.lockR=c.lockR,o.push(d),h.push(w[U+1]),A.push(y[U+1]),U++,g=!0;continue}}o.push(P),h.push(w[U]),A.push(y[U])}x=o,w=h,y=A}if(x.length>3){let o=x.length-1,h=x[o],A=x[0];if(h.spanIdx===A.spanIdx){let U=Math.hypot(h.P3[0]-h.P0[0],h.P3[1]-h.P0[1]),P=Math.hypot(A.P3[0]-A.P0[0],A.P3[1]-A.P0[1]),c=$(h,A),E=O(c,h.P0,A.P3);if(h.isLine&&A.isLine&&(!w[o]||Math.min(U,P)<2.5)&&E<=R||!w[o]&&(h.isLine||A.isLine)&&Math.min(U,P)<2.2&&E<=.14)x[0]=k(h.P0,A.P3,h.startSharp,A.endSharp,h.spanIdx,c),x.pop(),w.pop(),y.pop();else if(!w[o]&&!h.isLine&&!A.isLine&&x.length>4){let Q=Math.acos(St(-(h.tL[0]*A.tR[0]+h.tL[1]*A.tR[1]),-1,1)),tt=!y[o]||Q<1.55&&Math.min(U,P)<10;if(Q<1.95&&tt){let j=!h.startSharp&&h.lockL?h.tL:null,z=!A.endSharp&&A.lockR?A.tR:null,X=Ln(c,j,z,!1);X&&X.err<=(y[o]?e*.72:Math.max(e*1.18,.25))&&(X.startSharp=h.startSharp,X.endSharp=A.endSharp,X.spanIdx=h.spanIdx,X.lockL=h.lockL,X.lockR=A.lockR,x[0]=X,x.pop(),w.pop(),y.pop())}}}}La(x,w);for(let o=0;o<x.length;o++)x[o].endSharp=!!w[o],x[o].startSharp=!!w[(o-1+x.length)%x.length];return x}function $o(t){return t.slice().reverse().map(e=>({P0:[e.P3[0],e.P3[1]],P1:[e.P2[0],e.P2[1]],P2:[e.P1[0],e.P1[1]],P3:[e.P0[0],e.P0[1]],isLine:!!e.isLine,isTrueCircleArc:!!e.isTrueCircleArc,tL:e.tR?[e.tR[0],e.tR[1]]:null,tR:e.tL?[e.tL[0],e.tL[1]]:null,startSharp:!!e.endSharp,endSharp:!!e.startSharp,spanIdx:e.spanIdx}))}function Sa(t,e){let a=Math.min(t.length,e.length);for(let l=0;l<a;l++)if(t[l]!==e[l])return t[l]-e[l];return t.length-e.length}function mo(t,e){if(!t||!e||t.length!==e.length)return t;let a=new Map,l=new Map,n=t.map((r,s)=>s).sort((r,s)=>{let i=t[r]&&t[r].isTrueCircle?1:0,_=t[s]&&t[s].isTrueCircle?1:0;if(i!==_)return _-i;if(i===1&&_===1)return Math.abs(t[r].area||0)-Math.abs(t[s].area||0);let u=Math.abs(t[s].area||0)-Math.abs(t[r].area||0);return Math.abs(u)>.01?u:(t[s].area||0)-(t[r].area||0)});for(let r of n){let s=t[r],i=e[r];if(!s||!s.segs||!s.segs.length||!i||!i.vkeys||i.vkeys.length<3)continue;let _=i.vkeys,u=i.juncFlags,b=_.length,C=[];if(u)for(let T=0;T<b;T++)u[T]&&C.push(T);if(C.length===0){let T=_,I=[_[0],..._.slice(1).reverse()],p=Sa(T,I)<=0,x=(p?T:I).join(","),w=a.get(x);if(!w)a.set(x,{segs:s.segs,pts:s.pts||s.scaledPts,isFwd:p});else{let y=w.isFwd===p?w.segs.map(G=>({...G})):$o(w.segs);if(s.segs=y,w.pts){let G=w.isFwd===p?w.pts.slice():[w.pts[0],...w.pts.slice(1).reverse()];s.pts&&(s.pts=G),s.scaledPts&&(s.scaledPts=G)}s.d=gn(s.segs,!0)}}else{let T=C.length,I=Array.from({length:T},()=>[]);for(let w of s.segs){let y=St(w.spanIdx||0,0,T-1);I[y].push(w)}let p=!1,x=[];for(let w=0;w<T;w++){let y=I[w];if(!y.length)continue;let G=C[w],$=C[(w+1)%T],k=[];for(let U=G;k.push(_[U]),!(U===$&&k.length>1||k.length>b+2);U=(U+1)%b);let O=k.slice().reverse(),S=Sa(k,O)<=0,R=(S?k:O).join(","),g=y.length===1&&!!y[0].isLine,f=y.every(U=>U.isTrueCircleArc),o=b<=600&&Math.abs(s.area||0)>=16?1.5:0,h=(s.isTrueCircle?6:0)+(f?4.5:0)+(g?3.5:0)+o+(u[G]===2?1:0)+(u[$]===2?1:0)-y.length*.05,A=l.get(R);if(!A)l.set(R,{segs:y,isFwd:S,priority:h,ownerIdx:r,spanSlot:w}),x.push(...y);else if(h>A.priority+1e-4){let U=t[A.ownerIdx];if(U&&U.segs){let P=A.isFwd===S?y.map(q=>({...q,spanIdx:A.spanSlot})):$o(y).map(q=>({...q,spanIdx:A.spanSlot})),c=[],E=!1;for(let q of U.segs)(q.spanIdx||0)===A.spanSlot?(E||(P[0].P0=[q.P0[0],q.P0[1]],c.push(...P),E=!0),c[c.length-1].P3=[q.P3[0],q.P3[1]]):c.push(q);E&&(U.segs=c,U.d=gn(U.segs,!0))}l.set(R,{segs:y,isFwd:S,priority:h,ownerIdx:r,spanSlot:w}),x.push(...y)}else{let U=A.isFwd===S?A.segs.map(P=>({...P,spanIdx:w})):$o(A.segs).map(P=>({...P,spanIdx:w}));U[0].P0=[y[0].P0[0],y[0].P0[1]],U[U.length-1].P3=[y[y.length-1].P3[0],y[y.length-1].P3[1]],x.push(...U),p=!0}}p&&x.length&&(s.segs=x,s.d=gn(s.segs,!0))}}return t}function fe(t){return Math.round(t*100)/100}function gn(t,e){if(!t.length)return"";let a=`M${fe(t[0].P0[0])} ${fe(t[0].P0[1])}`;for(let l of t)l.isLine?a+=`L${fe(l.P3[0])} ${fe(l.P3[1])}`:a+=`C${fe(l.P1[0])} ${fe(l.P1[1])} ${fe(l.P2[0])} ${fe(l.P2[1])} ${fe(l.P3[0])} ${fe(l.P3[1])}`;return e?a+"Z":a}function Xo(t,e,a){let l=!1;for(let n=0,r=a.length-1;n<a.length;r=n++){let s=a[n][0],i=a[n][1],_=a[r][0],u=a[r][1];i>e!=u>e&&t<(_-s)*(e-i)/(u-i)+s&&(l=!l)}return l}function Wo(t){if(!t||t.length<3)return 0;let e=0;for(let a=0,l=t.length;a<l;a++){let n=t[a],r=t[(a+1)%l];e+=n[0]*r[1]-r[0]*n[1]}return e*.5}function Pa(t,e,a,l){if(!t||t.length<e*a*4)return[];let n=new Float32Array(a);for(let s=Math.floor(a*.14);s<Math.floor(a*.88);s++){let i=0,_=0,u=0,b=0,C=0;for(let T=4;T<e-4;T+=2){let I=(s-2)*e+T,p=(s+2)*e+T;if(l&&(l[I]||l[p]))continue;let x=I*4,w=p*4,y=Math.hypot(t[x]-t[w],t[x+1]-t[w+1],t[x+2]-t[w+2]),G=(s-5)*e+T,$=(s+5)*e+T,k=Math.hypot(t[G*4]-t[x],t[G*4+1]-t[x+1],t[G*4+2]-t[x+2]),O=Math.hypot(t[w]-t[$*4],t[w+1]-t[$*4+1],t[w+2]-t[$*4+2]);y>=9.5&&y>Math.max(k,O)*1.75?(_++,_>u&&(u=_),(T<e*.12||T>e*.88)&&C++):_=0,i+=y,b++}b>0&&u>=e/2*.25&&C>=8&&(n[s]=i/b)}let r=[];for(let s=24;s<a-24;s++){if(n[s]<7.5)continue;let i=!0;for(let _=-20;_<=20;_++)if(_!==0&&n[s+_]>n[s]){i=!1;break}i&&r.push(s)}return r}function Ca(t,e,a,l,n,r,s=null){let i=l&&l.rawRgba&&l.rawRgba.length===e*a*4?l.rawRgba:l&&l.data?l.data.data:null;if(!i||!r)return 0;let _=e*a,u=new Float32Array(_);for(let A=0;A<_;A++){let U=A*4;u[A]=.299*i[U]+.587*i[U+1]+.114*i[U+2]}let b=6,C=new Uint8Array(_),T=[[-6,0],[6,0],[0,-6],[0,6],[-4,-4],[4,-4],[-4,4],[4,4]],I=s&&s.length?Math.max(b+10,s[0]-24):a-b;for(let A=b;A<I;A++){let U=A*e;for(let P=b;P<e-b;P++){let c=U+P;if(n&&n[c])continue;let E=u[c];if(E<68)continue;let q=!0;for(let z=-1;z<=1&&q;z++)for(let X=-1;X<=1;X++)if(u[(A+z)*e+(P+X)]>E+2){q=!1;break}if(!q)continue;let Q=0,tt=0;for(let[z,X]of T){let B=u[(A+X)*e+(P+z)];B>Q&&(Q=B),tt+=B}let j=tt*.125;if(E-j>=25&&E-Q>=16){let z=t[c];if(z>=0&&r[z]){let L=.299*r[z].r+.587*r[z].g+.114*r[z].b;if(L>=150&&Math.abs(E-L)<=22)continue}let X=Math.min(E-u[U+P-4],E-u[U+P+4]),B=Math.min(E-u[(A-4)*e+P],E-u[(A+4)*e+P]);X>=15&&B>=15&&(C[c]=1)}}}for(let A=b;A<I;A++){let U=A*e;for(let P=b;P<e-b;P++){let c=U+P;if(C[c]!==1)continue;let E=(u[(A-b)*e+P]+u[(A+b)*e+P]+u[U+P-b]+u[U+P+b])*.25;for(let q=-2;q<=2;q++)for(let Q=-2;Q<=2;Q++){let tt=(A+q)*e+(P+Q);!C[tt]&&u[tt]-E>=14&&(C[tt]=2)}}}let p=new Uint8Array(_),x=new Int32Array(_),w=[],y=0,G=0,$=0,k=0;for(let A=0;A<_;A++){if(!C[A]||p[A])continue;let U=0,P=0;x[P++]=A,p[A]=1;let c=e,E=0,q=a,Q=0,tt=0,j=0,z=0;for(;U<P;){let L=x[U++],m=L%e,F=L/e|0;m<c&&(c=m),m>E&&(E=m),F<q&&(q=F),F>Q&&(Q=F);let d=L*4;tt+=i[d],j+=i[d+1],z+=i[d+2];let M=[m>0?L-1:-1,m<e-1?L+1:-1,F>0?L-e:-1,F<a-1?L+e:-1];for(let v of M)v>=0&&C[v]&&!p[v]&&(p[v]=1,x[P++]=v)}let X=E-c+1,B=Q-q+1;P>=2&&P<=64&&X<=10&&B<=10&&(w.push(Int32Array.from(x.subarray(0,P))),y+=tt,G+=j,$+=z,k+=P)}if(!w.length)return 0;let O=Math.min(255,Math.round(y/k*1.18)),S=Math.min(255,Math.round(G/k*1.18)),R=Math.min(255,Math.round($/k*1.14)),[g,f,o]=de(O,S,R),h=r.length;r.push({r:O,g:S,b:R,L:g,a:f,b2:o,hex:_e(O,S,R),verifiedPlateau:!0,isPointHighlight:!0});for(let A of w)for(let U=0;U<A.length;U++)t[A[U]]=h;return w.length}function Za(t){if(!t||!t.stops||t.stops.length<2)return null;let e=t.stops.map(l=>`${l.color} ${Math.round(St(l.offset??0,0,1)*100)}%`).join(", ");if(t.type==="radial")return`radial-gradient(circle at 38% 38%, ${e})`;let a=t.angleDeg;if(a==null&&t.x1!=null&&t.x2!=null&&t.y1!=null&&t.y2!=null){let l=t.x2-t.x1,n=t.y2-t.y1;Math.hypot(l,n)>.001&&(a=Math.round(Math.atan2(n,l)*180/Math.PI+90),a=(a%360+360)%360)}return a==null&&(a=135),`linear-gradient(${a}deg, ${e})`}function Zn(t,e,a,l,n,r,s=null,i=null,_={}){if(!t||!r||!r.length)return t;let u=e*a,b=l&&l.rawRgba&&l.rawRgba.length===u*4?l.rawRgba:l&&l.data?l.data.data:null,C=()=>{let I=r.length,p=new Int32Array(I);for(let y=0;y<u;y++){let G=t[y];G>=0&&G<I&&!(n&&n[y])&&p[G]++}let x=new Int32Array(I).fill(-1),w=[];for(let y=0;y<I;y++)if(p[y]>0){x[y]=w.length;let G=r[y];if(G.L==null){let[$,k,O]=de(G.r,G.g,G.b);G.L=$,G.a=k,G.b2=O}G.popCount=p[y],w.push(G)}!w.length&&r.length&&(x[0]=0,w.push(r[0]));for(let y=0;y<u;y++){let G=t[y];if(G>=0&&G<I){let $=x[G];t[y]=$>=0?$:0}}r.length=0;for(let y of w)r.push(y)};if(C(),b&&r.length>2){let I=s?s.mag:null,p=r.length,x=new Float64Array(p),w=new Float64Array(p),y=new Float64Array(p),G=new Int32Array(p);for(let k=0;k<u;k++){if(n&&n[k])continue;let O=t[k];if(O<0||O>=p||I&&I[k]>3.8)continue;let S=k*4;x[O]+=b[S],w[O]+=b[S+1],y[O]+=b[S+2],G[O]++}for(let k=0;k<p;k++)if(G[k]>=24&&!r[k].userGrad){let O=Math.round(x[k]/G[k]),S=Math.round(w[k]/G[k]),R=Math.round(y[k]/G[k]),[g,f,o]=de(O,S,R);r[k].r=O,r[k].g=S,r[k].b=R,r[k].L=g,r[k].a=f,r[k].b2=o,r[k].hex=_e(O,S,R)}let $=!0;for(;$&&r.length>2;){$=!1;let k=r.length;for(let O=0;O<k&&!$;O++)for(let S=O+1;S<k&&!$;S++){let R=r[O],g=r[S];if(R.userGrad||g.userGrad)continue;let f=De(R.L,R.a,R.b2,g.L,g.a,g.b2),o=Math.hypot(R.r-g.r,R.g-g.g,R.b-g.b),h=e*a<=15e4,A=Math.hypot(R.a,R.b2),U=Math.hypot(g.a,g.b2),P=A>=14&&U>=14&&(R.a*g.a+R.b2*g.b2)/(A*U)>=.94,c=h?3.4:P&&(Math.abs(R.L-g.L)<=4.8||Math.min(A,U)>=48)?4.68:3.65,E=h?21:Math.min(R.L,g.L)>=52||Math.min(A,U)>=50?23.5:16;if(f<=c||o<=E){let q=(R.popCount||1)>=(g.popCount||1)?O:S,Q=q===O?S:O,tt=r[q],j=r[Q],z=tt.popCount||1,X=j.popCount||1,B=z+X;tt.r=Math.round((tt.r*z+j.r*X)/B),tt.g=Math.round((tt.g*z+j.g*X)/B),tt.b=Math.round((tt.b*z+j.b*X)/B);let[L,m,F]=de(tt.r,tt.g,tt.b);tt.L=L,tt.a=m,tt.b2=F,tt.hex=_e(tt.r,tt.g,tt.b),tt.popCount=B;for(let d=0;d<u;d++)t[d]===Q&&(t[d]=q);C(),$=!0}}}}let T=_.maxColorEnabled&&_.maxColors>=2?Math.max(2,Math.round(_.maxColors)):0;if(T>0&&r.length>T)for(;r.length>T;){let I=r.length,p=new Int32Array(I*I);for(let o=0;o<a;o++){let h=o*e;for(let A=0;A<e;A++){let U=h+A,P=t[U];if(!(P<0)){if(A+1<e){let c=t[U+1];c>=0&&c!==P&&(p[P*I+c]++,p[c*I+P]++)}if(o+1<a){let c=t[U+e];c>=0&&c!==P&&(p[P*I+c]++,p[c*I+P]++)}}}}let x=-1,w=-1,y=1/0;for(let o=0;o<I;o++)for(let h=o+1;h<I;h++){let A=r[o],U=r[h],P=De(A.L,A.a,A.b2,U.L,U.a,U.b2),c=A.popCount||1,E=U.popCount||1,q=Math.min(c,E),tt=p[o*I+h]===0?.72:1,j=A.isGradientSuperRegion&&U.isGradientSuperRegion?.78:1,z=1+.24*Math.log(1+q/Math.max(12,u*5e-4)),X=(P+1.2)*z*tt*j;X<y&&(y=X,c<=E?(x=o,w=h):(x=h,w=o))}if(x<0||w<0)break;let G=r[x],$=r[w],k=G.popCount||1,O=$.popCount||1,S=k+O;$.r=Math.round(($.r*O+G.r*k)/S),$.g=Math.round(($.g*O+G.g*k)/S),$.b=Math.round(($.b*O+G.b*k)/S);let[R,g,f]=de($.r,$.g,$.b);$.L=R,$.a=g,$.b2=f,$.hex=_e($.r,$.g,$.b),$.popCount=S,G.isGradientSuperRegion&&($.isGradientSuperRegion=!0),G.userGrad&&!$.userGrad&&($.userGrad=G.userGrad);for(let o=0;o<u;o++)t[o]===x&&(t[o]=w);C()}if(_.attachGradients&&b){let I=r.length,p=new Int32Array(u).fill(-1),x=new Int32Array(u),w=new Array(I).fill(null);for(let y=0;y<u;y++){let G=t[y];if(G<0||G>=I||p[y]>=0||n&&n[y])continue;let $=0,k=0;for(x[k++]=y,p[y]=1;$<k;){let O=x[$++],S=O%e,R=O/e|0;S>0&&t[O-1]===G&&p[O-1]<0&&(p[O-1]=1,x[k++]=O-1),S<e-1&&t[O+1]===G&&p[O+1]<0&&(p[O+1]=1,x[k++]=O+1),R>0&&t[O-e]===G&&p[O-e]<0&&(p[O-e]=1,x[k++]=O-e),R<a-1&&t[O+e]===G&&p[O+e]<0&&(p[O+e]=1,x[k++]=O+e)}(!w[G]||k>w[G].length)&&(w[G]=Int32Array.from(x.subarray(0,k)))}for(let y=0;y<I;y++){let G=r[y];if(G.userGrad&&G.userGrad.stops&&G.userGrad.stops.length>=2){G.grad=G.userGrad,G.isGradient=!0;continue}let $=w[y];if($&&$.length>=36){let k=to($,e,a,b,1,e,a,s,G,{forceGradient:!!_.forceGradient});k&&k.stops&&k.stops.length>=2&&(G.grad=k,G.isGradient=!0,k.base&&(G.hex=k.base))}}}return t}function Ho(t,e,a,l,n,r,s,i,_={}){let u=_.gradientMode||"auto";if(u==="off")return Zn(t,e,a,l,n,r,s,i,{maxColorEnabled:_.maxColorEnabled,maxColors:_.maxColors,attachGradients:!1});let b=!!(_.forceGradient||u==="on"),C=!!(r&&r._hasSmoothGradient||l&&l._plateauAnalysis&&l._plateauAnalysis.hasSmoothGradient);if(!!!(b||u==="auto"&&C&&(!i||i.surfaceMode!=="flat"))||!r||r.length<2)return Zn(t,e,a,l,n,r,s,i,{maxColorEnabled:_.maxColorEnabled,maxColors:_.maxColors,attachGradients:!1});let I=e*a,p=l&&l.rawRgba&&l.rawRgba.length===I*4?l.rawRgba:l&&l.data?l.data.data:null,x=s?s.mag:null;if(!p||!x)return t;let w=Pa(p,e,a,n),y=new Set(w),G=(L,m)=>{let F=L/e|0,d=m/e|0,M=Math.max(F,d);if(y.has(M)||y.has(M-1)||y.has(M+1)){let v=L*4;if(.299*p[v]+.587*p[v+1]+.114*p[v+2]>=42)return!1}return!0},$=new Int32Array(I).fill(-1),k=[],O=new Int32Array(I);for(let L=0;L<I;L++){if(t[L]<0||n&&n[L]||$[L]>=0)continue;let m=k.length,F=t[L],d=0,M=0;O[M++]=L,$[L]=m;let v=e,D=0,N=a,V=0,K=0,W=0,H=0;for(;d<M;){let nt=O[d++],lt=nt%e,ht=nt/e|0;lt<v&&(v=lt),lt>D&&(D=lt),ht<N&&(N=ht),ht>V&&(V=ht);let gt=nt*4;K+=p[gt],W+=p[gt+1],H+=p[gt+2],lt>0&&t[nt-1]===F&&$[nt-1]<0&&($[nt-1]=m,O[M++]=nt-1),lt<e-1&&t[nt+1]===F&&$[nt+1]<0&&($[nt+1]=m,O[M++]=nt+1),ht>0&&t[nt-e]===F&&$[nt-e]<0&&G(nt,nt-e)&&($[nt-e]=m,O[M++]=nt-e),ht<a-1&&t[nt+e]===F&&$[nt+e]===-1&&G(nt,nt+e)&&($[nt+e]=m,O[M++]=nt+e)}let et=K/M,rt=W/M,dt=H/M,[Y,Z,ot]=de(et,rt,dt),xt=D-v+1,At=V-N+1,st=v<=5||D>=e-6,at=.5*(N+V),ft=!st&&D<e*.62&&N>a*.25&&V<a*.48&&Y>=41.2&&xt>At*1.15,J=ft?1:0,ut=0,mt=t._detailProt||null;if(mt)for(let nt=0;nt<M;nt++)mt[O[nt]]&&ut++;let it=ut/Math.max(1,M);k.push({cid:m,lab:F,area:M,bb:[v,N,D,V],bw:xt,bh:At,cy:at,touchesLR:st,isBeamBand:ft,beamTier:J,protFrac:it,r:et,g:rt,b:dt,L:Y,a:Z,b2:ot})}let S=new Map,R=Array.from({length:k.length},()=>[]);for(let L=1;L<a-1;L++)for(let m=1;m<e-1;m++){let F=L*e+m,d=$[F];if(!(d<0))for(let[M,v]of[[F+1,!0],[F+e,!1]]){let D=$[M];if(D>=0&&D!==d){let N=Math.max(x[F],x[M]);R[d].push(N),R[D].push(N);let V=d<D?d+":"+D:D+":"+d,K=S.get(V);if(K||(K={a:Math.min(d,D),b:Math.max(d,D),mags:[],stepSum:0,slopeSum:0,count:0},S.set(V,K)),K.mags.push(N),v?m>=2&&m<e-2:L>=2&&L<a-2){let W=v?1:e,H=(F-W)*4,et=F*4,rt=M*4,dt=(M+W)*4,Y=Math.sqrt(Wt(p[et],p[et+1],p[et+2],p[rt],p[rt+1],p[rt+2])),Z=.5*(Math.sqrt(Wt(p[H],p[H+1],p[H+2],p[et],p[et+1],p[et+2]))+Math.sqrt(Wt(p[rt],p[rt+1],p[rt+2],p[dt],p[dt+1],p[dt+2])));K.stepSum+=Y,K.slopeSum+=Z,K.count++}}}}for(let L=0;L<k.length;L++){let m=R[L];m.length?(m.sort((F,d)=>F-d),k[L].perimQ50=m[m.length>>1],k[L].perimQ75=m[Math.floor(m.length*.75)]):(k[L].perimQ50=0,k[L].perimQ75=0)}let g=Int32Array.from({length:k.length},(L,m)=>m),f=L=>g[L]===L?L:g[L]=f(g[L]),o=(L,m)=>{let F=f(L),d=f(m);F!==d&&(k[F].area>=k[d].area?g[d]=F:g[F]=d)},h=Math.max(4,Math.min(12,Math.round(Math.min(e,a)*.015))),A=[...S.values()].filter(L=>L.mags.length>=h);A.forEach(L=>{L.mags.sort((m,F)=>m-F),L.q50=L.mags[L.mags.length>>1],L.q80=L.mags[Math.floor(L.mags.length*.8)]}),A.sort((L,m)=>L.q50-m.q50);for(let L of A){let{a:m,b:F,q50:d,q80:M,stepSum:v,slopeSum:D,count:N}=L,V=k[m],K=k[F],W=f(m),H=f(F);if(W===H)continue;let et=Math.min(V.area,K.area),rt=Math.min(V.bw,K.bw);if(V.beamTier!==K.beamTier)continue;if(V.beamTier>0&&K.beamTier>0){d<=3.45&&M<=4.85&&o(m,F);continue}if(V.L<15.5!=K.L<15.5&&(V.cy>a*.42||K.cy>a*.42)&&(!V.touchesLR||!K.touchesLR||V.bw<e*.85||K.bw<e*.85)||V.L<9.8!=K.L<9.8&&Math.abs(V.L-K.L)>=3)continue;let dt=V.protFrac>=.22&&V.area<I*.0045&&V.area/Math.max(1,R[m].length)<1.95,Y=K.protFrac>=.22&&K.area<I*.0045&&K.area/Math.max(1,R[F].length)<1.95;if(dt||Y||(V.bh>V.bw*2.2&&V.bw<e*.14||K.bh>K.bw*2.2&&K.bw<e*.14)&&d>4.2||V.cy<a*.36&&K.cy<a*.36&&Math.min(V.a,K.a)<7.8&&Math.max(V.a,K.a)>=9.8&&Math.abs(V.a-K.a)>=4.2)continue;let xt=Math.hypot(V.a,V.b2),At=Math.hypot(K.a,K.b2),st=xt>4&&At>4?(V.a*K.a+V.b2*K.b2)/(xt*At):.92,at=V.L>=68&&K.L>=68&&V.a>=9&&K.a>=9&&Math.abs(V.L-K.L)<=18,ft=st>=.76||xt<14&&At<14||at,J=V.L<15.5&&K.L<15.5&&Math.abs(V.L-K.L)<=4.5;if(!J&&!ft&&et<I*.025&&(d>3.6||M>5.8))continue;if(!J&&et<I*.015&&rt<e*.32){let ct=V.area<K.area?V:K,bt=V.area<K.area?K:V;if(!ft&&ct.L<bt.L-4.5&&!ct.touchesLR&&d>3.2||d>6.5||M>10.2)continue}let ut=w.length?w[0]:-1;if(ut>0&&(V.cy<ut&&K.cy>ut||K.cy<ut&&V.cy>ut||k[W].cy<ut&&k[H].cy>ut||k[H].cy<ut&&k[W].cy>ut))continue;let mt=De(V.L,V.a,V.b2,K.L,K.a,K.b2),it=N>0?v/N:99,nt=N>0?D/N:1;if(!b&&nt<=1.25&&(it>=nt*2.1+2.5||mt>=4.2))continue;let lt=ft?4.8:2.8,ht=ft?7.8:4.4,gt=ft?b?18:10.5:6.5;d<lt&&M<ht&&mt<=gt&&it<=nt*1.95+4.5&&o(m,F)}for(let L of A){let m=k[L.a],F=k[L.b],d=r[m.lab]&&r[m.lab]._userGradGroup,M=r[F.lab]&&r[F.lab]._userGradGroup;d&&M&&d===M&&o(L.a,L.b)}let U=new Map;for(let L=0;L<k.length;L++){let m=f(L);U.set(m,(U.get(m)||0)+1)}let c=!k.some(L=>L.L<22&&L.area>=I*.0015)&&(!i||(i.meaningfulDetailDensity||0)<.065)&&w.length===0;for(let L of A){let{a:m,b:F,q50:d,q80:M}=L,v=f(m),D=f(F);if(v===D)continue;let N=k[m],V=k[F],K=N.protFrac>=.2&&N.area<I*.0045,W=V.protFrac>=.2&&V.area<I*.0045;if(K||W||N.beamTier!==V.beamTier)continue;let H=w.length?w[0]:-1;if(H>0&&(N.cy<H&&V.cy>H||V.cy<H&&N.cy>H))continue;let et=De(N.L,N.a,N.b2,V.L,V.a,V.b2),rt=U.get(v)||1,dt=U.get(D)||1;if((rt>=2||dt>=2)&&N.L>=16.5&&V.L>=16.5){let Y=Math.hypot(N.a,N.b2),Z=Math.hypot(V.a,V.b2);((Y>4&&Z>4?(N.a*V.a+N.b2*V.b2)/(Y*Z):.9)>=.72||Y<15&&Z<15)&&d<=(b?8.2:6.8)&&M<=(b?12.5:10.8)&&et<=(b?30:25.5)&&o(m,F)}c&&d<=(b?7.5:5.6)&&et<=34&&o(m,F)}let E=new Map;for(let L=0;L<k.length;L++){let m=f(L);E.has(m)||E.set(m,[]),E.get(m).push(k[L])}let q=new Map;E.forEach((L,m)=>q.set(m,new Set)),S.forEach(L=>{let m=f(L.a),F=f(L.b);m!==F&&(q.get(m).add(F),q.get(F).add(m))});let Q=new Map,tt=new Map,j=(L,m)=>{Q.set(L,m),tt.has(m)||tt.set(m,[]),tt.get(m).push(L)},z=(L,m)=>{let F=tt.get(m);if(!F||!F.length)return!0;let d=q.get(L);for(let M of F)if(d&&d.has(M))return!1;return!0},X=[...E.entries()].map(([L,m])=>{let F=m.reduce((d,M)=>d+M.area,0);return{r:L,list:m,totArea:F}}).sort((L,m)=>m.totArea-L.totArea),B=[];for(let{r:L,list:m,totArea:F}of X)if(m.length>=2){let d=0,M=0,v=0,D=null,N=m[0];for(let ot of m)d+=ot.r*ot.area,M+=ot.g*ot.area,v+=ot.b*ot.area,ot.area>N.area&&(N=ot),!D&&r[ot.lab]&&r[ot.lab].userGrad&&(D=r[ot.lab].userGrad);let V=Math.round(d/F),K=Math.round(M/F),W=Math.round(v/F),[H,et,rt]=de(V,K,W),dt=H<15.8&&F<I*.08,Y=k[L].beamTier||0,Z=-1;for(let ot of B){let xt=r[ot];if(xt.isDarkSilhouette===dt&&(xt.beamTier||0)===Y&&z(L,ot)){let At=De(H,et,rt,xt.L,xt.a,xt.b2),st=Math.hypot(et,rt),at=Math.hypot(xt.a,xt.b2),ft=st>4&&at>4?(et*xt.a+rt*xt.b2)/(st*at):.92;if(At<=16.5||ft>=.82&&Math.abs(H-xt.L)<=20){Z=ot;break}}}if(Z<0&&z(L,N.lab)){Z=N.lab;let ot=r[Z];ot.r=V,ot.g=K,ot.b=W,ot.L=H,ot.a=et,ot.b2=rt,ot.hex=_e(V,K,W),ot.isGradientSuperRegion=!dt,ot.isDarkSilhouette=dt,ot.beamTier=Y,D&&(ot.userGrad=D),B.includes(Z)||B.push(Z)}if(Z>=0)j(L,Z);else{let ot=r.length;r.push({r:V,g:K,b:W,L:H,a:et,b2:rt,hex:_e(V,K,W),isGradientSuperRegion:!dt,isDarkSilhouette:dt,beamTier:Y,userGrad:D||null}),B.push(ot),j(L,ot)}}else{let d=m[0],M=d.lab;if(d.protFrac<.18)for(let v of B){let D=r[v];if(D.isDarkSilhouette===d.L<15.8&&(D.beamTier||0)===(d.beamTier||0)&&z(L,v)&&De(d.L,d.a,d.b2,D.L,D.a,D.b2)<=13.5){M=v;break}}j(L,M)}for(let L=0;L<I;L++){let m=$[L];m>=0&&(t[L]=Q.get(f(m)))}return Ca(t,e,a,l,n,r,w),Zn(t,e,a,l,n,r,s,i,{maxColorEnabled:_.maxColorEnabled,maxColors:_.maxColors,attachGradients:_.attachPreviewGradients!==!1,forceGradient:b}),t}function to(t,e,a,l,n,r,s,i=null,_=null,u={},b=null){let C=t.length;if(C<36||!l||_&&(_.isPointHighlight||_.isDarkSilhouette||_.L!=null&&_.L<15.8&&!_.isGradientSuperRegion))return null;if(_&&_.beamTier>0){let yt=e,pt=0,Mt=a,vt=0,Ft=0,wt=0,Et=0,Dt=0,Yt=Math.max(1,Math.floor(C/2400));for(let zt=0;zt<C;zt+=Yt){let ue=t[zt],ge=ue%e,Fe=ue/e|0;ge<yt&&(yt=ge),ge>pt&&(pt=ge),Fe<Mt&&(Mt=Fe),Fe>vt&&(vt=Fe);let Nt=ue*4;Ft+=l[Nt],wt+=l[Nt+1],Et+=l[Nt+2],Dt++}let Xt=Dt?_e(Ft/Dt,wt/Dt,Et/Dt):_.hex||"#8889bf",Pt=yt*n,Rt=pt*n,Gt=Mt*n,Ut=vt*n,qt=Math.max(10,Rt-Pt),Vt=Math.max(10,Ut-Gt),Bt=.5*(Gt+Ut),Ot=Rt-qt*.02,kt=Bt,It=Rt-qt*.06,Kt=qt*.9;return{type:"radial",softFade:!0,sy:+St(Vt*.46/Kt,.16,1).toFixed(4),base:Xt,cx:+It.toFixed(2),cy:+kt.toFixed(2),r:+Kt.toFixed(2),fx:+Ot.toFixed(2),fy:+kt.toFixed(2),stops:[{offset:0,color:"#f0e7f3",op:.94},{offset:.25,color:"#ded6e6",op:.78},{offset:.52,color:"#a8a6ce",op:.44},{offset:.78,color:"#7679bc",op:.16},{offset:1,color:"#5458a8",op:0}]}}let T=Math.max(1,Math.floor(C/4600)),I=[],p=0,x=0,w=0,y=i?i.mag:null,G=b&&C>0?b[t[0]]:-999;for(let yt=0;yt<C;yt+=T){let pt=t[yt];if(y&&y[pt]>5.2&&C>160)continue;let Mt=pt%e,vt=pt/e|0;if(b&&G>=0&&C>96&&(Mt<=1||Mt>=e-2||vt<=1||vt>=a-2||b[pt-1]!==G||b[pt+1]!==G||b[pt-e]!==G||b[pt+e]!==G||b[pt-2]!==G||b[pt+2]!==G||b[pt-2*e]!==G||b[pt+2*e]!==G))continue;let Ft=pt*4,wt=l[Ft],Et=l[Ft+1],Dt=l[Ft+2],[Yt,Xt,Pt]=de(wt,Et,Dt);p+=Yt,x+=Xt,w+=Pt,I.push({x:Mt,y:vt,r:wt,g:Et,b:Dt,L:Yt,a:Xt,b2:Pt})}if(I.length<14)return null;let $=I;if(I.length>=32){let yt=I.length,pt=p/yt,Mt=x/yt,vt=w/yt;for(let wt=0;wt<yt;wt++){let Et=I[wt];Et.d2Med=(Et.L-pt)**2+(Et.a-Mt)**2+(Et.b2-vt)**2}$=I.slice().sort((wt,Et)=>wt.d2Med-Et.d2Med).slice(0,Math.max(16,Math.floor(yt*.9)))}let k=$.length,O=e,S=0,R=a,g=0,f=0,o=0,h=0,A=0,U=0,P=0;for(let yt=0;yt<k;yt++){let pt=$[yt];pt.x<O&&(O=pt.x),pt.x>S&&(S=pt.x),pt.y<R&&(R=pt.y),pt.y>g&&(g=pt.y),f+=pt.r,o+=pt.g,h+=pt.b,A+=pt.L,U+=pt.a,P+=pt.b2}let c=f/k,E=o/k,q=h/k,Q=A/k,tt=U/k,j=P/k,z=_e(c,E,q);if(Q<15.8&&!(_&&_.isGradientSuperRegion)&&!(u&&u.forceGradient))return null;let X=0;for(let yt=0;yt<k;yt++){let pt=$[yt];X+=(pt.L-Q)**2+(pt.a-tt)**2+(pt.b2-j)**2}let B=Math.sqrt(X/k),L=!!(u&&u.forceGradient),m=!!(_&&_.isGradientSuperRegion);if(B<(L?.55:m?.85:1.15))return null;let F=.5*(O+S),d=.5*(R+g),M=Math.max(1,S-O),v=Math.max(1,g-R),D=0,N=0,V=0,K=0,W=0,H=0,et=0,rt=0,dt=0;for(let yt=0;yt<k;yt++){let pt=$[yt],Mt=(pt.x-F)/M,vt=(pt.y-d)/v,Ft=pt.L-Q,wt=pt.a-tt,Et=pt.b2-j;D+=Mt*Mt,N+=vt*vt,V+=Mt*vt,K+=Mt*Ft,W+=vt*Ft,H+=Mt*wt,et+=vt*wt,rt+=Mt*Et,dt+=vt*Et}let Y=D*N-V*V,Z=0,ot=1;if(Math.abs(Y)>1e-9){let yt=(N*K-V*W)/Y/M,pt=(D*W-V*K)/Y/v,Mt=(N*H-V*et)/Y/M,vt=(D*et-V*H)/Y/v,Ft=(N*rt-V*dt)/Y/M,wt=(D*dt-V*rt)/Y/v,Et=yt*yt+Mt*Mt*1.35+Ft*Ft,Dt=pt*pt+vt*vt*1.35+wt*wt,Yt=yt*pt+Mt*vt*1.35+Ft*wt,Xt=.5*Math.atan2(2*Yt,Et-Dt);Z=Math.cos(Xt),ot=Math.sin(Xt),(ot<-.1||Math.abs(ot)<=.1&&Z<0)&&(Z=-Z,ot=-ot);let Pt=Math.abs(Math.atan2(ot,Z)*180/Math.PI);Math.abs(Pt-90)<=5?(Z=0,ot=1):(Pt<=5||Math.abs(Pt-180)<=5)&&(Z=1,ot=0)}let xt=1/0,At=-1/0;for(let yt=0;yt<k;yt++){let pt=$[yt],Mt=pt.x*Z+pt.y*ot;pt.t=Mt,Mt<xt&&(xt=Mt),Mt>At&&(At=Mt)}let st=Math.max(.001,At-xt),at=St(Math.round(Math.sqrt(k)*.45),10,28),ft=Array.from({length:at},()=>[]);for(let yt=0;yt<k;yt++){let pt=$[yt],Mt=Math.min(at-1,Math.max(0,Math.floor((pt.t-xt)/st*at)));ft[Mt].push(pt)}let J=[];for(let yt=0;yt<at;yt++){let pt=ft[yt];if(!pt.length)continue;pt.sort((Rt,Gt)=>Rt.L-Rt.a*.35-(Gt.L-Gt.a*.35));let Mt=Math.floor(pt.length*.08),vt=Math.max(Mt+1,Math.ceil(pt.length*.92)),Ft=0,wt=0,Et=0,Dt=0,Yt=0,Xt=0,Pt=0;for(let Rt=Mt;Rt<vt;Rt++)Ft+=pt[Rt].r,wt+=pt[Rt].g,Et+=pt[Rt].b,Dt+=pt[Rt].L,Yt+=pt[Rt].a,Xt+=pt[Rt].b2,Pt++;Pt&&J.push({offset:+((yt+.5)/at).toFixed(4),r:Ft/Pt,g:wt/Pt,b:Et/Pt,L:Dt/Pt,a:Yt/Pt,b2:Xt/Pt,color:_e(Ft/Pt,wt/Pt,Et/Pt),op:1})}if(J.length<2)return null;J[0].offset=0,J[J.length-1].offset=1;let ut=C>e*a*.12?2:1;if(J.length>=4)for(let yt=0;yt<ut;yt++)for(let pt=1;pt<J.length-1;pt++){let Mt=J[pt-1],vt=J[pt],Ft=J[pt+1],wt=.2*Mt.r+.6*vt.r+.2*Ft.r,Et=.2*Mt.g+.6*vt.g+.2*Ft.g,Dt=.2*Mt.b+.6*vt.b+.2*Ft.b,[Yt,Xt,Pt]=de(wt,Et,Dt);vt.r=wt,vt.g=Et,vt.b=Dt,vt.L=Yt,vt.a=Xt,vt.b2=Pt,vt.color=_e(wt,Et,Dt)}let mt=new Uint8Array(J.length);mt[0]=mt[J.length-1]=1;let it=[[0,J.length-1]];for(;it.length;){let[yt,pt]=it.pop();if(pt-yt<=1)continue;let Mt=J[yt],vt=J[pt],Ft=Math.max(1e-6,vt.offset-Mt.offset),wt=0,Et=-1;for(let Dt=yt+1;Dt<pt;Dt++){let Yt=J[Dt],Xt=(Yt.offset-Mt.offset)/Ft,Pt=Mt.L+Xt*(vt.L-Mt.L),Rt=Mt.a+Xt*(vt.a-Mt.a),Gt=Mt.b2+Xt*(vt.b2-Mt.b2),Ut=Math.hypot(Yt.L-Pt,Yt.a-Rt,Yt.b2-Gt);Ut>wt&&(wt=Ut,Et=Dt)}wt>.42&&Et>0&&(mt[Et]=1,it.push([yt,Et],[Et,pt]))}let nt=J.filter((yt,pt)=>mt[pt]),lt=yt=>{let pt=St(yt,0,1);for(let vt=0;vt<nt.length-1;vt++){let Ft=nt[vt],wt=nt[vt+1];if(pt<=wt.offset||vt===nt.length-2){let Et=(pt-Ft.offset)/Math.max(1e-6,wt.offset-Ft.offset);return[Ft.L+Et*(wt.L-Ft.L),Ft.a+Et*(wt.a-Ft.a),Ft.b2+Et*(wt.b2-Ft.b2)]}}let Mt=nt[nt.length-1];return[Mt.L,Mt.a,Mt.b2]},ht=0;for(let yt=0;yt<k;yt++){let pt=$[yt],Mt=(pt.t-xt)/st,[vt,Ft,wt]=lt(Mt);ht+=(pt.L-vt)**2+(pt.a-Ft)**2+(pt.b2-wt)**2}let gt=Math.sqrt(ht/k),ct=0;for(let yt=0;yt<nt.length;yt++)for(let pt=yt+1;pt<nt.length;pt++){let Mt=Math.hypot(nt[pt].L-nt[yt].L,nt[pt].a-nt[yt].a,nt[pt].b2-nt[yt].b2);Mt>ct&&(ct=Mt)}let bt=Math.max(M,v)/Math.max(1,Math.min(M,v)),Ct=Q>=70&&Q<=93&&tt>=9&&d<a*.42&&C<e*a*.04;if(bt<=3.2&&C<e*a*.22||Ct){let yt=0,pt=0,Mt=0,vt=0,Ft=Math.max(1,M*.5),wt=Math.max(1,v*.5);for(let Bt=0;Bt<k;Bt++){let Ot=$[Bt];Math.hypot((Ot.x-F)/Ft,(Ot.y-d)/wt)>=.72&&(yt+=Ot.L,pt+=Ot.a,Mt+=Ot.b2,vt++)}vt>=4?(yt/=vt,pt/=vt,Mt/=vt):(yt=Q,pt=tt,Mt=j);let Et=0,Dt=0,Yt=0;for(let Bt=0;Bt<k;Bt++){let Ot=$[Bt],kt=Ct?Math.max(.1,(Ot.a-pt)*2.2+(yt-Ot.L)*.8):Math.hypot((Ot.a-pt)*1.55,(Ot.b2-Mt)*1.15),It=Math.abs(Ot.L-yt),Kt=Math.pow(Math.max(.1,kt+It*.85),2);Dt+=Ot.x*Kt,Yt+=Ot.y*Kt,Et+=Kt}let Xt=Et>0?Dt/Et:F,Pt=Et>0?Yt/Et:d,Rt=1;for(let Bt=0;Bt<k;Bt++){let Ot=Math.hypot($[Bt].x-Xt,$[Bt].y-Pt);$[Bt].rad=Ot,Ot>Rt&&(Rt=Ot)}let Gt=10,Ut=Array.from({length:Gt},()=>[]);for(let Bt=0;Bt<k;Bt++){let Ot=Math.min(Gt-1,Math.floor($[Bt].rad/Rt*Gt));Ut[Ot].push($[Bt])}let qt=[];for(let Bt=0;Bt<Gt;Bt++){let Ot=Ut[Bt];if(!Ot.length)continue;let kt=0,It=0,Kt=0,Jt=0,zt=0,ue=0;for(let Fe of Ot)kt+=Fe.r,It+=Fe.g,Kt+=Fe.b,Jt+=Fe.L,zt+=Fe.a,ue+=Fe.b2;let ge=Ot.length;qt.push({offset:+(Bt/(Gt-1)).toFixed(4),L:Jt/ge,a:zt/ge,b2:ue/ge,color:_e(kt/ge,It/ge,Kt/ge),op:1})}let Vt=0;for(let Bt=0;Bt<qt.length;Bt++)for(let Ot=Bt+1;Ot<qt.length;Ot++){let kt=Math.hypot(qt[Ot].L-qt[Bt].L,qt[Ot].a-qt[Bt].a,qt[Ot].b2-qt[Bt].b2);kt>Vt&&(Vt=kt)}if(qt.length>=3){qt[0].offset=0,qt[qt.length-1].offset=1;let Bt=0;for(let Kt=0;Kt<k;Kt++){let Jt=St($[Kt].rad/Rt,0,1),zt=Math.min(qt.length-2,Math.floor(Jt*(qt.length-1))),ue=qt[zt],ge=qt[zt+1],Fe=(Jt-ue.offset)/Math.max(1e-6,ge.offset-ue.offset),Nt=ue.L+Fe*(ge.L-ue.L),jt=ue.a+Fe*(ge.a-ue.a),te=ue.b2+Fe*(ge.b2-ue.b2);Bt+=($[Kt].L-Nt)**2+($[Kt].a-jt)**2+($[Kt].b2-te)**2}let Ot=Math.sqrt(Bt/k),kt=Ct?1.06:.96,It=Ct?.98:.93;if(Ot<gt*kt&&Ot<B*It&&Math.max(ct,Vt)>=1.8)return{type:"radial",base:z,cx:+(F*n).toFixed(2),cy:+(d*n).toFixed(2),r:+(Rt*n).toFixed(2),fx:+(Xt*n).toFixed(2),fy:+(Pt*n).toFixed(2),stops:qt.map(Kt=>({offset:Kt.offset,color:Kt.color,op:Kt.op}))}}}let Tt=m||L?.992:.955;if(ct>=(L?1.15:m?1.45:1.8)&&gt<B*Tt){let yt=F*Z+d*ot,pt=(F+(xt-yt)*Z)*n,Mt=(d+(xt-yt)*ot)*n,vt=(F+(At-yt)*Z)*n,Ft=(d+(At-yt)*ot)*n;return{type:"linear",base:z,x1:+pt.toFixed(2),y1:+Mt.toFixed(2),x2:+vt.toFixed(2),y2:+Ft.toFixed(2),stops:nt.map(wt=>({offset:wt.offset,color:wt.color,op:wt.op}))}}return null}function Ta(t,e){if(!e||!e.stops||e.stops.length<2)return t;let a=e.stops.map(n=>({offset:n.offset,color:n.color,op:n.op??1})),l=a[Math.floor(a.length/2)].color||a[0].color;return t?{...t,type:e.type||t.type,base:l,stops:a}:{type:e.type||"linear",base:l,x1:e.x1??0,y1:e.y1??0,x2:e.x2??100,y2:e.y2??100,cx:e.cx??50,cy:e.cy??50,r:e.r??50,fx:e.fx??50,fy:e.fy??50,stops:a}}function Ko(t,e,a,l,n,r,s,i,_=null,u=null,b={}){if(b&&b.gradientMode==="off"){if(t){for(let O of t)if(O.grad=null,O.loops)for(let S of O.loops)S.grad=null}if(u)for(let O of u)O.grad=null,O.isGradient=!1;return t}let C=n&&n.rawRgba&&n.rawRgba.length===a*l*4?n.rawRgba:n&&n.data?n.data.data:null;if(!C||!e||!t||!t.length)return t;let T={forceGradient:!!(b&&(b.forceGradient||b.gradientMode==="on"))},I=a*l,p=new Int32Array(I).fill(-1),x=[],w=[],y=[],G=new Int32Array(I);for(let O=0;O<I;O++){let S=e[O];if(S<0||p[O]>=0)continue;let R=x.length,g=0,f=0;G[f++]=O,p[O]=R;let o=a,h=0,A=l,U=0;for(;g<f;){let P=G[g++],c=P%a,E=P/a|0;c<o&&(o=c),c>h&&(h=c),E<A&&(A=E),E>U&&(U=E),c>0&&e[P-1]===S&&p[P-1]<0&&(p[P-1]=R,G[f++]=P-1),c<a-1&&e[P+1]===S&&p[P+1]<0&&(p[P+1]=R,G[f++]=P+1),E>0&&e[P-a]===S&&p[P-a]<0&&(p[P-a]=R,G[f++]=P-a),E<l-1&&e[P+a]===S&&p[P+a]<0&&(p[P+a]=R,G[f++]=P+a)}x.push(Int32Array.from(G.subarray(0,f))),w.push([o*r,A*r,(h+1)*r,(U+1)*r]),y.push(S)}let $=new Map;for(let O=0;O<x.length;O++){let S=y[O];$.has(S)||$.set(S,[]),$.get(S).push(O)}let k=new Map;for(let O of t){let S=$.get(O.label)||[];if(!S.length)continue;let R=u?u[O.label]:null,g=S[0];for(let h of S)x[h].length>x[g].length&&(g=h);let f=R&&R.userGrad?R.userGrad:null;O.grad=to(x[g],a,l,C,r,s,i,_,R,T,e),f&&(O.grad=Ta(O.grad,f)),k.set(g,O.grad),O.grad&&O.grad.base&&(O.color=O.grad.base);let o=O.grad||null;for(let h of O.loops||[]){if((typeof h.signedArea=="number"?h.signedArea:Wo(h.pts))>0)continue;let U=ka(h.pts),P=U.bb,c=St(Math.floor((U.inPt?U.inPt[0]:U.c[0])/r),0,a-1),E=St(Math.floor((U.inPt?U.inPt[1]:U.c[1])/r),0,l-1),q=p[E*a+c];if(q<0||y[q]!==O.label){q=-1;let Q=1/0;for(let tt of S){let j=w[tt],z=Math.hypot((P[0]+P[2])*.5-(j[0]+j[2])*.5,(P[1]+P[3])*.5-(j[1]+j[3])*.5);z<Q&&(Q=z,q=tt)}}if(q>=0&&x[q].length>=42){let Q=null,tt=w[q],j=Math.max(1,(P[2]-P[0])*(P[3]-P[1])),z=Math.max(1,(tt[2]-tt[0])*(tt[3]-tt[1]));if(j<z*.72&&j>=160*r*r){let X=Math.max(0,Math.floor(P[0]/r)-2),B=Math.max(0,Math.floor(P[1]/r)-2),L=Math.min(a-1,Math.ceil(P[2]/r)+2),m=Math.min(l-1,Math.ceil(P[3]/r)+2),F=[],d=Math.max(1,Math.floor(Math.sqrt((L-X+1)*(m-B+1))/64));for(let M=B;M<=m;M+=d){let v=M*a;for(let D=X;D<=L;D+=d){let N=v+D;p[N]===q&&F.push(N)}}F.length>=48&&(Q=to(F,a,l,C,r,s,i,_,R,T,e))}Q||(k.has(q)||k.set(q,to(x[q],a,l,C,r,s,i,_,R,T,e)),Q=k.get(q)),f&&(Q=Ta(Q,f)),Q&&(h.grad=Q,o||(o=Q))}}R&&o&&o.stops&&o.stops.length>=2&&(R.isGradient=!0,R.grad={type:o.type,base:o.base||R.hex,x1:o.x1,y1:o.y1,x2:o.x2,y2:o.y2,cx:o.cx,cy:o.cy,r:o.r,fx:o.fx,fy:o.fy,stops:o.stops.map(h=>({offset:h.offset,color:h.color,op:h.op??1}))})}return t}function Fa(t,e,a,l=null,n=null,r={}){if(!a||!a.length)return{items:[],hexes:[],hasGradient:!1,gradientCount:0};let s=r.gradientMode||"auto",i=!!(a._hasSmoothGradient&&(!n||n.surfaceMode!=="flat")),_=s==="on"||s==="auto"&&i,u=r.maxColorEnabled&&r.maxColors>=2?Math.max(2,Math.round(r.maxColors)):0,b=a.map(S=>{let R=S.r!=null?Math.round(S.r):un(S.hex||"#000000")[0],g=S.g!=null?Math.round(S.g):un(S.hex||"#000000")[1],f=S.b!=null?Math.round(S.b):un(S.hex||"#000000")[2],[o,h,A]=S.L!=null?[S.L,S.a,S.b2]:de(R,g,f);return{r:R,g,b:f,L:o,a:h,b2:A,hex:(S.hex||_e(R,g,f)).toLowerCase(),count:S.count||1,verifiedPlateau:!!S.verifiedPlateau,isGradCluster:!!S.isGradCluster,isGradient:!1,grad:null}});if(b._hasSmoothGradient=i,!_||!t||!t.data){let S=[];for(let R of b)S.find(f=>f.hex===R.hex||De(R.L,R.a,R.b2,f.L,f.a,f.b2)<2.2)||S.push(R);if(u>0&&S.length>u)for(;S.length>u;){let R=0,g=1,f=1/0;for(let Q=0;Q<S.length;Q++)for(let tt=Q+1;tt<S.length;tt++){let z=De(S[Q].L,S[Q].a,S[Q].b2,S[tt].L,S[tt].a,S[tt].b2)*(1+.18*Math.log(1+Math.min(S[Q].count||1,S[tt].count||1)));z<f&&(f=z,R=Q,g=tt)}let o=S[R],h=S[g],A=(o.count||1)>=(h.count||1)?o:h,U=A===o?h:o,P=(A.count||1)+(U.count||1);A.r=Math.round((A.r*(A.count||1)+U.r*(U.count||1))/P),A.g=Math.round((A.g*(A.count||1)+U.g*(U.count||1))/P),A.b=Math.round((A.b*(A.count||1)+U.b*(U.count||1))/P);let[c,E,q]=de(A.r,A.g,A.b);A.L=c,A.a=E,A.b2=q,A.hex=_e(A.r,A.g,A.b).toLowerCase(),A.count=P,S.splice(A===o?g:R,1)}return{items:S,hexes:S.map(R=>R.hex.toLowerCase()),hasGradient:!1,gradientCount:0}}let C=t.w||t.data.width,T=t.h||t.data.height,I=C*T,p=t.rawRgba&&t.rawRgba.length===I*4?t.rawRgba:t.data.data,x=l||Ye(t,e),w=new Int16Array(I).fill(-1),y=b.length;for(let S=0;S<I;S++){if(e&&e[S])continue;let R=S*4,g=p[R],f=p[R+1],o=p[R+2],h=0,A=1/0;for(let U=0;U<y;U++){let P=b[U],c=Wt(g,f,o,P.r,P.g,P.b);c<A&&(A=c,h=U)}w[S]=h}let G=zn(w,C,T,t,b,e);w._detailProt=G,lo(w,C,T,Math.max(4,Math.round(I/18e3)),t,b);let $=b.map(S=>({...S}));$._hasSmoothGradient=!0,Ho(w,C,T,t,e,$,x,n,{gradientMode:s,forceGradient:s==="on",maxColorEnabled:r.maxColorEnabled,maxColors:r.maxColors,attachPreviewGradients:!0});let k=$.map(S=>({...S,hex:(S.hex||_e(S.r,S.g,S.b)).toLowerCase(),isGradient:!!(S.grad&&S.grad.stops&&S.grad.stops.length>=2),grad:S.grad&&S.grad.stops&&S.grad.stops.length>=2?S.grad:null})),O=k.filter(S=>S.isGradient).length;return{items:k,hexes:k.map(S=>S.hex),hasGradient:O>0,gradientCount:O}}function tr(t,e={}){if(!t||!t.regs||!t.palette)return t;t._baseSnapshot||(t._baseSnapshot={labels:t.labels?new Int16Array(t.labels):null,palette:t.palette.map(T=>({...T,grad:T.grad?{...T.grad,stops:T.grad.stops?T.grad.stops.map(I=>({...I})):[]}:null})),regs:t.regs.map(T=>({...T,grad:T.grad?{...T.grad,stops:T.grad.stops?T.grad.stops.map(I=>({...I})):[]}:null,loops:(T.loops||[]).map(I=>({...I,grad:I.grad?{...I.grad,stops:I.grad.stops?I.grad.stops.map(p=>({...p})):[]}:null}))}))});let a=t._baseSnapshot,l=e.gradientMode||"auto",r=!!e.maxColorEnabled&&e.maxColors>=2?Math.max(2,Math.round(e.maxColors)):0,s=a.palette.map(T=>({...T,grad:T.grad?{...T.grad,stops:T.grad.stops?T.grad.stops.map(I=>({...I})):[]}:null})),i=a.regs.map(T=>({...T,grad:T.grad?{...T.grad,stops:T.grad.stops?T.grad.stops.map(I=>({...I})):[]}:null,loops:(T.loops||[]).map(I=>({...I,grad:I.grad?{...I.grad,stops:I.grad.stops?I.grad.stops.map(p=>({...p})):[]}:null}))})),_=a.labels?new Int16Array(a.labels):null;if(r>0&&s.length>r)for(;s.length>r;){let T=-1,I=-1,p=1/0,x=new Float64Array(s.length);for(let G of i)G.label>=0&&G.label<s.length&&(x[G.label]+=G.area||1);for(let G=0;G<s.length;G++)for(let $=G+1;$<s.length;$++){let k=s[G],O=s[$],[S,R,g]=k.L!=null?[k.L,k.a,k.b2]:de(k.r,k.g,k.b),[f,o,h]=O.L!=null?[O.L,O.a,O.b2]:de(O.r,O.g,O.b),A=De(S,R,g,f,o,h),U=Math.min(x[G]||1,x[$]||1),P=(A+1)*(1+.22*Math.log(1+U/80));P<p&&(p=P,(x[G]||1)<=(x[$]||1)?(T=G,I=$):(T=$,I=G))}if(T<0||I<0)break;let w=i.find(G=>G.label===T),y=i.find(G=>G.label===I);if(w&&y?(y.loops=y.loops.concat(w.loops),y.area=(y.area||0)+(w.area||0),!y.grad&&w.grad&&(y.grad=w.grad),i=i.filter(G=>G!==w)):w&&(w.label=I),_)for(let G=0;G<_.length;G++)_[G]===T?_[G]=I:_[G]>T&&_[G]--;s.splice(T,1);for(let G of i)G.label>T&&G.label--}let u=!!(t.cls&&(t.cls.surfaceMode==="gradient"||t.cls.surfaceMode==="mixed"||t.cls.gradientContinuity>=.14)||a.palette.some(T=>T.grad));if(l==="on"||l==="auto"&&u)_&&(t.rawRgba||t.workData)&&Ko(i,_,t.w,t.h,{data:t.workData,rawRgba:t.rawRgba},t.scale,t.W,t.H,null,s,{gradientMode:l,forceGradient:l==="on"});else{for(let T of s)T.grad=null,T.isGradient=!1;for(let T of i)if(T.grad=null,T.color=s[T.label]&&s[T.label].hex||T.color,T.loops)for(let I of T.loops)I.grad=null}let C=eo(i,t.W,t.H,{stackMode:e.stackMode||"stack",stroke:e.stroke!==!1,bg:"none",safetyBg:!(t.stats&&t.stats.alpha&&t.stats.alpha.hasAlpha),hiddenLabels:[]});return t.traceHistory&&(t.traceHistory.palette=s,t.traceHistory.regs=i,t.traceHistory.svg=C),{...t,svg:C,regs:i,palette:s,labels:_||t.labels,hiddenLabels:[],stats:{...t.stats||{},regions:i.length,palette:{...t.stats&&t.stats.palette||{},count:s.length,colors:s.map(T=>T.hex)}}}}function xo(t,e,a,l=null){let n=[],r=new Map;for(let s of t)r.has(s.label)||r.set(s.label,[]),r.get(s.label).push(s);return r.forEach((s,i)=>{let _=e[i]||{r:0,g:0,b:0},u=0,b=s.map(C=>{let T=typeof C.area=="number"&&C.area!==0?C.area:Wo(C.scaledPts),I=Math.abs(T);return u+=I,{d:C.d,area:I,signedArea:T,pts:C.scaledPts,segs:C.segs,grad:C.grad||null}});n.push({label:i,color:_e(_.r,_.g,_.b),area:u*a*a,loops:b,hidden:!1,grad:null})}),n.sort((s,i)=>i.area-s.area),l&&l.labels&&l.rawWork&&Ko(n,l.labels,l.w,l.h,l.rawWork,l.scale||a,l.W,l.H,l.edgeField,e,{gradientMode:l.gradientMode||"auto",forceGradient:!!l.forceGradient}),n}function er(t,e,a){if(!t||!t.length)return[0,0];if(Xo(a[0],a[1],t))return a;let l=[a[1],(e[1]+a[1])*.5,(a[1]+e[3])*.5,e[1]+(e[3]-e[1])*.33,e[1]+(e[3]-e[1])*.67];for(let n of l){let r=[];for(let s=0,i=t.length-1;s<t.length;i=s++){let _=t[s][0],u=t[s][1],b=t[i][0],C=t[i][1];u>n!=C>n&&r.push(_+(b-_)*(n-u)/(C-u))}r.sort((s,i)=>s-i);for(let s=0;s+1<r.length;s+=2){let i=(r[s]+r[s+1])*.5;if(Xo(i,n,t))return[i,n]}}return t[0]}function ka(t){let e=1/0,a=1/0,l=-1/0,n=-1/0,r=0,s=0,i=t?t.length:0;if(!i)return{bb:[0,0,0,0],c:[0,0],inPt:[0,0]};for(let b=0;b<i;b++){let C=t[b][0],T=t[b][1];C<e&&(e=C),C>l&&(l=C),T<a&&(a=T),T>n&&(n=T),r+=C,s+=T}r/=i,s/=i;let _=[e,a,l,n],u=[r,s];return{bb:_,c:u,inPt:er(t,_,u)}}function zo(t,e,a=!1){let l=t.bb,n=e.bb;if(!t.pts||t.pts.length<3||!e.pts||!e.pts.length||(a?t.absArea<e.absArea*.85:t.absArea<=e.absArea*1.002))return!1;let r=a?3:2;if(n[0]<l[0]-r||n[1]<l[1]-r||n[2]>l[2]+r||n[3]>l[3]+r)return!1;let s=e.inPt||e.c;return Xo(s[0],s[1],t.pts)}function nr(t){let e=[],a=[];for(let l of t.loops||[]){if(!l.d)continue;let n=typeof l.signedArea=="number"?l.signedArea:Wo(l.pts),r=l.area||Math.abs(n),s=ka(l.pts),i={d:l.d,pts:l.pts||[],segs:l.segs||[],signedArea:n,absArea:r,bb:s.bb,c:s.c,inPt:s.inPt,holes:[],grad:l.grad||null};n<=0?e.push(i):a.push(i)}!e.length&&a.length&&(a.sort((l,n)=>n.absArea-l.absArea),e.push(a.shift())),e.sort((l,n)=>l.absArea-n.absArea);for(let l of a){let n=null;for(let r of e)if(zo(r,l)){n=r;break}n&&n.holes.push(l)}return e.map(l=>({label:t.label,color:l.grad&&l.grad.base?l.grad.base:t.color,grad:l.grad||(e.length===1?t.grad:null)||null,outer:l,holes:l.holes,keptHoles:l.holes.slice(),area:l.absArea,bb:l.bb,c:l.c,parent:null,parentHole:null,children:[],depth:0,effectiveBg:null,suppressed:!1,isFrameBg:!1}))}function eo(t,e,a,l={}){let n=l.stackMode||"stack",r=l.frameId===!1?null:l.frameId||"Frame-1",s=l.hiddenLabels instanceof Set?l.hiddenLabels:new Set(l.hiddenLabels||[]),i=t.filter(g=>!g.hidden&&!s.has(g.label)),_=l.stroke&&n!=="stack",u=_?` stroke-width="${fe(St(Math.min(e,a)/2400,.14,.24))}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"`:"",b=[];for(let g of i){let f=nr(g);for(let o of f)b.push(o)}b.sort((g,f)=>g.area-f.area);for(let g=0;g<b.length;g++){let f=b[g];for(let o=g+1;o<b.length;o++){let h=b[o];if(zo(h.outer,f.outer)){f.parent=h,h.children.push(f);let A=null;for(let U of h.holes)zo(U,f.outer,!0)&&(!A||U.absArea<A.absArea)&&(A=U);f.parentHole=A;break}}}let C=g=>{let f=0,o=g.parent,h=0;for(;o&&h++<b.length+2;)f++,o=o.parent;return f};for(let g of b)g.depth=C(g);let T=Math.max(8,a*.04),I=(g,f)=>Math.abs(g.c[1]-f.c[1])>T?g.c[1]-f.c[1]:g.c[0]-f.c[0],p=(g,f)=>{let o=g.bb[2]-g.bb[0]>=e*.85?1:0,h=f.bb[2]-f.bb[0]>=e*.85?1:0;return o!==h?h-o:Math.abs(g.area-f.area)>Math.max(g.area,f.area)*.25?f.area-g.area:I(g,f)},x="",w="",y="",G=0,$=(g,f)=>{if(!g||!g.stops||g.stops.length<2)return f;let o="svgpeak-grad-"+ ++G,h=f?` data-base-color="${f}"`:"",A=g.stops.map(U=>{let P=Math.round(St(U.offset,0,1)*1e4)/100,c=U.op!=null&&U.op<.999?` stop-opacity="${fe(U.op)}"`:"";return`    <stop offset="${P}%" stop-color="${U.color}"${c}/>`}).join(`
`);if(g.type==="radial"){let U=g.fx!=null?` fx="${fe(g.fx)}" fy="${fe(g.fy)}"`:"",P=g.sy!=null&&Math.abs(g.sy-1)>.01?` data-sy="${fe(g.sy)}" gradientTransform="matrix(1 0 0 ${fe(g.sy)} 0 ${fe(g.cy*(1-g.sy))})"`:"";y+=`  <radialGradient id="${o}" gradientUnits="userSpaceOnUse" cx="${fe(g.cx)}" cy="${fe(g.cy)}" r="${fe(g.r)}"${U}${P}${h}>
${A}
  </radialGradient>
`}else y+=`  <linearGradient id="${o}" gradientUnits="userSpaceOnUse" x1="${fe(g.x1)}" y1="${fe(g.y1)}" x2="${fe(g.x2)}" y2="${fe(g.y2)}"${h}>
${A}
  </linearGradient>
`;return`url(#${o})`},k=!!(l.bg&&l.bg!=="none"),O=!k&&!!(l.safetyBg&&i.length>0&&s.size===0);if(n==="stack"){let g=b.filter(P=>!P.parent).sort((P,c)=>c.area-P.area),f=null;if(g.length>0&&b.length>1){let P=g[0],c=P.bb;c[0]<=e*.03+2&&c[1]<=a*.03+2&&c[2]>=e*.97-2&&c[3]>=a*.97-2&&P.area>=e*a*.8&&(f=P,f.isFrameBg=!0)}if(k)w=`<path id="${r||"Frame-1"}-bg" fill="${l.bg}" d="M 0 0 L ${fe(e)} 0 L ${fe(e)} ${fe(a)} L 0 ${fe(a)} Z"/>
`;else if(f){let P=$(f.grad,f.color);w=`<path id="${r||"Frame-1"}-bg" fill="${P}" d="M 0 0 L ${fe(e)} 0 L ${fe(e)} ${fe(a)} L 0 ${fe(a)} Z"/>
`}else if(O){let P=i[0],c=$(P.grad,P.color);w=`<path id="${r||"Frame-1"}-bg" fill="${c}" d="M 0 0 L ${fe(e)} 0 L ${fe(e)} ${fe(a)} L 0 ${fe(a)} Z"/>
`}let o=b.slice().sort((P,c)=>P.depth-c.depth||c.area-P.area);for(let P of o){if(P.isFrameBg){for(let E of P.children)E.effectiveBg=P;continue}if(!P.parent&&f&&P!==f&&(P.effectiveBg=f),P.suppressed){for(let E of P.children)E.effectiveBg=P.effectiveBg;continue}let c=[];for(let E of P.holes){let q=P.children.filter(j=>j.parentHole===E),Q=q.reduce((j,z)=>j+z.area,0),tt=q.some(j=>j.grad&&j.grad.softFade);if(Q<E.absArea*.78&&!tt){c.push(E);for(let j of q)j.effectiveBg=P.effectiveBg}else if(q.length===1&&P.effectiveBg&&!q[0].grad&&!P.effectiveBg.grad&&q[0].color.toLowerCase()===P.effectiveBg.color.toLowerCase()){c.push(E),q[0].suppressed=!0;for(let j of q[0].children)j.effectiveBg=P.effectiveBg}else for(let j of q)j.effectiveBg=P}P.keptHoles=c;for(let E of P.children)!E.parentHole&&!E.effectiveBg&&(E.effectiveBg=P)}let h=b.filter(P=>!P.isFrameBg&&!P.suppressed);h.slice().sort(I).forEach((P,c)=>{P.objName="obj-"+(c+1)});let U=h.reduce((P,c)=>Math.max(P,c.depth),0);for(let P=0;P<=U;P++){let c=h.filter(E=>E.depth===P).sort(p);for(let E of c){let q=E.outer.d+E.keptHoles.map(z=>z.d).join(""),Q=$(E.grad,E.color),tt=!!(E.grad&&E.grad.softFade),j=_&&!tt?` stroke="${Q}"${u}`:"";x+=`<path id="${E.objName}" fill="${Q}"${j} fill-rule="evenodd" d="${q}"/>
`}}}else{if(k)w=`<path id="${r||"Frame-1"}-bg" fill="${l.bg}" d="M 0 0 L ${fe(e)} 0 L ${fe(e)} ${fe(a)} L 0 ${fe(a)} Z"/>
`;else if(O){let o=i[0],h=$(o.grad,o.color);w=`<path id="${r||"Frame-1"}-bg" fill="${h}" d="M 0 0 L ${fe(e)} 0 L ${fe(e)} ${fe(a)} L 0 ${fe(a)} Z"/>
`}b.slice().sort(I).forEach((o,h)=>{o.objName="obj-"+(h+1)});let f=b.slice().sort((o,h)=>o.depth-h.depth||p(o,h));if(n==="grouped"){let o=new Map;for(let h of f)o.has(h.color)||o.set(h.color,[]),o.get(h.color).push(h);o.forEach((h,A)=>{for(let U of h){let P=$(U.grad,A),c=!!(U.grad&&U.grad.softFade),E=l.stroke&&!c?` stroke="${P}"${u}`:"",q=U.outer.d+(c?"":U.holes.map(Q=>Q.d).join(""));x+=`<path id="${U.objName}" fill="${P}"${E} fill-rule="evenodd" d="${q}"/>
`}})}else for(let o of f){let h=$(o.grad,o.color),A=!!(o.grad&&o.grad.softFade),U=l.stroke&&!A?` stroke="${h}"${u}`:"",P=o.outer.d+(A?"":o.holes.map(c=>c.d).join(""));x+=`<path id="${o.objName}" fill="${h}"${U} fill-rule="evenodd" d="${P}"/>
`}}let S=y?`<defs>
${y}</defs>
`:"",R=r?`<g id="${r}" data-container="frame">
${w}${x}</g>
`:`${w}${x}`;return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fe(e)} ${fe(a)}" width="${fe(e)}" height="${fe(a)}">
${S}${R}</svg>`}function or(t,e,a,l){let n=["0","SECTION","2","ENTITIES"],r=(i,_)=>{let u=[],b=Math.hypot(i.P3[0]-i.P0[0],i.P3[1]-i.P0[1])+1,C=St(Math.ceil(b/Math.max(.5,_*8)),4,64);for(let T=0;T<=C;T++){let[I,p]=vn(i.P0,i.P1,i.P2,i.P3,T/C);u.push([I,a-p])}return u},s=l==="lines-more"?.25:1;for(let i of t)if(!i.hidden)for(let _ of i.loops){let u=_.segs||[];if(l==="spline"&&u.length){let b=[[u[0].P0[0],a-u[0].P0[1]]];for(let C of u)b.push([C.P1[0],a-C.P1[1]],[C.P2[0],a-C.P2[1]],[C.P3[0],a-C.P3[1]]);n.push("0","SPLINE","100","AcDbEntity","8","0","100","AcDbSpline","70","8","71","3","72",String(b.length),"73","0","74","0");for(let[C,T]of b)n.push("10",fe(C).toFixed(2),"20",fe(T).toFixed(2),"30","0.0")}else{let b=[];for(let C of u){let T=r(C,s);b.push(...T.slice(b.length?1:0))}if(b.length<2)continue;n.push("0","LWPOLYLINE","100","AcDbEntity","8","0","100","AcDbPolyline","90",String(b.length),"70","1");for(let[C,T]of b)n.push("10",fe(C).toFixed(2),"20",fe(T).toFixed(2))}}return n.push("0","ENDSEC","0","EOF"),n.join(`
`)}let ar=[["classify","1/7 \xB7 Ekstraksi fitur GLCM, entropi & klasifikasi citra"],["palette","2/7 \xB7 Kuantisasi warna CIE-Lab, k-d Tree ANN & evaluasi BIC"],["segment","3/7 \xB7 Dekomposisi QuadTree & optimasi MRF Potts (Simulated Annealing)"],["trace",'4/7 \xB7 Graf planar & inversi sub-piksel "Beach Deconvolution"'],["smooth","5/7 \xB7 Penghalusan kontur (Polak-Ribi\xE8re Conjugate Gradient + Corner Puncturing)"],["fit","6/7 \xB7 Fitting kurva B\xE9zier kubik (Gauss-Newton Re-parameterization & MDL)"],["assemble","7/7 \xB7 Perakitan topologi vektor & verifikasi akhir"]],_a="svgpeak-hw-cfg-v1",Pe=(()=>{let t=St(typeof navigator<"u"&&navigator.hardwareConcurrency||4,1,64),e=St(typeof navigator<"u"&&navigator.deviceMemory||8,1,64),a={available:!1,webgl2:!1,webgpu:!1,colorBufferFloat:!1,floatLinear:!1,offscreenCanvas:typeof OffscreenCanvas<"u",vendor:"CPU Fallback",renderer:"Tidak terdeteksi",maxTexSize:4096,maxDrawBuffers:1,maxColorAttachments:1};try{if(typeof Ue<"u"){let l=Ue.createElement("canvas"),n=l.getContext("webgl2",{powerPreference:"high-performance"})||l.getContext("webgl",{powerPreference:"high-performance"});if(n){let r=typeof WebGL2RenderingContext<"u"&&n instanceof WebGL2RenderingContext,s=n.getExtension("WEBGL_debug_renderer_info"),i=r?!!n.getExtension("EXT_color_buffer_float"):!!n.getExtension("WEBGL_color_buffer_float"),_=!!n.getExtension("OES_texture_float_linear"),u=s&&n.getParameter(s.UNMASKED_VENDOR_WEBGL)||n.getParameter(n.VENDOR)||"GPU Vendor",b=s&&n.getParameter(s.UNMASKED_RENDERER_WEBGL)||n.getParameter(n.RENDERER)||(r?"WebGL 2.0 VGA":"WebGL 1.0 VGA"),C=n.getParameter(n.MAX_TEXTURE_SIZE)||4096,T=r?n.getParameter(n.MAX_DRAW_BUFFERS)||4:1,I=r?n.getParameter(n.MAX_COLOR_ATTACHMENTS)||4:1;a={available:!0,webgl2:r,webgpu:typeof navigator<"u"&&!!navigator.gpu,colorBufferFloat:i,floatLinear:_,offscreenCanvas:typeof OffscreenCanvas<"u",vendor:String(u),renderer:String(b),maxTexSize:C,maxDrawBuffers:T,maxColorAttachments:I};let p=n.getExtension("WEBGL_lose_context");p&&p.loseContext()}}}catch{}return{logicalCores:t,devMemGb:e,maxRamMb:Math.max(8192,e*1024*2),gpu:a}})(),Un={ramMode:"auto",ramMb:St(Math.round(Pe.devMemGb*1024*.5),512,8192),multiThread:!0,cpuCores:Pe.logicalCores,threadPriority:"turbo",useGpu:Pe.gpu.available,gpuPower:"high-performance",gpuPipeline:"full"},$t=(()=>{try{let t=Fn.getItem(_a);if(!t)return{...Un};let e=JSON.parse(t);return{...Un,...e,ramMb:St(Number(e.ramMb)||Un.ramMb,128,16384),cpuCores:St(Number(e.cpuCores)||Un.cpuCores,1,64)}}catch{return{...Un}}})(),Yo=new Set;function Qo(){return $t}function rr(){return Pe}function wa(t){let e={...$t,...typeof t=="function"?t($t):t};e.ramMode==="auto"?e.ramMb=St(Math.round(Pe.devMemGb*1024*.5),512,8192):e.ramMb=St(Math.round(Number(e.ramMb)||1024),128,16384),e.cpuCores=St(Math.round(Number(e.cpuCores)||1),1,64),e.multiThread||(e.cpuCores=1),$t=e;try{Fn.setItem(_a,JSON.stringify($t))}catch{}return Yo.forEach(a=>{try{a($t)}catch{}}),$t}function sr(){return wa({...Un,cpuCores:Pe.logicalCores})}function ir(t){return Yo.add(t),()=>Yo.delete(t)}let Zt=(()=>{let t=0,e=0,a=0,l=0,n=new Map,r=()=>($t.ramMb||1024)*1024*1024,s=()=>{try{if(typeof performance<"u"&&performance.memory&&performance.memory.usedJSHeapSize)return+(performance.memory.usedJSHeapSize/(1024*1024)).toFixed(1)}catch{}return null};function i(){t=0,e=0,a=0,l=0}function _(p){l++,t+=p,t>e&&(e=t),t>r()*.85&&n.clear()}function u(p,x){let w=p.name+":"+x,y=n.get(w),G=x*(p.BYTES_PER_ELEMENT||1);if(y&&y.length>0){a++;let k=y.pop();return k.fill(0),_(G),k}let $=new p(x);return _(G),$}function b(p){if(!p||!p.buffer)return;let x=p.byteLength||0;if(t=Math.max(0,t-x),t<r()*.7){let w=p.constructor.name+":"+p.length,y=n.get(w);y||(y=[],n.set(w,y)),y.length<12&&y.push(p)}}function C(){n.clear(),t=0}function T(p){let x=$t.ramMb||1024,w=x<=256?.65:x<=512?.85:x<=1024?1:x<=2048?1.28:x<=4096?1.48:1.65,y=x<=256?560:x<=512?1024:2560,G=St(Math.round(p||840*Math.min(1.48,w)),160,y),$=St(Math.round(18e3*w),1e4,64e3),k=St(Math.floor(x*1024*64/Math.max(256,G*16)),16,512);return{effMaxDim:G,maxSamples:$,stripRows:k,ramMb:x,budgetBytes:x*1024*1024}}function I(){let p=s(),x=+Math.max(e/(1024*1024),(p||0)*.35).toFixed(1);return{allocatedMb:$t.ramMb,peakMb:Math.max(4.2,x),currentMb:+(t/(1024*1024)).toFixed(1),heapMb:p,reusedBuffers:a,totalAllocations:l}}return{beginSession:i,acquire:u,release:b,flush:C,computeRamCaps:T,getStats:I,trackAlloc:_}})(),pe=(()=>{let t=0,e=0,a=0,l=0,n=0,r=0,s=0,i=new Map,_={texRawRGBA:{bpp:4,scale:"pix",desc:"RGBA8Unorm \xB7 Citra Asli Pasca Alpha-Flatten"},texFltRGBA:{bpp:4,scale:"pix",desc:"RGBA8Unorm \xB7 Citra Hasil Bilateral Corner-Preserving"},texLabGrad:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 Kanal (L*/thinLab, a*/nearFlt, b*/nearRaw, luma/mask)"},texEdgeField:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 DiZenzo Scharr 2D (gx, gy, mag, lum)"},texTensor:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 Structure Tensor 3x3 (nx, ny, coh, corner)"},texFlanks:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 Normal-Ray Unmixing (flankA, flankB, alpha, perp)"},texLabelsA:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 Ping-Pong Label Map A (label, mask, detailProt, anchor)"},texLabelsB:{bpp:16,scale:"pix",desc:"RGBA32F \xB7 Ping-Pong Label Map B (label, mask, detailProt, anchor)"},texPalLut:{bpp:16,scale:"lut",desc:"RGBA32F \xB7 Tabel Pasangan Palet (palDist2, palIsMidBlend, palRGB)"},bufVerticesA:{bpp:16,scale:"vtx",desc:"RGBA32F \xB7 Kisi Verteks Sub-Piksel A (vx, vy, val, pin)"},bufVerticesB:{bpp:16,scale:"vtx",desc:"RGBA32F \xB7 Kisi Verteks Sub-Piksel B (vx, vy, val, pin)"}};function u(y,G){let $=y*G,k=(y+1)*(G+1),O=0;return Object.values(_).forEach(S=>{S.scale==="lut"?O+=4096*64*S.bpp:O+=(S.scale==="vtx"?k:$)*S.bpp}),O}function b(){let y=$t&&$t.ramMb||1024;return Math.min(y*1024*1024*.45,768*1024*1024)}function C(y){i.forEach(G=>{try{y&&G.tex&&y.deleteTexture(G.tex),y&&G.fbo&&y.deleteFramebuffer(G.fbo)}catch{}}),i.clear(),a=0,t=0,e=0}function T(y,G,$,k,O){let S=_[G]||{bpp:4,scale:"pix",desc:G},R=S.scale==="vtx"?$+1:$,g=S.scale==="vtx"?k+1:k,f=S.bpp===16&&O,o=f?y.RGBA32F:y.RGBA8,h=y.RGBA,A=f?y.FLOAT:y.UNSIGNED_BYTE,U=R*g*(f?16:4),P=i.get(G);if(P&&P.w===R&&P.h===g&&P.isFloat===f&&P.tex)return n++,P;if(P){try{P.tex&&y.deleteTexture(P.tex),P.fbo&&y.deleteFramebuffer(P.fbo)}catch{}a=Math.max(0,a-(P.byteSize||0)),i.delete(G)}let c=y.createTexture();y.bindTexture(y.TEXTURE_2D,c),y.pixelStorei(y.UNPACK_FLIP_Y_WEBGL,0),y.pixelStorei(y.UNPACK_ALIGNMENT,1),y.texParameteri(y.TEXTURE_2D,y.TEXTURE_MIN_FILTER,y.NEAREST),y.texParameteri(y.TEXTURE_2D,y.TEXTURE_MAG_FILTER,y.NEAREST),y.texParameteri(y.TEXTURE_2D,y.TEXTURE_WRAP_S,y.CLAMP_TO_EDGE),y.texParameteri(y.TEXTURE_2D,y.TEXTURE_WRAP_T,y.CLAMP_TO_EDGE),y.texImage2D(y.TEXTURE_2D,0,o,R,g,0,h,A,null);let E=y.createFramebuffer();y.bindFramebuffer(y.FRAMEBUFFER,E),y.framebufferTexture2D(y.FRAMEBUFFER,y.COLOR_ATTACHMENT0,y.TEXTURE_2D,c,0);let q=y.checkFramebufferStatus(y.FRAMEBUFFER);if(y.bindFramebuffer(y.FRAMEBUFFER,null),q!==y.FRAMEBUFFER_COMPLETE)return y.deleteFramebuffer(E),y.deleteTexture(c),f?T(y,G,$,k,!1):null;r++,a+=U,a>l&&(l=a),Zt.trackAlloc(U);let Q={name:G,tex:c,fbo:E,w:R,h:g,internalFormat:o,format:h,type:A,isFloat:f,byteSize:U,desc:S.desc};return i.set(G,Q),Q}function I(y,G,$,k,O){u(G,$)>b()*1.35&&C(y),(t!==G||e!==$)&&(C(y),t=G,e=$);let R=O||Object.keys(_),g={};for(let f of R){let o=T(y,f,G,$,k);if(!o)return null;g[f]=o}return g}function p(y){return i.get(y)||null}function x(){s++,i.clear(),a=0,t=0,e=0}function w(){return{activeDim:t&&e?`${t}\xD7${e}`:"Idle",activeSlots:i.size,totalSlotSpecs:Object.keys(_).length,currentVramMb:+(a/(1024*1024)).toFixed(2),peakVramMb:+(l/(1024*1024)).toFixed(2),vramBudgetMb:+(b()/(1024*1024)).toFixed(0),reusedCount:n,allocCount:r,contextLostCount:s,slotList:Array.from(i.values()).map(y=>({name:y.name,dim:`${y.w}\xD7${y.h}`,fmt:y.isFloat?"RGBA32F":"RGBA8",mb:+(y.byteSize/(1024*1024)).toFixed(2)}))}}return{SLOT_SPECS:_,estimateRequiredVramBytes:u,vramBudgetBytes:b,ensureWorkspace:I,allocateSlot:T,getSlot:p,releaseAll:C,notifyContextLost:x,getStats:w}})(),xe=(()=>{let t=null,e={checked:!1,supported:!1,adapterName:null,device:null},a=null;async function l(){if(e.checked&&e.device)return e;e.checked=!0;try{if(typeof navigator<"u"&&navigator.gpu){let J=await navigator.gpu.requestAdapter({powerPreference:$t&&$t.gpuPower||"high-performance"});if(J){let ut=J.info||{},mt=await J.requestDevice();e.supported=!0,e.adapterName=ut.description||ut.vendor||"WebGPU Hardware Adapter",e.device=mt,mt.lost.then(()=>{e.device=null,e.checked=!1})}}}catch{e.supported=!1}return e}function n(J,ut){try{if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(J,ut)}catch{}let mt=Ue.createElement("canvas");return mt.width=J,mt.height=ut,mt}function r(J){let ut=J||$t&&$t.gpuPower||"high-performance";if(t&&t.pref===ut&&t.gl&&!t.gl.isContextLost())return t;try{let mt=n(64,64),it=mt.getContext("webgl2",{powerPreference:ut,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1});if(!it)return null;let nt=!!it.getExtension("EXT_color_buffer_float"),lt=!!it.getExtension("OES_texture_float_linear"),ht=it.createVertexArray();it.bindVertexArray(ht);let gt=it.createBuffer();return it.bindBuffer(it.ARRAY_BUFFER,gt),it.bufferData(it.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),it.STATIC_DRAW),it.enableVertexAttribArray(0),it.vertexAttribPointer(0,2,it.FLOAT,!1,0,0),it.bindVertexArray(null),mt.addEventListener&&mt.addEventListener("webglcontextlost",ct=>{ct.preventDefault(),pe.notifyContextLost(),t=null},!1),t={gl:it,cv:mt,pref:ut,extFloat:nt,extFloatLinear:lt,vao:ht,quadBuf:gt,progs:{}},t}catch{return null}}function s(J,ut,mt){let it=(gt,ct)=>{let bt=J.createShader(gt);return J.shaderSource(bt,ct),J.compileShader(bt),J.getShaderParameter(bt,J.COMPILE_STATUS)?bt:(J.deleteShader(bt),null)},nt=it(J.VERTEX_SHADER,ut),lt=it(J.FRAGMENT_SHADER,mt);if(!nt||!lt)return null;let ht=J.createProgram();return J.bindAttribLocation(ht,0,"a_pos"),J.attachShader(ht,nt),J.attachShader(ht,lt),J.linkProgram(ht),J.deleteShader(nt),J.deleteShader(lt),J.getProgramParameter(ht,J.LINK_STATUS)?ht:(J.deleteProgram(ht),null)}let i=`#version 300 es
  layout(location = 0) in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`,_=`#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  in vec2 v_uv;
  out vec4 outLab;

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  void main() {
    vec4 px = texture(u_tex, v_uv);
    float R = srgbLin(px.r);
    float G = srgbLin(px.g);
    float B = srgbLin(px.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X);
    float fy = labF(Y);
    float fz = labF(Z);
    float L = 116.0 * fy - 16.0;
    float a = 500.0 * (fx - fy);
    float b = 200.0 * (fy - fz);
    float luma = dot(px.rgb * 255.0, vec3(0.299, 0.587, 0.114));
    outLab = vec4(L, a, b, luma);
  }`,u=`#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform float u_inv2Sp;
  uniform float u_inv2Col;
  uniform float u_wedgeThr;
  uniform int u_radius;
  in vec2 v_uv;
  out vec4 outColor;

  float cdist2(vec3 c1, vec3 c2) {
    vec3 d = (c1 - c2) * 255.0;
    float rm = (c1.r + c2.r) * 127.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    if (center.a < 0.05) { outColor = center; return; }

    /* 1. Wedge Aperture Guard 8-arah & Contiguous-4 Guard (melindungi sudut lancip <= 135 derajat) */
    const ivec2 RING[8] = ivec2[8](
      ivec2(1, 0), ivec2(1, 1), ivec2(0, 1), ivec2(-1, 1),
      ivec2(-1, 0), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1)
    );
    int simN = 0;
    int ringBits = 0;
    for (int k = 0; k < 8; k++) {
      ivec2 np = clamp(p0 + RING[k], ivec2(0), sz - ivec2(1));
      vec4 nb = texelFetch(u_tex, np, 0);
      if (nb.a >= 0.05 && cdist2(center.rgb, nb.rgb) < u_wedgeThr) {
        simN++;
        ringBits |= (1 << k);
      }
    }
    if (simN <= 3) { outColor = center; return; }
    if (simN == 4) {
      int dbl = ringBits | (ringBits << 8);
      for (int k = 0; k < 8; k++) {
        if (((dbl >> k) & 15) == 15) { outColor = center; return; }
      }
    }

    /* 2. Guard Lembah Garis (1D Valley/Crease) & Punggung Detail 1-2px (Garis Jari, Bulu Mata, Helai Rambut) */
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(center.rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int k = 0; k < 4; k++) {
        ivec2 d = DIRS[k];
        float lA1 = dot(texelFetch(u_tex, p0 - d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB1 = dot(texelFetch(u_tex, p0 + d, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lA2 = dot(texelFetch(u_tex, p0 - d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lB2 = dot(texelFetch(u_tex, p0 + d * 2, 0).rgb, vec3(0.299, 0.587, 0.114)) * 255.0;
        float lMaxA = max(lA1, lA2);
        float lMaxB = max(lB1, lB2);
        float lMinA = min(lA1, lA2);
        float lMinB = min(lB1, lB2);
        if ((l0 < lMaxA - 3.8 && l0 < lMaxB - 3.8) || (l0 > lMinA + 5.5 && l0 > lMinB + 5.5)) {
          outColor = center;
          return;
        }
      }
    }

    float localInv2Col = (simN <= 5) ? (u_inv2Col * 2.8) : u_inv2Col;
    vec3 sumRgb = vec3(0.0);
    float sumW = 0.0;
    int R = clamp(u_radius, 1, 3);
    for (int dy = -3; dy <= 3; dy++) {
      if (dy < -R || dy > R) continue;
      for (int dx = -3; dx <= 3; dx++) {
        if (dx < -R || dx > R) continue;
        ivec2 np = clamp(p0 + ivec2(dx, dy), ivec2(0), sz - ivec2(1));
        vec4 s = texelFetch(u_tex, np, 0);
        if (s.a < 0.05) continue;
        float d2 = float(dx * dx + dy * dy);
        float wSp = exp(-d2 * u_inv2Sp);
        float wCol = exp(-cdist2(center.rgb, s.rgb) * localInv2Col);
        float w = wSp * wCol;
        sumRgb += s.rgb * w;
        sumW += w;
      }
    }
    vec3 finalRgb = sumW > 1e-6 ? floor((sumRgb / sumW) * 255.0 + 0.5) / 255.0 : center.rgb;
    outColor = vec4(finalRgb, center.a);
  }`,b=`#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform int u_mode; /* 0 = keep, 1 = white / custom */
  uniform vec3 u_bg255;
  in vec2 v_uv;
  out vec4 outColor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 c0 = texelFetch(u_tex, p0, 0);
    vec3 c255 = c0.rgb * 255.0;
    float a = c0.a;

    if (u_mode == 0) {
      bool nearSolid = false;
      if (a >= 0.25 && a < 0.45) {
        for (int dy = -1; dy <= 1; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -1; dx <= 1; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            if (texelFetch(u_tex, ivec2(nx, ny), 0).a * 255.0 >= 209.5) {
              nearSolid = true;
            }
          }
        }
      }
      float cut = nearSolid ? 0.25 : 0.40;
      if (a < cut) {
        outColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
      if (a < 0.98) {
        vec3 fgRgb = vec3(0.0);
        float fgW = 0.0;
        for (int dy = -3; dy <= 3; dy++) {
          int ny = p0.y + dy;
          if (ny < 0 || ny >= sz.y) continue;
          for (int dx = -3; dx <= 3; dx++) {
            int nx = p0.x + dx;
            if (nx < 0 || nx >= sz.x) continue;
            vec4 nb = texelFetch(u_tex, ivec2(nx, ny), 0);
            if (nb.a * 255.0 >= 244.5) {
              float wgt = 1.0 / (float(dx * dx + dy * dy) + 0.5);
              fgRgb += (nb.rgb * 255.0) * wgt;
              fgW += wgt;
            }
          }
        }
        vec3 res255 = c255;
        if (fgW > 0.0) {
          vec3 ir = fgRgb / fgW;
          res255 = clamp(floor(ir * 0.88 + c255 * 0.12 + 0.5), 0.0, 255.0);
        }
        outColor = vec4(res255 / 255.0, 1.0);
        return;
      }
    }
    vec3 flat255 = clamp(floor(c255 * a + u_bg255 * (1.0 - a) + 0.5), 0.0, 255.0);
    outColor = vec4(flat255 / 255.0, 1.0);
  }`,C=`#version 300 es
  precision highp float;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outEdge;

  vec3 getCh(ivec2 p, ivec2 sz) {
    ivec2 cp = clamp(p, ivec2(0), sz - ivec2(1));
    vec3 rgb = texelFetch(u_tex, cp, 0).rgb * 255.0;
    float lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float cRG = (rgb.r - rgb.g) * 0.55;
    float cBY = (0.5 * (rgb.r + rgb.g) - rgb.b) * 0.45;
    return vec3(lum, cRG, cBY);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 center = texelFetch(u_tex, p0, 0);
    vec3 c11 = getCh(p0, sz);
    if (center.a < 0.05) {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
      return;
    }

    vec3 c00 = getCh(p0 + ivec2(-1, -1), sz);
    vec3 c10 = getCh(p0 + ivec2( 0, -1), sz);
    vec3 c20 = getCh(p0 + ivec2( 1, -1), sz);
    vec3 c01 = getCh(p0 + ivec2(-1,  0), sz);
    vec3 c21 = getCh(p0 + ivec2( 1,  0), sz);
    vec3 c02 = getCh(p0 + ivec2(-1,  1), sz);
    vec3 c12 = getCh(p0 + ivec2( 0,  1), sz);
    vec3 c22 = getCh(p0 + ivec2( 1,  1), sz);

    vec3 gx3 = (-3.0 * c00 - 10.0 * c01 - 3.0 * c02 + 3.0 * c20 + 10.0 * c21 + 3.0 * c22) / 32.0;
    vec3 gy3 = (-3.0 * c00 - 10.0 * c10 - 3.0 * c20 + 3.0 * c02 + 10.0 * c12 + 3.0 * c22) / 32.0;

    float gxx = dot(gx3, gx3);
    float gyy = dot(gy3, gy3);
    float gxy = dot(gx3, gy3);
    float tr = gxx + gyy;
    if (tr > 1e-6) {
      float df = gxx - gyy;
      float disc = sqrt(df * df + 4.0 * gxy * gxy);
      float lambda1 = max(0.0, 0.5 * (tr + disc));
      float mag = sqrt(lambda1);
      float theta = 0.5 * atan(2.0 * gxy, df);
      float vx = cos(theta), vy = sin(theta);
      float alx = abs(gx3.x), arx = abs(gx3.y), abx = abs(gx3.z);
      float domX = (alx >= arx && alx >= abx) ? gx3.x : ((arx >= abx) ? gx3.y : gx3.z);
      float aly = abs(gy3.x), ary = abs(gy3.y), aby = abs(gy3.z);
      float domY = (aly >= ary && aly >= aby) ? gy3.x : ((ary >= aby) ? gy3.y : gy3.z);
      if (vx * domX + vy * domY < 0.0) { vx = -vx; vy = -vy; }
      outEdge = vec4(vx * mag, vy * mag, mag, c11.x);
    } else {
      outEdge = vec4(0.0, 0.0, 0.0, c11.x);
    }
  }`,T=`#version 300 es
  precision highp float;
  uniform sampler2D u_edgeTex;
  uniform vec2 u_res;
  in vec2 v_uv;
  out vec4 outTensor;

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 e11 = texelFetch(u_edgeTex, p0, 0);
    if (e11.b < 1.5) {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    int xm1 = max(0, p0.x - 1), xp1 = min(sz.x - 1, p0.x + 1);
    int ym1 = max(0, p0.y - 1), yp1 = min(sz.y - 1, p0.y + 1);

    vec2 g00 = texelFetch(u_edgeTex, ivec2(xm1, ym1), 0).rg;
    vec2 g01 = texelFetch(u_edgeTex, ivec2(p0.x, ym1), 0).rg;
    vec2 g02 = texelFetch(u_edgeTex, ivec2(xp1, ym1), 0).rg;
    vec2 g10 = texelFetch(u_edgeTex, ivec2(xm1, p0.y), 0).rg;
    vec2 g11 = e11.rg;
    vec2 g12 = texelFetch(u_edgeTex, ivec2(xp1, p0.y), 0).rg;
    vec2 g20 = texelFetch(u_edgeTex, ivec2(xm1, yp1), 0).rg;
    vec2 g21 = texelFetch(u_edgeTex, ivec2(p0.x, yp1), 0).rg;
    vec2 g22 = texelFetch(u_edgeTex, ivec2(xp1, yp1), 0).rg;

    float jxx = (
      g00.x * g00.x + 2.0 * g01.x * g01.x + g02.x * g02.x +
      2.0 * g10.x * g10.x + 4.0 * g11.x * g11.x + 2.0 * g12.x * g12.x +
      g20.x * g20.x + 2.0 * g21.x * g21.x + g22.x * g22.x
    ) * 0.0625;
    float jxy = (
      g00.x * g00.y + 2.0 * g01.x * g01.y + g02.x * g02.y +
      2.0 * g10.x * g10.y + 4.0 * g11.x * g11.y + 2.0 * g12.x * g12.y +
      g20.x * g20.y + 2.0 * g21.x * g21.y + g22.x * g22.y
    ) * 0.0625;
    float jyy = (
      g00.y * g00.y + 2.0 * g01.y * g01.y + g02.y * g02.y +
      2.0 * g10.y * g10.y + 4.0 * g11.y * g11.y + 2.0 * g12.y * g12.y +
      g20.y * g20.y + 2.0 * g21.y * g21.y + g22.y * g22.y
    ) * 0.0625;

    float tr = jxx + jyy;
    if (tr > 1e-3) {
      float df = jxx - jyy;
      float disc = sqrt(df * df + 4.0 * jxy * jxy);
      float l2 = max(0.0, 0.5 * (tr - disc));
      float coh = (disc / tr) * (disc / tr);
      float corner = sqrt(l2);
      float theta = 0.5 * atan(2.0 * jxy, df);
      float vx = cos(theta), vy = sin(theta);
      if (vx * g11.x + vy * g11.y < 0.0) { vx = -vx; vy = -vy; }
      outTensor = vec4(vx, vy, coh, corner);
    } else {
      outTensor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }`,I=`#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  uniform vec3 u_palLab[64];
  in vec2 v_uv;
  out vec4 outNear;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  float srgbLin(float c) {
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
  }
  float labF(float t) {
    const float eps = 216.0 / 24389.0;
    const float kap = 24389.0 / 27.0;
    return (t > eps) ? pow(t, 1.0 / 3.0) : ((kap * t + 16.0) / 116.0);
  }
  vec3 rgb255ToLab(vec3 rgb255) {
    vec3 u = rgb255 / 255.0;
    float R = srgbLin(u.r), G = srgbLin(u.g), B = srgbLin(u.b);
    float X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    float Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    float Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    float fx = labF(X), fy = labF(Y), fz = labF(Z);
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  int findNearestPal(vec3 rgb255) {
    if (u_K == 2) {
      float d0 = cdist2_255(rgb255, u_palRgb[0]);
      float d1 = cdist2_255(rgb255, u_palRgb[1]);
      return (d0 <= d1) ? 0 : 1;
    }
    vec3 lab = rgb255ToLab(rgb255);
    int bestI = 0;
    float bestD = 1e30;
    for (int k = 0; k < 64; k++) {
      if (k >= u_K) break;
      vec3 dl = lab - u_palLab[k];
      float d2 = dot(dl, dl);
      if (d2 < bestD) { bestD = d2; bestI = k; }
    }
    return bestI;
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 raw0 = texelFetch(u_rawTex, p0, 0);
    if (raw0.a < 0.05) {
      outNear = vec4(-1.0, -1.0, -1.0, 1.0);
      return;
    }

    int thinK = -1;
    vec3 r0 = raw0.rgb * 255.0;
    if (p0.x >= 2 && p0.x < sz.x - 2 && p0.y >= 2 && p0.y < sz.y - 2) {
      float l0 = dot(r0, vec3(0.299, 0.587, 0.114));
      const ivec2 DIRS[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
      for (int dIdx = 0; dIdx < 4; dIdx++) {
        ivec2 d = DIRS[dIdx];
        ivec2 pA2 = p0 - d * 2;
        ivec2 pB2 = p0 + d * 2;
        vec4 cA2 = texelFetch(u_rawTex, pA2, 0);
        vec4 cB2 = texelFetch(u_rawTex, pB2, 0);
        if (cA2.a < 0.05 || cB2.a < 0.05) continue;
        vec3 rgbA2 = cA2.rgb * 255.0;
        vec3 rgbB2 = cB2.rgb * 255.0;
        if (cdist2_255(rgbA2, rgbB2) > 1800.0) continue;

        float lA = dot(rgbA2, vec3(0.299, 0.587, 0.114));
        float lB = dot(rgbB2, vec3(0.299, 0.587, 0.114));
        float lA1 = dot(texelFetch(u_rawTex, p0 - d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float lB1 = dot(texelFetch(u_rawTex, p0 + d, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
        float bgLum = 0.5 * (lA + lB);
        float dip = min(lA, lB) - l0;
        float peak = l0 - max(lA, lB);
        bool isLocalValley = (dip >= 36.0 && l0 <= min(lA1, lB1) - 10.0);
        bool isLocalRidge  = (peak >= 36.0 && l0 >= max(lA1, lB1) + 10.0);
        if (isLocalValley || isLocalRidge) {
          ivec2 pT1 = p0 + ivec2(d.y, -d.x);
          ivec2 pT2 = p0 + ivec2(-d.y, d.x);
          float lT1 = dot(texelFetch(u_rawTex, pT1, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          float lT2 = dot(texelFetch(u_rawTex, pT2, 0).rgb * 255.0, vec3(0.299, 0.587, 0.114));
          bool tangOk = isLocalValley
            ? (min(lT1, lT2) < min(lA, lB) - 18.0)
            : (max(lT1, lT2) > max(lA, lB) + 18.0);
          if (!tangOk) continue;
          vec3 bgRgb = 0.5 * (rgbA2 + rgbB2);
          float dBg0 = cdist2_255(r0, bgRgb);
          int bgK = 0; float bestBgD = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            float dB = cdist2_255(bgRgb, u_palRgb[k]);
            if (dB < bestBgD) { bestBgD = dB; bgK = k; }
          }
          int bestK = -1;
          float bestCost = 1e20;
          for (int k = 0; k < 64; k++) {
            if (k >= u_K) break;
            if (k == bgK) continue;
            vec3 pk = u_palRgb[k];
            if (cdist2_255(pk, bgRgb) < 1800.0) continue;
            vec3 v = pk - bgRgb;
            float vLen2 = dot(v, v);
            if (vLen2 < 200.0) continue;
            float alpha = clamp(dot(r0 - bgRgb, v) / vLen2, 0.0, 1.15);
            if (alpha < 0.36) continue;
            vec3 proj = bgRgb + min(1.0, alpha) * v;
            float perpD2 = cdist2_255(r0, proj);
            float directD2 = cdist2_255(r0, pk);
            float cost = perpD2 + directD2 * 0.28;
            if (cost < bestCost && perpD2 <= dBg0 * 0.28 + 480.0) {
              bestCost = cost; bestK = k;
            }
          }
          if (bestK >= 0) { thinK = bestK; break; }
        }
      }
    }

    int nearFlt = thinK;
    int nearRaw = thinK;
    if (thinK < 0) {
      vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
      nearFlt = findNearestPal(f0);
      nearRaw = findNearestPal(r0);
    }
    outNear = vec4(float(thinK), float(nearFlt), float(nearRaw), 0.0);
  }`,p=`#version 300 es
  precision highp float;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_nearTex;
  uniform vec2 u_res;
  uniform int u_K;
  uniform vec3 u_palRgb[64];
  in vec2 v_uv;
  out vec4 outFlank;

  float cdist2_255(vec3 c1, vec3 c2) {
    vec3 d = c1 - c2;
    float rm = (c1.r + c2.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }

  vec3 evalBlendPair(vec3 rgb, vec3 CA, vec3 CB) {
    vec3 d = CA - CB;
    float len2 = dot(d, d);
    float abD2 = cdist2_255(CA, CB);
    if (len2 < 120.0 || abD2 < 320.0) return vec3(0.0, 0.0, 0.0);

    float t = dot(rgb - CB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return vec3(0.0, 0.0, 0.0);

    vec3 pLin = CB + t * d;
    float perpD2 = cdist2_255(rgb, pLin);

    float tc = clamp(t, 0.02, 0.98);
    vec3 g20 = sqrt(tc * CA * CA + (1.0 - tc) * CB * CB);
    perpD2 = min(perpD2, cdist2_255(rgb, g20));

    vec3 g22 = pow(
      tc * pow(max(CA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(CB, vec3(0.0)), vec3(2.2)),
      vec3(1.0 / 2.2)
    );
    perpD2 = min(perpD2, cdist2_255(rgb, g22));

    float maxAllowedPerp = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowedPerp) return vec3(0.0, 0.0, 0.0);

    return vec3(t, perpD2, 1.0);
  }

  void main() {
    ivec2 sz = ivec2(u_res);
    ivec2 p0 = clamp(ivec2(gl_FragCoord.xy), ivec2(0), sz - ivec2(1));
    vec4 defOut = vec4(-1.0, -1.0, 0.5, 0.0);
    if (p0.x < 1 || p0.x >= sz.x - 1 || p0.y < 1 || p0.y >= sz.y - 1) {
      outFlank = defOut;
      return;
    }

    vec4 near0 = texelFetch(u_nearTex, p0, 0);
    float mp0 = texelFetch(u_edgeTex, p0, 0).b;
    if (near0.a > 0.5 || mp0 < 4.5) {
      outFlank = defOut;
      return;
    }

    vec4 ten = texelFetch(u_tensorTex, p0, 0);
    float nx = ten.r, ny = ten.g;
    if (nx == 0.0 && ny == 0.0) {
      outFlank = defOut;
      return;
    }

    ivec2 bestPos = ivec2(-1, -1);
    ivec2 bestNeg = ivec2(-1, -1);
    float bestPosMag = 1e20;
    float bestNegMag = 1e20;

    for (int s = 1; s <= 3; s++) {
      int px = clamp(int(floor(float(p0.x) + nx * float(s) + 0.5)), 0, sz.x - 1);
      int py = clamp(int(floor(float(p0.y) + ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 pp = ivec2(px, py);
      if (texelFetch(u_nearTex, pp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, pp, 0).b + float(s) * 1.1;
        if (mScore < bestPosMag) { bestPosMag = mScore; bestPos = pp; }
      }

      int mx = clamp(int(floor(float(p0.x) - nx * float(s) + 0.5)), 0, sz.x - 1);
      int my = clamp(int(floor(float(p0.y) - ny * float(s) + 0.5)), 0, sz.y - 1);
      ivec2 mp = ivec2(mx, my);
      if (texelFetch(u_nearTex, mp, 0).a < 0.5) {
        float mScore = texelFetch(u_edgeTex, mp, 0).b + float(s) * 1.1;
        if (mScore < bestNegMag) { bestNegMag = mScore; bestNeg = mp; }
      }
    }

    if (bestPos.x < 0 || bestNeg.x < 0 || (bestPos.x == bestNeg.x && bestPos.y == bestNeg.y)) {
      outFlank = defOut;
      return;
    }
    if (texelFetch(u_edgeTex, bestPos, 0).b > mp0 * 0.55 || texelFetch(u_edgeTex, bestNeg, 0).b > mp0 * 0.55) {
      outFlank = defOut;
      return;
    }

    int LA = int(floor(texelFetch(u_nearTex, bestPos, 0).g + 0.5));
    int LB = int(floor(texelFetch(u_nearTex, bestNeg, 0).g + 0.5));
    if (LA == LB || LA < 0 || LB < 0 || LA >= u_K || LB >= u_K) {
      outFlank = defOut;
      return;
    }

    vec3 r0 = texelFetch(u_rawTex, p0, 0).rgb * 255.0;
    vec3 f0 = texelFetch(u_fltTex, p0, 0).rgb * 255.0;
    vec3 CA = u_palRgb[LA];
    vec3 CB = u_palRgb[LB];

    vec3 blPal = evalBlendPair(r0, CA, CB);
    if (blPal.z < 0.5) {
      blPal = evalBlendPair((r0 + f0) * 0.5, CA, CB);
    }
    if (blPal.z < 0.5) {
      outFlank = defOut;
      return;
    }

    vec3 CposLocal = texelFetch(u_fltTex, bestPos, 0).rgb * 255.0;
    vec3 CnegLocal = texelFetch(u_fltTex, bestNeg, 0).rgb * 255.0;
    vec3 blLoc = evalBlendPair(r0, CposLocal, CnegLocal);

    float alpha = (blLoc.z > 0.5) ? (0.60 * blLoc.x + 0.40 * blPal.x) : blPal.x;
    float perp  = (blLoc.z > 0.5) ? min(blPal.y, blLoc.y) : blPal.y;
    outFlank = vec4(float(LA), float(LB), clamp(alpha, 0.0, 1.0), perp);
  }`;function x(J,ut,mt,it,nt){let{gl:lt,vao:ht,progs:gt}=J;if(!gt[ut]&&(gt[ut]=s(lt,i,mt),!gt[ut]))return!1;let ct=gt[ut];return lt.bindFramebuffer(lt.FRAMEBUFFER,it?it.fbo:null),lt.viewport(0,0,it?it.w:J.cv.width,it?it.h:J.cv.height),lt.useProgram(ct),lt.bindVertexArray(ht),nt&&nt(lt,ct),lt.drawArrays(lt.TRIANGLE_STRIP,0,4),lt.bindVertexArray(null),lt.bindFramebuffer(lt.FRAMEBUFFER,null),!0}function w(J,ut="texRawRGBA"){let mt=r($t.gpuPower);if(!mt)return null;let{gl:it}=mt,{w:nt,h:lt,data:ht}=J;if(nt>Pe.gpu.maxTexSize||lt>Pe.gpu.maxTexSize)return null;let gt=pe.allocateSlot(it,ut,nt,lt,!1);return gt?(it.bindTexture(it.TEXTURE_2D,gt.tex),it.pixelStorei(it.UNPACK_FLIP_Y_WEBGL,0),it.pixelStorei(it.UNPACK_ALIGNMENT,1),it.texSubImage2D(it.TEXTURE_2D,0,0,0,nt,lt,it.RGBA,it.UNSIGNED_BYTE,ht.data),gt):null}function y(J,ut,mt,it,nt,lt){let ht=pe.allocateSlot(J,ut,nt,lt,!1);if(!ht)return null;let gt=nt*lt,ct=mt;if(it){let bt=Zt.acquire(Uint8Array,gt*4);bt.set(mt);for(let Ct=0;Ct<gt;Ct++)bt[Ct*4+3]=it[Ct]?0:255;ct=bt}return J.bindTexture(J.TEXTURE_2D,ht.tex),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,0),J.pixelStorei(J.UNPACK_ALIGNMENT,1),J.texSubImage2D(J.TEXTURE_2D,0,0,0,nt,lt,J.RGBA,J.UNSIGNED_BYTE,ct),it&&ct!==mt&&Zt.release(ct),ht}function G(J,ut,mt,it,nt,lt=!1){let ht=pe.allocateSlot(J,ut,mt,it,lt);if(!ht)return null;let gt=!ht.isFloat&&!(nt instanceof Uint8Array)?new Uint8Array(nt.buffer,nt.byteOffset,nt.byteLength):nt;return J.bindTexture(J.TEXTURE_2D,ht.tex),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,0),J.pixelStorei(J.UNPACK_ALIGNMENT,1),J.texSubImage2D(J.TEXTURE_2D,0,0,0,ht.w,ht.h,J.RGBA,ht.isFloat?J.FLOAT:J.UNSIGNED_BYTE,gt),ht}function $(J){if(!$t.useGpu||$t.gpuPipeline==="off")return null;let ut=r($t.gpuPower);if(!ut)return null;let{w:mt,h:it}=J;if(mt>Pe.gpu.maxTexSize||it>Pe.gpu.maxTexSize)return null;let nt=pe.ensureWorkspace(ut.gl,mt,it,ut.extFloat,["texRawRGBA","texFltRGBA","texLabGrad","texEdgeField","texTensor","texFlanks","texLabelsA","texLabelsB","bufVerticesA","bufVerticesB"]);return nt?(w(J,"texRawRGBA"),{backend:e.supported?"WebGPU + WebGL2 FBO":"WebGL2 Zero-Copy FBO",extFloat:ut.extFloat,slots:nt}):null}function k(J,ut="keep",mt="#ffffff"){if(!$t.useGpu||$t.gpuPipeline==="off")return null;let it=r($t.gpuPower);if(!it)return null;let{gl:nt}=it,{w:lt,h:ht,data:gt}=J;if(lt>Pe.gpu.maxTexSize||ht>Pe.gpu.maxTexSize)return null;try{let ct=gt.data,bt=lt*ht,Ct=new Uint8Array(bt);for(let Dt=3,Yt=0;Dt<ct.length;Dt+=4,Yt++)Ct[Yt]=ct[Dt];J.origAlpha=Ct;let Tt=w(J,"texFltRGBA"),yt=pe.allocateSlot(nt,"texRawRGBA",lt,ht,!1);if(!Tt||!yt)return null;let pt=!1;for(let Dt=0;Dt<bt;Dt++)if(Ct[Dt]>=128){pt=!0;break}let Mt=ut==="custom"?un(mt||"#ffffff"):[255,255,255];if(!x(it,"alphaFlatten",b,yt,(Dt,Yt)=>{Dt.activeTexture(Dt.TEXTURE0),Dt.bindTexture(Dt.TEXTURE_2D,Tt.tex),Dt.uniform1i(Dt.getUniformLocation(Yt,"u_tex"),0),Dt.uniform2f(Dt.getUniformLocation(Yt,"u_res"),lt,ht),Dt.uniform1i(Dt.getUniformLocation(Yt,"u_mode"),ut==="keep"?0:1),Dt.uniform3f(Dt.getUniformLocation(Yt,"u_bg255"),Mt[0],Mt[1],Mt[2])}))return null;let Ft=Zt.acquire(Uint8Array,bt*4);nt.bindFramebuffer(nt.FRAMEBUFFER,yt.fbo),nt.readPixels(0,0,lt,ht,nt.RGBA,nt.UNSIGNED_BYTE,Ft),nt.bindFramebuffer(nt.FRAMEBUFFER,null);let wt=new Uint8Array(bt),Et=0;for(let Dt=0;Dt<bt;Dt++)Ft[Dt*4+3]===0?wt[Dt]=1:Et++;return pt&&Et===0?(Zt.release(Ft),null):(ct.set(Ft),Zt.release(Ft),wt)}catch{return null}}function O(J,ut){if(!$t.useGpu||$t.gpuPipeline==="off")return null;let mt=r($t.gpuPower);if(!mt||!mt.extFloat)return null;let{gl:it}=mt,{w:nt,h:lt,data:ht}=J;if(nt>Pe.gpu.maxTexSize||lt>Pe.gpu.maxTexSize)return null;try{let gt=y(it,"texFltRGBA",ht.data,ut,nt,lt),ct=pe.allocateSlot(it,"texEdgeField",nt,lt,!0);if(!gt||!ct||!ct.isFloat||!x(mt,"dizenzoScharr",C,ct,(Ft,wt)=>{Ft.activeTexture(Ft.TEXTURE0),Ft.bindTexture(Ft.TEXTURE_2D,gt.tex),Ft.uniform1i(Ft.getUniformLocation(wt,"u_tex"),0),Ft.uniform2f(Ft.getUniformLocation(wt,"u_res"),nt,lt)}))return null;let Ct=nt*lt,Tt=Zt.acquire(Float32Array,Ct*4);it.bindFramebuffer(it.FRAMEBUFFER,ct.fbo),it.readPixels(0,0,nt,lt,it.RGBA,it.FLOAT,Tt),it.bindFramebuffer(it.FRAMEBUFFER,null);let yt=new Float32Array(Ct),pt=new Float32Array(Ct),Mt=new Float32Array(Ct),vt=new Float32Array(Ct);for(let Ft=0;Ft<Ct;Ft++){let wt=Ft*4;yt[Ft]=Tt[wt+3],ut&&ut[Ft]||(pt[Ft]=Tt[wt],Mt[Ft]=Tt[wt+1],vt[Ft]=Tt[wt+2])}return Zt.release(Tt),{lum:yt,gx:pt,gy:Mt,mag:vt,gpuSlotReady:!0}}catch{return null}}function S(J,ut,mt,it,nt,lt){if(!$t.useGpu||$t.gpuPipeline!=="full")return null;let ht=r($t.gpuPower);if(!ht||!ht.extFloat)return null;let{gl:gt}=ht,{w:ct,h:bt}=J,Ct=nt?nt.length:0;if(Ct<2||Ct>64||ct>Pe.gpu.maxTexSize||bt>Pe.gpu.maxTexSize)return null;try{let Tt=y(gt,"texRawRGBA",ut,it,ct,bt),yt=y(gt,"texFltRGBA",mt,it,ct,bt),pt=pe.allocateSlot(gt,"texEdgeField",ct,bt,!0),Mt=pe.allocateSlot(gt,"texTensor",ct,bt,!0),vt=pe.allocateSlot(gt,"texLabGrad",ct,bt,!0),Ft=pe.allocateSlot(gt,"texFlanks",ct,bt,!0);if(!Tt||!yt||!pt||!Mt||!vt||!Ft||!x(ht,"dizenzoScharr",C,pt,(Nt,jt)=>{Nt.activeTexture(Nt.TEXTURE0),Nt.bindTexture(Nt.TEXTURE_2D,yt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_tex"),0),Nt.uniform2f(Nt.getUniformLocation(jt,"u_res"),ct,bt)})||!x(ht,"structureTensor",T,Mt,(Nt,jt)=>{Nt.activeTexture(Nt.TEXTURE0),Nt.bindTexture(Nt.TEXTURE_2D,pt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_edgeTex"),0),Nt.uniform2f(Nt.getUniformLocation(jt,"u_res"),ct,bt)}))return null;let Dt=new Float32Array(192),Yt=new Float32Array(192);for(let Nt=0;Nt<Ct;Nt++)Dt[Nt*3]=nt[Nt].r,Dt[Nt*3+1]=nt[Nt].g,Dt[Nt*3+2]=nt[Nt].b,Yt[Nt*3]=nt[Nt].L,Yt[Nt*3+1]=nt[Nt].a,Yt[Nt*3+2]=nt[Nt].b2;if(!x(ht,"thinAndNearest",I,vt,(Nt,jt)=>{Nt.activeTexture(Nt.TEXTURE0),Nt.bindTexture(Nt.TEXTURE_2D,Tt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_rawTex"),0),Nt.activeTexture(Nt.TEXTURE1),Nt.bindTexture(Nt.TEXTURE_2D,yt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_fltTex"),1),Nt.uniform2f(Nt.getUniformLocation(jt,"u_res"),ct,bt),Nt.uniform1i(Nt.getUniformLocation(jt,"u_K"),Ct),Nt.uniform3fv(Nt.getUniformLocation(jt,"u_palRgb[0]"),Dt),Nt.uniform3fv(Nt.getUniformLocation(jt,"u_palLab[0]"),Yt)})||!x(ht,"flankUnmix",p,Ft,(Nt,jt)=>{Nt.activeTexture(Nt.TEXTURE0),Nt.bindTexture(Nt.TEXTURE_2D,Tt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_rawTex"),0),Nt.activeTexture(Nt.TEXTURE1),Nt.bindTexture(Nt.TEXTURE_2D,yt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_fltTex"),1),Nt.activeTexture(Nt.TEXTURE2),Nt.bindTexture(Nt.TEXTURE_2D,pt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_edgeTex"),2),Nt.activeTexture(Nt.TEXTURE3),Nt.bindTexture(Nt.TEXTURE_2D,Mt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_tensorTex"),3),Nt.activeTexture(Nt.TEXTURE4),Nt.bindTexture(Nt.TEXTURE_2D,vt.tex),Nt.uniform1i(Nt.getUniformLocation(jt,"u_nearTex"),4),Nt.uniform2f(Nt.getUniformLocation(jt,"u_res"),ct,bt),Nt.uniform1i(Nt.getUniformLocation(jt,"u_K"),Ct),Nt.uniform3fv(Nt.getUniformLocation(jt,"u_palRgb[0]"),Dt)}))return null;let Rt=ct*bt,Gt=Zt.acquire(Float32Array,Rt*4),Ut=Zt.acquire(Float32Array,Rt*4),qt=Zt.acquire(Float32Array,Rt*4);gt.bindFramebuffer(gt.FRAMEBUFFER,Mt.fbo),gt.readPixels(0,0,ct,bt,gt.RGBA,gt.FLOAT,Gt),gt.bindFramebuffer(gt.FRAMEBUFFER,vt.fbo),gt.readPixels(0,0,ct,bt,gt.RGBA,gt.FLOAT,Ut),gt.bindFramebuffer(gt.FRAMEBUFFER,Ft.fbo),gt.readPixels(0,0,ct,bt,gt.RGBA,gt.FLOAT,qt),gt.bindFramebuffer(gt.FRAMEBUFFER,null);let Vt=new Float32Array(Rt),Bt=new Float32Array(Rt),Ot=new Float32Array(Rt),kt=new Float32Array(Rt),It=new Int16Array(Rt).fill(-1),Kt=new Int16Array(Rt).fill(-1),Jt=new Int16Array(Rt).fill(-1),zt=new Int16Array(Rt).fill(-1),ue=new Int16Array(Rt).fill(-1),ge=new Float32Array(Rt).fill(.5),Fe=new Float32Array(Rt);for(let Nt=0;Nt<Rt;Nt++){let jt=Nt*4;Vt[Nt]=Gt[jt],Bt[Nt]=Gt[jt+1],Ot[Nt]=Gt[jt+2],kt[Nt]=Gt[jt+3],It[Nt]=Math.round(Ut[jt]),Kt[Nt]=Math.round(Ut[jt+1]),Jt[Nt]=Math.round(Ut[jt+2]);let te=Math.round(qt[jt]),he=Math.round(qt[jt+1]);te>=0&&he>=0&&(zt[Nt]=te,ue[Nt]=he,ge[Nt]=qt[jt+2],Fe[Nt]=qt[jt+3])}return Zt.release(Gt),Zt.release(Ut),Zt.release(qt),{nxArr:Vt,nyArr:Bt,cohArr:Ot,cornerArr:kt,thinStrokeLab:It,rawNearestFlt:Kt,rawNearestRaw:Jt,flankA:zt,flankB:ue,flankAlpha:ge,flankPerp:Fe}}catch{return null}}let R=`
  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_fltTex;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_tensorTex;
  uniform sampler2D u_flankTex;
  uniform sampler2D u_nearTex;
  uniform sampler2D u_palLut;
  uniform vec2 u_res;
  uniform int u_K;

  vec3 fetchRaw(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_rawTex, c, 0).rgb * 255.0;
  }
  vec3 fetchFlt(ivec2 p) {
    ivec2 c = clamp(p, ivec2(0), ivec2(u_res) - ivec2(1));
    return texelFetch(u_fltTex, c, 0).rgb * 255.0;
  }
  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(v.b, g, b);
  }
  float fetchPalDist2(int a, int b) {
    if (a < 0 || b < 0 || a >= u_K || b >= u_K) return 0.0;
    return texelFetch(u_palLut, ivec2(a * u_K + b, 0), 0).r;
  }
  bool fetchPalIsMidBlend(int l, int a, int b) {
    if (l < 0 || a < 0 || b < 0 || l >= u_K || a >= u_K || b >= u_K) return false;
    return texelFetch(u_palLut, ivec2(a * u_K + b, l), 0).g > 0.5;
  }
  float cdist2(vec3 a, vec3 b) {
    vec3 d = a - b;
    float rm = (a.r + b.r) * 0.5;
    return (2.0 + rm / 256.0) * d.r * d.r + 4.0 * d.g * d.g + (2.0 + (255.0 - rm) / 256.0) * d.b * d.b;
  }
  bool evalColorBlendPair(vec3 p0, vec3 cA, vec3 cB, out float outT, out float outPerpD2) {
    vec3 d = cA - cB;
    float len2 = dot(d, d);
    float abD2 = cdist2(cA, cB);
    if (len2 < 120.0 || abD2 < 320.0) return false;
    float t = dot(p0 - cB, d) / len2;
    if (t <= 0.02 || t >= 0.98) return false;
    vec3 pr = cB + t * d;
    float perpD2 = cdist2(p0, pr);
    float tc = clamp(t, 0.02, 0.98);
    vec3 gr = sqrt(max(vec3(0.0), tc * cA * cA + (1.0 - tc) * cB * cB));
    perpD2 = min(perpD2, cdist2(p0, gr));
    vec3 gr22 = pow(max(vec3(0.0), tc * pow(max(cA, vec3(0.0)), vec3(2.2)) + (1.0 - tc) * pow(max(cB, vec3(0.0)), vec3(2.2))), vec3(1.0 / 2.2));
    perpD2 = min(perpD2, cdist2(p0, gr22));
    float maxAllowed = min(5400.0, 680.0 + abD2 * 0.022);
    if (perpD2 > maxAllowed) return false;
    outT = t;
    outPerpD2 = perpD2;
    return true;
  }
  /* 9-Bit Bitmask 4-Connected Component Counter (100% Identik dengan BFS wouldChangeTopology di seluruh 512 state 3x3) */
  int countComp4Mask(int mask9) {
    int rem = mask9 & 511;
    int c = 0;
    for (int k = 0; k < 5; k++) {
      if (rem == 0) break;
      int comp = rem & (-rem);
      for (int s = 0; s < 6; s++) {
        comp = (comp | ((comp & 219) << 1) | ((comp & 438) >> 1) | (comp << 3) | (comp >> 3)) & rem;
      }
      rem &= ~comp;
      c++;
    }
    return c;
  }
  bool wouldChangeTopoAt(ivec2 p, int fromL, int toL) {
    if (fromL == toL) return false;
    int maskFrom = 0;
    int maskTo = 0;
    int W = int(u_res.x);
    int H = int(u_res.y);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        if (i == 0 && j == 0) continue;
        int xx = p.x + i;
        int yy = p.y + j;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        int bit = 1 << ((j + 1) * 3 + (i + 1));
        int nl = int(round(texelFetch(u_labels, ivec2(xx, yy), 0).r));
        if (nl == fromL) maskFrom |= bit;
        if (nl == toL) maskTo |= bit;
      }
    }
    int beforeFrom = countComp4Mask(maskFrom | 16);
    int afterFrom = countComp4Mask(maskFrom);
    if (afterFrom > beforeFrom) return true;
    int beforeTo = countComp4Mask(maskTo);
    int afterTo = countComp4Mask(maskTo | 16);
    if (beforeTo >= 2 && afterTo < beforeTo) return true;
    return false;
  }
  `,g=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  uniform int u_pass;
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int L0 = int(round(curV.r));
    float isAnc = 0.0;
    if (p.x >= 1 && p.x < W - 1 && p.y >= 1 && p.y < H - 1 && curV.g < 0.5 && L0 >= 0) {
      float mag = texelFetch(u_edgeTex, p, 0).b;
      if (!(mag > 14.0 && u_pass == 0)) {
        int same = 0;
        if (int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r)) == L0) same++;
        if (int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r)) == L0) same++;
        if (same >= 3) {
          if (cdist2(fetchRaw(p), fetchPalRGB(L0)) < 1450.0) {
            isAnc = 1.0;
          }
        }
      }
    }
    outLabel = vec4(curV.r, curV.g, curV.b, isAnc);
  }`,f=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  out vec4 outLabel;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int curL = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.a > 0.5 || curL < 0 || tsLab == curL) {
      outLabel = curV;
      return;
    }
    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    if (lL == curL && lR == curL && lU == curL && lD == curL) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(curL));

    /* 1. Periksa pasangan jangkar normal gradien (flankA, flankB) terlebih dahulu */
    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fA = int(round(flk.r));
    int fB = int(round(flk.g));
    if (fA >= 0 && fB >= 0 && fA != curL && fB != curL) {
      if (fetchPalIsMidBlend(curL, fA, fB)) {
        float blT = 0.5, blPerp = 0.0;
        if (evalColorBlendPair(r0, fetchPalRGB(fA), fetchPalRGB(fB), blT, blPerp) && dCur > blPerp * 0.45) {
          int nextL = (flk.b >= 0.5) ? fA : fB;
          outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
          return;
        }
      }
    }

    /* 2. Evaluasi statistik jangkar lokal pada jendela 7x7 (hingga 12 label unik lokal) */
    int uLab[12];
    int uCnt[12];
    int uAnc[12];
    int nU = 0;
    for (int dy = -3; dy <= 3; dy++) {
      int ny = p.y + dy;
      if (ny < 0 || ny >= H) continue;
      for (int dx = -3; dx <= 3; dx++) {
        int nx = p.x + dx;
        if (nx < 0 || nx >= W) continue;
        vec4 nv = texelFetch(u_labels, ivec2(nx, ny), 0);
        int nl = int(round(nv.r));
        if (nl < 0) continue;
        int idx = -1;
        for (int k = 0; k < 12; k++) {
          if (k >= nU) break;
          if (uLab[k] == nl) { idx = k; break; }
        }
        if (idx < 0 && nU < 12) {
          idx = nU++;
          uLab[idx] = nl;
          uCnt[idx] = 0;
          uAnc[idx] = 0;
        }
        if (idx >= 0) {
          uCnt[idx] += 1;
          if (nv.a > 0.5) uAnc[idx] += 4;
        }
      }
    }
    if (nU < 2) {
      outLabel = curV;
      return;
    }

    /* Urutkan 4 kandidat teratas berdasarkan (anchorCounts + counts) */
    int topIdx[4];
    int maxCheck = min(nU, 4);
    int usedMask = 0;
    for (int t = 0; t < 4; t++) {
      if (t >= maxCheck) { topIdx[t] = -1; continue; }
      int bestK = -1, bestScore = -1;
      for (int k = 0; k < 12; k++) {
        if (k >= nU) break;
        if ((usedMask & (1 << k)) != 0) continue;
        int sc = uAnc[k] + uCnt[k];
        if (sc > bestScore) { bestScore = sc; bestK = k; }
      }
      topIdx[t] = bestK;
      if (bestK >= 0) usedMask |= (1 << bestK);
    }

    int curAnchor = 0, curTotal = 0;
    for (int k = 0; k < 12; k++) {
      if (k >= nU) break;
      if (uLab[k] == curL) { curAnchor = uAnc[k]; curTotal = uCnt[k]; break; }
    }

    int snapped = -1;
    float bestPerp = 1e20;
    for (int a = 0; a < 4; a++) {
      if (a >= maxCheck) break;
      int ia = topIdx[a];
      if (ia < 0) continue;
      int LA = uLab[ia];
      for (int b = a + 1; b < 4; b++) {
        if (b >= maxCheck) break;
        int ib = topIdx[b];
        if (ib < 0) continue;
        int LB = uLab[ib];
        if (uCnt[ia] + uCnt[ib] < 5) continue;
        if (LA != curL && LB != curL) {
          bool isPalMid = fetchPalIsMidBlend(curL, LA, LB);
          float blT = 0.5, blPerp = 0.0;
          if (!evalColorBlendPair(r0, fetchPalRGB(LA), fetchPalRGB(LB), blT, blPerp)) continue;
          if (!isPalMid && dCur < blPerp * 2.5 + 1200.0) continue;
          int ancAB = uAnc[ia] + uAnc[ib];
          if ((isPalMid && (curAnchor <= 4 || curTotal <= 16)) || (curAnchor == 0 && curTotal <= 6 && ancAB >= 12 && dCur > blPerp * 2.2)) {
            if (blPerp < bestPerp) {
              bestPerp = blPerp;
              snapped = (blT >= 0.5) ? LA : LB;
            }
          }
        }
      }
    }
    if (snapped >= 0 && snapped != curL) {
      outLabel = vec4(float(snapped), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`,o=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  uniform int u_colorPass;
  uniform float u_beta;
  uniform int u_checkTopo;
  out vec4 outLabel;

  float dataEnergyAt(ivec2 p, vec3 r0, vec3 flt0, float mag, int thinLab, int fA, int fB, float fAlpha, float fPerp, int l, float curBeta) {
    if (thinLab >= 0) {
      return (l == thinLab) ? 0.0 : (curBeta * 6.5 + 18000.0);
    }
    vec3 src = (mag > 5.5) ? r0 : flt0;
    float dBase = cdist2(src, fetchPalRGB(l));
    if (fA >= 0 && fB >= 0) {
      float abDist2 = fetchPalDist2(fA, fB);
      float scale = min(abDist2 * 0.28, curBeta * 3.0);
      if (l == fA) {
        float unmixCost = fPerp * 0.65 + (1.0 - fAlpha) * (1.0 - fAlpha) * scale;
        return min(dBase, unmixCost);
      }
      if (l == fB) {
        float unmixCost = fPerp * 0.65 + fAlpha * fAlpha * scale;
        return min(dBase, unmixCost);
      }
      if (fetchPalIsMidBlend(l, fA, fB) && dBase > fPerp * 0.5) {
        return dBase + curBeta * 3.6 + abDist2 * 0.25;
      }
    }
    return dBase;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    if (curV.g > 0.5 || cur < 0) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    /* Penjadwalan Kromatik 4-Warna (King's Graph 4-Coloring):
       Tidak ada dua piksel dengan paritas ((x & 1) + ((y & 1) << 1)) yang sama yang bertetangga-8! */
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    const ivec2 DIRS[8] = ivec2[8](
      ivec2( 1, 0), ivec2(-1, 0), ivec2(0,  1), ivec2(0, -1),
      ivec2( 1, 1), ivec2(-1, 1), ivec2(1, -1), ivec2(-1,-1)
    );
    const float W_DIR[8] = float[8](1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707);

    int nLabelBuf[8];
    int candBuf[12];
    int candLen = 1;
    candBuf[0] = cur;
    bool isBoundary = false;
    int sameOrtho = 0, sameDiag = 0;

    for (int k = 0; k < 8; k++) {
      ivec2 q = p + DIRS[k];
      if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) {
        nLabelBuf[k] = -2;
        continue;
      }
      int nl = int(round(texelFetch(u_labels, q, 0).r));
      nLabelBuf[k] = nl;
      if (nl == cur) {
        if (k < 4) sameOrtho++; else sameDiag++;
      } else if (nl >= 0) {
        isBoundary = true;
        bool seen = false;
        for (int ci = 0; ci < 12; ci++) {
          if (ci >= candLen) break;
          if (candBuf[ci] == nl) { seen = true; break; }
        }
        if (!seen && candLen < 12) candBuf[candLen++] = nl;
      }
    }
    if (!isBoundary) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 flt0 = fetchFlt(p);
    float mag = texelFetch(u_edgeTex, p, 0).b;
    vec4 ten = texelFetch(u_tensorTex, p, 0);
    float nx = ten.r, ny = ten.g, coh = ten.b, corner = ten.a;
    bool hasAniso = coh > 0.15 && (nx != 0.0 || ny != 0.0);
    const float inv2SigmaEdge = 1.0 / (2.0 * 1350.0);

    float wEdge[8];
    for (int k = 0; k < 8; k++) {
      if (nLabelBuf[k] == -2) { wEdge[k] = 0.0; continue; }
      ivec2 q = p + DIRS[k];
      float dc2 = cdist2(r0, fetchRaw(q));
      float aniso = 1.0;
      if (hasAniso) {
        float stepLen = (k < 4) ? 1.0 : 1.41421356;
        float tanAlign = abs((float(DIRS[k].x) * (-ny) + float(DIRS[k].y) * nx) / stepLen);
        aniso = 0.74 + 0.56 * tanAlign;
      }
      wEdge[k] = W_DIR[k] * aniso * (0.14 + 0.86 * exp(-dc2 * inv2SigmaEdge));
    }

    vec4 flk = texelFetch(u_flankTex, p, 0);
    int fAp = int(round(flk.r));
    int fBp = int(round(flk.g));
    float fAlpha = flk.b;
    float fPerp = flk.a;
    if (fAp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fAp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fAp;
    }
    if (fBp >= 0) {
      bool sc = false;
      for (int ci = 0; ci < 12; ci++) { if (ci >= candLen) break; if (candBuf[ci] == fBp) { sc = true; break; } }
      if (!sc && candLen < 12) candBuf[candLen++] = fBp;
    }

    int thinLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (thinLab >= 0 && cur == thinLab) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }
    float dCurRaw = cdist2(r0, fetchPalRGB(cur));
    float dCur = dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, cur, u_beta);

    bool hasCleanUnmixMajority = fAp >= 0 && fBp >= 0 && coh > 0.25 && fPerp < 320.0 && sameOrtho >= 1 && (sameOrtho + sameDiag >= 2) &&
      ((cur == fAp && fAlpha >= 0.505) || (cur == fBp && fAlpha <= 0.495));
    if (hasCleanUnmixMajority) {
      outLabel = vec4(curV.rgb, 0.0);
      return;
    }

    bool isSharpFeature = corner > 5.5 && (sameOrtho + sameDiag >= 1) && dCurRaw < 1100.0;
    bool isProtectedDetailOrTip = ((sameOrtho + sameDiag >= 1) && dCurRaw < 480.0) || isSharpFeature;

    int bestL = cur;
    float bestE = 1e20;
    for (int ci = 0; ci < 12; ci++) {
      if (ci >= candLen) break;
      int l = candBuf[ci];
      float dl = (l == cur) ? dCur : dataEnergyAt(p, r0, flt0, mag, thinLab, fAp, fBp, fAlpha, fPerp, l, u_beta);
      if (isProtectedDetailOrTip && l != cur && dl > dCur * 1.95 + 420.0) continue;
      float e = dl;
      for (int k = 0; k < 8; k++) {
        int nl = nLabelBuf[k];
        if (nl == -2) continue;
        if (nl != l) {
          float pairCap = (nl >= 0 && l >= 0) ? min(u_beta, fetchPalDist2(l, nl) * 0.24 + 120.0) : u_beta;
          e += pairCap * wEdge[k];
        }
      }
      if (e < bestE) { bestE = e; bestL = l; }
    }

    if (bestL != cur) {
      if (u_checkTopo == 1 && wouldChangeTopoAt(p, cur, bestL)) {
        bool isFalseHalo = fAp >= 0 && fBp >= 0 && cur != fAp && cur != fBp && fetchPalIsMidBlend(cur, fAp, fBp);
        if (!isFalseHalo) {
          outLabel = vec4(curV.rgb, 0.0);
          return;
        }
      }
      outLabel = vec4(float(bestL), curV.g, curV.b, 1.0);
      return;
    }
    outLabel = vec4(curV.rgb, 0.0);
  }`,h=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  uniform int u_mode;
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));

    if (u_mode == 0) {
      /* Mode 0: Closing 1px Bridge (4-Color Chromatic agar wouldChangeTopoAt bebas tabrakan) */
      int parity = (p.x & 1) + ((p.y & 1) << 1);
      if (parity != u_colorPass) {
        outLabel = curV;
        return;
      }
      int bridgeL = -1;
      if (lL >= 0 && lL == lR && lL != cur && lU != lL && lD != lL) bridgeL = lL;
      else if (lU >= 0 && lU == lD && lU != cur && lL != lU && lR != lU) bridgeL = lU;
      if (bridgeL >= 0 && bridgeL < u_K) {
        int cntB = 0;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            if (int(round(texelFetch(u_labels, p + ivec2(dx, dy), 0).r)) == bridgeL) cntB++;
          }
        }
        if (cntB >= 3) {
          vec3 r0 = fetchRaw(p);
          float dBridge = cdist2(r0, fetchPalRGB(bridgeL));
          float dCur = cdist2(r0, fetchPalRGB(cur));
          if (dBridge <= dCur * 1.25 + 420.0 && !wouldChangeTopoAt(p, cur, bridgeL)) {
            outLabel = vec4(float(bridgeL), curV.g, curV.b, curV.a);
            return;
          }
        }
      }
      outLabel = curV;
      return;
    }

    /* Mode 1: Opening 1px Protrusion (Tanpa memotong sudut lancip) */
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;
    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0, fwdDiagSame = 0;
    int stepDx0 = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
    int stepDy0 = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int ddx = DIAGS[k].x, ddy = DIAGS[k].y;
      int nl = int(round(texelFetch(u_labels, p + ivec2(ddx, ddy), 0).r));
      if (nl == cur) {
        sameDiag++;
        if (sameOrtho == 1 && (ddx * stepDx0 + ddy * stepDy0) <= 0) fwdDiagSame++;
      } else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }
    if (sameOrtho == 0 && sameDiag >= 1) { outLabel = curV; return; }
    if (sameOrtho == 1 && (fwdDiagSame > 0 || sameDiag >= 1)) { outLabel = curV; return; }

    int domBg = -1, maxV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > maxV) { maxV = vCnt[j]; domBg = vLab[j]; }
    }
    if (domBg < 0 || domBg >= u_K) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dBg = cdist2(r0, fetchPalRGB(domBg));
    if (sameOrtho == 0 && dCur > dBg * 1.15) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    if (sameOrtho == 1 && sameDiag == 0 && dCur > dBg * 1.35) {
      outLabel = vec4(float(domBg), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`,A=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  out vec4 outLabel;

  bool is2x2CoreAt(ivec2 p, int L, int W, int H) {
    for (int dy = -2; dy <= 1; dy++) {
      int y0 = p.y + dy;
      if (y0 < 0 || y0 + 1 >= H) continue;
      for (int dx = -2; dx <= 1; dx++) {
        int x0 = p.x + dx;
        if (x0 < 0 || x0 + 1 >= W) continue;
        int l00 = int(round(texelFetch(u_labels, ivec2(x0, y0), 0).r));
        int l10 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0), 0).r));
        int l01 = int(round(texelFetch(u_labels, ivec2(x0, y0 + 1), 0).r));
        int l11 = int(round(texelFetch(u_labels, ivec2(x0 + 1, y0 + 1), 0).r));
        if (l00 == L && l10 == L && l01 == L && l11 == L) return true;
      }
    }
    return false;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 2 || p.x >= W - 2 || p.y < 2 || p.y >= H - 2 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    if (is2x2CoreAt(p, cur, W, H)) {
      outLabel = curV;
      return;
    }

    int pairA = -1, pairB = -1;
    const ivec2 AXES[4] = ivec2[4](ivec2(1, 0), ivec2(0, 1), ivec2(1, 1), ivec2(1, -1));
    for (int a = 0; a < 4; a++) {
      if (pairA >= 0) break;
      ivec2 d = AXES[a];
      int la = -1, lb = -1;
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p - d * s, 0).r));
        if (nl != cur && nl >= 0) { la = nl; break; }
      }
      for (int s = 1; s <= 2; s++) {
        int nl = int(round(texelFetch(u_labels, p + d * s, 0).r));
        if (nl != cur && nl >= 0) { lb = nl; break; }
      }
      if (la >= 0 && lb >= 0 && la != lb) { pairA = la; pairB = lb; }
    }
    if (pairA < 0 || pairB < 0) {
      outLabel = curV;
      return;
    }

    vec3 r0 = fetchRaw(p);
    vec3 cA = fetchPalRGB(pairA), cB = fetchPalRGB(pairB), cCur = fetchPalRGB(cur);
    float lum0 = dot(r0, vec3(0.299, 0.587, 0.114));
    float lumA = dot(cA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(cB, vec3(0.299, 0.587, 0.114));
    float lumCur = dot(cCur, vec3(0.299, 0.587, 0.114));
    if (lum0 > max(lumA, lumB) + 6.0 || lum0 < min(lumA, lumB) - 6.0 ||
        lumCur > max(lumA, lumB) + 8.0 || lumCur < min(lumA, lumB) - 8.0) {
      outLabel = curV;
      return;
    }
    float dCur = cdist2(r0, cCur);
    float blT = 0.5, blPerp = 0.0;
    bool hasBlend = evalColorBlendPair(r0, cA, cB, blT, blPerp);
    bool isPalMid = fetchPalIsMidBlend(cur, pairA, pairB);
    if (hasBlend && (isPalMid || dCur > blPerp * 2.5 + 900.0)) {
      int nextL = (blT >= 0.5) ? pairA : pairB;
      outLabel = vec4(float(nextL), curV.g, curV.b, curV.a);
      return;
    }
    outLabel = curV;
  }`,U=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  uniform int u_colorPass;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);
    int cur = int(round(curV.r));
    int tsLab = int(round(texelFetch(u_nearTex, p, 0).r));
    if (p.x < 1 || p.x >= W - 1 || p.y < 1 || p.y >= H - 1 || curV.g > 0.5 || curV.b > 0.5 || cur < 0 || tsLab == cur) {
      outLabel = curV;
      return;
    }
    int parity = (p.x & 1) + ((p.y & 1) << 1);
    if (parity != u_colorPass) {
      outLabel = curV;
      return;
    }

    int lL = int(round(texelFetch(u_labels, p + ivec2(-1, 0), 0).r));
    int lR = int(round(texelFetch(u_labels, p + ivec2( 1, 0), 0).r));
    int lU = int(round(texelFetch(u_labels, p + ivec2( 0,-1), 0).r));
    int lD = int(round(texelFetch(u_labels, p + ivec2( 0, 1), 0).r));
    int nbsOrtho[4] = int[4](lL, lR, lU, lD);
    int sameOrtho = 0, sameDir = -1;
    int vLab[8];
    int vCnt[8];
    int nV = 0;

    for (int k = 0; k < 4; k++) {
      int nl = nbsOrtho[k];
      if (nl == cur) { sameOrtho++; sameDir = k; }
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 2;
      }
    }
    if (sameOrtho > 1) { outLabel = curV; return; }

    int sameDiag = 0;
    const ivec2 DIAGS[4] = ivec2[4](ivec2(-1,-1), ivec2(1,-1), ivec2(-1,1), ivec2(1,1));
    for (int k = 0; k < 4; k++) {
      int nl = int(round(texelFetch(u_labels, p + DIAGS[k], 0).r));
      if (nl == cur) sameDiag++;
      else if (nl >= 0) {
        int idx = -1;
        for (int j = 0; j < 8; j++) { if (j >= nV) break; if (vLab[j] == nl) { idx = j; break; } }
        if (idx < 0 && nV < 8) { idx = nV++; vLab[idx] = nl; vCnt[idx] = 0; }
        if (idx >= 0) vCnt[idx] += 1;
      }
    }

    int domNb = -1, bestV = 0;
    for (int j = 0; j < 8; j++) {
      if (j >= nV) break;
      if (vCnt[j] > bestV) { bestV = vCnt[j]; domNb = vLab[j]; }
    }
    if (domNb < 0 || bestV < 6) { outLabel = curV; return; }

    vec3 r0 = fetchRaw(p);
    float dCur = cdist2(r0, fetchPalRGB(cur));
    float dDom = cdist2(r0, fetchPalRGB(domNb));

    if (sameOrtho == 1) {
      int stepDx = (sameDir == 0) ? -1 : (sameDir == 1) ? 1 : 0;
      int stepDy = (sameDir == 2) ? -1 : (sameDir == 3) ? 1 : 0;
      int bx = clamp(p.x + stepDx, 1, W - 2);
      int by = clamp(p.y + stepDy, 1, H - 2);
      int perpDx = stepDy, perpDy = stepDx;
      int backSpread = 0;
      for (int s = -1; s <= 1; s++) {
        if (int(round(texelFetch(u_labels, ivec2(bx + perpDx * s, by + perpDy * s), 0).r)) == cur) backSpread++;
      }
      if (backSpread >= 2 && dCur <= dDom * 0.85) { outLabel = curV; return; }
    }
    if ((sameOrtho + sameDiag >= 1) && dCur < dDom * 0.45 && dCur < 600.0) { outLabel = curV; return; }
    if (wouldChangeTopoAt(p, cur, domNb)) { outLabel = curV; return; }

    outLabel = vec4(float(domNb), curV.g, curV.b, curV.a);
  }`,P=`#version 300 es
  precision highp float;
  precision highp int;
  `+R+`
  uniform int u_blockParity;
  out vec4 outLabel;

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int W = int(u_res.x), H = int(u_res.y);
    vec4 curV = texelFetch(u_labels, p, 0);

    /* Tentukan sudut kiri-atas (x0, y0) dari blok 2x2 dengan paritas u_blockParity (0..3) yang memuat piksel p */
    int ox = u_blockParity & 1;
    int oy = (u_blockParity >> 1) & 1;
    int dx = (p.x - ox) & 1;
    int dy = (p.y - oy) & 1;
    int x0 = p.x - dx;
    int y0 = p.y - dy;
    if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) {
      outLabel = curV;
      return;
    }

    ivec2 q00 = ivec2(x0, y0), q10 = ivec2(x0 + 1, y0), q01 = ivec2(x0, y0 + 1), q11 = ivec2(x0 + 1, y0 + 1);
    vec4 v00 = texelFetch(u_labels, q00, 0), v10 = texelFetch(u_labels, q10, 0);
    vec4 v01 = texelFetch(u_labels, q01, 0), v11 = texelFetch(u_labels, q11, 0);
    if (v00.g > 0.5 || v10.g > 0.5 || v01.g > 0.5 || v11.g > 0.5) {
      outLabel = curV;
      return;
    }
    int l00 = int(round(v00.r)), l10 = int(round(v10.r)), l01 = int(round(v01.r)), l11 = int(round(v11.r));
    if (l00 < 0 || l10 < 0 || !(l00 == l11 && l10 == l01 && l00 != l10)) {
      outLabel = curV;
      return;
    }

    int ts00 = int(round(texelFetch(u_nearTex, q00, 0).r));
    int ts10 = int(round(texelFetch(u_nearTex, q10, 0).r));
    int ts01 = int(round(texelFetch(u_nearTex, q01, 0).r));
    int ts11 = int(round(texelFetch(u_nearTex, q11, 0).r));

    bool prot00_11 = (ts00 == l00 || ts11 == l00) || (v00.b > 0.5 || v11.b > 0.5);
    bool prot10_01 = (ts10 == l10 || ts01 == l10) || (v10.b > 0.5 || v01.b > 0.5);

    ivec2 cPts[4] = ivec2[4](q00, q11, q10, q01);
    int cCur[4] = int[4](l00, l00, l10, l10);
    int cAlt[4] = int[4](l10, l10, l00, l00);
    int startIdx = (prot00_11 && !prot10_01) ? 2 : 0;
    int endIdx = (prot10_01 && !prot00_11) ? 2 : 4;

    vec3 CA = fetchPalRGB(l00), CB = fetchPalRGB(l10);
    ivec2 bestQ = cPts[startIdx];
    int bestNewL = cAlt[startIdx];
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      if (int(round(texelFetch(u_nearTex, cPts[k], 0).r)) != cCur[k]) {
        bestQ = cPts[k];
        bestNewL = cAlt[k];
        break;
      }
    }
    float minPenalty = 1e20;

    int ringA = 0, ringB = 0;
    for (int ry = -1; ry <= 2; ry++) {
      for (int rx = -1; rx <= 2; rx++) {
        if (rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1) continue;
        ivec2 rp = clamp(ivec2(x0 + rx, y0 + ry), ivec2(0), ivec2(W - 1, H - 1));
        int rl = int(round(texelFetch(u_labels, rp, 0).r));
        if (rl == l00) ringA++;
        else if (rl == l10) ringB++;
      }
    }
    float lumA = dot(CA, vec3(0.299, 0.587, 0.114));
    float lumB = dot(CB, vec3(0.299, 0.587, 0.114));
    for (int k = 0; k < 4; k++) {
      if (k < startIdx || k >= endIdx) continue;
      ivec2 q = cPts[k];
      int curL = cCur[k], altL = cAlt[k];
      if (int(round(texelFetch(u_nearTex, q, 0).r)) == curL) continue;
      if (wouldChangeTopoAt(q, curL, altL)) continue;
      vec3 rq = fetchRaw(q);
      vec3 Calt = (altL == l00) ? CA : CB;
      vec3 Ccur = (curL == l00) ? CA : CB;
      float pen = cdist2(rq, Calt) - cdist2(rq, Ccur);
      if (ringA >= 4 && ringB >= 4) {
        bool altIsLighter = (altL == l00) ? (lumA > lumB) : (lumB > lumA);
        if (altIsLighter) pen -= 950.0;
      }
      if (pen < minPenalty) {
        minPenalty = pen;
        bestQ = q;
        bestNewL = altL;
      }
    }

    if (p.x == bestQ.x && p.y == bestQ.y) {
      outLabel = vec4(float(bestNewL), curV.g, curV.b, curV.a);
    } else {
      outLabel = curV;
    }
  }`;function c(J,ut,mt,it,nt,lt){let{gl:ht,extFloat:gt}=J;if(!gt)return null;let{w:ct,h:bt}=ut,Ct=it.length;if(Ct<2||Ct>64||ct>Pe.gpu.maxTexSize||bt>Pe.gpu.maxTexSize||Ct*Ct>Pe.gpu.maxTexSize)return null;let Tt=nt&&nt.rawD||(ut.rawRgba&&ut.rawRgba.length===ct*bt*4?ut.rawRgba:ut.data.data),yt=nt&&nt.fltD||ut.data.data,pt=nt||ut,Mt=Ct+":"+(it[0]?it[0].r+","+it[0].g+","+it[0].b:"")+":"+(it[Ct-1]?it[Ct-1].r+","+it[Ct-1].g+","+it[Ct-1].b:""),vt=!pt._gpuStaticSynced||pt._gpuStaticW!==ct||pt._gpuStaticH!==bt||pt._gpuStaticPalSig!==Mt,Ft=pe.getSlot("texRawRGBA"),wt=pe.getSlot("texFltRGBA");if((vt||!Ft||!wt||Ft.w!==ct||Ft.h!==bt)&&(Ft=G(ht,"texRawRGBA",ct,bt,Tt,!1),wt=G(ht,"texFltRGBA",ct,bt,yt,!1)),!Ft||!wt)return null;let Et=pe.getSlot("texEdgeField");if(vt||!Et||Et.w!==ct||Et.h!==bt||!Et.isFloat){if(Et=pe.allocateSlot(ht,"texEdgeField",ct,bt,!0),!Et)return null;let Vt=Zt.acquire(Float32Array,ct*bt*4),Bt=nt&&nt.gx,Ot=nt&&nt.gy,kt=nt&&nt.mag;for(let It=0;It<ct*bt;It++){let Kt=It*4;Vt[Kt]=Bt?Bt[It]:0,Vt[Kt+1]=Ot?Ot[It]:0,Vt[Kt+2]=kt?kt[It]:0,Vt[Kt+3]=0}G(ht,"texEdgeField",ct,bt,Vt,!0),Zt.release(Vt)}let Dt=pe.getSlot("texTensor");if(vt||!Dt||Dt.w!==ct||Dt.h!==bt||!Dt.isFloat){if(Dt=pe.allocateSlot(ht,"texTensor",ct,bt,!0),!Dt)return null;let Vt=Zt.acquire(Float32Array,ct*bt*4),Bt=nt&&nt.nxArr,Ot=nt&&nt.nyArr,kt=nt&&nt.cohArr,It=nt&&nt.cornerArr;for(let Kt=0;Kt<ct*bt;Kt++){let Jt=Kt*4;Vt[Jt]=Bt?Bt[Kt]:0,Vt[Jt+1]=Ot?Ot[Kt]:0,Vt[Jt+2]=kt?kt[Kt]:0,Vt[Jt+3]=It?It[Kt]:0}G(ht,"texTensor",ct,bt,Vt,!0),Zt.release(Vt)}let Yt=pe.getSlot("texFlanks");if(vt||!Yt||Yt.w!==ct||Yt.h!==bt||!Yt.isFloat){if(Yt=pe.allocateSlot(ht,"texFlanks",ct,bt,!0),!Yt)return null;let Vt=Zt.acquire(Float32Array,ct*bt*4),Bt=nt&&nt.flankA,Ot=nt&&nt.flankB,kt=nt&&nt.flankAlpha,It=nt&&nt.flankPerp;for(let Kt=0;Kt<ct*bt;Kt++){let Jt=Kt*4;Vt[Jt]=Bt?Bt[Kt]:-1,Vt[Jt+1]=Ot?Ot[Kt]:-1,Vt[Jt+2]=kt?kt[Kt]:.5,Vt[Jt+3]=It?It[Kt]:0}G(ht,"texFlanks",ct,bt,Vt,!0),Zt.release(Vt)}let Xt=pe.getSlot("texLabGrad");if(vt||!Xt||Xt.w!==ct||Xt.h!==bt||!Xt.isFloat){if(Xt=pe.allocateSlot(ht,"texLabGrad",ct,bt,!0),!Xt)return null;let Vt=Zt.acquire(Float32Array,ct*bt*4),Bt=nt&&nt.thinStrokeLab||lt&&lt._segCtx&&lt._segCtx.thinStrokeLab;for(let Ot=0;Ot<ct*bt;Ot++){let kt=Ot*4;Vt[kt]=Bt?Bt[Ot]:-1,Vt[kt+1]=0,Vt[kt+2]=0,Vt[kt+3]=1}G(ht,"texLabGrad",ct,bt,Vt,!0),Zt.release(Vt)}let Pt=Ct*Ct,Rt=Ct,Gt=pe.getSlot("texPalLut");if(vt||!Gt||Gt.w!==Pt||Gt.h!==Rt||!Gt.isFloat){if(Gt=pe.allocateSlot(ht,"texPalLut",Pt,Rt,!0),!Gt)return null;let Vt=new Float32Array(Pt*Rt*4),Bt=nt?nt.palDist2:null,Ot=nt?nt.palIsMidBlend:null;for(let kt=0;kt<Ct;kt++){let It=it[kt]||{r:0,g:0,b:0},Kt=It.g+It.b*256;for(let Jt=0;Jt<Ct;Jt++)for(let zt=0;zt<Ct;zt++){let ue=Jt*Ct+zt,ge=(kt*Pt+ue)*4,Fe=Bt?Bt[ue]:Wt(it[Jt].r,it[Jt].g,it[Jt].b,it[zt].r,it[zt].g,it[zt].b),Nt=Ot?Ot[kt*Ct*Ct+ue]:0;Vt[ge]=Fe,Vt[ge+1]=Nt?1:0,Vt[ge+2]=It.r,Vt[ge+3]=Kt}}G(ht,"texPalLut",Pt,Rt,Vt,!0)}pt._gpuStaticSynced=!0,pt._gpuStaticW=ct,pt._gpuStaticH=bt,pt._gpuStaticPalSig=Mt;let Ut=pe.allocateSlot(ht,"texLabelsA",ct,bt,!0),qt=pe.allocateSlot(ht,"texLabelsB",ct,bt,!0);if(!Ut||!qt)return null;{let Vt=Zt.acquire(Float32Array,ct*bt*4),Bt=lt._detailProt||null,Ot=ut&&ut.origAlpha?ut.origAlpha:null;for(let kt=0;kt<ct*bt;kt++){let It=kt*4;Vt[It]=lt[kt],Vt[It+1]=mt&&mt[kt]?1:0,Vt[It+2]=Bt&&Bt[kt]?1:0,Vt[It+3]=Ot?Ot[kt]/255:1}G(ht,"texLabelsA",ct,bt,Vt,!0),Zt.release(Vt)}return{rawSlot:Ft,fltSlot:wt,edgeSlot:Et,tensorSlot:Dt,flankSlot:Yt,nearSlot:Xt,palLutSlot:Gt,labSlotA:Ut,labSlotB:qt,w:ct,h:bt,K:Ct}}function E(J,ut,mt,it){J.activeTexture(J.TEXTURE0),J.bindTexture(J.TEXTURE_2D,it),J.uniform1i(J.getUniformLocation(ut,"u_labels"),0),J.activeTexture(J.TEXTURE1),J.bindTexture(J.TEXTURE_2D,mt.rawSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_rawTex"),1),J.activeTexture(J.TEXTURE2),J.bindTexture(J.TEXTURE_2D,mt.fltSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_fltTex"),2),J.activeTexture(J.TEXTURE3),J.bindTexture(J.TEXTURE_2D,mt.edgeSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_edgeTex"),3),J.activeTexture(J.TEXTURE4),J.bindTexture(J.TEXTURE_2D,mt.tensorSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_tensorTex"),4),J.activeTexture(J.TEXTURE5),J.bindTexture(J.TEXTURE_2D,mt.flankSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_flankTex"),5),J.activeTexture(J.TEXTURE6),J.bindTexture(J.TEXTURE_2D,mt.nearSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_nearTex"),6),J.activeTexture(J.TEXTURE7),J.bindTexture(J.TEXTURE_2D,mt.palLutSlot.tex),J.uniform1i(J.getUniformLocation(ut,"u_palLut"),7),J.uniform2f(J.getUniformLocation(ut,"u_res"),mt.w,mt.h),J.uniform1i(J.getUniformLocation(ut,"u_K"),mt.K)}function q(J,ut,mt,it,nt){let lt=Zt.acquire(Float32Array,it*nt*4);J.bindFramebuffer(J.FRAMEBUFFER,ut.fbo),J.readPixels(0,0,it,nt,J.RGBA,J.FLOAT,lt),J.bindFramebuffer(J.FRAMEBUFFER,null);let ht=0;for(let gt=0;gt<it*nt;gt++){let ct=Math.round(lt[gt*4]);mt[gt]!==ct&&(mt[gt]=ct,ht++)}return Zt.release(lt),ht}function Q(J,ut,mt,it,nt=4,lt=null){return!1}function tt(J,ut,mt,it,nt={},lt=null,ht=null){if(!$t.useGpu||$t.gpuPipeline!=="full")return!1;let gt=r($t.gpuPower);if(!gt||!gt.extFloat)return!1;try{let ct=c(gt,J,ut,it,lt,mt);if(!ct)return!1;let bt=nt.beta||1350,Ct=nt.maxIter||20,Tt=Ct===1&&typeof nt.iterIndex=="number",yt=typeof nt.startIter=="number"?nt.startIter:Tt?nt.iterIndex:0,pt=ct.labSlotA,Mt=ct.labSlotB,vt=[[0,3,1,2],[3,0,2,1],[1,2,0,3],[2,1,3,0]];for(let Ft=0;Ft<Ct;Ft++){let wt=yt+Ft,Et=nt.totalIters||Ct,Dt=Tt&&typeof nt.startIter!="number"?1:.55+.55*(wt/Math.max(1,Et-1)),Yt=bt*Dt,Xt=nt.topology!==!1&&wt>=1?1:0,Pt=vt[wt&3];for(let Rt=0;Rt<4;Rt++){let Gt=Pt[Rt];if(!x(gt,"mrfPotts4Color",o,Mt,(Vt,Bt)=>{E(Vt,Bt,ct,pt.tex),Vt.uniform1i(Vt.getUniformLocation(Bt,"u_colorPass"),Gt),Vt.uniform1f(Vt.getUniformLocation(Bt,"u_beta"),Yt),Vt.uniform1i(Vt.getUniformLocation(Bt,"u_checkTopo"),Xt)}))return!1;let qt=pt;pt=Mt,Mt=qt}ht&&ht((Ft+1)/Ct,0)}return q(gt.gl,pt,mt,ct.w,ct.h),!0}catch{return!1}}function j(J,ut,mt,it,nt,lt,ht=null){return!1}function z(J,ut,mt,it,nt,lt){if(!$t.useGpu||$t.gpuPipeline!=="full")return!1;let ht=r($t.gpuPower);if(!ht||!ht.extFloat)return!1;try{let gt=J&&J._segCtx||it&&it._segCtx||null,ct=c(ht,it,lt,nt,gt,J);if(!ct)return!1;let bt=ct.labSlotA,Ct=ct.labSlotB;for(let Tt=0;Tt<4;Tt++){if(!x(ht,"checkerboardSaddle",P,Ct,(Mt,vt)=>{E(Mt,vt,ct,bt.tex),Mt.uniform1i(Mt.getUniformLocation(vt,"u_blockParity"),Tt)}))return!1;let pt=bt;bt=Ct,Ct=pt}return q(ht.gl,bt,J,ct.w,ct.h),!0}catch{return!1}}function X(J,ut,mt,it,nt,lt){if(!$t.useGpu||$t.gpuPipeline!=="full")return!1;let ht=r($t.gpuPower);if(!ht||!ht.extFloat)return!1;try{let gt=J&&J._segCtx||it&&it._segCtx||null,ct=c(ht,it,lt,nt,gt,J);if(!ct)return!1;let bt=ct.labSlotA,Ct=ct.labSlotB;for(let Tt=0;Tt<2;Tt++)for(let yt=0;yt<4;yt++){if(!x(ht,"parasiteClean",U,Ct,(vt,Ft)=>{E(vt,Ft,ct,bt.tex),vt.uniform1i(vt.getUniformLocation(Ft,"u_colorPass"),yt)}))return!1;let Mt=bt;bt=Ct,Ct=Mt}for(let Tt=0;Tt<4;Tt++){if(!x(ht,"checkerboardSaddle",P,Ct,(Mt,vt)=>{E(Mt,vt,ct,bt.tex),Mt.uniform1i(Mt.getUniformLocation(vt,"u_blockParity"),Tt)}))return!1;let pt=bt;bt=Ct,Ct=pt}return q(ht.gl,bt,J,ct.w,ct.h),!0}catch{return!1}}function B(J,ut,mt,it,nt,lt,ht=null){if(!$t.useGpu||$t.gpuPipeline!=="full")return!1;let gt=r($t.gpuPower);if(!gt||!gt.extFloat)return!1;try{let ct=c(gt,it,lt,nt,ht,J);if(!ct)return!1;let bt=ct.labSlotA,Ct=ct.labSlotB;for(let Tt=0;Tt<4;Tt++){if(!x(gt,"morphCloseOpen",h,Ct,(Mt,vt)=>{E(Mt,vt,ct,bt.tex),Mt.uniform1i(Mt.getUniformLocation(vt,"u_mode"),0),Mt.uniform1i(Mt.getUniformLocation(vt,"u_colorPass"),Tt)}))return!1;let pt=bt;bt=Ct,Ct=pt}{if(!x(gt,"morphCloseOpen",h,Ct,(pt,Mt)=>{E(pt,Mt,ct,bt.tex),pt.uniform1i(pt.getUniformLocation(Mt,"u_mode"),1),pt.uniform1i(pt.getUniformLocation(Mt,"u_colorPass"),0)}))return!1;let yt=bt;bt=Ct,Ct=yt}for(let Tt=0;Tt<2;Tt++){if(!x(gt,"ribbonErode",A,Ct,(Mt,vt)=>{E(Mt,vt,ct,bt.tex)}))return!1;let pt=bt;bt=Ct,Ct=pt}for(let Tt=0;Tt<2;Tt++)for(let yt=0;yt<4;yt++){if(!x(gt,"parasiteClean",U,Ct,(vt,Ft)=>{E(vt,Ft,ct,bt.tex),vt.uniform1i(vt.getUniformLocation(Ft,"u_colorPass"),yt)}))return!1;let Mt=bt;bt=Ct,Ct=Mt}for(let Tt=0;Tt<2;Tt++)for(let yt=0;yt<4;yt++){if(!x(gt,"checkerboardSaddle",P,Ct,(vt,Ft)=>{E(vt,Ft,ct,bt.tex),vt.uniform1i(vt.getUniformLocation(Ft,"u_blockParity"),yt)}))return!1;let Mt=bt;bt=Ct,Ct=Mt}return q(gt.gl,bt,J,ct.w,ct.h),!0}catch{return!1}}let L=`#version 300 es
  precision highp float;
  precision highp int;

  uniform sampler2D u_labels;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_palLut;
  uniform sampler2D u_vtx;
  uniform sampler2D u_refTex;
  uniform ivec2 u_imgRes;
  uniform int u_K;
  uniform int u_hasOrigAlpha;
  uniform float u_weight;

  int lblAt(int px, int py) {
    if (px < 0 || py < 0 || px >= u_imgRes.x || py >= u_imgRes.y) return -1;
    return int(round(texelFetch(u_labels, ivec2(px, py), 0).r));
  }

  vec3 fetchPalRGB(int l) {
    if (l < 0 || l >= u_K) return vec3(0.0);
    vec4 v = texelFetch(u_palLut, ivec2(0, l), 0);
    float r = v.b;
    float b = floor(v.a / 256.0);
    float g = v.a - b * 256.0;
    return vec3(r, g, b);
  }

  int vertexValence(ivec2 v) {
    int nw = lblAt(v.x - 1, v.y - 1);
    int ne = lblAt(v.x,     v.y - 1);
    int sw = lblAt(v.x - 1, v.y    );
    int se = lblAt(v.x,     v.y    );
    int deg = 0;
    if (nw != ne) deg++;
    if (ne != se) deg++;
    if (se != sw) deg++;
    if (sw != nw) deg++;
    return deg;
  }

  /* Mengembalikan tetangga aktif pada kisi verteks (w+1)x(h+1) dalam urutan persis CPU adj.get(k):
     1. Up (v.x, v.y - 1)
     2. Left (v.x - 1, v.y)
     3. Right (v.x + 1, v.y)
     4. Down (v.x, v.y + 1) */
  int getGridNeighbors(ivec2 v, out ivec2 nbs[4]) {
    int cnt = 0;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (v.y > 0 && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y - 1) != lblAt(v.x, v.y - 1)) {
      nbs[cnt++] = ivec2(v.x, v.y - 1);
    }
    if (v.x > 0 && v.y > 0 && v.y < h && lblAt(v.x - 1, v.y - 1) != lblAt(v.x - 1, v.y)) {
      nbs[cnt++] = ivec2(v.x - 1, v.y);
    }
    if (v.x < w && v.y > 0 && v.y < h && lblAt(v.x, v.y - 1) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x + 1, v.y);
    }
    if (v.y < h && v.x > 0 && v.x < w && lblAt(v.x - 1, v.y) != lblAt(v.x, v.y)) {
      nbs[cnt++] = ivec2(v.x, v.y + 1);
    }
    return cnt;
  }

  /* Penelusuran rantai batas kisi (ekuivalen walkChainKeys di CPU) */
  int walkChainGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    int len = 1;
    ivec2 cur = firstNb;
    ivec2 prev = startV;
    for (int s = 1; s <= 8; s++) {
      if (s > maxSteps) break;
      chain[len++] = cur;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Penelusuran lengan lurus kisi hingga maxSteps=8 (ekuivalen walkStraightArmKeys di CPU) */
  int walkStraightArmGrid(ivec2 startV, ivec2 firstNb, int maxSteps, out ivec2 chain[9]) {
    chain[0] = startV;
    chain[1] = firstNb;
    int len = 2;
    ivec2 prev = startV;
    ivec2 cur = firstNb;
    int dx0 = firstNb.x - startV.x;
    int dy0 = firstNb.y - startV.y;
    for (int s = 1; s < 8; s++) {
      if (s >= maxSteps) break;
      if (vertexValence(cur) != 2) break;
      ivec2 cnbs[4];
      int cCnt = getGridNeighbors(cur, cnbs);
      if (cCnt != 2) break;
      ivec2 nxt = (cnbs[0].x == prev.x && cnbs[0].y == prev.y) ? cnbs[1] : cnbs[0];
      if (nxt.x == startV.x && nxt.y == startV.y) break;
      int dx = nxt.x - cur.x;
      int dy = nxt.y - cur.y;
      if (dx * dx0 + dy * dy0 <= 0 && len >= 3) break;
      chain[len++] = nxt;
      prev = cur;
      cur = nxt;
    }
    return len;
  }

  /* Inversi Luas Persegi 2x2 Sub-Piksel Eksak (invert2x2SquareShift) */
  float invert2x2SquareShiftGL(float alphaBar, float nx, float ny) {
    float a = max(abs(nx), abs(ny));
    float b = min(abs(nx), abs(ny));
    float al = clamp(alphaBar, 0.0, 1.0);
    if (a < 1e-6) return 0.0;
    float trans = b / (2.0 * a);
    float s;
    if (al < trans && b > 1e-5) {
      s = -((a + b) - sqrt(max(0.0, 8.0 * a * b * al)));
    } else if (al > 1.0 - trans && b > 1e-5) {
      s = +((a + b) - sqrt(max(0.0, 8.0 * a * b * (1.0 - al))));
    } else {
      s = 2.0 * a * (al - 0.5);
    }
    return clamp(s, -0.72, 0.72);
  }

  /* Total Least Squares 2D Line Fit (identik dengan fitLine2D di CPU) */
  bool fitLine2DGL(vec2 pts[8], int m, out vec2 c, out vec2 d, out float rms, out float maxDev, out float span) {
    if (m < 2) {
      c = vec2(0.0); d = vec2(1.0, 0.0); rms = 0.0; maxDev = 0.0; span = 0.0;
      return false;
    }
    vec2 meanP = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      meanP += pts[i];
    }
    meanP /= float(m);
    float sxx = 0.0, syy = 0.0, sxy = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      sxx += df.x * df.x;
      syy += df.y * df.y;
      sxy += df.x * df.y;
    }
    float th = 0.5 * atan(2.0 * sxy, sxx - syy);
    vec2 dir = vec2(cos(th), sin(th));
    vec2 chord = pts[m - 1] - pts[0];
    if (dot(dir, chord) < 0.0) dir = -dir;
    float ss = 0.0, mDev = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= m) break;
      vec2 df = pts[i] - meanP;
      float e = abs(df.x * dir.y - df.y * dir.x);
      if (e > mDev) mDev = e;
      ss += e * e;
    }
    c = meanP;
    d = dir;
    rms = sqrt(ss / float(m));
    maxDev = mDev;
    span = length(chord);
    return true;
  }

  /* K\xE5sa Circle Fit 2D pada hingga 17 titik (identik dengan fitCircle2D di CPU) */
  bool fitCircle2DGL(vec2 pts[17], int m, out float rOut, out float rmsOut) {
    rOut = 0.0; rmsOut = 999.0;
    if (m < 4) return false;
    float sx = 0.0, sy = 0.0, sx2 = 0.0, sy2 = 0.0, sxy = 0.0, sx3 = 0.0, sy3 = 0.0, sx2y = 0.0, sxy2 = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float x = pts[i].x, y = pts[i].y;
      float x2 = x * x, y2 = y * y;
      sx += x; sy += y; sx2 += x2; sy2 += y2; sxy += x * y;
      sx3 += x2 * x; sy3 += y2 * y; sx2y += x2 * y; sxy2 += x * y2;
    }
    float fm = float(m);
    float C = fm * sx2 - sx * sx;
    float D = fm * sxy - sx * sy;
    float E = fm * sy2 - sy * sy;
    float G = 0.5 * (fm * sx3 + fm * sxy2 - sx * sx2 - sx * sy2);
    float H = 0.5 * (fm * sx2y + fm * sy3 - sy * sx2 - sy * sy2);
    float det = C * E - D * D;
    if (abs(det) < 1e-6) return false;
    float cx = (G * E - H * D) / det;
    float cy = (C * H - D * G) / det;
    float r = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      r += length(pts[i] - vec2(cx, cy));
    }
    r /= fm;
    float ss = 0.0;
    for (int i = 0; i < 17; i++) {
      if (i >= m) break;
      float e = length(pts[i] - vec2(cx, cy)) - r;
      ss += e * e;
    }
    rOut = r;
    rmsOut = sqrt(ss / fm);
    return true;
  }
  `,m=L+`
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    int val = vertexValence(v);
    if (val < 2) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    if (val >= 3) {
      /* Pin = 1 dikodekan sebagai offset +16384.0 pada kanal .b */
      outVtx = vec4(float(x), float(y), 16384.0, 0.0);
      return;
    }

    int qLabs[4];
    qLabs[0] = lblAt(x - 1, y - 1);
    qLabs[1] = lblAt(x,     y - 1);
    qLabs[2] = lblAt(x - 1, y    );
    qLabs[3] = lblAt(x,     y    );
    int la = qLabs[0];
    int lb = -2, cntA2 = 0, cntB2 = 0;
    for (int i = 0; i < 4; i++) {
      if (qLabs[i] == la) cntA2++;
      else {
        if (lb == -2) lb = qLabs[i];
        if (qLabs[i] == lb) cntB2++;
      }
    }
    if (lb == -2 || cntA2 + cntB2 < 4) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float ax = 0.0, ay = 0.0, an = 0.0, bx = 0.0, by = 0.0, bn = 0.0;
    int foreign = 0;
    vec3 sumA = vec3(0.0), sumB = vec3(0.0);
    float wAr = 0.0, wBr = 0.0;

    for (int j = -3; j <= 2; j++) {
      int py = y + j;
      if (py < 0 || py >= h) continue;
      for (int i = -3; i <= 2; i++) {
        int px = x + i;
        if (px < 0 || px >= w) continue;
        int L = lblAt(px, py);
        float cx = float(i) + 0.5, cy = float(j) + 0.5;
        float r2d = cx * cx + cy * cy;
        float wgt = exp(-r2d / 3.0);
        if (L == la) {
          ax += cx * wgt; ay += cy * wgt; an += wgt;
          if (r2d >= 1.5) {
            sumA += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wAr += 1.0;
          }
        } else if (L == lb) {
          bx += cx * wgt; by += cy * wgt; bn += wgt;
          if (r2d >= 1.5) {
            sumB += texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
            wBr += 1.0;
          }
        } else if (i >= -2 && i <= 1 && j >= -2 && j <= 1) {
          foreign++;
        }
      }
    }

    if (an <= 0.0 || bn <= 0.0) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }

    float nx = (bx / bn) - (ax / an);
    float ny = (by / bn) - (ay / an);
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 2) {
      ivec2 chA[9], chB[9];
      int lenA = walkChainGrid(v, nbs[0], 3, chA);
      int lenB = walkChainGrid(v, nbs[1], 3, chB);
      ivec2 kA = chA[lenA - 1];
      ivec2 kB = chB[lenB - 1];
      float tx = float(kB.x - kA.x), ty = float(kB.y - kA.y);
      float tl = length(vec2(tx, ty));
      if (tl > 1.5) {
        float cnx = -ty / tl, cny = tx / tl;
        if (cnx * nx + cny * ny < 0.0) { cnx = -cnx; cny = -cny; }
        float nlen = length(vec2(nx, ny));
        if (nlen <= 0.0) nlen = 1.0;
        nx = 0.55 * (nx / nlen) + 0.45 * cnx;
        ny = 0.55 * (ny / nlen) + 0.45 * cny;
      }
    }
    float nl = length(vec2(nx, ny));
    if (nl < 1e-5) {
      outVtx = vec4(float(x), float(y), 0.0, 0.0);
      return;
    }
    nx /= nl; ny /= nl;

    bool hasCA = (la >= 0 && la < u_K);
    bool hasCB = (lb >= 0 && lb < u_K);
    vec3 palA = hasCA ? fetchPalRGB(la) : vec3(0.0);
    vec3 palB = hasCB ? fetchPalRGB(lb) : vec3(0.0);
    vec3 CA = hasCA ? (wAr >= 2.0 ? (0.90 * (sumA / wAr) + 0.10 * palA) : palA) : vec3(0.0);
    vec3 CB = hasCB ? (wBr >= 2.0 ? (0.90 * (sumB / wBr) + 0.10 * palB) : palB) : vec3(0.0);
    vec3 dC = (hasCA && hasCB) ? (CA - CB) : vec3(0.0);
    float denom = dot(dC, dC);

    float sumAlpha = 0.0;
    int cntAlpha = 0;
    for (int j = -1; j <= 0; j++) {
      int py = y + j;
      for (int i = -1; i <= 0; i++) {
        int px = x + i;
        if (denom > 64.0) {
          vec3 irgb = texelFetch(u_rawTex, ivec2(px, py), 0).rgb * 255.0;
          float alpha = clamp(dot(irgb - CB, dC) / denom, 0.0, 1.0);
          sumAlpha += alpha;
          cntAlpha++;
        } else if ((la == -1 || lb == -1) && u_hasOrigAlpha == 1) {
          float aVal = texelFetch(u_labels, ivec2(px, py), 0).a;
          sumAlpha += (la == -1 ? 1.0 - aVal : aVal);
          cntAlpha++;
        }
      }
    }

    float vx = float(x), vy = float(y);
    bool isGridCorner90 = (foreign == 0) && ((cntA2 == 1 && cntB2 == 3) || (cntA2 == 3 && cntB2 == 1));
    if (isGridCorner90 && cntAlpha == 4 && denom > 64.0) {
      float a00 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a10 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y - 1), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a01 = clamp(dot(texelFetch(u_rawTex, ivec2(x - 1, y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      float a11 = clamp(dot(texelFetch(u_rawTex, ivec2(x,     y    ), 0).rgb * 255.0 - CB, dC) / denom, 0.0, 1.0);
      bool topDiff = (qLabs[0] != qLabs[1]), botDiff = (qLabs[2] != qLabs[3]);
      bool leftDiff = (qLabs[0] != qLabs[2]), rightDiff = (qLabs[1] != qLabs[3]);
      float alphaX = topDiff ? 0.5 * (a00 + a10) : (botDiff ? 0.5 * (a01 + a11) : 0.5);
      float alphaY = leftDiff ? 0.5 * (a00 + a01) : (rightDiff ? 0.5 * (a10 + a11) : 0.5);
      float signX = topDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[2] == la ? 1.0 : -1.0);
      float signY = leftDiff ? (qLabs[0] == la ? 1.0 : -1.0) : (qLabs[1] == la ? 1.0 : -1.0);
      vx = float(x) + signX * clamp(alphaX - 0.5, -0.42, 0.42);
      vy = float(y) + signY * clamp(alphaY - 0.5, -0.42, 0.42);
    } else {
      float alphaBar = (cntAlpha == 4) ? (sumAlpha * 0.25) : (float(cntA2) * 0.25);
      float shift = invert2x2SquareShiftGL(alphaBar, nx, ny) * (foreign > 0 ? 0.65 : 1.0);
      vx = float(x) + nx * shift;
      vy = float(y) + ny * shift;
    }

    outVtx = vec4(vx, vy, nx, ny);
  }`,F=L+`
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x > 0 && x < w && y > 0 && y < h) {
      outVtx = curV;
      return;
    }
    if ((x == 0 || x == w) && (y == 0 || y == h)) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt == 0) {
      outVtx = curV;
      return;
    }
    ivec2 intNb = ivec2(-1, -1);
    for (int i = 0; i < 4; i++) {
      if (i >= nCnt) break;
      ivec2 nb = nbs[i];
      if (nb.x > 0 && nb.x < w && nb.y > 0 && nb.y < h) {
        intNb = nb;
        break;
      }
    }
    if (intNb.x < 0) {
      outVtx = curV;
      return;
    }
    ivec2 ch[9];
    int chLen = walkChainGrid(v, intNb, 6, ch);
    if (chLen < 3) {
      outVtx = curV;
      return;
    }
    vec2 pts[8];
    int m = chLen - 1;
    for (int s = 1; s < 9; s++) {
      if (s >= chLen) break;
      pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
    }
    vec2 fc, fd;
    float fRms, fMaxDev, fSpan;
    if (!fitLine2DGL(pts, m, fc, fd, fRms, fMaxDev, fSpan)) {
      outVtx = curV;
      return;
    }
    if ((y == 0 || y == h) && abs(fd.y) > 0.25) {
      float t = (float(y) - fc.y) / fd.y;
      float bx = fc.x + fd.x * t;
      if (abs(bx - float(x)) <= 0.72) curV.r = clamp(bx, 0.0, float(w));
    } else if ((x == 0 || x == w) && abs(fd.x) > 0.25) {
      float t = (float(x) - fc.x) / fd.x;
      float by = fc.y + fd.y * t;
      if (abs(by - float(y)) <= 0.72) curV.g = clamp(by, 0.0, float(h));
    }
    outVtx = curV;
  }`,d=L+`
  bool isArmLinearGL(vec2 ptsArm[8], int m, vec2 fc, vec2 fd, float fRms, float fMaxDev, float fSpan) {
    if (m < 2 || fSpan < 1.45 || fRms > 0.15 || fMaxDev > 0.28) return false;
    vec2 p0 = ptsArm[0], p1 = ptsArm[m - 1], pm = ptsArm[m >> 1];
    float ch = length(p1 - p0);
    if (ch <= 0.0) ch = 1.0;
    float sag = abs((pm.x - p0.x) * (p1.y - p0.y) - (pm.y - p0.y) * (p1.x - p0.x)) / ch;
    return sag <= 0.024;
  }

  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }

    ivec2 keysA[9], keysB[9];
    int lenA = walkStraightArmGrid(v, nbs[0], 8, keysA);
    int lenB = walkStraightArmGrid(v, nbs[1], 8, keysB);
    if (lenA < 3 || lenB < 3) {
      outVtx = curV;
      return;
    }

    int mA = lenA - 1, mB = lenB - 1;
    vec2 armA[8], armB[8];
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      armA[i] = texelFetch(u_vtx, keysA[lenA - 1 - i], 0).rg;
    }
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      armB[i] = texelFetch(u_vtx, keysB[i + 1], 0).rg;
    }

    vec2 fAc, fAd, fBc, fBd;
    float fArms, fAdev, fAspan, fBrms, fBdev, fBspan;
    if (!fitLine2DGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan) ||
        !fitLine2DGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan)) {
      outVtx = curV;
      return;
    }

    float armTurn = abs(atan(fAd.x * fBd.y - fAd.y * fBd.x, dot(fAd, fBd)));
    if (armTurn < 0.42) {
      outVtx = curV;
      return;
    }

    vec2 pA3 = texelFetch(u_vtx, keysA[min(3, lenA - 1)], 0).rg;
    vec2 pB3 = texelFetch(u_vtx, keysB[min(3, lenB - 1)], 0).rg;
    vec2 pA6 = texelFetch(u_vtx, keysA[min(6, lenA - 1)], 0).rg;
    vec2 pB6 = texelFetch(u_vtx, keysB[min(6, lenB - 1)], 0).rg;
    float w3 = length(pB3 - pA3);
    float w6 = length(pB6 - pA6);
    vec2 mid6 = 0.5 * (pA6 + pB6);
    float sag6 = length(curV.rg - mid6);
    float sagRatio6 = w6 > 0.5 ? (sag6 / w6) : 0.0;

    bool isNarrowCap = (armTurn >= 2.35 && w3 <= 3.2 && w6 <= 3.8 && (w6 - w3) < 0.8);
    if (isNarrowCap) {
      outVtx = curV;
      return;
    }

    bool linA = isArmLinearGL(armA, mA, fAc, fAd, fArms, fAdev, fAspan);
    bool linB = isArmLinearGL(armB, mB, fBc, fBd, fBrms, fBdev, fBspan);
    bool bothLinear = linA && linB;

    vec2 arcPts[17];
    int mArc = 0;
    for (int i = 0; i < 8; i++) {
      if (i >= mA) break;
      arcPts[mArc++] = armA[i];
    }
    arcPts[mArc++] = curV.rg;
    for (int i = 0; i < 8; i++) {
      if (i >= mB) break;
      arcPts[mArc++] = armB[i];
    }
    float circR = 0.0, circRms = 999.0;
    bool hasCirc = (mArc >= 5) ? fitCircle2DGL(arcPts, mArc, circR, circRms) : false;
    float wedgeRms = 0.5 * (fArms + fBrms);
    bool isRoundArc = hasCirc && circR >= 2.2 && circR <= 95.0 && circRms <= min(0.18, wedgeRms * 0.72);

    bool isTrueCorner = !isRoundArc && (
      (bothLinear && armTurn >= 0.48 && sagRatio6 >= 0.16) ||
      (armTurn >= 0.65 && sagRatio6 >= 0.24 && (w6 - w3) >= 1.3 && wedgeRms <= 0.34)
    );

    if (isTrueCorner) {
      /* Tandai vSharpPin = 1 dengan menambahkan +16384.0 ke kanal .b */
      if (curV.b < 8192.0) curV.b += 16384.0;
      if (bothLinear) {
        float det = fAd.x * fBd.y - fAd.y * fBd.x;
        if (abs(det) > 0.12) {
          vec2 wVec = fBc - fAc;
          float t = (wVec.x * fBd.y - wVec.y * fBd.x) / det;
          vec2 ap = fAc + fAd * t;
          float d0 = length(ap - curV.rg);
          float d1 = length(ap - texelFetch(u_vtx, nbs[0], 0).rg);
          float d2 = length(ap - texelFetch(u_vtx, nbs[1], 0).rg);
          if (d0 <= d1 + 0.15 && d0 <= d2 + 0.15 && d0 <= 1.15) {
            curV.r = clamp(ap.x, float(x) - 0.65, float(x) + 0.65);
            curV.g = clamp(ap.y, float(y) - 0.65, float(y) + 0.65);
          }
        }
      } else if (linA != linB) {
        vec2 fStrC = linA ? fAc : fBc;
        vec2 fStrD = linA ? fAd : fBd;
        vec2 nearCurv[8];
        int mNear = min(4, linA ? lenB : lenA);
        for (int i = 0; i < 4; i++) {
          if (i >= mNear) break;
          ivec2 kv = linA ? keysB[i] : keysA[i];
          nearCurv[i] = texelFetch(u_vtx, kv, 0).rg;
        }
        vec2 fNc, fNd;
        float fNrms, fNdev, fNspan;
        if (fitLine2DGL(nearCurv, mNear, fNc, fNd, fNrms, fNdev, fNspan)) {
          float det = fStrD.x * fNd.y - fStrD.y * fNd.x;
          if (abs(det) > 0.15) {
            vec2 wVec = fNc - fStrC;
            float t = (wVec.x * fNd.y - wVec.y * fNd.x) / det;
            vec2 ap = fStrC + fStrD * t;
            float d0 = length(ap - curV.rg);
            if (d0 <= 0.42) {
              curV.r = clamp(ap.x, float(x) - 0.45, float(x) + 0.45);
              curV.g = clamp(ap.y, float(y) - 0.45, float(y) + 0.45);
            }
          }
        }
      }
    }
    outVtx = curV;
  }`,M=L+`
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h || vertexValence(v) < 3) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt < 3) {
      outVtx = curV;
      return;
    }
    float a00 = 0.20, a01 = 0.0, a11 = 0.20;
    float b0 = 0.20 * float(x), b1 = 0.20 * float(y);
    int validBranches = 0;

    for (int bi = 0; bi < 4; bi++) {
      if (bi >= nCnt) break;
      ivec2 ch[9];
      int chLen = walkChainGrid(v, nbs[bi], 6, ch);
      int m = chLen - 1;
      if (m >= 2) {
        vec2 pts[8];
        for (int s = 1; s < 9; s++) {
          if (s >= chLen) break;
          pts[s - 1] = texelFetch(u_vtx, ch[s], 0).rg;
        }
        vec2 fc, fd;
        float fRms, fDev, fSpan;
        if (fitLine2DGL(pts, m, fc, fd, fRms, fDev, fSpan)) {
          float nx = -fd.y, ny = fd.x;
          float wgt = 1.0 / (0.04 + fRms);
          a00 += wgt * nx * nx;
          a01 += wgt * nx * ny;
          a11 += wgt * ny * ny;
          float rhs = nx * fc.x + ny * fc.y;
          b0 += wgt * nx * rhs;
          b1 += wgt * ny * rhs;
          validBranches++;
        }
      }
    }

    if (validBranches >= 2) {
      float det = a00 * a11 - a01 * a01;
      if (abs(det) > 1e-6) {
        float jx = (a11 * b0 - a01 * b1) / det;
        float jy = (a00 * b1 - a01 * b0) / det;
        curV.r = clamp(jx, float(x) - 0.50, float(x) + 0.50);
        curV.g = clamp(jy, float(y) - 0.50, float(y) + 0.50);
      }
    }
    outVtx = curV;
  }`,v=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_vtx;
  out vec4 outRef;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    outRef = texelFetch(u_vtx, p, 0);
  }`,D=L+`
  out vec4 outVtx;
  void main() {
    ivec2 v = ivec2(gl_FragCoord.xy);
    int x = v.x, y = v.y;
    int w = u_imgRes.x, h = u_imgRes.y;
    vec4 curV = texelFetch(u_vtx, v, 0);
    if (x <= 0 || y <= 0 || x >= w || y >= h) {
      outVtx = curV;
      return;
    }
    if (curV.b >= 8192.0 || vertexValence(v) != 2) {
      outVtx = curV;
      return;
    }
    ivec2 nbs[4];
    int nCnt = getGridNeighbors(v, nbs);
    if (nCnt != 2) {
      outVtx = curV;
      return;
    }
    ivec2 a = nbs[0], b = nbs[1];
    vec4 va = texelFetch(u_vtx, a, 0);
    vec4 vb = texelFetch(u_vtx, b, 0);
    bool dampCond = (va.b >= 8192.0) || (vb.b >= 8192.0) || (vertexValence(a) >= 3) || (vertexValence(b) >= 3);
    float damp = dampCond ? 0.30 : 1.0;

    vec2 m = 0.5 * (va.rg + vb.rg);
    vec2 d = (m - curV.rg) * (u_weight * damp);

    vec4 refV = texelFetch(u_refTex, v, 0);
    vec2 beachV = refV.rg;
    float nx = refV.b >= 8192.0 ? (refV.b - 16384.0) : refV.b;
    float ny = refV.a;

    if (nx != 0.0 || ny != 0.0) {
      vec2 nVec = vec2(nx, ny);
      vec2 tVec = vec2(-ny, nx);
      float dNorm = dot(d, nVec);
      float dTang = dot(d, tVec);
      vec2 newP = curV.rg + tVec * dTang + nVec * (dNorm * 0.40);
      vec2 totD = newP - beachV;
      float cNorm = clamp(dot(totD, nVec), -0.14, 0.14);
      float cTang = clamp(dot(totD, tVec), -0.36, 0.36);
      outVtx = vec4(beachV + tVec * cTang + nVec * cNorm, curV.b, curV.a);
    } else {
      outVtx = vec4(
        clamp(curV.r + d.x, beachV.x - 0.22, beachV.x + 0.22),
        clamp(curV.g + d.y, beachV.y - 0.22, beachV.y + 0.22),
        curV.b,
        curV.a
      );
    }
  }`,N=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int y = idx / u_texW;
    int x = idx - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int ia = (i - 1 + u_n) % u_n;
    int ib = (i + 1) % u_n;
    vec2 pa = texelFetch(u_ptsTex, idxToCoord(ia), 0).rg;
    vec2 pb = texelFetch(u_ptsTex, idxToCoord(ib), 0).rg;
    vec2 nextP = cur.rg + u_weight * (0.5 * (pa + pb) - cur.rg);
    outPt = vec4(nextP, cur.b, cur.a);
  }`;function V(J,ut,mt,it,nt,lt,ht,gt,ct){if(!$t.useGpu||$t.gpuPipeline!=="full")return!1;let bt=r($t.gpuPower);if(!bt||!bt.extFloat)return!1;let{gl:Ct}=bt,Tt=lt+1,yt=ht+1;if(Tt>Pe.gpu.maxTexSize||yt>Pe.gpu.maxTexSize)return!1;try{let pt=nt&&nt._segCtx||gt&&gt._segCtx||null,Mt=c(bt,gt,null,ct,pt,nt);if(!Mt)return!1;let vt=pe.allocateSlot(Ct,"bufVerticesA",lt,ht,!0),Ft=pe.allocateSlot(Ct,"bufVerticesB",lt,ht,!0),wt=pe.allocateSlot(Ct,"texLabGrad",lt,ht,!0);if(!vt||!Ft||!wt||!vt.isFloat||!Ft.isFloat)return!1;let Et=gt&&gt.origAlpha&&gt.origAlpha.length===lt*ht?1:0;if(!x(bt,"vtxBeachDeconv",m,vt,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Mt.labSlotA.tex),kt.uniform1i(kt.getUniformLocation(It,"u_labels"),0),kt.activeTexture(kt.TEXTURE1),kt.bindTexture(kt.TEXTURE_2D,Mt.rawSlot.tex),kt.uniform1i(kt.getUniformLocation(It,"u_rawTex"),1),kt.activeTexture(kt.TEXTURE2),kt.bindTexture(kt.TEXTURE_2D,Mt.palLutSlot.tex),kt.uniform1i(kt.getUniformLocation(It,"u_palLut"),2),kt.uniform2i(kt.getUniformLocation(It,"u_imgRes"),lt,ht),kt.uniform1i(kt.getUniformLocation(It,"u_K"),Mt.K),kt.uniform1i(kt.getUniformLocation(It,"u_hasOrigAlpha"),Et)})||!x(bt,"vtxBorderExtrap",F,Ft,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Mt.labSlotA.tex),kt.uniform1i(kt.getUniformLocation(It,"u_labels"),0),kt.activeTexture(kt.TEXTURE1),kt.bindTexture(kt.TEXTURE_2D,vt.tex),kt.uniform1i(kt.getUniformLocation(It,"u_vtx"),1),kt.uniform2i(kt.getUniformLocation(It,"u_imgRes"),lt,ht)})||!x(bt,"vtxCornerStepB",d,vt,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Mt.labSlotA.tex),kt.uniform1i(kt.getUniformLocation(It,"u_labels"),0),kt.activeTexture(kt.TEXTURE1),kt.bindTexture(kt.TEXTURE_2D,Ft.tex),kt.uniform1i(kt.getUniformLocation(It,"u_vtx"),1),kt.uniform2i(kt.getUniformLocation(It,"u_imgRes"),lt,ht)})||!x(bt,"vtxJuncStepB2",M,Ft,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Mt.labSlotA.tex),kt.uniform1i(kt.getUniformLocation(It,"u_labels"),0),kt.activeTexture(kt.TEXTURE1),kt.bindTexture(kt.TEXTURE_2D,vt.tex),kt.uniform1i(kt.getUniformLocation(It,"u_vtx"),1),kt.uniform2i(kt.getUniformLocation(It,"u_imgRes"),lt,ht)})||!x(bt,"vtxSnapshotRef",v,wt,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Ft.tex),kt.uniform1i(kt.getUniformLocation(It,"u_vtx"),0)}))return!1;let Gt=[.42,-.44,.38,-.4,.34,-.36],Ut=Ft,qt=vt;for(let kt=0;kt<Gt.length;kt++){let It=Gt[kt];if(!x(bt,"vtxTaubinAniso",D,qt,(zt,ue)=>{zt.activeTexture(zt.TEXTURE0),zt.bindTexture(zt.TEXTURE_2D,Mt.labSlotA.tex),zt.uniform1i(zt.getUniformLocation(ue,"u_labels"),0),zt.activeTexture(zt.TEXTURE1),zt.bindTexture(zt.TEXTURE_2D,Ut.tex),zt.uniform1i(zt.getUniformLocation(ue,"u_vtx"),1),zt.activeTexture(zt.TEXTURE2),zt.bindTexture(zt.TEXTURE_2D,wt.tex),zt.uniform1i(zt.getUniformLocation(ue,"u_refTex"),2),zt.uniform2i(zt.getUniformLocation(ue,"u_imgRes"),lt,ht),zt.uniform1f(zt.getUniformLocation(ue,"u_weight"),It)}))return!1;let Jt=Ut;Ut=qt,qt=Jt}if(!x(bt,"vtxBorderExtrap",F,qt,(kt,It)=>{kt.activeTexture(kt.TEXTURE0),kt.bindTexture(kt.TEXTURE_2D,Mt.labSlotA.tex),kt.uniform1i(kt.getUniformLocation(It,"u_labels"),0),kt.activeTexture(kt.TEXTURE1),kt.bindTexture(kt.TEXTURE_2D,Ut.tex),kt.uniform1i(kt.getUniformLocation(It,"u_vtx"),1),kt.uniform2i(kt.getUniformLocation(It,"u_imgRes"),lt,ht)}))return!1;let Bt=Tt*yt,Ot=Zt.acquire(Float32Array,Bt*4);Ct.bindFramebuffer(Ct.FRAMEBUFFER,qt.fbo),Ct.readPixels(0,0,Tt,yt,Ct.RGBA,Ct.FLOAT,Ot),Ct.bindFramebuffer(Ct.FRAMEBUFFER,null);for(let kt=0;kt<Bt;kt++){let It=kt*4;J[kt]=Ot[It],ut[kt]=Ot[It+1],it[kt]=Ot[It+2]>=8192?1:0}return Zt.release(Ot),!0}catch{return!1}}function K(J,ut,mt=14,it=.45,nt=-.473){if(!$t.useGpu||$t.gpuPipeline==="off")return null;let lt=r($t.gpuPower);if(!lt||!lt.extFloat)return null;let ht=J?J.length:0;if(ht<5)return null;let{gl:gt}=lt;try{let ct=Math.min(256,ht),bt=Math.ceil(ht/ct);if(ct>Pe.gpu.maxTexSize||bt>Pe.gpu.maxTexSize)return null;let Ct=pe.allocateSlot(gt,"bufVerticesA",ct-1,bt-1,!0),Tt=pe.allocateSlot(gt,"bufVerticesB",ct-1,bt-1,!0);if(!Ct||!Tt||!Ct.isFloat||!Tt.isFloat)return null;let yt=Ct.w*Ct.h,pt=Zt.acquire(Float32Array,yt*4);for(let Et=0;Et<ht;Et++){let Dt=Et*4;pt[Dt]=J[Et][0],pt[Dt+1]=J[Et][1],pt[Dt+2]=ut&&ut[Et]?1:0,pt[Dt+3]=1}G(gt,"bufVerticesA",ct-1,bt-1,pt,!0),Zt.release(pt);let Mt=Ct,vt=Tt;for(let Et=0;Et<mt;Et++)for(let Dt of[it,nt]){if(!x(lt,"contourTaubinPass",N,vt,(Pt,Rt)=>{Pt.activeTexture(Pt.TEXTURE0),Pt.bindTexture(Pt.TEXTURE_2D,Mt.tex),Pt.uniform1i(Pt.getUniformLocation(Rt,"u_ptsTex"),0),Pt.uniform1i(Pt.getUniformLocation(Rt,"u_texW"),Ct.w),Pt.uniform1i(Pt.getUniformLocation(Rt,"u_n"),ht),Pt.uniform1f(Pt.getUniformLocation(Rt,"u_weight"),Dt)}))return null;let Xt=Mt;Mt=vt,vt=Xt}let Ft=Zt.acquire(Float32Array,yt*4);gt.bindFramebuffer(gt.FRAMEBUFFER,Mt.fbo),gt.readPixels(0,0,Ct.w,Ct.h,gt.RGBA,gt.FLOAT,Ft),gt.bindFramebuffer(gt.FRAMEBUFFER,null);let wt=new Array(ht);for(let Et=0;Et<ht;Et++){let Dt=Et*4;wt[Et]=[Ft[Dt],Ft[Dt+1]]}return Zt.release(Ft),wt}catch{return null}}let W=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_weight;
  uniform int u_isMuStep;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec2 ptAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0).rg;
  }

  float turnAt(int idx, out float l1Out, out float l2Out) {
    vec2 a = ptAt(idx - 1);
    vec2 p = ptAt(idx);
    vec2 b = ptAt(idx + 1);
    vec2 u = p - a;
    vec2 v = b - p;
    l1Out = length(u);
    l2Out = length(v);
    if (l1Out > 1e-5 && l2Out > 1e-5) {
      return atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
    }
    return 0.0;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec2 rawP = texelFetch(u_rawTex, c, 0).rg;

    if (u_isMuStep == 0) {
      if (cur.b > 0.5) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      float lPrev = 0.0, lNext = 0.0;
      float t0 = turnAt(i, lPrev, lNext);
      bool hasOpp = false;
      for (int d = 1; d <= 4; d++) {
        float dm1 = 0.0, dm2 = 0.0;
        float tM = turnAt(i - d, dm1, dm2);
        float tP = turnAt(i + d, dm1, dm2);
        if (t0 * tM < -0.006 || t0 * tP < -0.006) {
          hasOpp = true;
          break;
        }
      }
      bool isZig = (abs(t0) >= 0.25 && hasOpp && min(lPrev, lNext) <= 4.5);
      if (!isZig) {
        outPt = vec4(cur.rg, cur.b, 0.0);
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    } else {
      if (cur.a < 0.5) {
        outPt = cur;
        return;
      }
      vec2 m = 0.5 * (ptAt(i - 1) + ptAt(i + 1));
      vec2 t = cur.rg + u_weight * (m - cur.rg);
      vec2 cl = clamp(t, rawP - vec2(0.48), rawP + vec2(0.48));
      outPt = vec4(cl, cur.b, 1.0);
    }
  }`,H=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform int u_texW;
  uniform int u_n;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    if (cur.b > 0.5) {
      outPt = vec4(cur.rg, 1.0, cur.a);
      return;
    }
    vec2 pM4 = texelFetch(u_ptsTex, idxToCoord(i - 4), 0).rg;
    vec2 p0  = cur.rg;
    vec2 pP4 = texelFetch(u_ptsTex, idxToCoord(i + 4), 0).rg;
    vec2 u = p0 - pM4;
    vec2 v = pP4 - p0;
    float l1 = length(u), l2 = length(v);
    float locked = 0.0;
    if (l1 > 0.5 && l2 > 0.5) {
      float turn4 = abs(atan(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y));
      float c4 = max(1e-6, length(pP4 - pM4));
      float sag4 = length(p0 - 0.5 * (pM4 + pP4));
      if (turn4 >= 0.45 && (sag4 / c4) >= 0.16) locked = 1.0;
    }
    outPt = vec4(cur.rg, locked, cur.a);
  }`,et=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_rawTex;
  uniform int u_texW;
  uniform int u_n;
  uniform int u_maxW;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 fetchAt(int idx) {
    return texelFetch(u_ptsTex, idxToCoord(idx), 0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_ptsTex, c, 0);
    if (i >= u_n || cur.b > 0.5) {
      outPt = cur;
      return;
    }
    int quarterN = u_n >> 2;
    int w = 0;
    for (int step = 0; step < 36; step++) {
      if (w >= u_maxW || w >= quarterN) break;
      if (fetchAt(i - w - 1).b > 0.5 || fetchAt(i + w + 1).b > 0.5) break;
      w++;
    }
    if (w < 4) {
      outPt = cur;
      return;
    }
    float arc = 0.0;
    vec2 prevP = fetchAt(i - w).rg;
    vec2 pA = prevP;
    for (int k = -36; k < 36; k++) {
      if (k < -w) continue;
      if (k >= w) break;
      vec2 nxtP = fetchAt(i + k + 1).rg;
      arc += distance(prevP, nxtP);
      prevP = nxtP;
    }
    vec2 pB = prevP;
    float chord = distance(pA, pB);
    if (chord < 3.0 || (arc / chord) > 1.035) {
      outPt = cur;
      return;
    }

    float sig = float(w) * 0.55;
    float inv2Sig2 = 1.0 / (2.0 * sig * sig);
    float s0 = 0.0, s2 = 0.0, s4 = 0.0;
    float sx0 = 0.0, sx2 = 0.0, sy0 = 0.0, sy2 = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      float k2 = fk * fk;
      float wt = exp(-k2 * inv2Sig2);
      vec2 pk = fetchAt(i + k).rg;
      s0 += wt;
      s2 += wt * k2;
      s4 += wt * k2 * k2;
      sx0 += wt * pk.x;
      sx2 += wt * k2 * pk.x;
      sy0 += wt * pk.y;
      sy2 += wt * k2 * pk.y;
    }
    float det = s0 * s4 - s2 * s2;
    if (abs(det) < 1e-9) {
      outPt = cur;
      return;
    }
    float ax = (s4 * sx0 - s2 * sx2) / det;
    float cx = (s0 * sx2 - s2 * sx0) / det;
    float ay = (s4 * sy0 - s2 * sy2) / det;
    float cy = (s0 * sy2 - s2 * sy0) / det;
    float bx = (pB.x - pA.x) / float(2 * w);
    float by = (pB.y - pA.y) / float(2 * w);

    float errSq = 0.0;
    for (int k = -36; k <= 36; k++) {
      if (k < -w) continue;
      if (k > w) break;
      float fk = float(k);
      vec2 pk = fetchAt(i + k).rg;
      float fx = ax + bx * fk + cx * fk * fk;
      float fy = ay + by * fk + cy * fk * fk;
      vec2 df = pk - vec2(fx, fy);
      errSq += dot(df, df);
    }
    float rms = sqrt(errSq / float(2 * w + 1));
    if (rms <= 0.42) {
      vec2 rawP = texelFetch(u_rawTex, c, 0).rg;
      vec2 cl = clamp(vec2(ax, ay), rawP - vec2(0.58), rawP + vec2(0.58));
      outPt = vec4(cl, cur.b, cur.a);
    } else {
      outPt = cur;
    }
  }`;function rt(J,ut=.65,mt=null,it=null){return null}let dt=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_curTex;
  uniform sampler2D u_refTex;
  uniform int u_texW;
  uniform int u_n;
  uniform float u_lam;
  out vec4 outPt;

  ivec2 idxToCoord(int idx) {
    int k = ((idx % u_n) + u_n) % u_n;
    int y = k / u_texW;
    int x = k - y * u_texW;
    return ivec2(x, y);
  }

  vec4 curAt(int idx) { return texelFetch(u_curTex, idxToCoord(idx), 0); }
  vec4 refAt(int idx) { return texelFetch(u_refTex, idxToCoord(idx), 0); }

  float bendWeightAt(int k) {
    vec4 ck = curAt(k);
    if (ck.b > 0.5) return 0.0;
    bool nearCorner = (curAt(k - 1).b > 0.5) || (curAt(k + 1).b > 0.5);
    float baseW = (ck.a > 0.5) ? (u_lam * 0.65) : u_lam;
    return baseW * (nearCorner ? 0.15 : 1.0);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int i = c.y * u_texW + c.x;
    vec4 cur = texelFetch(u_curTex, c, 0);
    if (i >= u_n) {
      outPt = cur;
      return;
    }
    vec4 ref = texelFetch(u_refTex, c, 0);
    vec2 d0 = ref.rg;
    vec2 snapP = ref.ba;
    if (cur.b > 0.5) {
      outPt = vec4(snapP, cur.b, cur.a);
      return;
    }

    float wData = (cur.a > 0.5) ? 3.5 : 1.8;
    vec2 g = 2.0 * wData * (cur.rg - d0);

    vec2 vM2 = curAt(i - 2).rg;
    vec2 vM1 = curAt(i - 1).rg;
    vec2 v0  = cur.rg;
    vec2 vP1 = curAt(i + 1).rg;
    vec2 vP2 = curAt(i + 2).rg;

    float wBm = bendWeightAt(i - 1);
    float wB0 = bendWeightAt(i);
    float wBp = bendWeightAt(i + 1);

    if (wBm > 0.0) g += 2.0 * wBm * (vM2 - 2.0 * vM1 + v0);
    if (wB0 > 0.0) g -= 4.0 * wB0 * (vM1 - 2.0 * v0  + vP1);
    if (wBp > 0.0) g += 2.0 * wBp * (v0  - 2.0 * vP1 + vP2);

    float diagH = 2.0 * wData + 8.0 * wB0 + 2.0 * (wBm + wBp);
    vec2 xt = v0 - (0.68 / max(1e-4, diagH)) * g;

    float maxTube = (curAt(i - 1).b > 0.5 || curAt(i + 1).b > 0.5) ? 0.12 : 0.28;
    vec2 dSnap = xt - snapP;
    float dl = length(dSnap);
    if (dl > maxTube) {
      xt = snapP + (dSnap / dl) * maxTube;
    }
    outPt = vec4(xt, cur.b, cur.a);
  }`;function Y(J,ut,mt,it,nt=.5,lt=12){return null}let Z=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_ptsTex;
  uniform sampler2D u_metaTex;
  uniform int u_ptsTexW;
  uniform int u_metaTexW;
  uniform int u_outTexW;
  uniform int u_numChains;
  out vec4 outCtrl;

  ivec2 ptCoord(int idx) {
    int y = idx / u_ptsTexW;
    int x = idx - y * u_ptsTexW;
    return ivec2(x, y);
  }

  ivec2 metaCoord(int idx) {
    int y = idx / u_metaTexW;
    int x = idx - y * u_metaTexW;
    return ivec2(x, y);
  }

  vec2 evalBez(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t, u2 = u * u, t2 = t * t;
    return u2 * u * P0 + 3.0 * u2 * t * P1 + 3.0 * u * t2 * P2 + t2 * t * P3;
  }

  vec2 evalBezD1(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 3.0 * (u * u * (P1 - P0) + 2.0 * u * t * (P2 - P1) + t * t * (P3 - P2));
  }

  vec2 evalBezD2(vec2 P0, vec2 P1, vec2 P2, vec2 P3, float t) {
    float u = 1.0 - t;
    return 6.0 * (u * (P2 - 2.0 * P1 + P0) + t * (P3 - 2.0 * P2 + P1));
  }

  void solveAlphasGL(
    int startIdx, int n, float uArr[96],
    vec2 P0, vec2 P3, vec2 tL, vec2 tR,
    float chord, float L, float circAlpha,
    out vec2 outP1, out vec2 outP2
  ) {
    float aNat = circAlpha > 0.0 ? circAlpha : (L / 3.0);
    float regW = circAlpha > 0.0 ? 0.06 : 0.004;
    float c00 = regW, c01 = 0.0, c11 = regW;
    float x0 = regW * aNat, x1 = regW * aNat;
    for (int i = 0; i < 96; i++) {
      if (i >= n) break;
      float t = uArr[i], m = 1.0 - t;
      float b0 = m * m * m, b1 = 3.0 * m * m * t, b2 = 3.0 * m * t * t, b3 = t * t * t;
      vec2 a1v = tL * b1;
      vec2 a2v = tR * b2;
      c00 += dot(a1v, a1v);
      c01 += dot(a1v, a2v);
      c11 += dot(a2v, a2v);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 rhs = pi - (P0 * (b0 + b1) + P3 * (b2 + b3));
      x0 += dot(a1v, rhs);
      x1 += dot(a2v, rhs);
    }
    float det = c00 * c11 - c01 * c01;
    float minA = max(0.08 * chord, 0.06 * L);
    float maxA = min(0.75 * L, max(0.78 * chord, 0.62 * L));
    float a1 = abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : aNat;
    float a2 = abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : aNat;
    if (a1 < minA || a1 > maxA) {
      a1 = clamp(a1, minA, maxA);
      if (c11 > 1e-9) a2 = (x1 - c01 * a1) / c11;
    }
    if (a2 < minA || a2 > maxA) {
      a2 = clamp(a2, minA, maxA);
      if (c00 > 1e-9) a1 = clamp((x0 - c01 * a2) / c00, minA, maxA);
    }
    outP1 = P0 + tL * a1;
    outP2 = P3 + tR * a2;
  }

  float computeMaxErrGL(int startIdx, int n, float uArr[96], vec2 P0, vec2 P1, vec2 P2, vec2 P3) {
    float maxE2 = 0.0;
    for (int i = 1; i < 96; i++) {
      if (i >= n - 1) break;
      vec2 Q = evalBez(P0, P1, P2, P3, uArr[i]);
      vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
      vec2 df = Q - pi;
      float d2 = dot(df, df);
      if (d2 > maxE2) maxE2 = d2;
    }
    return sqrt(maxE2);
  }

  bool isConvexPairValidGL(
    vec2 P0, vec2 cP1, vec2 cP2, vec2 P3,
    vec2 chU, float chord, float minOppExcur, float convexSign,
    bool hasTanL, bool hasTanR
  ) {
    if (chord < 1.5) return true;
    float h1 = (cP1.x - P0.x) * chU.y - (cP1.y - P0.y) * chU.x;
    float h2 = (cP2.x - P0.x) * chU.y - (cP2.y - P0.y) * chU.x;
    if (minOppExcur <= max(0.85, chord * 0.035) && (h1 * h2) < -1e-4) return false;
    if (abs(convexSign) > 0.5 && (convexSign * h1 < -0.005 || convexSign * h2 < -0.005)) return false;
    float proj1 = dot(cP1 - P0, chU);
    float proj2 = dot(P3 - cP2, chU);
    float minP1 = hasTanL ? (-0.05 * chord) : (0.02 * chord);
    float minP2 = hasTanR ? (-0.05 * chord) : (0.02 * chord);
    return proj1 >= minP1 && proj2 >= minP2 && proj1 <= 0.88 * chord && proj2 <= 0.88 * chord;
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    int k = c.y * u_outTexW + c.x;
    if (k >= u_numChains) {
      outCtrl = vec4(0.0);
      return;
    }
    vec4 m0 = texelFetch(u_metaTex, metaCoord(k * 3), 0);
    vec4 m1 = texelFetch(u_metaTex, metaCoord(k * 3 + 1), 0);
    vec4 m2 = texelFetch(u_metaTex, metaCoord(k * 3 + 2), 0);

    int startIdx = int(floor(m0.r + 0.5));
    int n = clamp(int(floor(m0.g + 0.5)), 2, 96);
    vec2 tL = m0.ba;
    vec2 tR = m1.rg;
    float circAlpha = m1.b;
    float L = m1.a;
    float minOppExcur = m2.r;
    float convexSign = m2.g;
    int flags = int(floor(m2.b + 0.5));
    bool hasTanL = (flags & 1) != 0;
    bool hasTanR = (flags & 2) != 0;

    vec2 P0 = texelFetch(u_ptsTex, ptCoord(startIdx), 0).rg;
    vec2 P3 = texelFetch(u_ptsTex, ptCoord(startIdx + n - 1), 0).rg;
    float chord = distance(P0, P3);
    vec2 chU = chord > 1e-6 ? (P3 - P0) / chord : vec2(1.0, 0.0);

    float uArr[96];
    for (int i = 0; i < 96; i++) {
      if (i >= n) { uArr[i] = 1.0; continue; }
      uArr[i] = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).b;
    }

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      for (int pass = 0; pass < 2; pass++) {
        float prevU = 0.0;
        uArr[0] = 0.0;
        uArr[n - 1] = 1.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, cP1, cP2, P3, t);
          vec2 Q1 = evalBezD1(P0, cP1, cP2, P3, t);
          vec2 Q2 = evalBezD2(P0, cP1, cP2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uArr[i] = prevU;
        }
      }
    }

    vec2 P1, P2;
    solveAlphasGL(startIdx, n, uArr, P0, P3, tL, tR, chord, L, circAlpha, P1, P2);
    float bestErr = computeMaxErrGL(startIdx, n, uArr, P0, P1, P2, P3);

    if (circAlpha > 0.0) {
      vec2 cP1 = P0 + tL * circAlpha;
      vec2 cP2 = P3 + tR * circAlpha;
      float cErr = computeMaxErrGL(startIdx, n, uArr, P0, cP1, cP2, P3);
      if (cErr <= bestErr * 1.05) {
        P1 = cP1; P2 = cP2; bestErr = cErr;
      }
    }

    if (bestErr > 0.015 && bestErr < 18.0 && n >= 4) {
      float uNext[96];
      for (int it = 0; it < 10; it++) {
        uNext[0] = 0.0;
        uNext[n - 1] = 1.0;
        float prevU = 0.0;
        for (int i = 1; i < 96; i++) {
          if (i >= n - 1) break;
          float t = uArr[i];
          vec2 Q = evalBez(P0, P1, P2, P3, t);
          vec2 Q1 = evalBezD1(P0, P1, P2, P3, t);
          vec2 Q2 = evalBezD2(P0, P1, P2, P3, t);
          vec2 pi = texelFetch(u_ptsTex, ptCoord(startIdx + i), 0).rg;
          vec2 df = Q - pi;
          float num = dot(df, Q1);
          float den = dot(Q1, Q1) + dot(df, Q2);
          float nt = abs(den) > 1e-12 ? (t - num / den) : t;
          prevU = clamp(nt, prevU + 1e-5, 1.0 - 1e-5);
          uNext[i] = prevU;
        }
        vec2 nP1, nP2;
        solveAlphasGL(startIdx, n, uNext, P0, P3, tL, tR, chord, L, circAlpha, nP1, nP2);
        float nErr = computeMaxErrGL(startIdx, n, uNext, P0, nP1, nP2, P3);
        if (nErr < bestErr && isConvexPairValidGL(P0, nP1, nP2, P3, chU, chord, minOppExcur, convexSign, hasTanL, hasTanR)) {
          for (int i = 0; i < 96; i++) {
            if (i >= n) break;
            uArr[i] = uNext[i];
          }
          P1 = nP1;
          P2 = nP2;
          bestErr = nErr;
        } else {
          break;
        }
      }
    }

    outCtrl = vec4(P1.x, P1.y, P2.x, P2.y);
  }`;function ot(J){if(!$t.useGpu||$t.gpuPipeline==="off")return null;if(!J||!J.length)return[];let ut=r($t.gpuPower);if(!ut||!ut.extFloat)return null;let{gl:mt}=ut;try{let it=J.length,nt=0,lt=new Array(it);for(let Xt=0;Xt<it;Xt++){let Pt=J[Xt],Rt=Pt.pts,Gt=Rt.length;if(Gt<2||Gt>96){lt[Xt]={cpuFallback:!0,res:Ln(Rt,Pt.tanL,Pt.tanR,Pt.allowLine)};continue}let Ut=Rt[0],qt=Rt[Gt-1],Vt=new Float64Array(Gt),Bt=0;for(let ee=1;ee<Gt;ee++)Bt+=Math.hypot(Rt[ee][0]-Rt[ee-1][0],Rt[ee][1]-Rt[ee-1][1]),Vt[ee]=Bt;if(Bt<1e-9){lt[Xt]={cpuFallback:!0,res:null};continue}for(let ee=0;ee<Gt;ee++)Vt[ee]/=Bt;let Ot=Math.hypot(qt[0]-Ut[0],qt[1]-Ut[1]),kt=Ot>1e-6?(qt[0]-Ut[0])/Ot:1,It=Ot>1e-6?(qt[1]-Ut[1])/Ot:0,Kt=0,Jt=0,zt=0;for(let ee=1;ee<Gt-1;ee++){let oe=(Rt[ee][0]-Ut[0])*It-(Rt[ee][1]-Ut[1])*kt;zt+=oe,oe>Kt&&(Kt=oe),oe<Jt&&(Jt=oe)}let ue=Math.min(Kt,-Jt),ge=Math.max(Kt,-Jt),Fe=zt>=0?1:-1,Nt=Kt>=.2&&Jt>=-.12?1:Jt<=-.2&&Kt<=.12?-1:ue<=.35&&ge>=.12?Fe:0;if(Pt.allowLine&&Ot>1e-6){let ee=Math.max(Kt,-Jt),oe=!Pt.tanL||Math.abs(Pt.tanL[0]*It-Pt.tanL[1]*kt)<.12,Me=!Pt.tanR||Math.abs(Pt.tanR[0]*It-Pt.tanR[1]*kt)<.12;if(ee<=.22&&oe&&Me){let ce=[Ut[0]+(qt[0]-Ut[0])/3,Ut[1]+(qt[1]-Ut[1])/3],ve=[Ut[0]+2*(qt[0]-Ut[0])/3,Ut[1]+2*(qt[1]-Ut[1])/3];lt[Xt]={cpuFallback:!0,res:{P0:Ut,P1:ce,P2:ve,P3:qt,err:ee,sse:ee*ee*Gt,at:Gt>>1,isLine:!0,tL:[kt,It],tR:[-kt,-It]}};continue}}let jt=null,te=null,he=-1;if(Gt>=5&&Ot>1.5){let ee=Te(Rt);if(ee&&ee.r>=1.8&&ee.r<=500&&ee.rms<=Math.max(.16,ee.r*.015)){let oe=Ut[0]-ee.cx,Me=Ut[1]-ee.cy,ce=Math.hypot(oe,Me)||1,ve=qt[0]-ee.cx,me=qt[1]-ee.cy,ie=Math.hypot(ve,me)||1,Le=Rt[Gt>>1],Ht=(Ut[0]-ee.cx)*(Le[1]-ee.cy)-(Ut[1]-ee.cy)*(Le[0]-ee.cx)>=0?1:-1;jt=[-Me/ce*Ht,oe/ce*Ht],te=[me/ie*Ht,-ve/ie*Ht];let re=Math.acos(St((oe*ve+Me*me)/(ce*ie),-1,1));re>.08&&re<2.2&&(he=4/3*ee.r*Math.tan(re/4))}}let le=jt&&!Pt.tanL,ne=te&&!Pt.tanR,se=Ot>18&&Bt/Ot<1.02?St(Ot*.24,10.5,28):9.5,ae=Pt.tanL?[Pt.tanL[0],Pt.tanL[1]]:le?jt:kn(Rt,!0,se),Se=ne?[-te[0],-te[1]]:kn(Rt,!1,se),ke=Pt.tanR?[Pt.tanR[0],Pt.tanR[1]]:ne?te:[-Se[0],-Se[1]],ye=(ee,oe)=>{if(!Nt)return ee;let Me=ee[0]*It-ee[1]*kt;if(Nt*Me<-.01){if(oe&&jt)return jt;if(!oe&&te)return te;let ce=ee[0]*kt+ee[1]*It,ve=Math.abs(Me)*.5*Nt,me=ce*kt+ve*It,ie=ce*It-ve*kt,Le=Math.hypot(me,ie)||1;return[me/Le,ie/Le]}return ee};if(ae=ye(ae,!0),ke=ye(ke,!1),ue<=Math.max(.85,Ot*.035)&&Ot>1.5){let ee=ae[0]*It-ae[1]*kt,oe=-ke[0]*It- -ke[1]*kt;if(ee*oe>1e-4&&ge>=.12){let Me=(ce,ve)=>{let me=ve?-1:1,ie=me*ce[0]*It-me*ce[1]*kt;if(ie*Fe*me>0){let Le=Math.max(.2,me*ce[0]*kt+me*ce[1]*It),Ge=-Fe*me*Math.min(Math.abs(ie)*.35,.18*Le),Ht=me*(Le*kt+Ge*It),re=me*(Le*It-Ge*kt),je=Math.hypot(Ht,re)||1;return[Ht/je,re/je]}return ce};ae=Me(ae,!1),ke=Me(ke,!0)}}let qe=nt;nt+=Gt,lt[Xt]={cpuFallback:!1,pts:Rt,n:Gt,u:Vt,P0:Ut,P3:qt,tL:ae,tR:ke,circAlpha:he,L:Bt,minOppExcur:ue,convexSign:Nt,flags:(Pt.tanL?1:0)|(Pt.tanR?2:0),startIdx:qe}}if(nt===0)return lt.map(Xt=>Xt.res);let ht=Math.min(512,Math.max(16,Math.ceil(Math.sqrt(nt)))),gt=Math.ceil(nt/ht),ct=it*3,bt=Math.min(256,Math.max(8,Math.ceil(Math.sqrt(ct)))),Ct=Math.ceil(ct/bt),Tt=Math.min(256,Math.max(8,Math.ceil(Math.sqrt(it)))),yt=Math.ceil(it/Tt),pt=pe.allocateSlot(mt,"bufVerticesA",ht-1,gt-1,!0),Mt=pe.allocateSlot(mt,"texLabGrad",bt,Ct,!0),vt=pe.allocateSlot(mt,"bufVerticesB",Tt-1,yt-1,!0);if(!pt||!Mt||!vt||!pt.isFloat)return null;let Ft=Zt.acquire(Float32Array,pt.w*pt.h*4),wt=Zt.acquire(Float32Array,Mt.w*Mt.h*4);for(let Xt=0;Xt<it;Xt++){let Pt=lt[Xt];if(Pt.cpuFallback)continue;for(let qt=0;qt<Pt.n;qt++){let Vt=(Pt.startIdx+qt)*4;Ft[Vt]=Pt.pts[qt][0],Ft[Vt+1]=Pt.pts[qt][1],Ft[Vt+2]=Pt.u[qt],Ft[Vt+3]=1}let Rt=Xt*3*4,Gt=(Xt*3+1)*4,Ut=(Xt*3+2)*4;wt[Rt]=Pt.startIdx,wt[Rt+1]=Pt.n,wt[Rt+2]=Pt.tL[0],wt[Rt+3]=Pt.tL[1],wt[Gt]=Pt.tR[0],wt[Gt+1]=Pt.tR[1],wt[Gt+2]=Pt.circAlpha,wt[Gt+3]=Pt.L,wt[Ut]=Pt.minOppExcur,wt[Ut+1]=Pt.convexSign,wt[Ut+2]=Pt.flags,wt[Ut+3]=0}if(G(mt,"bufVerticesA",ht-1,gt-1,Ft,!0),G(mt,"texLabGrad",Mt.w,Mt.h,wt,!0),Zt.release(Ft),Zt.release(wt),!x(ut,"bezierFitGn",Z,vt,(Xt,Pt)=>{Xt.activeTexture(Xt.TEXTURE0),Xt.bindTexture(Xt.TEXTURE_2D,pt.tex),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_ptsTex"),0),Xt.activeTexture(Xt.TEXTURE1),Xt.bindTexture(Xt.TEXTURE_2D,Mt.tex),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_metaTex"),1),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_ptsTexW"),pt.w),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_metaTexW"),Mt.w),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_outTexW"),vt.w),Xt.uniform1i(Xt.getUniformLocation(Pt,"u_numChains"),it)}))return null;let Dt=Zt.acquire(Float32Array,vt.w*vt.h*4);mt.bindFramebuffer(mt.FRAMEBUFFER,vt.fbo),mt.readPixels(0,0,vt.w,vt.h,mt.RGBA,mt.FLOAT,Dt),mt.bindFramebuffer(mt.FRAMEBUFFER,null);let Yt=new Array(it);for(let Xt=0;Xt<it;Xt++){let Pt=lt[Xt];if(Pt.cpuFallback){Yt[Xt]=Pt.res;continue}let Rt=Xt*4,Gt=[Dt[Rt],Dt[Rt+1]],Ut=[Dt[Rt+2],Dt[Rt+3]],qt=0,Vt=0,Bt=Pt.n>>1,Ot=Pt.u;Ot=An(Pt.pts,Ot,Pt.P0,Gt,Ut,Pt.P3);for(let Kt=1;Kt<Pt.n-1;Kt++){let Jt=vn(Pt.P0,Gt,Ut,Pt.P3,Ot[Kt]),zt=(Jt[0]-Pt.pts[Kt][0])**2+(Jt[1]-Pt.pts[Kt][1])**2;Vt+=zt,zt>qt&&(qt=zt,Bt=Kt)}let kt=Math.sqrt(qt),It=J[Xt];(!It.tanL||!It.tanR)&&kt>.14&&Pt.n>=6?Yt[Xt]=Ln(Pt.pts,It.tanL,It.tanR,It.allowLine):Yt[Xt]={P0:Pt.P0,P1:Gt,P2:Ut,P3:Pt.P3,err:kt,sse:Vt,at:Bt,isLine:!1,tL:Pt.tL,tR:Pt.tR}}return Zt.release(Dt),Yt}catch{return null}}let xt=`#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D u_rawTex;
  uniform sampler2D u_labels;
  uniform sampler2D u_edgeTex;
  uniform sampler2D u_palLut;
  uniform ivec2 u_res;
  uniform int u_K;
  uniform float u_edgeThr;
  out vec4 outEval;

  float srgbToLin(float c) {
    return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
  }

  vec3 rgbToLabGL(vec3 rgb255) {
    float r = srgbToLin(rgb255.r / 255.0);
    float g = srgbToLin(rgb255.g / 255.0);
    float b = srgbToLin(rgb255.b / 255.0);
    float X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    float Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
    float Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    float eps = 0.008856, kap = 903.3;
    float fx = X > eps ? pow(X, 1.0 / 3.0) : (kap * X + 16.0) / 116.0;
    float fy = Y > eps ? pow(Y, 1.0 / 3.0) : (kap * Y + 16.0) / 116.0;
    float fz = Z > eps ? pow(Z, 1.0 / 3.0) : (kap * Z + 16.0) / 116.0;
    return vec3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
  }

  float ciede2000GL(vec3 lab1, vec3 lab2) {
    float L1 = lab1.x, a1 = lab1.y, b1 = lab1.z;
    float L2 = lab2.x, a2 = lab2.y, b2 = lab2.z;
    float C1 = length(vec2(a1, b1));
    float C2 = length(vec2(a2, b2));
    float Cbar = 0.5 * (C1 + C2);
    float Cbar7 = pow(Cbar, 7.0);
    float G = 0.5 * (1.0 - sqrt(Cbar7 / (Cbar7 + 6103515625.0)));
    float a1p = (1.0 + G) * a1;
    float a2p = (1.0 + G) * a2;
    float C1p = length(vec2(a1p, b1));
    float C2p = length(vec2(a2p, b2));
    float h1p = (b1 == 0.0 && a1p == 0.0) ? 0.0 : degrees(atan(b1, a1p));
    if (h1p < 0.0) h1p += 360.0;
    float h2p = (b2 == 0.0 && a2p == 0.0) ? 0.0 : degrees(atan(b2, a2p));
    if (h2p < 0.0) h2p += 360.0;

    float dLp = L2 - L1;
    float dCp = C2p - C1p;
    float dhp = 0.0;
    if (C1p * C2p > 1e-8) {
      float dh = h2p - h1p;
      if (abs(dh) <= 180.0) dhp = dh;
      else if (dh > 180.0) dhp = dh - 360.0;
      else dhp = dh + 360.0;
    }
    float dHp = 2.0 * sqrt(C1p * C2p) * sin(radians(dhp * 0.5));

    float Lbarp = 0.5 * (L1 + L2);
    float Cbarp = 0.5 * (C1p + C2p);
    float hbarp = h1p + h2p;
    if (C1p * C2p > 1e-8) {
      if (abs(h1p - h2p) <= 180.0) hbarp = 0.5 * (h1p + h2p);
      else if (h1p + h2p < 360.0) hbarp = 0.5 * (h1p + h2p + 360.0);
      else hbarp = 0.5 * (h1p + h2p - 360.0);
    }

    float T = 1.0
      - 0.17 * cos(radians(hbarp - 30.0))
      + 0.24 * cos(radians(2.0 * hbarp))
      + 0.32 * cos(radians(3.0 * hbarp + 6.0))
      - 0.20 * cos(radians(4.0 * hbarp - 63.0));

    float dTheta = 30.0 * exp(-pow((hbarp - 275.0) / 25.0, 2.0));
    float Cbarp7 = pow(Cbarp, 7.0);
    float RC = 2.0 * sqrt(Cbarp7 / (Cbarp7 + 6103515625.0));
    float Lm50 = Lbarp - 50.0;
    float SL = 1.0 + (0.015 * Lm50 * Lm50) / sqrt(20.0 + Lm50 * Lm50);
    float SC = 1.0 + 0.045 * Cbarp;
    float SH = 1.0 + 0.015 * Cbarp * T;
    float RT = -sin(radians(2.0 * dTheta)) * RC;

    float kL = dLp / SL;
    float kC = dCp / SC;
    float kH = dHp / SH;
    return sqrt(max(0.0, kL * kL + kC * kC + kH * kH + RT * kC * kH));
  }

  int lblAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return int(floor(texelFetch(u_labels, cq, 0).r + 0.5));
  }

  float magAt(ivec2 q) {
    ivec2 cq = clamp(q, ivec2(0), u_res - ivec2(1));
    return texelFetch(u_edgeTex, cq, 0).b;
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int w = u_res.x, h = u_res.y;
    vec4 lInfo = texelFetch(u_labels, p, 0);
    int l0 = int(floor(lInfo.r + 0.5));
    if (lInfo.g > 0.5 || l0 < 0 || l0 >= u_K) {
      outEval = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    vec3 pixRgb = texelFetch(u_rawTex, p, 0).rgb * 255.0;
    vec4 palEntry = texelFetch(u_palLut, ivec2(0, l0), 0);
    float palB = floor(palEntry.a / 256.0);
    float palG = palEntry.a - palB * 256.0;
    vec3 palRgb = vec3(palEntry.b, palG, palB);
    float de00 = ciede2000GL(rgbToLabGL(pixRgb), rgbToLabGL(palRgb));

    float bFlags = 0.0;
    if (p.x >= 1 && p.x < w - 1 && p.y >= 1 && p.y < h - 1) {
      bool isImgEdge = (magAt(p) >= u_edgeThr || magAt(p + ivec2(-1, 0)) >= u_edgeThr || magAt(p + ivec2(1, 0)) >= u_edgeThr || magAt(p + ivec2(0, -1)) >= u_edgeThr || magAt(p + ivec2(0, 1)) >= u_edgeThr);
      bool isSegEdge = (lblAt(p + ivec2(-1, 0)) != l0 || lblAt(p + ivec2(1, 0)) != l0 || lblAt(p + ivec2(0, -1)) != l0 || lblAt(p + ivec2(0, 1)) != l0);
      bFlags = (isImgEdge ? 1.0 : 0.0) + (isSegEdge ? 2.0 : 0.0);
    }

    float dFlags = 0.0;
    if (p.x >= 2 && p.x < w - 2 && p.y >= 2 && p.y < h - 2) {
      int lL1 = lblAt(p + ivec2(-1, 0)), lR1 = lblAt(p + ivec2(1, 0));
      int lU1 = lblAt(p + ivec2(0, -1)), lD1 = lblAt(p + ivec2(0, 1));
      int sameOrtho = (lL1 == l0 ? 1 : 0) + (lR1 == l0 ? 1 : 0) + (lU1 == l0 ? 1 : 0) + (lD1 == l0 ? 1 : 0);
      bool isOrphan = (sameOrtho == 0);
      bool isDetail = (magAt(p) >= u_edgeThr * 1.25);
      bool hasNearBnd = false;
      if (isDetail) {
        int lL2 = lblAt(p + ivec2(-2, 0)), lR2 = lblAt(p + ivec2(2, 0));
        int lU2 = lblAt(p + ivec2(0, -2)), lD2 = lblAt(p + ivec2(0, 2));
        hasNearBnd = (lL1 != l0 || lR1 != l0 || lU1 != l0 || lD1 != l0 || lL2 != l0 || lR2 != l0 || lU2 != l0 || lD2 != l0);
      }
      dFlags = (isOrphan ? 1.0 : 0.0) + (isDetail ? 2.0 : 0.0) + (hasNearBnd ? 4.0 : 0.0);
    }

    outEval = vec4(de00, bFlags, dFlags, 1.0);
  }`;function At(J,ut,mt,it,nt,lt){if(!$t.useGpu||$t.gpuPipeline!=="full"||!J||!mt||!it||!it.length)return null;let ht=r($t.gpuPower);if(!ht||!ht.extFloat)return null;let{gl:gt}=ht,{w:ct,h:bt}=J;if(ct>Pe.gpu.maxTexSize||bt>Pe.gpu.maxTexSize)return null;try{let Ct=mt&&mt._segCtx||J&&J._segCtx||null,Tt=c(ht,J,ut,it,Ct,mt);if(!Tt)return null;let yt=pe.getSlot("texEdgeField");if((!yt||yt.w!==ct||yt.h!==bt||!yt.isFloat)&&(O(J,ut),yt=pe.getSlot("texEdgeField")),!yt)return null;let pt=pe.allocateSlot(gt,"texTensor",ct,bt,!0);if(!pt||!pt.isFloat)return null;let Mt=lt&&lt.type==="photo"?18.5:13.5;if(!x(ht,"roundTripEvalDe00",xt,pt,(Bt,Ot)=>{Bt.activeTexture(Bt.TEXTURE0),Bt.bindTexture(Bt.TEXTURE_2D,Tt.rawSlot.tex),Bt.uniform1i(Bt.getUniformLocation(Ot,"u_rawTex"),0),Bt.activeTexture(Bt.TEXTURE1),Bt.bindTexture(Bt.TEXTURE_2D,Tt.labSlotA.tex),Bt.uniform1i(Bt.getUniformLocation(Ot,"u_labels"),1),Bt.activeTexture(Bt.TEXTURE2),Bt.bindTexture(Bt.TEXTURE_2D,yt.tex),Bt.uniform1i(Bt.getUniformLocation(Ot,"u_edgeTex"),2),Bt.activeTexture(Bt.TEXTURE3),Bt.bindTexture(Bt.TEXTURE_2D,Tt.palLutSlot.tex),Bt.uniform1i(Bt.getUniformLocation(Ot,"u_palLut"),3),Bt.uniform2i(Bt.getUniformLocation(Ot,"u_res"),ct,bt),Bt.uniform1i(Bt.getUniformLocation(Ot,"u_K"),Tt.K),Bt.uniform1f(Bt.getUniformLocation(Ot,"u_edgeThr"),Mt)}))return null;let Ft=Zt.acquire(Float32Array,ct*bt*4);gt.bindFramebuffer(gt.FRAMEBUFFER,pt.fbo),gt.readPixels(0,0,ct,bt,gt.RGBA,gt.FLOAT,Ft),gt.bindFramebuffer(gt.FRAMEBUFFER,null);let wt=Math.max(1,Math.floor(ct*bt/16e3)),Et=0,Dt=0;for(let Bt=0;Bt<ct*bt;Bt+=wt){let Ot=Bt*4;Ft[Ot+3]>.5&&(Et+=Ft[Ot],Dt++)}let Yt=Math.max(1,Math.floor(Math.min(ct,bt)/180)),Xt=0,Pt=0,Rt=0,Gt=0;for(let Bt=1;Bt<bt-1;Bt+=Yt){let Ot=Bt*ct;for(let kt=1;kt<ct-1;kt+=Yt){let It=Ot+kt,Kt=It*4;if(Ft[Kt+3]<.5)continue;let Jt=Math.round(Ft[Kt+1]),zt=(Jt&1)!==0,ue=(Jt&2)!==0;zt&&Rt++,ue&&Gt++,zt&&ue&&Xt++,(zt||ue)&&Pt++}}let Ut=0,qt=0,Vt=0;for(let Bt=2;Bt<bt-2;Bt+=Yt*2){let Ot=Bt*ct;for(let kt=2;kt<ct-2;kt+=Yt*2){let It=Ot+kt,Kt=It*4;if(Ft[Kt+3]<.5)continue;let Jt=Math.round(Ft[Kt+2]);(Jt&1)!==0&&Vt++,(Jt&2)!==0&&(qt++,(Jt&4)!==0&&Ut++)}}return Zt.release(Ft),{meanDE00:Dt>0?Et/Dt:0,validPix:Dt,interB:Xt,unionB:Pt,imgEdgeN:Rt,segEdgeN:Gt,detailHits:Ut,detailTotal:qt,orphanNoise:Vt,bStep:Yt}}catch{return null}}function st(J,ut,mt=1.4,it=22,nt={}){if(!$t.useGpu||$t.gpuPipeline==="off")return!1;let lt=r($t.gpuPower);if(!lt)return!1;let{gl:ht}=lt,{w:gt,h:ct,data:bt}=J;if(gt>Pe.gpu.maxTexSize||ct>Pe.gpu.maxTexSize)return!1;try{let Ct=w(J,"texRawRGBA"),Tt=pe.allocateSlot(ht,"texFltRGBA",gt,ct,!1);if(!Ct||!Tt)return!1;let yt=St(nt&&nt.radius||(mt<=1.15?1:2),1,3),pt=nt&&nt.wedgeGuardThr||780;if(!x(lt,"bilateral",u,Tt,(wt,Et)=>{wt.activeTexture(wt.TEXTURE0),wt.bindTexture(wt.TEXTURE_2D,Ct.tex),wt.uniform1i(wt.getUniformLocation(Et,"u_tex"),0),wt.uniform2f(wt.getUniformLocation(Et,"u_res"),gt,ct),wt.uniform1f(wt.getUniformLocation(Et,"u_inv2Sp"),1/(2*mt*mt)),wt.uniform1f(wt.getUniformLocation(Et,"u_inv2Col"),1/(2*it*it*9)),wt.uniform1f(wt.getUniformLocation(Et,"u_wedgeThr"),pt),wt.uniform1i(wt.getUniformLocation(Et,"u_radius"),yt)}))return!1;if(lt.extFloat){let wt=pe.allocateSlot(ht,"texLabGrad",gt,ct,!0);wt&&x(lt,"rgb2lab",_,wt,(Et,Dt)=>{Et.activeTexture(Et.TEXTURE0),Et.bindTexture(Et.TEXTURE_2D,Tt.tex),Et.uniform1i(Et.getUniformLocation(Dt,"u_tex"),0)})}ht.bindFramebuffer(ht.FRAMEBUFFER,Tt.fbo);let vt=Zt.acquire(Uint8Array,gt*ct*4);ht.readPixels(0,0,gt,ct,ht.RGBA,ht.UNSIGNED_BYTE,vt),ht.bindFramebuffer(ht.FRAMEBUFFER,null);let Ft=bt.data;for(let wt=0;wt<gt*ct;wt++){if(ut&&ut[wt])continue;let Et=wt*4;Ft[Et]=vt[Et],Ft[Et+1]=vt[Et+1],Ft[Et+2]=vt[Et+2]}return Zt.release(vt),!0}catch{return!1}}function at(){let J=performance.now(),ut=r($t.gpuPower);if(!ut)return a={ok:!1,reason:"Konteks WebGL2 tidak tersedia"},a;let{gl:mt,extFloat:it}=ut,nt=64,lt=64,ht=new on(nt,lt),gt=ht.data;for(let jt=0;jt<lt;jt++)for(let te=0;te<nt;te++){let he=(jt*nt+te)*4,le=te===32&&jt>=10&&jt<=54,ne=jt>te&&jt-te<12&&te>14&&te<44;gt[he]=le?18:ne?235:te*4+jt*2&255,gt[he+1]=le?22:ne?45:(te*3^jt*5)&255,gt[he+2]=le?28:ne?60:240-(te*2+jt*3&200),gt[he+3]=255}let ct=0,bt=0,Ct=w({w:nt,h:lt,data:ht},"texRawRGBA");if(it&&Ct){let jt=pe.allocateSlot(mt,"texLabGrad",nt,lt,!0);if(jt){x(ut,"rgb2lab",_,jt,(le,ne)=>{le.activeTexture(le.TEXTURE0),le.bindTexture(le.TEXTURE_2D,Ct.tex),le.uniform1i(le.getUniformLocation(ne,"u_tex"),0)});let te=new Float32Array(nt*lt*4);mt.bindFramebuffer(mt.FRAMEBUFFER,jt.fbo),mt.readPixels(0,0,nt,lt,mt.RGBA,mt.FLOAT,te),mt.bindFramebuffer(mt.FRAMEBUFFER,null);let he=0;for(let le=0;le<nt*lt;le++){let ne=le*4,[se,ae,Se]=de(gt[ne],gt[ne+1],gt[ne+2]),ke=Math.max(Math.abs(se-te[ne]),Math.abs(ae-te[ne+1]),Math.abs(Se-te[ne+2]));ke>ct&&(ct=ke),he+=ke}bt=he/(nt*lt)}}let Tt={w:nt,h:lt,data:new on(new Uint8ClampedArray(gt),nt,lt)},yt={w:nt,h:lt,data:new on(new Uint8ClampedArray(gt),nt,lt)},pt=new Uint8Array(nt*lt);st(yt,pt,1.4,22,{radius:2,wedgeGuardThr:780});let Mt=new Uint8ClampedArray(Tt.data.data),vt=Tt.data.data,Ft=2,wt=780,Et=1/(2*1.4*1.4),Dt=1/(968*9),Yt=[1,1,0,-1,-1,-1,0,1],Xt=[0,1,1,1,0,-1,-1,-1];for(let jt=0;jt<lt;jt++)for(let te=0;te<nt;te++){let he=jt*nt+te,le=he*4,ne=Mt[le],se=Mt[le+1],ae=Mt[le+2],Se=0,ke=0;for(let ce=0;ce<8;ce++){let me=(St(jt+Xt[ce],0,lt-1)*nt+St(te+Yt[ce],0,nt-1))*4;Wt(ne,se,ae,Mt[me],Mt[me+1],Mt[me+2])<wt&&(Se++,ke|=1<<ce)}if(Se<=3)continue;if(Se===4){let ce=ke|ke<<8,ve=!1;for(let me=0;me<8;me++)if((ce>>me&15)===15){ve=!0;break}if(ve)continue}if(te>=2&&te<nt-2&&jt>=2&&jt<lt-2){let ce=.299*ne+.587*se+.114*ae,ve=!1;for(let[me,ie]of[[1,0],[0,1],[1,1],[1,-1]]){let Le=((jt-ie)*nt+(te-me))*4,Ge=((jt+ie)*nt+(te+me))*4,Ht=((jt-2*ie)*nt+(te-2*me))*4,re=((jt+2*ie)*nt+(te+2*me))*4,je=Math.max(.299*Mt[Le]+.587*Mt[Le+1]+.114*Mt[Le+2],.299*Mt[Ht]+.587*Mt[Ht+1]+.114*Mt[Ht+2]),fn=Math.max(.299*Mt[Ge]+.587*Mt[Ge+1]+.114*Mt[Ge+2],.299*Mt[re]+.587*Mt[re+1]+.114*Mt[re+2]),en=Math.min(.299*Mt[Le]+.587*Mt[Le+1]+.114*Mt[Le+2],.299*Mt[Ht]+.587*Mt[Ht+1]+.114*Mt[Ht+2]),sn=Math.min(.299*Mt[Ge]+.587*Mt[Ge+1]+.114*Mt[Ge+2],.299*Mt[re]+.587*Mt[re+1]+.114*Mt[re+2]);if(ce<je-3.8&&ce<fn-3.8||ce>en+5.5&&ce>sn+5.5){ve=!0;break}}if(ve)continue}let ye=0,qe=0,ee=0,oe=0,Me=Se<=5?Dt*2.8:Dt;for(let ce=-Ft;ce<=Ft;ce++){let ve=St(jt+ce,0,lt-1)*nt;for(let me=-Ft;me<=Ft;me++){let ie=(ve+St(te+me,0,nt-1))*4,Le=Math.exp(-(me*me+ce*ce)*Et)*Math.exp(-Wt(ne,se,ae,Mt[ie],Mt[ie+1],Mt[ie+2])*Me);ye+=Mt[ie]*Le,qe+=Mt[ie+1]*Le,ee+=Mt[ie+2]*Le,oe+=Le}}oe>1e-6&&(vt[le]=Math.round(ye/oe),vt[le+1]=Math.round(qe/oe),vt[le+2]=Math.round(ee/oe))}let Pt=0,Rt=0,Gt=yt.data.data;for(let jt=0;jt<nt*lt;jt++){let te=jt*4,he=Math.max(Math.abs(vt[te]-Gt[te]),Math.abs(vt[te+1]-Gt[te+1]),Math.abs(vt[te+2]-Gt[te+2]));he>Pt&&(Pt=he),he<=1&&Rt++}let Ut=+(Rt/(nt*lt)*100).toFixed(2),qt=0,Vt=0,Bt=100;if(it){let jt=Ye(yt,pt,!0),te=O(yt,pt);if(te)for(let se=0;se<nt*lt;se++){let ae=Math.max(Math.abs(jt.gx[se]-te.gx[se]),Math.abs(jt.gy[se]-te.gy[se]),Math.abs(jt.mag[se]-te.mag[se]));ae>qt&&(qt=ae)}let he=[{r:18,g:22,b:28,hex:"#12161c"},{r:235,g:45,b:60,hex:"#eb2d3c"},{r:80,g:140,b:210,hex:"#508cd2"},{r:210,g:205,b:120,hex:"#d2cd78"}],le=cn(yt,yt,pt,he,jt,!0),ne=cn(yt,yt,pt,he,te||jt,!1);if(le&&ne){let se=0;for(let ae=0;ae<nt*lt;ae++){let Se=Math.max(Math.abs(le.nxArr[ae]-ne.nxArr[ae]),Math.abs(le.nyArr[ae]-ne.nyArr[ae]),Math.abs(le.cohArr[ae]-ne.cohArr[ae]),Math.abs(le.cornerArr[ae]-ne.cornerArr[ae]));Se>Vt&&(Vt=Se),le.flankA[ae]===ne.flankA[ae]&&le.flankB[ae]===ne.flankB[ae]&&Math.abs(le.flankAlpha[ae]-ne.flankAlpha[ae])<.001&&se++}Bt=+(se/(nt*lt)*100).toFixed(2)}}let Ot=100,kt=0,It=100;if(it){let jt=[{r:18,g:22,b:28,hex:"#12161c"},{r:235,g:45,b:60,hex:"#eb2d3c"},{r:80,g:140,b:210,hex:"#508cd2"},{r:210,g:205,b:120,hex:"#d2cd78"}],te=O(yt,pt)||Ye(yt,pt,!0),he=cn(yt,yt,pt,jt,te,!1),le=new Int16Array(nt*lt);for(let ye=0;ye<nt*lt;ye++)le[ye]=he.thinStrokeLab[ye]>=0?he.thinStrokeLab[ye]:he.rawNearestFlt[ye];let ne=new Int16Array(le),se=new Int16Array(le);Kn(yt,pt,ne,jt,te,2,he,!0),Mn(yt,pt,ne,jt,{beta:1350,maxIter:10,topology:!0,segCtx:he,forceCpu:!0}),Uo(ne,nt,lt,yt,jt,pt,he,!0),Q(yt,pt,se,jt,2,he),tt(yt,pt,se,jt,{beta:1350,maxIter:10,topology:!0},he),B(se,nt,lt,yt,jt,pt,he);let ae=0,Se=0,ke=0;for(let ye=0;ye<nt*lt;ye++)ne[ye]===se[ye]&&ae++,he.thinStrokeLab[ye]>=0&&(Se++,se[ye]===he.thinStrokeLab[ye]&&ke++);Ot=+(ae/(nt*lt)*100).toFixed(2),It=Se>0?+(ke/Se*100).toFixed(2):100;for(let ye=0;ye<lt-1;ye++)for(let qe=0;qe<nt-1;qe++){let ee=ye*nt+qe,oe=se[ee],Me=se[ee+1],ce=se[ee+nt],ve=se[ee+nt+1];oe===ve&&Me===ce&&oe!==Me&&kt++}}let Kt=0,Jt=100,zt=0;if(it){let jt=[{r:18,g:22,b:28,hex:"#12161c"},{r:235,g:45,b:60,hex:"#eb2d3c"},{r:80,g:140,b:210,hex:"#508cd2"},{r:210,g:205,b:120,hex:"#d2cd78"}],te=O(yt,pt)||Ye(yt,pt,!0),he=cn(yt,yt,pt,jt,te,!1),le=new Int16Array(nt*lt);for(let Ht=0;Ht<nt*lt;Ht++)le[Ht]=he.thinStrokeLab[Ht]>=0?he.thinStrokeLab[Ht]:he.rawNearestFlt[Ht];tt(yt,pt,le,jt,{beta:1350,maxIter:6,topology:!0},he),B(le,nt,lt,yt,jt,pt,he);let ne=nt+1,se=lt+1,ae=new Float64Array(ne*se),Se=new Float64Array(ne*se),ke=new Float64Array(ne*se),ye=new Float64Array(ne*se),qe=new Uint8Array(ne*se),ee=new Uint8Array(ne*se),oe=new Uint8Array(ne*se),Me=new Uint8Array(ne*se),ce=(Ht,re)=>Ht<0||re<0||Ht>=nt||re>=lt?-1:le[re*nt+Ht];for(let Ht=0;Ht<=lt;Ht++)for(let re=0;re<=nt;re++){let je=Ht*ne+re;ae[je]=ke[je]=re,Se[je]=ye[je]=Ht;let fn=ce(re-1,Ht-1),en=ce(re,Ht-1),sn=ce(re-1,Ht),wn=ce(re,Ht),yn=0;fn!==en&&yn++,en!==wn&&yn++,wn!==sn&&yn++,sn!==fn&&yn++,qe[je]=ee[je]=yn}No(ae,Se,qe,oe,le,nt,lt,yt,jt,!0),V(ke,ye,ee,Me,le,nt,lt,yt,jt);let ve=0;for(let Ht=0;Ht<ne*se;Ht++){let re=Math.hypot(ae[Ht]-ke[Ht],Se[Ht]-ye[Ht]);re>Kt&&(Kt=re),oe[Ht]===Me[Ht]&&ve++}Jt=+(ve/(ne*se)*100).toFixed(2);let me=[],ie=new Uint8Array(64);ie[0]=1,ie[16]=1,ie[32]=1,ie[48]=1;for(let Ht=0;Ht<64;Ht++){let re=Ht/64*Math.PI*2;me.push([32+Math.cos(re)*20+(Ht&1)*.35,32+Math.sin(re)*18-(Ht&1)*.25])}let Le=Gn(me,ie,6,.44,-.46,!0),Ge=K(me,ie,6,.44,-.46);if(Ge&&Ge.length===Le.length)for(let Ht=0;Ht<Le.length;Ht++){let re=Math.hypot(Le[Ht][0]-Ge[Ht][0],Le[Ht][1]-Ge[Ht][1]);re>zt&&(zt=re)}}let ue=0,ge=0,Fe=0;if(it){let jt=[],te=new Uint8Array(64);te[0]=1,te[32]=1;for(let oe=0;oe<64;oe++){let Me=oe/64*Math.PI*2,ce=oe%2===0?.32:-.32;jt.push([32+Math.cos(Me)*22+ce,32+Math.sin(Me)*18-ce])}let he=ho(jt,.65,null,te,!0),le=rt(jt,.65,null,te);if(le&&le.length===he.length)for(let oe=0;oe<he.length;oe++){let Me=Math.hypot(he[oe][0]-le[oe][0],he[oe][1]-le[oe][1]);Me>ue&&(ue=Me)}let ne=[];for(let oe=0;oe<4;oe++){let Me=[],ce=oe*(Math.PI*.5);for(let ve=0;ve<=16;ve++){let me=ve/16,ie=ce+me*(Math.PI*.45);Me.push([32+Math.cos(ie)*(18+oe*2),32+Math.sin(ie)*(15+oe*2)])}ne.push({pts:Me,tanL:null,tanR:null,allowLine:!1})}let se=ot(ne);if(se&&se.length===ne.length)for(let oe=0;oe<ne.length;oe++){let Me=Ln(ne[oe].pts,null,null,!1),ce=se[oe];if(Me&&ce){let ve=Math.hypot(Me.P1[0]-ce.P1[0],Me.P1[1]-ce.P1[1]),me=Math.hypot(Me.P2[0]-ce.P2[0],Me.P2[1]-ce.P2[1]),ie=Math.max(ve,me);ie>ge&&(ge=ie)}}let ae=[{r:18,g:22,b:28,hex:"#12161c"},{r:235,g:45,b:60,hex:"#eb2d3c"},{r:80,g:140,b:210,hex:"#508cd2"},{r:210,g:205,b:120,hex:"#d2cd78"}],Se=O(yt,pt)||Ye(yt,pt,!0),ke=cn(yt,yt,pt,ae,Se,!1),ye=new Int16Array(nt*lt);for(let oe=0;oe<nt*lt;oe++)ye[oe]=ke.rawNearestFlt[oe];let qe=_n(yt,pt,ye,ae,Se,{type:"illustration",effectiveColors:4},4,32,!0),ee=_n(yt,pt,ye,ae,Se,{type:"illustration",effectiveColors:4},4,32,!1);qe&&ee&&(Fe=Math.abs(qe.meanDE00-ee.meanDE00)+Math.abs(qe.boundaryIoU-ee.boundaryIoU))}let Nt=+(performance.now()-J).toFixed(2);return a={ok:ct<.001&&Pt<=1&&qt<.02&&Vt<.01&&Bt>=99&&Ot>=94&&It>=95&&kt===0&&Kt<.5&&Jt>=99.5&&zt<.001&&ue<.01&&ge<.01&&Fe<.05,backend:e.supported?"WebGPU + WebGL2 FBO":it?"WebGL2 Float32 FBO":"WebGL2 RGBA8 FBO",extFloat:it,labMaxErr:+ct.toExponential(2),labMeanErr:+bt.toExponential(2),bilatMaxDiffLsb:Pt,bilatMatchPct:Ut,scharrMaxErr:+qt.toExponential(2),tensorMaxErr:+Vt.toExponential(2),flankMatchPct:Bt,mrfMatchPct:Ot,thinStrokePreservedPct:It,saddleCountAfterGpu:kt,beachMaxErrPx:+Kt.toExponential(2),beachPinMatchPct:Jt,taubinMaxErrPx:+zt.toExponential(2),sgMaxErrPx:+ue.toExponential(2),bezierMaxErrPx:+ge.toExponential(2),de00EvalErr:+Fe.toExponential(2),elapsedMs:Nt,vramStats:pe.getStats()},a}function ft(){let J=r($t.gpuPower);return{ready:!!J,webgpuSupported:e.supported||Pe.gpu.webgpu,webgpuAdapter:e.adapterName,webgl2Supported:Pe.gpu.webgl2,floatFboSupported:J?J.extFloat:Pe.gpu.colorBufferFloat,offscreenSupported:Pe.gpu.offscreenCanvas,vram:pe.getStats(),lastParityReport:a}}return{gpuFlattenAlpha:k,gpuBilateralPreFilter:st,gpuBuildEdgeField:O,gpuBuildSegmentationTables:S,gpuLocalNeighborhoodEdgeSnap:Q,gpuSegmentMRF:tt,gpuErodeSandwichedRibbons:j,gpuResolveCheckerboardSaddles:z,gpuAbsorbBoundaryParasites:X,gpuMorphCleanStrokes:B,gpuRefineBeachPlanar:V,gpuTaubinFilterClosed:K,gpuDespeckleStaircaseClosed:rt,gpuElasticaRelaxClosed:Y,gpuFitCubicBezierBatch:ot,gpuEvaluateRoundTripMetrics:At,getGl:r,beginGpuSession:$,uploadToSlot:w,uploadBufferToSlot:G,runSlotPass:x,runParitySelfTest:at,getEngineStatus:ft,initWebGPUAsync:l}})(),Vn=(()=>{let t=[],e=null,a=0,l=`
const _hwCfg = { useGpu: false, gpuPipeline: 'off' };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function cdist2(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2, rm = (r1 + r2) * 0.5;
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }

  /* 1. Kernel Strip Bilateral Pre-Filter */
  function runBilateralStrip(msg) {
    const { srcBuf, maskBuf, w, stripH, yStart, yEnd, radius, spWeight, inv2Col } = msg;
    const src = new Uint8ClampedArray(srcBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const outRows = yEnd - yStart;
    const out = new Uint8ClampedArray(outRows * w * 4);

    for (let y = yStart; y < yEnd; y++) {
      const outY = y - yStart;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i0 = p * 4;
        const oi = (outY * w + x) * 4;
        if (mask && mask[p]) {
          out[oi] = src[i0]; out[oi+1] = src[i0+1]; out[oi+2] = src[i0+2]; out[oi+3] = src[i0+3];
          continue;
        }
        const r0 = src[i0], g0 = src[i0 + 1], b0 = src[i0 + 2];
        const RING_DX = [1, 1, 0, -1, -1, -1, 0, 1];
        const RING_DY = [0, 1, 1, 1, 0, -1, -1, -1];
        let simN = 0, ringBits = 0;
        for (let k = 0; k < 8; k++) {
          const ny = clamp(y + RING_DY[k], 0, stripH - 1) * w;
          const np = ny + clamp(x + RING_DX[k], 0, w - 1);
          if (mask && mask[np]) continue;
          const ni = np * 4;
          if (cdist2(r0, g0, b0, src[ni], src[ni + 1], src[ni + 2]) < 780) {
            simN++;
            ringBits |= (1 << k);
          }
        }
        if (simN <= 3) {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
          continue;
        }
        if (simN === 4) {
          const dbl = ringBits | (ringBits << 8);
          let contiguous4 = false;
          for (let k = 0; k < 8; k++) {
            if (((dbl >> k) & 15) === 15) { contiguous4 = true; break; }
          }
          if (contiguous4) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        if (x >= 2 && x < w - 2 && y >= 2 && y < stripH - 2) {
          const l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
          let isCreaseOrRidge = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const iA2 = ((y - 2 * dy) * w + (x - 2 * dx)) * 4;
            const iB2 = ((y + 2 * dy) * w + (x + 2 * dx)) * 4;
            const lA = 0.299 * src[iA2] + 0.587 * src[iA2 + 1] + 0.114 * src[iA2 + 2];
            const lB = 0.299 * src[iB2] + 0.587 * src[iB2 + 1] + 0.114 * src[iB2 + 2];
            if ((l0 < lA - 3.8 && l0 < lB - 3.8) || (l0 > lA + 5.5 && l0 > lB + 5.5)) {
              isCreaseOrRidge = true;
              break;
            }
          }
          if (isCreaseOrRidge) {
            out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0; out[oi+3] = src[i0+3];
            continue;
          }
        }
        let sr = 0, sg = 0, sb = 0, sw = 0, wi = 0;
        const localInv2Col = simN <= 5 ? inv2Col * 2.8 : inv2Col;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = clamp(y + dy, 0, stripH - 1) * w;
          for (let dx = -radius; dx <= radius; dx++) {
            const np = ny + clamp(x + dx, 0, w - 1);
            const sw0 = spWeight[wi++];
            if (mask && mask[np]) continue;
            const ni = np * 4;
            const r = src[ni], g = src[ni + 1], b = src[ni + 2];
            const wgt = sw0 * Math.exp(-cdist2(r0, g0, b0, r, g, b) * localInv2Col);
            sr += r * wgt; sg += g * wgt; sb += b * wgt; sw += wgt;
          }
        }
        if (sw > 1e-6) {
          out[oi] = Math.round(sr / sw);
          out[oi+1] = Math.round(sg / sw);
          out[oi+2] = Math.round(sb / sw);
        } else {
          out[oi] = r0; out[oi+1] = g0; out[oi+2] = b0;
        }
        out[oi+3] = src[i0+3];
      }
    }
    return { res: { outBuf: out.buffer, yStart, yEnd }, transfer: [out.buffer] };
  }

  /* 2. Kernel Strip DiZenzo Multi-Channel Scharr 2D Edge Field */
  function runEdgeStrip(msg) {
    const { lumBuf, rgBuf, byBuf, maskBuf, w, h, y0, y1 } = msg;
    const lum = new Float32Array(lumBuf);
    const cRG = new Float32Array(rgBuf);
    const cBY = new Float32Array(byBuf);
    const mask = maskBuf ? new Uint8Array(maskBuf) : null;
    const rows = y1 - y0;
    const gxArr = new Float32Array(rows * w);
    const gyArr = new Float32Array(rows * w);
    const magArr = new Float32Array(rows * w);
    const scharrAt = (arr, x, y) => {
      const ym1 = clamp(y - 1, 0, h - 1) * w, y0c = clamp(y, 0, h - 1) * w, yp1 = clamp(y + 1, 0, h - 1) * w;
      const xm1 = clamp(x - 1, 0, w - 1), x0c = clamp(x, 0, w - 1), xp1 = clamp(x + 1, 0, w - 1);
      const gx = (-3 * arr[ym1 + xm1] - 10 * arr[y0c + xm1] - 3 * arr[yp1 + xm1]
                 + 3 * arr[ym1 + xp1] + 10 * arr[y0c + xp1] + 3 * arr[yp1 + xp1]) / 32;
      const gy = (-3 * arr[ym1 + xm1] - 10 * arr[ym1 + x0c] - 3 * arr[ym1 + xp1]
                 + 3 * arr[yp1 + xm1] + 10 * arr[yp1 + x0c] + 3 * arr[yp1 + xp1]) / 32;
      return [gx, gy];
    };

    for (let y = y0; y < y1; y++) {
      const ry = (y - y0) * w;
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (mask && mask[p]) continue;
        const [lx, ly] = scharrAt(lum, x, y);
        const [rx, ry2] = scharrAt(cRG, x, y);
        const [bx, by] = scharrAt(cBY, x, y);
        const gxx = lx * lx + rx * rx + bx * bx;
        const gyy = ly * ly + ry2 * ry2 + by * by;
        const gxy = lx * ly + rx * ry2 + bx * by;
        const tr = gxx + gyy;
        if (tr > 1e-6) {
          const disc = Math.hypot(gxx - gyy, 2 * gxy);
          const lambda1 = Math.max(0, 0.5 * (tr + disc));
          const mag = Math.sqrt(lambda1);
          const theta = 0.5 * Math.atan2(2 * gxy, gxx - gyy);
          let vx = Math.cos(theta), vy = Math.sin(theta);
          const domX = Math.abs(lx) >= Math.abs(rx) && Math.abs(lx) >= Math.abs(bx) ? lx : (Math.abs(rx) >= Math.abs(bx) ? rx : bx);
          const domY = Math.abs(ly) >= Math.abs(ry2) && Math.abs(ly) >= Math.abs(by) ? ly : (Math.abs(ry2) >= Math.abs(by) ? ry2 : by);
          if (vx * domX + vy * domY < 0) { vx = -vx; vy = -vy; }
          gxArr[ry + x] = vx * mag;
          gyArr[ry + x] = vy * mag;
          magArr[ry + x] = mag;
        }
      }
    }
    return {
      res: { y0, y1, gxBuf: gxArr.buffer, gyBuf: gyArr.buffer, magBuf: magArr.buffer },
      transfer: [gxArr.buffer, gyArr.buffer, magArr.buffer]
    };
  }

  /* 3. Kernel Paralel Smoothing (Taubin + Polak-Ribiere CG) & Constrained G1 Cubic Bezier Fitting */
  const r2 = v => Math.round(v * 100) / 100;
  ${[Gn,be,Te,qo,jo,ho,Oo,ba,kn,ya,Yn,Qn,vn,Ma,va,An,ln,Aa,Ln,po,La,Jn,gn].map(T=>T.toString()).join(`
  `)}
  function runSmoothAndFitBatch(msg) {
    const { items, scale, lambda, iters, detectCorners, cornerAngle, tol, advOpt } = msg;
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { localLambda, localTol, localAdv } = computeContourAdaptiveOpts(it.pts, it.area, lambda, tol, scale, advOpt || {});
      const s = smoothLoop(it.pts, { ...localAdv, lambda: localLambda, iters, detectCorners, cornerAngle, juncFlags: it.juncFlags, isTrueCircle: it.isTrueCircle });
      const spts = s.pts.map(p => [p[0] * scale, p[1] * scale]);
      const scaledCircleFit = s.circleFit ? { cx: s.circleFit.cx * scale, cy: s.circleFit.cy * scale, r: s.circleFit.r * scale } : null;
      const segs = fitLoopBeziers({ pts: spts, corners: s.corners, smoothKnots: s.smoothKnots, knotTangents: s.knotTangents, juncFlags: it.juncFlags, straightSpanFlags: s.straightSpanFlags, isTrueCircle: s.isTrueCircle, circleFit: scaledCircleFit }, localTol, localAdv || advOpt || {});
      let sharpCnt = 0, smoothCnt = 0, lineCnt = 0, curveCnt = 0;
      const sharpPts = [], smoothPts = [];
      for (let k = 0; k < s.corners.length; k++) {
        if (s.corners[k]) { sharpCnt++; sharpPts.push(spts[k]); }
        else if (s.smoothKnots && s.smoothKnots[k]) { smoothCnt++; smoothPts.push(spts[k]); }
      }
      for (let k = 0; k < segs.length; k++) {
        if (segs[k].isLine) lineCnt++; else curveCnt++;
      }
      results.push({ idx: it.idx, label: it.label, area: it.area * scale * scale, scaledPts: spts, segs, d: segsToD(segs, true), sharpCnt, smoothCnt, lineCnt, curveCnt, sharpPts, smoothPts, isTrueCircle: !!s.isTrueCircle });
    }
    return { res: { results }, transfer: [] };
  }

  self.onmessage = e => {
    const { id, task, payload } = e.data;
    try {
      let out;
      if (task === 'bilateral') out = runBilateralStrip(payload);
      else if (task === 'edge') out = runEdgeStrip(payload);
      else if (task === 'smoothFit') out = runSmoothAndFitBatch(payload);
      else out = { res: { ok: true }, transfer: [] };
      self.postMessage({ id, ok: true, res: out.res }, out.transfer || []);
    } catch (err) {
      self.postMessage({ id, ok: false, error: String(err && err.message || err) });
    }
  };
  `,n=!1;function r(){for(;t.length>0;){let T=t.pop();try{T.terminate()}catch{}}a=0,n=!1}function s(T){let I=St(T,1,32);if(typeof Worker>"u")return[];n&&!t.some(p=>!p._dead)&&r();try{for(t=t.filter(p=>!p._dead),e||(e=URL.createObjectURL(new Blob([l],{type:"application/javascript"})));t.length>I;){let p=t.pop();try{p.terminate()}catch{}}for(;t.length<I;){let p=new Worker(e);p._busy=!1,p._dead=!1,p.addEventListener("error",x=>{x&&typeof x.preventDefault=="function"&&x.preventDefault(),p._dead=!0,n=!0}),t.push(p)}return a=t.length,t}catch{return n=!0,r(),[]}}let i=1;function _(T,I,p,x=[]){return new Promise((w,y)=>{if(!T||T._dead||n){y(new Error("Worker unavailable"));return}let G=i++,$=!1,k=R=>{!R.data||R.data.id!==G||$||($=!0,clearTimeout(S),T.removeEventListener("message",k),T.removeEventListener("error",O),R.data.ok?w(R.data.res):y(new Error(R.data.error||"Worker error")))},O=R=>{$||($=!0,clearTimeout(S),R&&typeof R.preventDefault=="function"&&R.preventDefault(),T.removeEventListener("message",k),T.removeEventListener("error",O),T._dead=!0,n=!0,y(new Error("Worker script error")))},S=setTimeout(()=>{$||($=!0,T.removeEventListener("message",k),T.removeEventListener("error",O),T._dead=!0,n=!0,y(new Error("Worker timeout")))},1e4);T.addEventListener("message",k),T.addEventListener("error",O);try{T.postMessage({id:G,task:I,payload:p},x)}catch(R){$=!0,clearTimeout(S),T.removeEventListener("message",k),T.removeEventListener("error",O),T._dead=!0,n=!0,y(R)}})}async function u(T,I,p=1.4,x=22,w=4,y,G={}){let $=s(w);if($.length<=1)return await ko(T,I,p,x,y,G),!1;try{let{data:k,w:O,h:S}=T,R=St(Math.round(G&&G.radius||(p<=1.05?1:2)),1,2),g=new Float32Array((2*R+1)*(2*R+1)),f=1/(2*p*p),o=1/(2*x*x*9),h=0;for(let c=-R;c<=R;c++)for(let E=-R;E<=R;E++)g[h++]=Math.exp(-(E*E+c*c)*f);let A=Math.min($.length,Math.max(1,Math.floor(S/16))),U=[];for(let c=0;c<A;c++){let E=Math.floor(c*S/A),q=Math.floor((c+1)*S/A),Q=Math.max(0,E-R),tt=Math.min(S,q+R),j=tt-Q,z=k.data.slice(Q*O*4,tt*O*4),X=I?I.slice(Q*O,tt*O):null,B=[z.buffer];X&&B.push(X.buffer),Zt.trackAlloc(z.byteLength+(X?X.byteLength:0)),U.push(_($[c],"bilateral",{srcBuf:z.buffer,maskBuf:X?X.buffer:null,w:O,stripH:j,yStart:E-Q,yEnd:q-Q,radius:R,spWeight:g,inv2Col:o},B).then(L=>({...L,globalY0:E,globalY1:q})))}let P=await Promise.all(U);for(let c of P){let E=new Uint8ClampedArray(c.outBuf);k.data.set(E,c.globalY0*O*4)}return y&&await y(1),!0}catch{return r(),await ko(T,I,p,x,y,G),!1}}async function b(T,I,p=4){if($t&&$t.useGpu&&$t.gpuPipeline==="full"&&xe.gpuBuildEdgeField){let g=xe.gpuBuildEdgeField(T,I);if(g)return g}let x=s(p);if(x.length<=1)return Ye(T,I,!0);let{data:w,w:y,h:G}=T,$=w.data,k=y*G,O=Zt.acquire(Float32Array,k),S=Zt.acquire(Float32Array,k),R=Zt.acquire(Float32Array,k);for(let g=0;g<k;g++){let f=g*4,o=$[f],h=$[f+1],A=$[f+2];O[g]=.299*o+.587*h+.114*A,S[g]=(o-h)*.55,R[g]=(.5*(o+h)-A)*.45}try{let g=Math.min(x.length,Math.max(1,Math.floor(G/16))),f=[];for(let P=0;P<g;P++){let c=Math.floor(P*G/g),E=Math.floor((P+1)*G/g),q=new Float32Array(O),Q=new Float32Array(S),tt=new Float32Array(R),j=I?new Uint8Array(I):null,z=[q.buffer,Q.buffer,tt.buffer];j&&z.push(j.buffer),f.push(_(x[P],"edge",{lumBuf:q.buffer,rgBuf:Q.buffer,byBuf:tt.buffer,maskBuf:j?j.buffer:null,w:y,h:G,y0:c,y1:E},z))}let o=await Promise.all(f),h=Zt.acquire(Float32Array,k),A=Zt.acquire(Float32Array,k),U=Zt.acquire(Float32Array,k);for(let P of o){let c=P.y0*y;h.set(new Float32Array(P.gxBuf),c),A.set(new Float32Array(P.gyBuf),c),U.set(new Float32Array(P.magBuf),c)}return Zt.release(S),Zt.release(R),{lum:O,gx:h,gy:A,mag:U}}catch{return r(),Zt.release(O),Zt.release(S),Zt.release(R),Ye(T,I,!0)}}async function C(T,I,p,x=4,w){let y=s(x),G=T.length;if(y.length<=1||G<4)return null;try{let $=Math.min(y.length,G),k=Array.from({length:$},()=>[]);T.map((o,h)=>({idx:h,label:o.label,pts:o.pts.map(A=>[A[0],A[1]]),juncFlags:o.juncFlags,isTrueCircle:!!o.isTrueCircle,area:o.area})).sort((o,h)=>h.pts.length-o.pts.length).forEach((o,h)=>k[h%$].push(o));let S=0,R=k.map((o,h)=>_(y[h],"smoothFit",{items:o,scale:I,lambda:p.lambda,iters:p.iters||52,detectCorners:p.detectCorners!==!1,cornerAngle:p.cornerAngle||52,tol:p.tol,advOpt:p.advOpt||{}}).then(A=>(S++,w&&w(S/$),A.results)));return(await Promise.all(R)).flat().sort((o,h)=>o.idx-h.idx)}catch{return r(),null}}return{ensurePool:s,bilateralPreFilterParallel:u,buildEdgeFieldParallel:b,smoothAndFitParallel:C}})(),Ke={paused:!1,speed:1,skipToEnd:!1,holdOnComplete:!0},Jo=new Set;function cr(){return Ke}function Zo(t){return Object.assign(Ke,typeof t=="function"?t(Ke):t),Jo.forEach(e=>{try{e({...Ke})}catch{}}),Ke}function lr(t){return Jo.add(t),()=>Jo.delete(t)}let Ra=720;function go(t,e){let a=Math.max(t,e);if(a<=Ra)return{vw:t,vh:e,scaled:!1};let l=Ra/a;return{vw:Math.max(16,Math.round(t*l)),vh:Math.max(16,Math.round(e*l)),scaled:!0}}function Ba(t,e,a){let{vw:l,vh:n,scaled:r}=go(e,a),s=Ue.createElement("canvas");s.width=l,s.height=n;let i=s.getContext("2d");if(!r)return i.putImageData(new on(new Uint8ClampedArray(t),e,a),0,0),s;let _=i.createImageData(l,n),u=_.data;for(let b=0;b<n;b++){let C=Math.min(a-1,Math.floor(b*a/n))*e;for(let T=0;T<l;T++){let I=Math.min(e-1,Math.floor(T*e/l)),p=(C+I)*4,x=(b*l+T)*4;u[x]=t[p],u[x+1]=t[p+1],u[x+2]=t[p+2],u[x+3]=t[p+3]}}return i.putImageData(_,0,0),s}function Ea(t,e,a,l,n){let{vw:r,vh:s}=go(l,n),i=Ue.createElement("canvas");i.width=r,i.height=s;let _=i.getContext("2d"),u=_.createImageData(r,s),b=u.data;for(let C=0;C<s;C++){let T=Math.min(n-1,Math.floor(C*n/s))*l,I=C*r;for(let p=0;p<r;p++){let x=Math.min(l-1,Math.floor(p*l/r)),w=T+x,y=w*4,G=(I+p)*4;if(a&&a[w]){b[G]=15,b[G+1]=23,b[G+2]=42,b[G+3]=180;continue}let $=t[y],k=t[y+1],O=t[y+2],S=e?e[w]:0,R=St(S/36,0,1),g=.26*(1-R*.45),f=0,o=0,h=0;if(R>.05)if(R<.52){let A=(R-.05)/.47;f=12*A,o=190*A+24,h=240*A+35}else{let A=(R-.52)/.48;f=12+238*A,o=214-40*A,h=255-150*A}b[G]=St(Math.round($*g+f),0,255),b[G+1]=St(Math.round(k*g+o),0,255),b[G+2]=St(Math.round(O*g+h),0,255),b[G+3]=255}}return _.putImageData(u,0,0),i}function hn(t,e,a,l,n=!0){let{vw:r,vh:s,scaled:i}=go(a,l),_=Ue.createElement("canvas");if(_.width=r,_.height=s,!i)return ea(_,t,e,a,l,{bounds:n}),_;let u=new Int16Array(r*s);for(let b=0;b<s;b++){let C=Math.min(l-1,Math.floor(b*l/s))*a,T=b*r;for(let I=0;I<r;I++){let p=Math.min(a-1,Math.floor(I*a/r));u[T+I]=t[C+p]}}return ea(_,u,e,r,s,{bounds:n}),_}function fr(t,e,a,l){let{vw:n,vh:r}=go(a,l),s=Ue.createElement("canvas");s.width=n,s.height=r;let i=s.getContext("2d"),_=i.createImageData(n,r),u=_.data,b=0;for(let C=0;C<a*l;C++)t[C]!==e[C]&&b++;for(let C=0;C<r;C++){let T=Math.min(l-1,Math.floor(C*l/r))*a,I=C*n;for(let p=0;p<n;p++){let x=Math.min(a-1,Math.floor(p*a/n)),w=T+x;if(t[w]!==e[w]){let y=(I+p)*4;u[y]=245,u[y+1]=158,u[y+2]=11,u[y+3]=235}}}return i.putImageData(_,0,0),{canvas:s,diffCount:b}}function ta(t,e,a,l){if(!t||!t.data||!a||!a.length)return[];let{data:n,w:r,h:s}=t,i=n.data,_=a.length,u=new Int32Array(_),b=new Float64Array(_).fill(1/0),C=new Float64Array(_),T=new Float64Array(_),I=0,p=Math.max(1,Math.floor(Math.min(r,s)/110));for(let x=p;x<s-p;x+=p)for(let w=p;w<r-p;w+=p){let y=x*r+w;if(e&&e[y])continue;I++;let G=y*4,$=i[G],k=i[G+1],O=i[G+2],S=0,R=1/0;for(let f=0;f<_;f++){let o=a[f],h=Wt($,k,O,o.r,o.g,o.b);h<R&&(R=h,S=f)}u[S]++;let g=Math.hypot(w-r*.5,x-s*.5)*.06;R+g<b[S]&&(b[S]=R+g,C[S]=(w+.5)*l,T[S]=(x+.5)*l)}return a.map((x,w)=>({hex:x.hex,r:x.r,g:x.g,b:x.b,x:C[w]||r*.5*l,y:T[w]||s*.5*l,pct:I>0?Math.max(.1,+(u[w]/I*100).toFixed(1)):0}))}function bo(t,e,a,l,n){let r=[];for(let s=0;s<e.length;s++){let i=e[s],_=l[i.label]&&l[i.label].hex||"#38bdf8",u=i.rawPts.map(C=>[C[0]*n,C[1]*n]),b=[];if(i.juncFlags)for(let C=0;C<i.juncFlags.length;C++)i.juncFlags[C]&&u[C]&&b.push(u[C]);r.push({label:i.label,color:_,pts:u,juncPts:b,area:Math.abs((i.area||0)*n*n)})}if(r.sort((s,i)=>i.area-s.area),t.rawLoops=r,a&&a.length){let s=[],i=[];for(let u=0;u<a.length;u++){let b=a[u],C=e[u],T=l[b.label]&&l[b.label].hex||"#6366f1",I=b.pts||b.scaledPts||[],p=C?C.rawPts.map(G=>[G[0]*n,G[1]*n]):I,x=b.sharpPts||[],w=b.smoothPts||[];if(!x.length&&!w.length&&b.segs)for(let G of b.segs)G.startSharp?x.push(G.P0):w.push(G.P0);let y=Math.abs(b.area||0);if(s.push({label:b.label,color:T,pts:I,rawPts:p,sharpPts:x,smoothPts:w,area:y}),b.segs&&b.segs.length){let G=b.d||gn(b.segs,!0),$=null;try{$=new Path2D(G)}catch{}i.push({label:b.label,color:T,segs:b.segs,d:G,p2d:$,area:y})}}s.sort((u,b)=>b.area-u.area),i.sort((u,b)=>b.area-u.area),t.smoothedLoops=s,t.bezierLoops=i;let _=[];for(let u=0;u<i.length;u++){let b=i[u];for(let C=0;C<b.segs.length;C++)_.push({seg:b.segs[C],color:b.color,loopIdx:u,segIdxInLoop:C,isFirstInLoop:C===0,isLastInLoop:C===b.segs.length-1,loopP2d:b.p2d})}t.drawingSegs=_}}function Da(t,e){if(t&&t.traceHistory)return t.traceHistory;if(!t)return null;let{w:a,h:l,W:n,H:r,scale:s,palette:i,labels:_,loops:u,regs:b,svg:C,workData:T,mask:I,cls:p}=t,x=T&&T.data?T.data:e&&e.work&&e.work.data?e.work.data.data:null,w=e&&e.workOrig?e.workOrig:x,y=T?Ye({data:T,w:a,h:l},I):null,G={w:a,h:l,W:n,H:r,scale:s,cls:p||e&&e.cls||{},alphaInfo:t.stats&&t.stats.alpha||e&&e.alpha||{},origCanvas:w?Ba(w,a,l):null,edgeScanCanvas:x?Ea(x,y?y.mag:null,I,a,l):null,palette:i||[],paletteProbes:T?ta({data:T,w:a,h:l},I,i||[],s):[],quantCanvas:_&&i?hn(_,i,a,l,!1):null,qtCanvas:_&&i?hn(_,i,a,l,!0):null,segFinalCanvas:_&&i?hn(_,i,a,l,!0):null,segDiffCanvas:null,cleanedPixels:0,quadBlocks:[],rawLoops:[],smoothedLoops:[],bezierLoops:[],drawingSegs:[],regs:b||[],svg:C||"",stats:t.stats||{}},$=[];if(b)for(let k of b)for(let O of k.loops||[])$.push({label:k.label,pts:O.pts||[],scaledPts:O.pts||[],segs:O.segs||[],d:O.d,area:O.area||0});return bo(G,u||[],$,i||[],s||1),t.traceHistory=G,G}let ur=420,hr=!1;async function bn(t,e,a,l,n,r,s){if(!hr||Ke.skipToEnd||Ke.speed>=8){s&&await s(a,n,r);return}let i=Math.max(.25,Ke.speed||1),_=performance.now()-t,u=Math.max(e-_*i,Math.min(e,ur));if(s&&u>20){let b=0,C=performance.now();for(;b<1&&!(Ke.skipToEnd||Ke.speed>=8);){if(Ke.paused){await s(a,l+(n-l)*b,r),C=performance.now();continue}let T=performance.now(),I=Math.min(64,Math.max(0,T-C));C=T;let p=Math.max(.25,Ke.speed||1);b=Math.min(1,b+I*p/u),await s(a,l+(n-l)*b,r)}}s&&await s(a,n,r)}function _n(t,e,a,l,n,r,s=0,i=0,_=!1){let{w:u,h:b}=t,C=Math.max(1,Math.floor(Math.min(u,b)/180)),T=0,I=0,p=0,x=0,w=0,y=0,G=0,$=0,k=0,O=!_&&typeof xe<"u"&&xe.gpuEvaluateRoundTripMetrics&&$t.useGpu&&$t.gpuPipeline==="full"?xe.gpuEvaluateRoundTripMetrics(t,e,a,l,n,r):null;if(O)T=O.meanDE00,I=O.validPix,p=O.interB,x=O.unionB,w=O.imgEdgeN,y=O.segEdgeN,G=O.detailHits,$=O.detailTotal,k=O.orphanNoise;else{let m=t.rawRgba&&t.rawRgba.length===u*b*4?t.rawRgba:t.data.data,F=n?n.mag:null,d=Math.max(1,Math.floor(u*b/16e3)),M=0,v=l.map(N=>{let[V,K,W]=N.L!=null&&N.a!=null&&N.b2!=null?[N.L,N.a,N.b2]:de(N.r,N.g,N.b);return{r:N.r,g:N.g,b:N.b,L:V,a:K,b2:W}});for(let N=0;N<u*b;N+=d){if(e&&e[N])continue;let V=a[N];if(V<0||!v[V])continue;let K=N*4,[W,H,et]=de(m[K],m[K+1],m[K+2]),rt=v[V];M+=De(W,H,et,rt.L,rt.a,rt.b2),I++}T=I>0?M/I:0;let D=r&&r.type==="photo"?18.5:13.5;for(let N=1;N<b-1;N+=C){let V=N*u;for(let K=1;K<u-1;K+=C){let W=V+K;if(e&&e[W])continue;let H=F?F[W]>=D||F[W-1]>=D||F[W+1]>=D||F[W-u]>=D||F[W+u]>=D:!1,et=a[W],rt=a[W-1]!==et||a[W+1]!==et||a[W-u]!==et||a[W+u]!==et;H&&w++,rt&&y++,H&&rt&&p++,(H||rt)&&x++}}for(let N=2;N<b-2;N+=C*2){let V=N*u;for(let K=2;K<u-2;K+=C*2){let W=V+K;if(e&&e[W])continue;let H=a[W];(a[W-1]===H?1:0)+(a[W+1]===H?1:0)+(a[W-u]===H?1:0)+(a[W+u]===H?1:0)===0&&k++,F&&F[W]>=D*1.25&&($++,(a[W-1]!==H||a[W+1]!==H||a[W-u]!==H||a[W+u]!==H||a[W-2]!==H||a[W+2]!==H||a[W-2*u]!==H||a[W+2*u]!==H)&&G++)}}}let S=St(T/18,0,1),R=w>=Math.max(6,u*b/(C*C*250))?x>0?St(p/x,0,1):.85:St(.88-y/Math.max(1,u*b/(C*C))*.25,.62,.94),g=St(1-R,0,1),f=$>0?St(G/$,0,1):.9,o=St(1-f,0,1),h=St(k/Math.max(1,I)*12+Math.abs(l.length-(r&&r.effectiveColors||l.length))/42,0,1),A=s||Math.max(l.length,Math.round(y*.08)),U=i||A*8,P=r&&r.profileId==="flat"?450:r&&r.profileId==="photo"?2600:1200,c=St(U/Math.max(200,P)*.28,0,1),E=r&&r.adaptiveAttributes||{geometryPriority:.6,detailProtection:.6,gradientPreservation:.3},q=.26+E.gradientPreservation*.08,Q=.26+E.geometryPriority*.08,tt=.24,j=.18+E.detailProtection*.08,z=.14,X=q+Q+tt+j+z,B=(q*S+Q*g+tt*h+j*o+z*c)/X,L=B>.235||R<.56||T>5.8||f<.68;return{J:+B.toFixed(4),qualityScore:Math.round(St((1-B)*100,10,99)),boundaryIoU:+R.toFixed(3),meanDE00:+T.toFixed(2),detailRecall:+f.toFixed(3),components:{E_color:+S.toFixed(3),E_boundary:+g.toFixed(3),E_topology:+h.toFixed(3),E_detail:+o.toFixed(3),E_complexity:+c.toFixed(3)},needsRefinement:L}}function Ia(t,e,a){let l=[],n=t;if((a.detailRecall<.78||a.meanDE00>4.2)&&l.push({name:"Presisi Detail & Warna (\u0394E Lebih Ketat)",layerDifference:+St(n.layerDifference*.86,3.4,8.8).toFixed(2),targetKMax:St(n.targetKMax+4,4,36),minPixels:n.minPixels,complexity:St(n.complexity+3,35,78),qtVarThr:Math.max(95,Math.round(n.qtVarThr*.85))}),a.boundaryIoU<.68||a.components.E_topology>.18){let r=e&&(e.effectiveColors<=6||e.profileId==="flat");l.push({name:"Koherensi Batas & Reduksi Spekula",layerDifference:r?n.layerDifference:+St(n.layerDifference*1.12,3.4,9.2).toFixed(2),targetKMax:n.targetKMax,minPixels:r?n.minPixels:St(n.minPixels+1,2,12),complexity:r?n.complexity:St(n.complexity-6,35,88),qtVarThr:r?n.qtVarThr:Math.min(420,Math.round(n.qtVarThr*1.15))})}return(!l.length||e&&e.surfaceMode!=="flat")&&l.push({name:"Harmoni Tonal & Transisi CIE-Lab",layerDifference:+St(n.layerDifference*.9,3.2,8.5).toFixed(2),targetKMax:St(n.targetKMax+2,4,34),minPixels:n.minPixels,complexity:St(n.complexity+4,40,88),qtVarThr:n.qtVarThr}),l.slice(0,2)}function Ga(t,e,a,l,n,r,s,i,_){let u=_n(t,e,l,n,r,s,_,i);if(!a||!a.length||typeof Ue>"u")return u;try{let{w:b,h:C}=t,T=Math.min(1,360/Math.max(b,C)),I=Math.max(16,Math.round(b*T)),p=Math.max(16,Math.round(C*T)),x=T/(t.scale||1),w=Ue.createElement("canvas");w.width=I,w.height=p;let y=w.getContext("2d",{willReadFrequently:!0});y.save(),y.scale(x,x);for(let R of a)y.globalAlpha=R.opacity??1,R.fill&&R.fill!=="none"&&(typeof Ce=="function"?Ce(y,R):(y.fillStyle=typeof we=="function"?we(y,R.fill,R.fillGrad):R.fill,y.fill(R.p2d,R.fillRule||"evenodd"))),R.stroke&&R.stroke!=="none"&&R.strokeWidth>0&&(y.strokeStyle=typeof we=="function"?we(y,R.stroke,R.strokeGrad):R.stroke,y.lineWidth=R.strokeWidth,y.stroke(R.p2d));y.restore();let G=y.getImageData(0,0,I,p).data,$=t.rawRgba&&t.rawRgba.length===b*C*4?t.rawRgba:t.data.data,k=Math.max(1,Math.floor(I*p/8e3)),O=0,S=0;for(let R=0;R<I*p;R+=k){let g=R%I,f=R/I|0,o=Math.min(b-1,Math.floor(g*b/I)),A=Math.min(C-1,Math.floor(f*C/p))*b+o;if(e&&e[A])continue;let U=R*4,P=A*4;if(G[U+3]<32)continue;let[c,E,q]=de($[P],$[P+1],$[P+2]),[Q,tt,j]=de(G[U],G[U+1],G[U+2]);O+=De(c,E,q,Q,tt,j),S++}if(S>0){let R=+(O/S).toFixed(2),g=St(R/18,0,1),f=+(u.J*.72+g*.28).toFixed(4);return{...u,J:f,qualityScore:Math.round(St((1-f)*100,12,99)),meanDE00:R,components:{...u.components,E_color:+g.toFixed(3)}}}}catch{}return u}async function dr(t,e={},a){Zo({paused:!1,skipToEnd:!1});let l=performance.now(),n={},r=Qo(),s=r.multiThread?St(r.cpuCores||1,1,64):1,i=Zt.computeRamCaps(e.maxDim||(e.imageType==="photo"?760:880));Zt.beginSession();let _=e.fastPreview?900:6400,u={classify:_*.12,palette:_*.13,segment:_*.2,trace:_*.14,smooth:_*.14,fit:_*.19,assemble:_*.08},b=i.effMaxDim;a&&(a("classify",.005,"Membaca & menyiapkan citra resolusi kerja\u2026",null),await We());let C=Fo(t,b),{w:T,h:I,scale:p}=C,x=Math.round(t.w),w=Math.round(t.h);Zt.trackAlloc(T*I*16),n.workSize=T+"\xD7"+I,n.origSize=t.w+"\xD7"+t.h;let y=new Uint8ClampedArray(C.data.data),G={w:T,h:I,W:x,H:w,scale:p,origCanvas:Ba(y,T,I),edgeScanCanvas:null,cls:null,alphaInfo:null,palette:[],paletteProbes:[],quantCanvas:null,quadBlocks:[],qtCanvas:null,segMidCanvas:null,segFinalCanvas:null,segDiffCanvas:null,cleanedPixels:0,rawLoops:[],smoothedLoops:[],bezierLoops:[],drawingSegs:[],regs:[],svg:"",stats:n},$=0,k=async(Pt,Rt,Gt,Ut)=>{for(Pt!=="done"&&(Rt<$?Rt=$:$=Rt),G.busy=!!Ut;Ke.paused&&!Ke.skipToEnd;)a&&a(Pt,Rt,Gt,G),await tn(60);a&&a(Pt,Rt,Gt,G),await We(),ze=performance.now()},O=0,S=async(Pt,Rt,Gt)=>{let Ut=performance.now();if(Ut-O<90){await He(12);return}O=Ut,await k(Pt,Rt,Gt,!0)},R=performance.now();await k("classify",.02,`Memindai citra & gradien Scharr 2D (${s} Core \xB7 ${r.ramMb} MB RAM${r.useGpu?" \xB7 VGA Aktif":""})\u2026`,!0);let g=!1,f=!1,o=r.useGpu&&r.gpuPipeline!=="off"?xe.beginGpuSession(C):null,h=ua(C.data),A=_o(C,e.transparency||"keep",e.customColor);C.rawRgba=new Uint8ClampedArray(C.data.data);let U={data:{data:new Uint8ClampedArray(C.data.data),width:T,height:I},rawRgba:C.rawRgba,w:T,h:I,origAlpha:C.origAlpha};n.alpha=h,G.alphaInfo=h,await k("classify",.02,"Mengklasifikasi karakter citra (warna, tepi, noise, topologi)\u2026",!0);let P=fa(C,h,x,w);e.imageType&&e.imageType!=="auto"&&(P={...P,type:e.imageType,label:{blended:"Artwork with Blended Edges",aliased:"Artwork without Blended Edges",photo:"Photograph"}[e.imageType]}),e.quality&&e.quality!=="auto"&&(P={...P,quality:e.quality,qlabel:{high:"High",medium:"Medium",low:"Low"}[e.quality]});let c=ro(P,x,w,e.adaptiveProfileMode||"auto"),E=c.params;if(n.classification=P,n.adaptiveProfile=c,G.cls=P,G.adaptiveProfile=c,P.type!=="aliased"&&!E.skipBilateral){await k("classify",.02,"Meredam noise dengan filter bilateral\u2026",!0);let Pt=E.sigmaSpatial||1.45,Rt=E.sigmaColor||(P.quality==="low"?30:P.quality==="medium"?20:14);r.useGpu&&r.gpuPipeline!=="off"&&(g=xe.gpuBilateralPreFilter(C,A,Pt,Rt,{radius:E.bilateralRadius,wedgeGuardThr:E.wedgeGuardThr})),g||(r.multiThread&&s>1?f=await Vn.bilateralPreFilterParallel(C,A,Pt,Rt,s,null,{radius:E.bilateralRadius,wedgeGuardThr:E.wedgeGuardThr,skipIfClean:E.skipBilateral}):await ko(C,A,Pt,Rt,null,{radius:E.bilateralRadius,wedgeGuardThr:E.wedgeGuardThr,skipIfClean:E.skipBilateral}))}await k("classify",.02,"Menghitung gradien tepi DiZenzo Scharr 2D\u2026",!0);let q=r.useGpu&&r.gpuPipeline==="full"?xe.gpuBuildEdgeField(C,A)||(r.multiThread&&s>1?await Vn.buildEdgeFieldParallel(C,A,s):Ye(C,A)):r.multiThread&&s>1?await Vn.buildEdgeFieldParallel(C,A,s):Ye(C,A);q&&q.gpuSlotReady&&(g=!0),await He(),G.edgeScanCanvas=Ea(C.data.data,q.mag,A,T,I),await bn(R,u.classify,"classify",.02,.14,`Image Profiler: ${c.shortTitle} \xB7 ${P.effectiveColors} warna efektif \xB7 \u0394E=${E.layerDifference}`,k),R=performance.now();let Q=!!e.autoProfileParams,tt=!Q&&e.layerDifference!=null?e.layerDifference:E.layerDifference;await k("palette",.15,`Kuantisasi CIE-Lab adaptif (target K\u2264${E.targetKMax}, \u0394E=${tt}) & eliminasi halo\u2026`,!0);let j=e.gradientMode||"auto",z=!!e.maxColorEnabled,X=z&&e.maxColors>=2?Math.max(2,Math.round(e.maxColors)):0,B={colorMode:e.colorMode||"auto",paletteColors:e.paletteColors,paletteItems:e.paletteItems,targetColors:z?X:e.targetColors,maxColorEnabled:z,maxColors:X,gradientMode:j,adaptiveKMax:z?Math.min(E.targetKMax||22,X):E.targetKMax,fixedK:e.palMode==="fixed",sensitivity:e.sensitivity||E.sensitivity||"medium",layerDifference:tt,imageType:P.type},L=io(C,A,B,q),m=L.palette,F=Fa(C,A,m,q,P,{gradientMode:j,maxColorEnabled:z,maxColors:X});n.palette={count:F.items.length,auto:L.auto,colors:F.hexes,layerDifference:tt},G.palette=F.items,await He(),G.paletteProbes=ta(C,A,m,p),await k("palette",.15,"Menyusun partisi QuadTree adaptif\u2026",!0);let d=E.qtVarThr||{high:160,medium:320,low:620}[P.quality]||320,M=[],v=co(C,A,m,P.type==="aliased"?d*.35:d,q,M,U),D=v._segCtx||C._segCtx;U._segCtx=D,M.sort((Pt,Rt)=>Rt[2]*Rt[3]-Pt[2]*Pt[3]),G.quadBlocks=M;let N=v._rawNearestSnapshot||new Int16Array(v),V=new Int16Array(v);await He(),G.quantCanvas=hn(N,m,T,I,!1),await He(),G.qtCanvas=hn(V,m,T,I,!0),await bn(R,u.palette,"palette",.15,.28,`Palet CIE-Lab ditemukan: ${m.length} warna bersih (layer_difference \u0394E=${tt})`,k),R=performance.now(),await bn(R,u.segment*.38,"segment",.28,.38,`Partisi kisi adaptif QuadTree (${M.length} sub-blok tepi)\u2026`,k);let K=performance.now(),W=!Q&&e.complexity!=null?e.complexity:E.complexity,et=P.surfaceMode==="flat"&&P.effectiveColors<=8&&P.meaningfulDetailDensity>=.45?1150:{high:1250,medium:2100,low:3600}[P.quality]||2100,rt=et*(E.mrfBetaScale||1)*(1.28-W/100*.85)*(P.type==="aliased"?.45:1),dt=E.mrfIters||(P.type==="photo"?14:18);if(await k("segment",.38,"Optimasi MRF Potts (simulated annealing)\u2026",!0),r.useGpu&&r.gpuPipeline==="full"&&m.length<=64){let Pt=Math.max(1,dt>>1),Rt=Math.max(0,dt-Pt);Mn(C,A,v,m,{beta:rt,maxIter:Pt,startIter:0,totalIters:dt,topology:!0,rawWork:U,edgeField:q,segCtx:D}),G.segMidCanvas=hn(v,m,T,I,!0),await He(),Rt>0&&Mn(C,A,v,m,{beta:rt,maxIter:Rt,startIter:Pt,totalIters:dt,topology:!0,rawWork:U,edgeField:q,segCtx:D})}else for(let Pt=0;Pt<dt;Pt++)if(await S("segment",.38,`Optimasi MRF Potts \xB7 iterasi ${Pt+1}/${dt}\u2026`),Mn(C,A,v,m,{beta:rt*(.55+.55*(Pt/Math.max(1,dt-1))),maxIter:1,iterIndex:Pt,totalIters:dt,topology:!0,rawWork:U,edgeField:q,segCtx:D}),Pt===dt>>1&&(G.segMidCanvas=hn(v,m,T,I,!0)),Pt>=6&&v._lastMrfChanged!=null&&v._lastMrfChanged<Math.max(4,T*I*12e-5)){G.segMidCanvas||(G.segMidCanvas=hn(v,m,T,I,!0));break}await k("segment",.38,"Edge snapping sub-piksel & pembersihan speckle\u2026",!0),Kn(U,A,v,m,q,E.snapPasses||4,D),await He();let Y=!Q&&e.minPixels!=null?e.minPixels:E.minPixels;uo(v,T,I,U,m,A,D,Y),await k("segment",.38,"Evaluasi kualitas segmentasi (closed-loop)\u2026",!0);let Z=_n(U,A,v,m,q,P),ot=Z,xt={enabled:e.closedLoop!==!1,refined:!1,candidatesTested:0,selectedCandidate:"Konfigurasi Awal (Optimal)",initialJ:Z.J,finalJ:Z.J,initialQuality:Z.qualityScore,finalQuality:Z.qualityScore,boundaryIoU:Z.boundaryIoU,meanDE00:Z.meanDE00,detailRecall:Z.detailRecall,components:Z.components};if(e.closedLoop!==!1&&(e.colorMode||"auto")==="auto"&&!(e.paletteColors&&e.paletteColors.length)&&Z.needsRefinement){let Pt=Ia({layerDifference:tt,targetKMax:E.targetKMax,minPixels:Y,complexity:W,qtVarThr:d},P,Z),Rt=Math.min(480,Math.max(T,I)),Gt=Math.max(T,I)>Rt?Fo(t,Rt):{data:new on(new Uint8ClampedArray(C.data.data),T,I),rawRgba:U.rawRgba,w:T,h:I},Ut=Math.max(T,I)>Rt?_o(Gt,e.transparency||"keep",e.customColor):A;Gt.rawRgba||(Gt.rawRgba=new Uint8ClampedArray(Gt.data.data));let qt=Math.max(T,I)>Rt?Ye(Gt,Ut):q,Vt=null;for(let Bt of Pt){xt.candidatesTested++,await k("segment",.38,`Kalibrasi kandidat ${xt.candidatesTested}/${Pt.length}: ${Bt.name}\u2026`,!0);let kt=io(Gt,Ut,{...B,adaptiveKMax:Bt.targetKMax,layerDifference:Bt.layerDifference},qt).palette;await He();let It=co(Gt,Ut,kt,P.type==="aliased"?Bt.qtVarThr*.35:Bt.qtVarThr,qt,null,Gt),Kt=et*(E.mrfBetaScale||1)*(1.28-Bt.complexity/100*.85)*(P.type==="aliased"?.45:1);await He(),Mn(Gt,Ut,It,kt,{beta:Kt,maxIter:6,topology:!0,rawWork:Gt,edgeField:qt,segCtx:It._segCtx}),await He(),uo(It,Gt.w,Gt.h,Gt,kt,Ut,It._segCtx,Bt.minPixels);let Jt=_n(Gt,Ut,It,kt,qt,P);Jt.J<ot.J-.008&&(ot=Jt,Vt=Bt)}if(Vt){await k("segment",.38,"Menerapkan kandidat terbaik pada resolusi penuh\u2026",!0);let Bt=io(C,A,{...B,adaptiveKMax:Vt.targetKMax,layerDifference:Vt.layerDifference},q);m.length=0,Bt.palette.forEach(Kt=>m.push(Kt)),v=co(C,A,m,P.type==="aliased"?Vt.qtVarThr*.35:Vt.qtVarThr,q,null,U);let Ot=et*(E.mrfBetaScale||1)*(1.28-Vt.complexity/100*.85)*(P.type==="aliased"?.45:1),kt=Math.max(8,dt-4);if(r.useGpu&&r.gpuPipeline==="full"&&m.length<=64)Mn(C,A,v,m,{beta:Ot,maxIter:kt,startIter:0,totalIters:kt,topology:!0,rawWork:U,edgeField:q,segCtx:v._segCtx});else for(let Kt=0;Kt<kt&&(await S("segment",.38,`Optimasi MRF resolusi penuh \xB7 iterasi ${Kt+1}/${kt}\u2026`),Mn(C,A,v,m,{beta:Ot*(.6+.4*(Kt/Math.max(1,dt-5))),maxIter:1,iterIndex:Kt,totalIters:dt,topology:!0,rawWork:U,edgeField:q,segCtx:v._segCtx}),!(Kt>=6&&v._lastMrfChanged!=null&&v._lastMrfChanged<Math.max(4,T*I*12e-5)));Kt++);Kn(U,A,v,m,q,E.snapPasses||4,v._segCtx),Y=Vt.minPixels,uo(v,T,I,U,m,A,v._segCtx,Y);let It=_n(U,A,v,m,q,P);ot=It,xt.refined=!0,xt.selectedCandidate=Vt.name,xt.finalJ=It.J,xt.finalQuality=It.qualityScore,xt.boundaryIoU=It.boundaryIoU,xt.meanDE00=It.meanDE00,xt.detailRecall=It.detailRecall,xt.components=It.components,n.palette={count:m.length,auto:!0,colors:m.map(Kt=>Kt.hex),layerDifference:Vt.layerDifference},G.palette=m,G.paletteProbes=ta(C,A,m,p)}}(e.colorMode||"auto")!=="two"?(Ho(v,T,I,U,A,m,q,P,{gradientMode:j,forceGradient:j==="on",maxColorEnabled:z,maxColors:X,attachPreviewGradients:!0}),n.palette={count:m.length,auto:L.auto,colors:m.map(Pt=>Pt.hex),layerDifference:n.palette?n.palette.layerDifference:tt},G.palette=m):(Zn(v,T,I,U,A,m,q,P,{maxColorEnabled:z,maxColors:X,attachGradients:!1}),G.palette=m),n.beta=Math.round(rt),n.minPixels=Y,n.layerDifference=n.palette?n.palette.layerDifference:tt,n.calibration=xt,G.calibration=xt,await He(),G.segFinalCanvas=hn(v,m,T,I,!0),await He();let At=fr(N,v,T,I);G.segDiffCanvas=At.canvas,G.cleanedPixels=At.diffCount,n.cleanedPixels=At.diffCount,await bn(K,u.segment*.62,"segment",.38,.54,`MRF Potts & Context-Aware Cleanup selesai (filter_speckle=${Y}px \xB7 ${At.diffCount.toLocaleString("id-ID")} piksel diperbaiki)`,k),R=performance.now(),await k("trace",.55,"Menelusuri graf planar & dekonvolusi sub-piksel pantai\u2026",!0);let st=e.aa!==!1,at=Vo(v,T,I,U,m,{aa:st});n.loops=at.loops.length,n.traceMs=Math.round(at.ms);let ft=[],J=0;for(let Pt=0;Pt<at.loops.length;Pt++){let Rt=at.loops[Pt],Gt=Rt.pts.map(Ut=>[Ut[0],Ut[1]]);J+=Gt.length,ft.push({label:Rt.label,rawPts:Gt,vkeys:Rt.vkeys,juncFlags:Rt.juncFlags,isTrueCircle:!!Rt.isTrueCircle,area:Rt.area})}bo(G,ft,null,m,p),await bn(R,u.trace,"trace",.55,.67,`Menelusuri ${at.loops.length} kontur graf planar (${J.toLocaleString("id-ID")} verteks sub-piksel)\u2026`,k),R=performance.now();let ut=!Q&&e.smoothness!=null?e.smoothness:E.smoothness,mt=Math.pow(10,-.8+ut/100*2.25),it=!Q&&e.nodeDensity!=null?e.nodeDensity:E.nodeDensity,nt=Math.max(.08,.38-it/100*.28)*p,lt=[],ht=0,gt={smoothMethod:!Q&&e.smoothMethod||E.smoothMethod||"hybrid",lineStraighten:(Q?void 0:e.lineStraighten)??E.lineStraighten??58,axisSnap:!Q&&e.axisSnap!==void 0?e.axisSnap!==!1:E.axisSnap,axisSnapDeg:(Q?void 0:e.axisSnapDeg)??E.axisSnapDeg??2.4,despeckleJitter:(Q?void 0:e.despeckleJitter)??E.despeckleJitter??74,extremumAlign:e.extremumAlign!==!1,cornerMode:!Q&&e.cornerMode||E.cornerMode||"typo",lineCurveSensitivity:(Q?void 0:e.lineCurveSensitivity)??E.lineCurveSensitivity??76,apexSharpness:(Q?void 0:e.apexSharpness)??E.apexSharpness??82,cornerRoundness:(Q?void 0:e.cornerRoundness)??E.cornerRoundness??68,protectStemCaps:!Q&&e.protectStemCaps!==void 0?e.protectStemCaps!==!1:E.protectStemCaps},ct=!Q&&e.cornerAngle||E.cornerAngle||44;await k("smooth",.67,`Menghaluskan ${at.loops.length} kontur & fitting kurva B\xE9zier\u2026`,!0);let bt=null;r.multiThread&&s>1&&at.loops.length>=4&&(bt=await Vn.smoothAndFitParallel(at.loops,p,{lambda:mt,iters:52,detectCorners:e.detectCorners!==!1,cornerAngle:ct,tol:nt,advOpt:gt},s));let Ct=0,Tt=0,yt=0,pt=0;if(bt){f=!0;for(let Pt of bt)Ct+=Pt.sharpCnt||0,Tt+=Pt.smoothCnt||0,lt.push({label:Pt.label,pts:Pt.scaledPts,scaledPts:Pt.scaledPts,segs:Pt.segs,d:Pt.d,area:Pt.area,isTrueCircle:!!Pt.isTrueCircle,sharpPts:Pt.sharpPts||[],smoothPts:Pt.smoothPts||[]})}else for(let Pt=0;Pt<at.loops.length;Pt++){(Pt&7)===0&&await S("smooth",.67,`Menghaluskan & memfitting kontur ${Pt+1}/${at.loops.length}\u2026`);let Rt=at.loops[Pt],Gt=ft[Pt].rawPts,{localLambda:Ut,localTol:qt,localAdv:Vt}=Yn(Gt,Rt.area,mt,nt,p,gt),Bt=Qn(Gt,{...Vt,lambda:Ut,iters:52,detectCorners:e.detectCorners!==!1,cornerAngle:ct,juncFlags:Rt.juncFlags,isTrueCircle:Rt.isTrueCircle}),Ot=Bt.pts.map(zt=>[zt[0]*p,zt[1]*p]),kt=Bt.circleFit?{cx:Bt.circleFit.cx*p,cy:Bt.circleFit.cy*p,r:Bt.circleFit.r*p}:null,It=[],Kt=[];for(let zt=0;zt<Bt.corners.length;zt++)Bt.corners[zt]?(Ct++,It.push(Ot[zt])):Bt.smoothKnots&&Bt.smoothKnots[zt]&&(Tt++,Kt.push(Ot[zt]));let Jt=Jn({pts:Ot,corners:Bt.corners,smoothKnots:Bt.smoothKnots,knotTangents:Bt.knotTangents,juncFlags:Rt.juncFlags,straightSpanFlags:Bt.straightSpanFlags,isTrueCircle:Bt.isTrueCircle,circleFit:kt},qt,Vt||gt);lt.push({label:Rt.label,pts:Ot,scaledPts:Ot,corners:Bt.corners,smoothKnots:Bt.smoothKnots,knotTangents:Bt.knotTangents,juncFlags:Rt.juncFlags,isTrueCircle:!!Bt.isTrueCircle,segs:Jt,d:gn(Jt,!0),area:Rt.area*p*p,sharpPts:It,smoothPts:Kt})}mo(lt,ft);for(let Pt of lt){ht+=Pt.segs.length;for(let Rt of Pt.segs)Rt.isLine?yt++:pt++}n.smoothLambda=+mt.toFixed(3),n.vertices=J,n.bezierSegs=ht,n.sharpCorners=Ct,n.smoothCorners=Tt,n.straightSegs=yt,n.curveSegs=pt,n.fitTol=+nt.toFixed(2),bo(G,ft,lt,m,p),await bn(R,u.smooth,"smooth",.67,.78,`Penghalusan Elastika CG & penguncian sudut (${Ct} Sudut Tajam C\u2070 \xB7 ${Tt} Simpul Halus G\xB9)\u2026`,k);let Mt=performance.now();await bn(Mt,u.fit,"fit",.78,.93,`Menggambar ${ht} segmen vektor (${yt} Garis Lurus L \xB7 ${pt} Kurva B\xE9zier Kubik C)\u2026`,k),R=performance.now(),await k("assemble",.93,"Mengekstraksi gradien halus (<linearGradient> / <radialGradient>) & merakit topologi SVG\u2026",!0);let vt=j==="on"||j==="auto"&&P&&P.surfaceMode!=="flat"&&(P.surfaceMode==="gradient"||P.surfaceMode==="mixed"||P.gradientContinuity>=.18||L.hasSmoothGradient),Ft=(e.colorMode||"auto")!=="two"&&vt?{labels:v,w:T,h:I,rawWork:U,scale:p,W:x,H:w,edgeField:q,gradientMode:j,forceGradient:j==="on"}:null,wt=xo(lt.map(Pt=>({label:Pt.label,area:Pt.area,d:Pt.d,scaledPts:Pt.pts,segs:Pt.segs})),m,1,Ft);G.palette=m;let Et=e.transparency==="white"||e.transparency==="custom"?e.transparency==="custom"&&e.customColor||"#ffffff":"none",Dt=eo(wt,x,w,{stackMode:e.stackMode||"stack",stroke:e.stroke!==!1,bg:Et,safetyBg:!h.hasAlpha});if(n.regions=wt.length,G.regs=wt,G.svg=Dt,n.calibration)try{let Pt=Ga(U,A,typeof Be=="function"?Be(Dt):[],v,m,q,P,ht,at.loops.length);Pt&&(n.calibration.finalJ=Pt.J,n.calibration.finalQuality=Pt.qualityScore,n.calibration.boundaryIoU=Pt.boundaryIoU,n.calibration.meanDE00=Pt.meanDE00,n.calibration.components=Pt.components)}catch{}await bn(R,u.assemble,"assemble",.93,.99,`Mewarnai & merakit ${wt.length} layer region SVG bebas-celah\u2026`,k),n.ms=Math.round(performance.now()-l);let Yt=Zt.getStats(),Xt=pe.getStats();return n.hw={coresUsed:s,multiThread:r.multiThread&&s>1,workersActive:f,gpuUsed:g||r.useGpu&&Pe.gpu.available,gpuBackend:o?o.backend:r.useGpu?"WebGL2 Shader":"CPU",gpuRenderer:Pe.gpu.renderer,ramAllocatedMb:r.ramMb,peakRamMb:Yt.peakMb,peakVramMb:Xt.peakVramMb,activeVramSlots:Xt.activeSlots,threadPriority:r.threadPriority},Zt.flush(),await k("done",1,"Selesai"),{svg:Dt,regs:wt,palette:m,labels:v,loops:ft,w:T,h:I,W:x,H:w,scale:p,cls:P,stats:n,mask:A,hasGradForAssemble:vt,edgeField:q,adaptiveProfile:c,origLabelsSnapshot:new Int16Array(v),workData:C.data,rawRgba:y,origAlpha:C.origAlpha,hiddenLabels:[],traceHistory:G}}async function pr(t,e={},a){Zo({paused:!1,skipToEnd:!1});let l=t.traceHistory||Da(t,null),n=async(d,M,v)=>{for(;Ke.paused&&!Ke.skipToEnd;)a&&a(d,M,v,l),await tn(60);a&&a(d,M,v,l),await We()},r=performance.now(),{labels:s,palette:i,w:_,h:u,scale:b,W:C,H:T,cls:I,workData:p}=t,x=I||t.stats&&t.stats.classification||{},w=t.adaptiveProfile||t.stats&&t.stats.adaptiveProfile||ro(x,C,T,e.adaptiveProfileMode||"auto"),y=w&&w.params||{},G=!!e.autoProfileParams,$=t.rawRgba;if(t.origLabelsSnapshot&&t.origLabelsSnapshot.length===_*u){let d=t.origLabelsSnapshot,M=new Uint8Array(_*u),v=0;for(let D=0;D<_*u;D++)s[D]!==d[D]&&(M[D]=1,v++);if(v>0){let D=new Uint8Array(_*u);for(let N=0;N<u;N++)for(let V=0;V<_;V++)if(M[N*_+V])for(let K=-2;K<=2;K++){let W=N+K;if(!(W<0||W>=u))for(let H=-2;H<=2;H++){let et=V+H;et>=0&&et<_&&(D[W*_+et]=1)}}for(let N=0;N<u-1;N++)for(let V=0;V<_-1;V++){let K=N*_+V;if(!D[K])continue;let W=K+1,H=K+_,et=H+1,rt=s[K],dt=s[W],Y=s[H],Z=s[et];rt>=0&&dt>=0&&rt===Z&&dt===Y&&rt!==dt&&(In(s,_,u,V,N,rt,dt)?In(s,_,u,V+1,N,dt,rt)||(s[W]=rt):s[K]=dt)}if(t.rawRgba&&t.rawRgba.length===_*u*4){$=new Uint8ClampedArray(t.rawRgba);for(let V=0;V<_*u;V++){if(!M[V])continue;let K=i[s[V]];if(!K)continue;let W=V*4;$[W]=K.r,$[W+1]=K.g,$[W+2]=K.b}let N=new Uint8ClampedArray($);for(let V=1;V<u-1;V++)for(let K=1;K<_-1;K++){let W=V*_+K;if(!D[W])continue;let H=s[W];if(s[W-1]===H&&s[W+1]===H&&s[W-_]===H&&s[W+_]===H)continue;let et=0,rt=0,dt=0,Y=0;for(let Z=-1;Z<=1;Z++)for(let ot=-1;ot<=1;ot++){let xt=(V+Z)*_+(K+ot),At=i[s[xt]];if(!At)continue;let st=ot===0&&Z===0?4:ot===0||Z===0?2:1;et+=At.r*st,rt+=At.g*st,dt+=At.b*st,Y+=st}if(Y>0){let Z=W*4;N[Z]=Math.round(et/Y),N[Z+1]=Math.round(rt/Y),N[Z+2]=Math.round(dt/Y)}}$=N}t.origLabelsSnapshot=new Int16Array(s)}}l&&(l.segFinalCanvas=hn(s,i,_,u,!0)),await n("trace",.56,"Menelusuri ulang graf planar dari label yang diedit\u2026");let k=e.aa!==!1,O=Vo(s,_,u,{data:p,rawRgba:$,origAlpha:t.origAlpha},i,{aa:k}),S=!G&&e.smoothness!=null?e.smoothness:y.smoothness??(x.type==="photo"?56:66),R=Math.pow(10,-.8+S/100*2.25),g=!G&&e.nodeDensity!=null?e.nodeDensity:y.nodeDensity??62,f=Math.max(.08,.38-g/100*.28)*b,o=[],h=[],A=Qo(),U=A.multiThread?St(A.cpuCores||1,1,64):1,P={smoothMethod:!G&&e.smoothMethod||y.smoothMethod||"hybrid",lineStraighten:(G?void 0:e.lineStraighten)??y.lineStraighten??58,axisSnap:!G&&e.axisSnap!==void 0?e.axisSnap!==!1:y.axisSnap!==!1,axisSnapDeg:(G?void 0:e.axisSnapDeg)??y.axisSnapDeg??2.4,despeckleJitter:(G?void 0:e.despeckleJitter)??y.despeckleJitter??74,extremumAlign:e.extremumAlign!==!1,cornerMode:!G&&e.cornerMode||y.cornerMode||"typo",lineCurveSensitivity:(G?void 0:e.lineCurveSensitivity)??y.lineCurveSensitivity??76,apexSharpness:(G?void 0:e.apexSharpness)??y.apexSharpness??82,cornerRoundness:(G?void 0:e.cornerRoundness)??y.cornerRoundness??68,protectStemCaps:!G&&e.protectStemCaps!==void 0?e.protectStemCaps!==!1:y.protectStemCaps!==!1},c=!G&&e.cornerAngle||y.cornerAngle||44;for(let d=0;d<O.loops.length;d++){let M=O.loops[d];h.push({label:M.label,rawPts:M.pts.map(v=>[v[0],v[1]]),vkeys:M.vkeys,juncFlags:M.juncFlags,isTrueCircle:!!M.isTrueCircle,area:M.area})}let E=0,q=0,Q=0,tt=0,j=null;if(A.multiThread&&U>1&&O.loops.length>=4&&(j=await Vn.smoothAndFitParallel(O.loops,b,{lambda:R,iters:52,detectCorners:e.detectCorners!==!1,cornerAngle:c,tol:f,advOpt:P},U)),j)for(let d of j)E+=d.sharpCnt||0,q+=d.smoothCnt||0,o.push({label:d.label,area:d.area,d:d.d,pts:d.scaledPts,scaledPts:d.scaledPts,segs:d.segs,isTrueCircle:!!d.isTrueCircle,sharpPts:d.sharpPts||[],smoothPts:d.smoothPts||[]});else for(let d=0;d<O.loops.length;d++){let M=O.loops[d],v=h[d].rawPts,{localLambda:D,localTol:N,localAdv:V}=Yn(v,M.area,R,f,b,P),K=Qn(v,{...V,lambda:D,iters:52,detectCorners:e.detectCorners!==!1,cornerAngle:c,juncFlags:M.juncFlags,isTrueCircle:M.isTrueCircle}),W=K.pts.map(Y=>[Y[0]*b,Y[1]*b]),H=K.circleFit?{cx:K.circleFit.cx*b,cy:K.circleFit.cy*b,r:K.circleFit.r*b}:null,et=[],rt=[];for(let Y=0;Y<K.corners.length;Y++)K.corners[Y]?(E++,et.push(W[Y])):K.smoothKnots&&K.smoothKnots[Y]&&(q++,rt.push(W[Y]));let dt=Jn({pts:W,corners:K.corners,smoothKnots:K.smoothKnots,knotTangents:K.knotTangents,juncFlags:M.juncFlags,straightSpanFlags:K.straightSpanFlags,isTrueCircle:K.isTrueCircle,circleFit:H},N,V||P);o.push({label:M.label,area:M.area*b*b,d:gn(dt,!0),pts:W,scaledPts:W,segs:dt,isTrueCircle:!!K.isTrueCircle,sharpPts:et,smoothPts:rt})}mo(o,h);for(let d of o)for(let M of d.segs)M.isLine?Q++:tt++;let z=e.gradientMode||"auto",X=i&&i.some(d=>d&&d.userGrad),B=z==="on"||X||z==="auto"&&x&&x.surfaceMode!=="flat"&&(x.surfaceMode==="gradient"||x.surfaceMode==="mixed"||x.gradientContinuity>=.18||!!t.hasGradForAssemble);if(!B&&i)for(let d of i)d&&!d.userGrad&&(d.grad=null,d.isGradient=!1);let L=(e.colorMode||"auto")!=="two"&&B?{labels:s,w:_,h:u,rawWork:{data:p,rawRgba:t.rawRgba},scale:b,W:C,H:T,edgeField:t.edgeField,gradientMode:z,forceGradient:z==="on"}:null,m=xo(o,i,1,L),F=eo(m,C,T,{stackMode:e.stackMode||"stack",stroke:e.stroke!==!1,bg:e.transparency==="white"||e.transparency==="custom"?e.transparency==="custom"&&e.customColor||"#ffffff":"none",safetyBg:!0,hiddenLabels:t.hiddenLabels||[]});return l&&(bo(l,h,o,i,b),l.regs=m,l.svg=F),await bn(performance.now(),950,"fit",.78,.96,"Menggambar ulang kurva B\xE9zier dari peta segmen baru\u2026",n),await n("done",1,"Selesai"),{...t,svg:F,regs:m,loops:h,traceHistory:l,stats:{...t.stats||{},loops:O.loops.length,bezierSegs:o.reduce((d,M)=>d+M.segs.length,0),sharpCorners:E,smoothCorners:q,straightSegs:Q,curveSegs:tt,regions:m.length,ms:Math.round(performance.now()-r)}}}async function mr(t,e={},a){let l=performance.now(),{loops:n,palette:r,scale:s,W:i,H:_}=t,u=e.smoothness!=null?e.smoothness:66,b=Math.pow(10,-.8+u/100*2.25),C=e.nodeDensity!=null?e.nodeDensity:62,T=Math.max(.08,.38-C/100*.28)*s,I={smoothMethod:e.smoothMethod||"hybrid",lineStraighten:e.lineStraighten??58,axisSnap:e.axisSnap!==!1,axisSnapDeg:e.axisSnapDeg??2.4,despeckleJitter:e.despeckleJitter??74,extremumAlign:e.extremumAlign!==!1,cornerMode:e.cornerMode||"typo",lineCurveSensitivity:e.lineCurveSensitivity??76,apexSharpness:e.apexSharpness??82,cornerRoundness:e.cornerRoundness??68,protectStemCaps:e.protectStemCaps!==!1},p=[],x=0,w=0,y=0,G=0;for(let o=0;o<n.length;o++){let h=n[o],{localLambda:A,localTol:U,localAdv:P}=Yn(h.rawPts,h.area,b,T,s,I),c=Qn(h.rawPts,{...P,lambda:A,iters:50,detectCorners:e.detectCorners!==!1,cornerAngle:e.cornerAngle||44,juncFlags:h.juncFlags,isTrueCircle:h.isTrueCircle});for(let tt=0;tt<c.corners.length;tt++)c.corners[tt]?x++:c.smoothKnots&&c.smoothKnots[tt]&&w++;let E=c.pts.map(tt=>[tt[0]*s,tt[1]*s]),q=c.circleFit?{cx:c.circleFit.cx*s,cy:c.circleFit.cy*s,r:c.circleFit.r*s}:null,Q=Jn({pts:E,corners:c.corners,smoothKnots:c.smoothKnots,knotTangents:c.knotTangents,juncFlags:h.juncFlags,straightSpanFlags:c.straightSpanFlags,isTrueCircle:c.isTrueCircle,circleFit:q},U,P||I);p.push({label:h.label,area:h.area*s*s,d:gn(Q,!0),pts:E,scaledPts:E,segs:Q,isTrueCircle:!!c.isTrueCircle}),o%35===0&&a&&(a(o/n.length),await We())}mo(p,n);for(let o of p)for(let h of o.segs)h.isLine?y++:G++;let $=e.gradientMode||"auto",k=t.cls||t.stats&&t.stats.classification||{},O=r&&r.some(o=>o&&o.userGrad),S=$==="on"||O||$==="auto"&&k&&k.surfaceMode!=="flat"&&(k.surfaceMode==="gradient"||k.surfaceMode==="mixed"||k.gradientContinuity>=.18||!!t.hasGradForAssemble);if(!S&&r)for(let o of r)o&&!o.userGrad&&(o.grad=null,o.isGradient=!1);let R=S&&t.labels&&(t.rawRgba||t.workData)?{labels:t.labels,w:Math.round(i/s),h:Math.round(_/s),rawWork:{data:t.workData,rawRgba:t.rawRgba},scale:s,W:i,H:_,edgeField:t.edgeField,gradientMode:$,forceGradient:$==="on"}:null,g=xo(p,r,1,R);return{svg:eo(g,i,_,{stackMode:e.stackMode||"stack",stroke:e.stroke!==!1,bg:e.transparency==="white"||e.transparency==="custom"?e.transparency==="custom"&&e.customColor||"#ffffff":"none",safetyBg:!0,hiddenLabels:t.hiddenLabels||[]}),regs:g,ms:Math.round(performance.now()-l),segs:p.reduce((o,h)=>o+h.segs.length,0),sharpCorners:x,smoothCorners:w,straightSegs:y,curveSegs:G}}function ea(t,e,a,l,n,r={}){t.width=l,t.height=n;let s=t.getContext("2d"),i=s.createImageData(l,n),_=i.data;for(let u=0;u<l*n;u++){let b=e[u],C=u*4;if(b<0){_[C+3]=0;continue}let T=a[b]||{r:200,g:200,b:200};_[C]=T.r,_[C+1]=T.g,_[C+2]=T.b,_[C+3]=255}if(s.putImageData(i,0,0),r.bounds){s.fillStyle="rgba(0,0,0,0.85)";for(let u=0;u<n;u++)for(let b=0;b<l;b++){let C=e[u*l+b];(b<l-1&&e[u*l+b+1]!==C||u<n-1&&e[(u+1)*l+b]!==C)&&s.fillRect(b,u,1,1)}}return t}function xr(t,e,a,l,n,r,s,i,_=1,u="circle",b=-999){let C=Math.max(0,Math.floor(_/2)),T=(C+.35)*(C+.35),I=e,p=a,x=-1,w=-1,y=(f,o)=>{for(let h=-C;h<=C;h++){let A=o+h;if(A<0||A>=a)continue;let U=A*e;for(let P=-C;P<=C;P++){if(u==="circle"&&C>1&&P*P+h*h>T)continue;let c=f+P;if(c<0||c>=e)continue;let E=U+c;b!==-999&&t[E]!==b||(t[E]=i,c<I&&(I=c),c>x&&(x=c),A<p&&(p=A),A>w&&(w=A))}}},G=Math.abs(r-l),$=Math.abs(s-n),k=l<r?1:-1,O=n<s?1:-1,S=G-$,R=l,g=n;for(y(R,g);!(R===r&&g===s);){let f=2*S;f>-$&&(S-=$,R+=k),f<G&&(S+=G,g+=O),y(R,g)}return x>=I?{x0:I,y0:p,x1:x,y1:w}:null}function Ua(t,e,a,l,n,r,s={}){let i=n*e+l,_=t[i],u=s.scope||"contig";if(u==="global"){if(_===r)return 0;let k=0;for(let O=0,S=e*a;O<S;O++)t[O]===_&&(t[O]=r,k++);return k}let b=s.palette,C=s.tol||0,T=u==="similar"&&b&&b[_]&&C>0,I=T?b[_]:null,p=T?C*C*18:0,x=k=>{if(k===_)return!0;if(!T||k<0||k===r||!b[k])return!1;let O=b[k];return Wt(I.r,I.g,I.b,O.r,O.g,O.b)<=p};if(_===r&&!T)return 0;let w=new Int32Array(e*a),y=T?new Uint8Array(e*a):null,G=0,$=0;for(w[$++]=i,t[i]=r,y&&(y[i]=1);G<$;){let k=w[G++],O=k%e,S=k/e|0;if(O>0){let R=k-1;(!y||!y[R])&&x(t[R])&&t[R]!==r&&(y&&(y[R]=1),t[R]=r,w[$++]=R)}if(O<e-1){let R=k+1;(!y||!y[R])&&x(t[R])&&t[R]!==r&&(y&&(y[R]=1),t[R]=r,w[$++]=R)}if(S>0){let R=k-e;(!y||!y[R])&&x(t[R])&&t[R]!==r&&(y&&(y[R]=1),t[R]=r,w[$++]=R)}if(S<a-1){let R=k+e;(!y||!y[R])&&x(t[R])&&t[R]!==r&&(y&&(y[R]=1),t[R]=r,w[$++]=R)}}return $}function gr(t,e,a,l,n,r,s,i=28,_=!0){if(!e||e.length<a*l*4)return Ua(t,a,l,n,r,s,{scope:_?"contig":"global"});let u=r*a+n,b=u*4,C=e[b],T=e[b+1],I=e[b+2],p=i*i*14+45;if(!_){let $=0;for(let k=0,O=a*l;k<O;k++){if(t[k]<0)continue;let S=k*4;Wt(C,T,I,e[S],e[S+1],e[S+2])<=p&&(t[k]=s,$++)}return $}let x=new Uint8Array(a*l),w=new Int32Array(a*l),y=0,G=0;for(x[u]=1,w[G++]=u,t[u]=s;y<G;){let $=w[y++],k=$%a,O=$/a|0,S=[k>0?$-1:-1,k<a-1?$+1:-1,O>0?$-a:-1,O<l-1?$+a:-1];for(let R=0;R<4;R++){let g=S[R];if(g<0||x[g]||t[g]<0)continue;let f=g*4;Wt(C,T,I,e[f],e[f+1],e[f+2])<=p&&(x[g]=1,t[g]=s,w[G++]=g)}}return G}function br(t,e,a,l,n,r,s,i,_=-999){let u=St(Math.min(l,r),0,e-1),b=St(Math.max(l,r),0,e-1),C=St(Math.min(n,s),0,a-1),T=St(Math.max(n,s),0,a-1),I=0;for(let p=C;p<=T;p++){let x=p*e;for(let w=u;w<=b;w++){let y=x+w;t[y]<0||_!==-999&&t[y]!==_||(t[y]=i,I++)}}return I}function yr(t,e,a,l,n){let r=n*e+l,s=t[r];if(s<0)return 0;let i=new Uint8Array(e*a),_=new Int32Array(e*a),u=0,b=0;i[r]=1,_[b++]=r;let C=new Map;for(;u<b;){let p=_[u++],x=p%e,w=p/e|0,y=[x>0?p-1:-1,x<e-1?p+1:-1,w>0?p-e:-1,w<a-1?p+e:-1];for(let G=0;G<4;G++){let $=y[G];if($<0)continue;let k=t[$];k===s?i[$]||(i[$]=1,_[b++]=$):k>=0&&C.set(k,(C.get(k)||0)+1)}}let T=-1,I=0;if(C.forEach((p,x)=>{p>I&&(I=p,T=x)}),T<0)return 0;for(let p=0;p<b;p++)t[_[p]]=T;return b}function Mr(t,e,a,l=1){return new Promise((n,r)=>{let s=URL.createObjectURL(new Blob([t],{type:"image/svg+xml"})),i=new Image;i.onload=()=>{let _=Ue.createElement("canvas");_.width=Math.max(1,Math.round(e*l)),_.height=Math.max(1,Math.round(a*l)),_.getContext("2d").drawImage(i,0,0,_.width,_.height),URL.revokeObjectURL(s),n(_)},i.onerror=_=>{URL.revokeObjectURL(s),r(_)},i.src=s})}let rn={loadImage:$a,makeWork:Fo,analyzeAlpha:ua,flattenAlpha:_o,classifyStage:fa,buildEdgeField:Ye,findPalette:io,pruneHaloPaletteClusters:ha,detectImageColorPool:Ha,detectNextImageColor:Ka,analyzeRecommendations:za,buildAdaptiveTraceProfile:ro,evalColorBlendPair:Oe,buildSegmentationContext:cn,quadtreeInit:co,localNeighborhoodEdgeSnap:Kn,segmentMRF:Mn,enforceMinPixels:lo,erodeSandwichedBoundaryRibbons:Do,resolveCheckerboardSaddles:fo,absorbBoundaryParasites:Io,morphologicalCleanStrokes:Uo,removeBoundarySlivers:ma,analyzeSmallRegions:Go,buildDetailProtection:zn,resolveEnclosedNoiseIslands:pa,runSegmentationCleanup:uo,detectHorizontalSplitLines:Pa,injectPointHighlights:Ca,unifyGradientBands:Ho,fitComponentGradientFromPixels:to,attachGradientsToRegions:Ko,gradToCss:Za,compactActivePaletteAndLabels:Zn,consolidateGradientPalette:Fa,applySessionPaletteAndGradientSettings:tr,traceBoundaries:Vo,pruneContourSliverSpikes:xa,refineBeachPlanar:No,douglasPeucker:ga,simplifyClosed:Ja,smoothLoop:Qn,detectCorners:ba,fitLoopBeziers:Jn,segsToD:gn,synchronizeSharedTopology:mo,analyzeColorPlateausAndGradients:Ro,buildRegions:xo,assembleSVG:eo,exportDXF:or,vectorize:dr,retraceFromLabels:pr,refitFromSession:mr,STAGES:ar,renderSeg:ea,segLine:xr,segFill:Ua,segWandFill:gr,segRectFill:br,segZap:yr,rasterizeSVG:Mr,hexOf:_e,rgbOf:un,cdist2:Wt,rgb2lab:de,lab2lch:ia,ciede2000:De,clamp:St,evaluateSegmentationRoundTrip:_n,evaluateFinalVectorRoundTrip:Ga,generateBoundedCandidates:Ia,computeContourAdaptiveOpts:Yn,getHwConfig:Qo,setHwConfig:wa,resetHwConfig:sr,getHwInfo:rr,subscribeHwConfig:ir,getTraceCtrl:cr,setTraceCtrl:Zo,subscribeTraceCtrl:lr,buildTraceHistoryFromSession:Da,MemPool:Zt,GPUMemPool:pe,GpuAccelerator:xe,WorkerPool:Vn};Tn.VMT=rn;let na=rn.makeWork;return rn.makeWork=function(t,e=840){if(t&&(t.rgba||t.img&&t.img._rgba)){let a=t.rgba||t.img._rgba,l=Math.max(1,t.w||t.img&&t.img.w||64),n=Math.max(1,t.h||t.img&&t.img.h||64);if(typeof Ue<"u"&&typeof HTMLCanvasElement<"u"){let r=Ue.createElement("canvas");r.width=l,r.height=n;let s=r.getContext("2d"),i=a instanceof Uint8ClampedArray?a:new Uint8ClampedArray(a.buffer||a,a.byteOffset||0,a.byteLength||a.length);return s.putImageData(new on(i,l,n),0,0),na({img:r,w:l,h:n},e)}return na({img:{_rgba:a,w:l,h:n},w:l,h:n},e)}return na(t,e)},{VMT:rn,VE:Ee}}function sa(){if(To)return To;let Tn=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement=="function",Ue=typeof ImageData<"u"?ImageData:class{constructor(Ce,we,Ee){typeof Ce=="number"?(this.width=Ce,this.height=we,this.data=new Uint8ClampedArray(Ce*we*4)):(this.data=Ce instanceof Uint8ClampedArray?Ce:new Uint8ClampedArray(Ce.buffer||Ce,Ce.byteOffset||0,Ce.byteLength||Ce.length),this.width=we,this.height=Ee||Math.max(1,Math.floor(this.data.length/(4*Math.max(1,we)))))}},on=(()=>{try{if(Tn&&window.localStorage)return window.localStorage.getItem("__svgpeak_probe__"),window.localStorage}catch{}let Be=new Map;return{getItem:Ce=>Be.has(Ce)?Be.get(Ce):null,setItem:(Ce,we)=>{Be.set(Ce,String(we))},removeItem:Ce=>{Be.delete(Ce)}}})(),Fn=(Be,Ce,we,Ee,St)=>{if(Ce===Ee&&we===St)return new Uint8ClampedArray(Be);let We=new Uint8ClampedArray(Ee*St*4);for(let ze=0;ze<St;ze++){let He=Math.min(we-1,Math.floor((ze+.5)*we/St));for(let tn=0;tn<Ee;tn++){let an=Math.min(Ce-1,Math.floor((tn+.5)*Ce/Ee)),Xe=(He*Ce+an)*4,de=(ze*Ee+tn)*4;We[de]=Be[Xe],We[de+1]=Be[Xe+1],We[de+2]=Be[Xe+2],We[de+3]=Be[Xe+3]}}return We},Dn={createElement(Be){return Be!=="canvas"?{}:{width:1,height:1,getContext(Ce){if(Ce!=="2d")return null;let we=this;return{imageSmoothingEnabled:!0,imageSmoothingQuality:"high",globalAlpha:1,fillStyle:"#000000",strokeStyle:"#000000",lineWidth:1,save(){},restore(){},scale(){},translate(){},setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},fill(){},stroke(){},clip(){},fillRect(){},rect(){},arc(){},createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}},drawImage(Ee,St,We,ze,He){let tn=ze||we.width||1,an=He||we.height||1;if(Ee&&Ee._rgba){let Xe=Fn(Ee._rgba,Ee.w||tn,Ee.h||an,tn,an);this._id=new Ue(Xe,tn,an)}else if(Ee&&Ee._ctx&&Ee._ctx._id){let Xe=Ee._ctx._id,de=Fn(Xe.data,Xe.width,Xe.height,tn,an);this._id=new Ue(de,tn,an)}},putImageData(Ee){this._id=Ee},createImageData(Ee,St){return new Ue(Ee,St)},getImageData(Ee,St,We,ze){return this._id||new Ue(We,ze)}}}}}},mn=Tn?window:globalThis,xn=Tn?window.document:Dn,$n=typeof requestAnimationFrame=="function"?requestAnimationFrame.bind(globalThis):Be=>setTimeout(Be,0);return To=Pr(mn,xn,Ue,on,$n),To}var Cr=globalThis;Cr.__geovantaGetSvgPeakVmt=sa;typeof document>"u"&&typeof self<"u"&&typeof self.postMessage=="function"&&(self.onmessage=async Tn=>{let Ue=Tn.data||{},{id:on,rgbaBuffer:Fn,width:Dn,height:mn,vmtCfg:xn,opts:$n}=Ue;try{let{VMT:Be}=sa();typeof Be.setHwConfig=="function"&&Be.setHwConfig({useGpu:!1,gpuPipeline:"off",multiThread:!1});let Ce=new Uint8ClampedArray(Fn),we=await Be.vectorize({rgba:Ce,img:{_rgba:Ce,w:Dn,h:mn},w:Dn,h:mn},xn,(St,We,ze)=>{self.postMessage({id:on,type:"progress",stage:St,frac:We,detail:ze})}),Ee=Be.assembleSVG(we.regs,we.W,we.H,{stackMode:xn?.stackMode||"stack",stroke:xn?.stroke!==!1,bg:"none",safetyBg:!$n?.ignoreWhite&&!we.stats?.alpha?.hasAlpha,hiddenLabels:[],frameId:!1});self.postMessage({id:on,type:"done",svg:Ee,palette:Array.isArray(we.palette)?we.palette:[],regions:[],stats:we.stats||{}})}catch(Be){self.postMessage({id:on,type:"error",message:Be&&Be.message||String(Be)})}});})();
