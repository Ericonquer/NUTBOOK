// Shadow DOM retargets event.target to its host. Use the composed path so an
// embedded control is never mistaken for a presentation-body advance intent.
export const interactiveSelector='button,a,input,textarea,select,[contenteditable],iframe,video,[role="button"],[data-nutbook-runtime-control],#nutbook-native-presentation-fullscreen-exit';
export function isInteractiveMotionEvent(event){return event.composedPath().some(node=>node?.matches?.(interactiveSelector));}
