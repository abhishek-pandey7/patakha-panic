import { WORLD } from './config.js';

export const CRACKERS = {
  rocket:{name:'Rocket',color:'#ff586d',description:'Aim precisely. Tap in flight to pierce reinforced supports with a speed boost.',unlockLevel:1},
  sutli:{name:'Sutli Bomb',color:'#64dba7',description:'A wide, heavy blast that excels against brick. Tap to detonate beside a support.',unlockLevel:3},
  chakri:{name:'Chakri',color:'#39c8ef',description:'Roll a spark storm through wooden shopfronts. Concrete and steel resist its spin.',unlockLevel:5},
  ladi:{name:'Ladi',color:'#ff7196',description:'Seven small explosions travel along the fuse. Excellent against adjoining wood; poor against steel.',unlockLevel:6},
};
const palette=['#ef92b9','#75cdbd','#efbc76','#a394df','#87bced'];
const R=['rocket'],RS=['rocket','sutli'],RSC=['rocket','sutli','chakri'],ALL=['rocket','sutli','chakri','ladi'];
const obstacle=(x,y,w,h,kind,material='concrete',extra={})=>({x,y,w,h,kind,material,color:material==='metal'?'#7290ab':'#cfaa85',...extra});

/** Different load paths are deliberate: wide bases, middle piers, stepped
 * terraces and independent heavy towers cannot all be solved with one sweep. */
function building({x,width=190,floors=2,group=0,supports=['wood','wood'],weak=[0],heavy=0,tank=false,base=100,step=0,roof='wood'}) {
  const pieces=[];
  const color=palette[group%palette.length];
  const add=p=>pieces.push({group,color,weak:false,...p});
  const span=width/2-23;
  supports.forEach((material,i)=>{
    const dx=supports.length===1?0:-span+2*span*i/(supports.length-1);
    add({x:x+dx,y:WORLD.ground-base/2,w:32,h:base,material,kind:i>0&&i<supports.length-1?'brace':'support',weak:weak.includes(i)});
  });
  let top=WORLD.ground-base;
  add({x,y:top-8,w:width+16,h:16,material:heavy?'concrete':'wood',kind:'slab'});
  top-=16;
  for(let floor=0;floor<floors;floor++) {
    const floorWidth=width-Math.abs(step)*floor;
    const center=x+step*floor/2;
    const wallW=(floorWidth-6)/2;
    add({x:center-wallW/2-2,y:top-26,w:wallW,h:52,material:floor<heavy?'concrete':'brick',kind:'wall'});
    add({x:center+wallW/2+2,y:top-26,w:wallW,h:52,material:floor<heavy?'concrete':'brick',kind:'wall'});
    top-=52;
    if(floor<floors-1){add({x:center,y:top-7,w:floorWidth+12,h:14,material:floor<heavy?'concrete':'wood',kind:'slab'});top-=14;}
  }
  const roofX=x+step*(floors-1)/2;
  add({x:roofX,y:top-7,w:width-Math.abs(step)*(floors-1)+22,h:14,material:roof,kind:'roof'});
  if(tank)add({x:roofX+25,y:top-44,w:56,h:60,material:'metal',kind:'tank',color:'#64839c'});
  return pieces;
}
const level=(id,name,location,hint,shots,par,types,pieces,obstacles)=>({id,name,location,hint,shots,par,unlockedTypes:types,pieces,obstacles});

