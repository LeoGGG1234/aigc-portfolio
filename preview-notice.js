
const style=document.createElement('style');
style.textContent=`.preview-video-note{font:12px/1.6 system-ui,sans-serif;color:#888;margin:6px 0 12px}`;
document.head.append(style);
const videos=new WeakMap();
function update(){
 const zh=document.documentElement.lang.toLowerCase().startsWith('zh');
 document.querySelectorAll('video').forEach(video=>{
  let note=videos.get(video);if(!note){note=document.createElement('p');note.className='preview-video-note';(video.parentElement.matches('.screen,.short-player,.video-frame')?video.parentElement:video).insertAdjacentElement('afterend',note);videos.set(video,note);video.addEventListener('loadedmetadata',update)}
  const duration=Number.isFinite(video.duration)?video.duration:null;
  const short=duration!==null&&duration<19;
  const isOneLap=(video.currentSrc||video.getAttribute('src')||video.querySelector('source')?.src||'').includes('/one-lap/');
  const isAd=(video.currentSrc||video.getAttribute('src')||video.querySelector('source')?.src||'').includes('/solvane/');
  const label=isOneLap?(zh?'63 秒预览版 · 完整版约 2 分钟':'63-second preview · Full film approx. 2 minutes'):isAd?(zh?'15 秒剪辑预览 · 30 秒完整版可按需提供':'15-second cutdown preview · Full 30-second film available on request'):zh?(short?'短片原时长 · 轻量播放版':'不超过 20 秒预览 · 完整作品可按需提供'):(short?'Original short duration · Lightweight version':'Preview up to 20 seconds · Full work available on request');
  if(note.textContent!==label)note.textContent=label;
  video.setAttribute('aria-label',label);
 });
}
new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new MutationObserver(update).observe(document.body,{childList:true,subtree:true});update();
