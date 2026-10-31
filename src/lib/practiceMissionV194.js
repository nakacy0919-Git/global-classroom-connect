// GCC V19.4: let learners see their achieved accuracy before the next level begins.
// A cancellable controller prevents an old timer from changing another phrase/dialog.
export const SCORE_REVIEW_MS=1000;
export const LEVEL_START_MS=2000;

export function createLevelTransitionController({setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let generation=0;
 let pending=[];
 function cancel(){
  generation++;
  pending.forEach(id=>clearTimer(id));
  pending=[];
 }
 function schedule({isActive=()=>true,onBanner,onAdvance}){
  cancel();
  const current=generation;
  pending.push(setTimer(()=>{
   if(generation!==current||!isActive())return;
   onBanner();
  },SCORE_REVIEW_MS));
  pending.push(setTimer(()=>{
   if(generation!==current||!isActive())return;
   pending=[];
   onAdvance();
  },LEVEL_START_MS));
 }
 return {schedule,cancel};
}
