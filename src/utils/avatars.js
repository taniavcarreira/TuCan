import { COLORS } from '../theme';

// The toucan mascot's full customisation system (8 hat/colour presets,
// picked in ProfileScreen) was shelved on 28/08/2026 — Tania didn't like
// the variations and asked to keep only this single validated design
// everywhere a toucan appears (the "Perfect!" hero moment in RingChart
// and the topbar profile icon in App.js), with no picker for now.
// If/when customisation comes back, this is the file to reintroduce an
// AVATAR_OPTIONS list + an avatarById lookup in — the pieces that used
// them (App.js, HojeScreen.js, ProfileScreen.js) were simplified to
// import DEFAULT_AVATAR directly instead.
export const DEFAULT_AVATAR = {
  hat: 'none',
  top: COLORS.c4,
  base: COLORS.c9,
  leg: COLORS.c5,
};
