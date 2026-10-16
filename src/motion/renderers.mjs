import {preparePageCurl} from './page-curl.mjs';
import {prepareSimpleExit} from './simple-exits.mjs';
import {prepareFoldExit} from './fold-exit.mjs';
import {prepareFragments} from './fragments.mjs';
import {prepareTextEffect} from './text-effects.mjs';
import {prepareGlyphParticles,prepareParticleExit} from './glyph-particles.mjs';
import {prepareGravityImpact,prepareSpotlight} from './object-adapters.mjs';
export const renderers=Object.freeze({'exit.page-curl':preparePageCurl,'exit.blur-away':prepareSimpleExit,'exit.directional-wipe':prepareSimpleExit,'exit.depth-away':prepareSimpleExit,'exit.fold-close':prepareFoldExit,'entrance.fragment-assemble':prepareFragments,'exit.fragment-fall':prepareFragments,'text.glyph-particles':prepareGlyphParticles,'text.masked-heading':prepareTextEffect,'text.blur-reveal':prepareTextEffect,'text.typewriter':prepareTextEffect,'text.pressure':prepareTextEffect,'text.gradient':prepareTextEffect,'text.true-focus':prepareTextEffect,'text.count-up':prepareTextEffect,'text.character-stagger':prepareTextEffect,'text.decode-reveal':prepareTextEffect,'text.split-flip':prepareTextEffect,'text.elastic-warp':prepareTextEffect,'text.outline-write':prepareTextEffect,'text.depth-text':prepareTextEffect,'text.fold-unfold':prepareTextEffect,'text.echo-trail':prepareTextEffect,'text.light-sweep':prepareTextEffect,'entrance.gravity-impact':prepareGravityImpact,'emphasis.spotlight':prepareSpotlight,'exit.particle-dissolve':prepareParticleExit});
