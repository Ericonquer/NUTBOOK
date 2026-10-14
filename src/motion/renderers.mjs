import {prepareGlyphParticles,prepareParticleExit} from './glyph-particles.mjs';
import {prepareGravityImpact,prepareSpotlight} from './object-adapters.mjs';
export const renderers=Object.freeze({'text.glyph-particles':prepareGlyphParticles,'entrance.gravity-impact':prepareGravityImpact,'emphasis.spotlight':prepareSpotlight,'exit.particle-dissolve':prepareParticleExit});