export const LEVELS=[
  level(1,'First Spark','Gully Warm-Up','Pull with purpose. Clear the low barricade, then boost into a striped wooden leg.',4,2,R,
    building({x:1420,width:210,floors:2,group:0,weak:[0,1]}),
    [obstacle(840,749,94,62,'barricade','wood')]),
  level(2,'Good Neighbours','Gully Warm-Up','The sign blocks high arcs. Aim below it and choose which wide support to remove first.',4,2,R,
    [...building({x:1390,width:210,floors:2,group:1,supports:['wood','wood','wood'],weak:[0]}),
     ...building({x:1720,width:160,floors:2,group:2,base:88,weak:[0,1]})],
    [obstacle(990,360,230,36,'sign','metal')]),
  level(3,'Tank You Very Much','Terrace Trouble','Thread the arch opening. Burst a Sutli beside the brick terrace; boost a Rocket into the reinforced pier.',5,4,RS,
    building({x:1500,width:250,floors:4,group:3,supports:['wood','concrete','wood'],weak:[0,2],heavy:1,tank:true}),
    [obstacle(985,540,44,70,'arch'),obstacle(985,740,44,80,'arch'),obstacle(1095,494,264,24,'arch')]),
  level(4,'Balcony Dominoes','Terrace Trouble','Clear the steps. The stepped terrace and the heavy little tower have separate load paths.',5,4,RS,
    [...building({x:1390,width:220,floors:4,group:0,supports:['wood','wood','wood'],weak:[0,2],tank:true,step:14}),
     ...building({x:1740,width:180,floors:3,group:1,supports:['concrete','wood'],weak:[1],heavy:1})],
    [obstacle(935,751,64,58,'stair'),obstacle(997,714,64,132,'stair'),obstacle(1059,655,64,250,'stair')]),
  level(5,'Shop, Drop & Roll','Bazaar Blast','Land beyond the ramp. A Chakri shreds wooden legs; use Sutli for the brick back shop.',5,3,RSC,
    [...building({x:1360,width:170,floors:2,group:2,supports:['wood','wood','wood'],weak:[0,2],base:78}),
     ...building({x:1580,width:170,floors:2,group:0,supports:['wood','wood'],weak:[0,1],base:78}),
     ...building({x:1758,width:160,floors:3,group:1,supports:['concrete','brick','brick','concrete'],weak:[],base:78,heavy:1})],
    [obstacle(965,751,280,22,'ramp','concrete',{angle:-0.18}),obstacle(1672,745,20,70,'barricade')]),
  level(6,'Chain Reaction','Bazaar Blast','Light a Ladi after clearing the wall. Its fuse sweeps timber shops; the steel pier needs a boosted Rocket.',6,4,ALL,
    [...building({x:1350,width:150,floors:3,group:0,supports:['wood','wood'],weak:[0,1],base:82}),
     ...building({x:1555,width:170,floors:2,group:4,supports:['wood','wood','wood'],weak:[0,2],base:82}),
     ...building({x:1774,width:130,floors:3,group:2,supports:['metal','brick'],weak:[],tank:true,base:82})],
    [obstacle(930,634,44,292,'wall'),obstacle(1155,720,40,120,'wall')]),
  level(7,'Bridge over Boom','Skyline Showdown','Thread below the steel canopy. The twin towers have reinforced piers; one blast cannot reach both.',6,4,ALL,
    [...building({x:1360,width:190,floors:4,group:1,supports:['concrete','metal','metal','wood'],weak:[3],heavy:2,tank:true,roof:'concrete'}),
     ...building({x:1720,width:190,floors:4,group:3,supports:['wood','metal','metal','concrete'],weak:[0],heavy:2,tank:true,roof:'concrete'}),
     {x:1540,y:395,w:192,h:14,material:'wood',kind:'bridge',group:1,color:palette[1],weak:false}],
    [obstacle(1000,405,300,28,'canopy','metal'),obstacle(1020,750,50,60,'barricade')]),
  level(8,'The Grand Dhamaka','Skyline Showdown','Clear the staggered gateway. Sweep timber with Ladi, blast brick with Sutli, and boost through the steel skyline.',7,5,ALL,
    [...building({x:1360,width:180,floors:3,group:2,supports:['wood','wood','wood'],weak:[0,2],tank:true,base:92}),
     ...building({x:1580,width:180,floors:5,group:0,supports:['concrete','metal','concrete'],weak:[],heavy:2,tank:true,base:92,roof:'concrete'}),
     ...building({x:1783,width:110,floors:4,group:4,supports:['metal','brick'],weak:[],heavy:1,tank:true,base:92,roof:'metal'})],
    [obstacle(990,425,270,28,'canopy','metal'),obstacle(1165,680,42,200,'wall'),obstacle(855,754,112,52,'stair')]),
  level(9,'Steel Mandap','Midnight Mela','A tall wall guards a reinforced hall. Lob over it; only a boosted Rocket cracks the steel legs.',4,3,ALL,
    [...building({x:1450,width:230,floors:4,group:3,supports:['metal','wood','concrete'],weak:[1],heavy:1,tank:true,roof:'concrete'}),
     ...building({x:1740,width:150,floors:3,group:0,supports:['wood','brick'],weak:[0],base:90})],
    [obstacle(1010,650,46,260,'wall'),obstacle(860,752,90,56,'barricade','wood')]),
  level(10,'Lantern Lane','Midnight Mela','Three shops lean on each other. The sign blocks high lobs; drop the middle tower into its neighbours.',3,2,ALL,
    [...building({x:1336,width:140,floors:3,group:1,supports:['brick','wood'],weak:[1],base:86}),
     ...building({x:1530,width:170,floors:4,group:2,supports:['brick','concrete','brick'],weak:[],heavy:1,base:86,tank:true}),
     ...building({x:1745,width:140,floors:3,group:4,supports:['concrete','metal'],weak:[],base:86})],
    [obstacle(1110,330,250,34,'sign','metal'),obstacle(900,751,64,58,'stair'),obstacle(962,714,64,132,'stair'),obstacle(1150,745,34,70,'barricade')]),
  level(11,'Twin Temple Towers','Grand Finale','Two reinforced towers, no weak legs. Squeeze under the canopy and boost into each steel pier.',3,2,ALL,
    [...building({x:1400,width:220,floors:5,group:0,supports:['metal','concrete','metal'],weak:[],heavy:3,tank:true,roof:'concrete'}),
     ...building({x:1725,width:200,floors:5,group:3,supports:['metal','metal','metal'],weak:[],heavy:3,tank:true,roof:'metal'})],
    [obstacle(1000,420,300,28,'canopy','metal'),obstacle(1185,705,40,150,'wall'),obstacle(1567,735,40,90,'barricade')]),
  level(12,'Thousand Diya Night','Grand Finale','The whole skyline is reinforced and every shot counts. Read each material before you light the fuse.',5,5,ALL,
    [...building({x:1346,width:160,floors:4,group:2,supports:['wood','concrete','wood'],weak:[0],heavy:1,tank:true,base:92}),
     ...building({x:1560,width:170,floors:5,group:0,supports:['metal','wood','metal'],weak:[1],heavy:2,tank:true,base:92,roof:'metal'}),
     ...building({x:1775,width:120,floors:4,group:4,supports:['concrete','metal'],weak:[],heavy:2,tank:true,base:92,roof:'concrete'})],
    [obstacle(990,400,280,28,'canopy','metal'),obstacle(1160,660,42,240,'wall'),obstacle(860,754,112,52,'stair'),obstacle(1232,740,34,80,'barricade')]),
];

