export async function selectMotionCategory(panel,label){
 if(label==='背景'||label==='转场'){await panel.getByRole('button',{name:label==='背景'?'页面背景':'页面转场',exact:true}).click();return;}
 await panel.getByRole('button',{name:'元素动效',exact:true}).click();await panel.getByRole('button',{name:label==='强调'?'强调效果':label==='退场'?'退场效果':'进场效果',exact:true}).click();
 if(label==='进场')await panel.getByRole('option',{name:'重力撞击',exact:true}).click();
}
