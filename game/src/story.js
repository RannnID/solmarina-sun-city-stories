// The story of SOLMARINA — all names, characters and places are original.
// Rook Vale, a driver just out of the Harbor lockup, is pulled back into the sun-soaked
// underworld of Solmarina by Mara Solis, who runs a garage on Coral Row. The rival crew is
// the Vultures, led by Kade Voss. The police answer to Captain Inez Duarte.
export const CHARACTERS = {
  mara: { name: 'MARA SOLIS', color: '#ffcf5c' },
  rook: { name: 'ROOK VALE', color: '#7dd8ff' },
  kade: { name: 'KADE VOSS', color: '#ff7a7a' },
  duarte: { name: 'CAPT. DUARTE', color: '#9db8ff' },
  juno: { name: 'JUNO PARK', color: '#b8ff9d' },
  radio: { name: 'SUNSET FM', color: '#e8a0ff' },
};

export const INTRO_LINES = [
  { who: 'mara', text: 'Rook. You are out. Good — the garage needs a driver and the Vultures took my delivery van.' },
  { who: 'rook', text: 'Mara, I just got out. One job. Then I am gone, I swear it.' },
  { who: 'mara', text: 'One job, sure. Get in a car, any car, and bring my van back from the pier. The keys are in it.' },
];

export const MISSION_BRIEFS = [
  { title: 'THE VAN JOB', brief: 'Mara needs her delivery van back. Steal any car and drive to the pier.' },
  { title: 'CORAL ROW RUN', brief: 'Drive the van back to Mara\'s garage on Coral Row. The Vultures are watching.' },
  { title: 'STREET HEAT', brief: 'Juno needs a getaway driver. Lose the police, then reach the hideout.' },
  { title: 'PACKAGE RUN', brief: 'Deliver three packages across town before the timer runs out. No cops, no crashes.' },
  { title: 'VULTURE NEST', brief: 'The Vultures took the garage\'s money. Take it back — by force if you must.' },
  { title: 'MIDNIGHT RACE', brief: 'Beat Kade Voss in a street race through the tower district. First to the pier wins.' },
  { title: 'THE BIG SCORE', brief: 'Hit the Vulture stash house on Marina Point. Grab the cash and get out clean.' },
  { title: 'SUNSET SHOWDOWN', brief: 'Kade Voss is waiting at the lighthouse. End this, Rook — then drive into the sunset.' },
];

export const MISSION_DIALOG = [
  [{ who: 'mara', text: 'The van is parked at the pier, south end. Take any car — this city owes us one.' }],
  [{ who: 'mara', text: 'Van is loaded and waiting. Drive it back to the garage. Careful — Vultures patrol Coral Row.' }],
  [{ who: 'juno', text: 'Rook, I lifted a watch from a Vulture and the cops are on me. Be my wheels. Lose them!' }],
  [{ who: 'mara', text: 'Three packages, three addresses, one timer. The customers pay double if you are fast.' }],
  [{ who: 'kade', text: 'You took my van, Vale. Now you take my money? Come and try, little driver.' }],
  [{ who: 'juno', text: 'Kade challenged you to a race. Tower district to the pier. Beat him and the Vultures back off.' }],
  [{ who: 'mara', text: 'The stash house is on Marina Point. Get the cash, Rook. This ends the debt for good.' }],
  [{ who: 'kade', text: 'The lighthouse, Vale. Just you and me. Winner takes Solmarina.' }],
];

export const MISSION_DONE_LINES = [
  'Van recovered. Mara owes you one — and she pays in cash.',
  'The garage is yours to call home now, Rook.',
  'Clean getaway. Juno says you drive like the wind.',
  'All packages delivered on time. The customers love you.',
  'The Vultures\' money is back where it belongs.',
  'Kade Voss eats your dust. The streets talk about it already.',
  'The stash is yours. Solmarina is almost free.',
  'Kade is done. The sun sets on a free Solmarina. You did it, Rook.',
];

export const RADIO_LINES = [
  'Sunset FM — the sound of Solmarina, all afternoon, every afternoon.',
  'Traffic on the coast road is moving slow. The sun is not. Stay hydrated, Solmarina.',
  'The Vultures were seen near Marina Point again. Police advise: keep your doors locked.',
  'Tonight: the street race everyone is talking about. Sunset FM will be there.',
];
