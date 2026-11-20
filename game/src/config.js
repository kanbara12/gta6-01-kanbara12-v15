// SUNCOAST: HEATLINE — layout, jobs, economy and shot staging (v15).
// A single table owns every number the HUD can show, so a staged frame
// can never disagree with itself: job, cash, REP, jobs done, wanted
// stars, timer and speed are always applied together from here.

export const WORLD = {
  size: 1200,
  beachRoadX: -60, // beach road centreline, north-south along z
  sandX: -80, // sand strip starts here
  seaX: -115, // ocean starts here
  yard: { x: 140, z: 150 }, // container yard, job 4
  garage: { x: -20, z: 260 }, // lose-the-heat garage, job 5
  safehouse: { x: 60, z: -240 },
  marina: { x: -100, z: 420 }, // case swap, job 7
  lighthouse: { x: -105, z: -480 }, // loop end, job 8
  pier: { x: -130, z: 60 },
  playerSpawn: { x: -60, z: -40 },
  carSpawn: { x: -56, z: -40 }, // 4 m from the player, so E works at spawn
  marker1: { x: -60, z: 4 }, // ~44 m from both spawns: no instant trigger
};

export const JOBS = [
  { n: 1, title: 'A FAVOR IN THE HEAT', pay: 2500, goal: 'Meet the fixer Rae at the glowing marker', par: '1:00', at: { x: -60, z: 4 } },
  { n: 2, title: 'LOOSE CARGO', pay: 2500, goal: 'Pick up the sealed package at the next marker', par: '1:30', at: { x: -60, z: 180 } },
  { n: 3, title: 'THE QUIET EXIT', pay: 3000, goal: 'Deliver the package across town, keep it quiet', par: '2:00', at: { x: 180, z: -160 } },
  { n: 4, title: 'STREET SWEEP', pay: 3500, goal: 'Clear the hostile crew in the industrial yard', par: '3:00', at: { x: 140, z: 150 } },
  { n: 5, title: 'NO WITNESSES', pay: 4250, goal: 'Reach the garage and lose the heat', par: '2:30', at: { x: -20, z: 260 } },
  { n: 6, title: 'LAST LIGHT', pay: 2000, goal: 'Final run at dusk, through the roadblocks', par: '2:00', at: { x: -60, z: -420 } },
  { n: 7, title: 'THE MARINA SWAP', pay: 1500, goal: 'Case swap at the marina dock', par: '1:30', at: { x: -140, z: 420 } },
  { n: 8, title: 'NORTH LIGHT', pay: 1500, goal: 'North-beach run to the lighthouse', par: '1:30', at: { x: -150, z: -480 } },
];

// REP while running job n (index n-1): +1 per finished job, +1 extra once
// the yard sweep (job 4) is done, +2 once the final run (job 8) is done.
// The loop ends at 10: 8 jobs + 1 yard bonus + 1 final bonus.
export const REP_WHILE = [0, 1, 2, 3, 5, 6, 7, 8];
export const REP_FINAL = 10;
// Wanted stars while running job n: quiet early, hot in the middle, cooling.
export const WANTED_WHILE = [0, 0, 0, 2, 3, 4, 1, 1];

export const CASH_START = 1250;
export const YARD_BOUNTY = 150; // per yard target, 3 targets = $450
export const LOOP_TOTAL = 22450; // 19750 story + 1250 start + 450 bounties

// Screenshot staging. Cash is the cumulative figure for that job:
// shot 2: 1250 + 2500 (job 1) = 3750; shot 4: 9250 after job 3 + 2x150
// bounties earned mid-sweep = 9550; shot 3: 12750 after job 4 + 450 = 13200.
// Elapsed is mm:ss, always > 0:30 and < PAR.
export const SHOTS = {
  start: {
    job: 1, cash: 1250, rep: 0, done: 0, wanted: 0, elapsed: 47, par: '1:00',
    speed: 128, heli: false, police: [], dlg: null, cam: 'wide',
    note: 'WIDE HIGH establishing: beachfront, ferris wheel fully framed',
  },
  play: {
    job: 2, cash: 3750, rep: 1, done: 1, wanted: 0, elapsed: 72, par: '1:30',
    speed: 141, heli: true, heliOff: { x: -6, y: 12, z: -30 },
    police: [
      { call: 'SNOOK-12', d: 6, st: 'RESPONDING' },
      { call: 'SNOOK-11', d: 14, st: 'RESPONDING' },
      { call: 'SNOOK-13', d: 38, st: 'EN ROUTE' },
      { call: 'AIR-1 SKY-1', d: 42, st: 'SPOTLIGHT' },
    ],
    dlg: { who: 'RAE', role: 'FIXER', text: 'Package is sealed and hot. Beach road, keep it above a hundred — I will talk you through the handoff.' },
    cam: 'chase', note: 'LOW rear 3/4 chase cam, beach road at speed',
  },
  chase: {
    job: 5, cash: 13200, rep: 5, done: 4, wanted: 3, elapsed: 129, par: '2:30',
    speed: 152, heli: true, heliOff: { x: 26, y: 12, z: -10 },
    police: [
      { call: 'SNOOK-12', d: 6, st: 'RAMMING' },
      { call: 'SNOOK-11', d: 14, st: 'PURSUIT' },
      { call: 'SNOOK-13', d: 38, st: 'RESPONDING' },
      { call: 'SNOOK-14', d: 55, st: 'ROADBLOCK' },
      { call: 'AIR-1 SKY-1', d: 42, st: 'SPOTLIGHT' },
    ],
    dlg: { who: 'SABLE', role: 'LOOKOUT', text: 'EYES UP — roadblock two streets ahead, heli is painting you. Cut through the marina lane, now.' },
    popup: 'DRIFT x3 +$150', cam: 'chaseWide',
    note: 'DUSK downtown pursuit on Ocean Ave, heli dominant, drift popup',
    heading: Math.PI / 2, startX: 40, startZ: 180,
  },
  mission: {
    job: 4, cash: 9550, rep: 4, done: 3, wanted: 2, elapsed: 151, par: '3:00',
    speed: 0, heli: false, police: [], targets: 2,
    dlg: { who: 'MARLO', role: 'DRIVER', text: 'The yard crew skimmed our cut. I keep the engine running — you handle the yard.' },
    cam: 'foot', note: 'ON FOOT container yard, pistol + muzzle flash, 3 enemies',
  },
  end: {
    job: 8, cash: 22450, rep: 10, done: 8, wanted: 0, elapsed: 0, par: '—',
    speed: 0, heli: false, police: [], complete: true,
    dlg: { who: 'RAE', role: 'FIXER', text: 'Loop closed. Twenty-two four-fifty, clean. Suncoast is ours tonight.' },
    cam: 'lighthouse', note: 'North beach road to the lighthouse (not submitted)',
  },
};

export const RADIO = [
  { name: 'SHORELINE 96.7', track: 'Sunset Run' },
  { name: 'PIER 102.5', track: 'Boardwalk Lights' },
  { name: 'DUNE 89.9', track: 'Night Mirage' },
];
export const WEAPONS = ['PISTOL', 'SMG', 'SHOTGUN', 'BAT'];
export const CREW = [
  { key: 'Z', who: 'R', name: 'Rae', ab: 'CLEAN SLATE' },
  { key: 'X', who: 'S', name: 'Sable', ab: 'EYES UP' },
  { key: 'C', who: 'M', name: 'Marlo', ab: 'PIT STOP' },
];

export function fmtClock(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}
export function money(n) { return '$' + n.toLocaleString('en-US'); }

// Deterministic RNG so ?shot=&seed=1 always stages the same world.
export function rng32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
