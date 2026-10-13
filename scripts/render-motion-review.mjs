// Render the two visual-review clips from the current user-preserved sample.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const output=resolve(process.env.NUTBOOK_MOTION_REVIEW || '/tmp/nutbook-motion-refinement');mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await page.goto(pathToFileURL(resolve('docs/presentations/motion-lab/index.html')).href);
  await page.evaluate(()=>{document.querySelector('.controls').hidden=true;});
  const results=[];
  for(const id of ['impact','light']) {
    await page.evaluate(id=>window.__NUTBOOK_PRESENTATION__.goTo(id),id);
    const duration=await page.evaluate(()=>window.__NUTBOOK_MOTION__.duration);
    const frames=join(output,id);mkdirSync(frames,{recursive:true});
    const total=Math.ceil(duration*24)+12;
    for(let f=0;f<total;f++) {
      await page.evaluate(t=>window.__NUTBOOK_MOTION__.seek(t),Math.min(duration,f/24));
      await page.screenshot({path:join(frames,`${String(f).padStart(4,'0')}.png`)});
    }
    const clip=join(output,`${id}.mp4`);
    execFileSync('/opt/homebrew/bin/ffmpeg',['-y','-loglevel','error','-framerate','24','-i',join(frames,'%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',clip]);
    const streams=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_streams','-of','json',clip],{encoding:'utf8'})).streams;
    results.push({id,clip,width:streams[0].width,height:streams[0].height,frames:streams[0].nb_frames,fps:streams[0].r_frame_rate});
  }
  writeFileSync(join(output,'result.json'),JSON.stringify({runtime:'Chromium headless; visual approval pending',results},null,2));
  console.log(`Visual review clips: ${output}`);
}finally{await browser.close();}
