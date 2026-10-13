// Deadlines apply to preparation, not animation time. Cancellation settles
// immediately even when an underlying browser resource promise never resolves.
export function createPreparationGate({now, setTimer, clearTimer, status}) {
  let pending=null;
  function cancel(reason='cancelled') { if(pending){const operation=pending;pending=null;operation.finish(reason);} }
  return {
    cancel,
    async run(ready, build) {
      cancel('superseded');
      const started=now();let progressTimer,deadlineTimer,resolveStop;
      const stopped=new Promise(resolve=>resolveStop=resolve);
      const operation={finish:reason=>{clearTimer(progressTimer);clearTimer(deadlineTimer);resolveStop(reason);}};
      pending=operation;
      status('preparing');
      progressTimer=setTimer(()=>{if(pending===operation)status('progress');},200);
      deadlineTimer=setTimer(()=>{if(pending===operation){cancel('timeout');status('timeout');}},2000);
      try {
        const result=await Promise.race([Promise.resolve(ready).then(()=>null),stopped]);
        if(result!==null || pending!==operation)return null;
        const resources=build();
        if(now()-started>=2000 || pending!==operation){resources.forEach(resource=>resource.adapter.dispose());if(pending===operation){cancel('timeout');status('timeout');}return null;}
        operation.finish('complete');pending=null;status('ready');return resources;
      }catch(error){if(pending===operation){cancel('error');status('error',error.message);}return null;}
    },
    state:()=>({pending:pending!==null}),
  };
}
