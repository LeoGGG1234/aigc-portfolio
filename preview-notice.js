
const style=document.createElement('style');
style.textContent=`#preview-notice{position:fixed;bottom:0;left:0;right:0;z-index:10000;padding:7px 12px;background:rgba(22,24,29,.94);color:#e8e8ec;font:11px/1.45 system-ui,sans-serif;text-align:center;backdrop-filter:blur(8px);box-sizing:border-box}body{padding-bottom:36px!important}.preview-video-note{font:12px/1.6 system-ui,sans-serif;color:#888;margin:6px 0 12px} @media(max-width:520px){#preview-notice{font-size:10px;padding:6px 9px}}`;
document.head.append(style);
const notice=document.createElement('aside');notice.id='preview-notice';notice.setAttribute('role','note');document.body.append(notice);
const videos=new WeakMap();
function update(){
 const zh=document.documentElement.lang.toLowerCase().startsWith('zh');
 const text=zh?'独立测试站 · 长视频仅展示约 20 秒预览，项目介绍保留原作信息 · 原站未迁移':'Independent test site · Longer videos are ~20-second previews; descriptions refer to the original projects · Original site retained';
 if(notice.textContent!==text)notice.textContent=text;
 document.querySelectorAll('video').forEach(video=>{
  let note=videos.get(video);if(!note){note=document.createElement('p');note.className='preview-video-note';(video.parentElement.matches('.screen,.short-player,.video-frame')?video.parentElement:video).insertAdjacentElement('afterend',note);videos.set(video,note);video.addEventListener('loadedmetadata',update)}
  const duration=Number.isFinite(video.duration)?video.duration:null;
  const short=duration!==null&&duration<19.9;
  const label=zh?(short?'短片原时长 · 轻量播放版':'约 20 秒预览 · 完整原作保留在原站'):(short?'Original short duration · Lightweight version':'~20-second preview · Original retained on the existing site');
  if(note.textContent!==label)note.textContent=label;
  video.setAttribute('aria-label',label);
 });
}
new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new MutationObserver(update).observe(document.body,{childList:true,subtree:true});update();