// Balance fixtures only: player controls never invoke these solutions. Vectors
// are normalized to the same maximum pull as the real launcher.
const shot=(type,vx,vy,activateX)=>{
  const scale=Math.min(1,WORLD.maxSpeed/Math.hypot(vx,vy));
  return {type,vx:vx*scale,vy:vy*scale,...(activateX?{activateX}:{})};
};
export const LEVEL_SOLUTIONS = {
  1:[shot('rocket',32,-3,1120)],
  2:[shot('rocket',32,-3,1120),shot('rocket',32,-2,1120)],
  3:[shot('sutli',32,0),shot('rocket',32,2,1120)],
  4:[shot('sutli',32,-6),shot('rocket',28,-6,1120),shot('sutli',28,-6),shot('sutli',32,-6)],
  5:[shot('chakri',26,0),shot('rocket',29,-6,1300)],
  6:[shot('chakri',24,-6),shot('sutli',32,-6,1520),shot('ladi',24,-6),shot('rocket',24,-6,1120)],
  7:[shot('sutli',32,-4)],
  8:[shot('sutli',30.708305065568176,-9),shot('sutli',31.85906464414798,-3),shot('rocket',31.606961258558215,-5,1440),shot('sutli',31.606961258558215,-5,1480),shot('rocket',31.85906464414798,-3,1200)],
  9:[shot('sutli',32,-6),shot('sutli',32,-6),shot('rocket',24,-6,1120)],
  10:[shot('chakri',32,-10),shot('rocket',32,0,1120)],
  11:[shot('sutli',32,-4),shot('rocket',32,-2,1300)],
  12:[shot('sutli',32,-6),shot('rocket',32,-6,1440),shot('rocket',32,-6,1300),shot('sutli',28,-10),shot('sutli',32,-6)],
};
