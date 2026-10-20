# Motion-editable presentations

Every newly authored presentation supports NUTBOOK's motion center by default.
Use `templates/presentation.html`; `templates/motion-presentation.html` is a
compatible alias. Ordinary non-presentation HTML keeps its existing workflow.
Existing decks are not rewritten merely to register them or edit their text.

The template embeds the current motion runtime with no CDN or build service.
It adds about 356 KB to each standalone HTML. Do not replace it with remote
scripts or add installation dependencies. Keep the embedded runtime when
adapting the sample's content and visual design.

## Support first, effects by choice

New pages start with `actions:[]`, `background:null`, and `transition:null`.
Remove independent CSS entrance animations; opening the deck must show its
content immediately without playing an effect. The user chooses effects in the
motion center. An explicit request for initial effects can populate only the
requested actions; do not animate every heading by default.

Keep `data-nutbook-motion-contract="nutbook-motion/v1"` on the HTML root and
exactly one `script#nutbook-motion-config[type="application/json"]` with
`data-id="nutbook-motion-config"`. Its JSON follows `motion-schema.json`;
current effect versions, parameters and bounds are in
`../scripts/motion/registry.json`. Use these shipped definitions rather than
inventing parameters or copying an older effect list. Config is data only: no
code, URLs, CSS, selectors or unknown fields.

When replacing sample pages, keep page IDs, bridge pages, notes keys and config
pages in the same DOM order. Every editable text/image target belongs to its
page and has a stable unique `data-id`; declare text/rich-text fields as motion
`text`, and editable `img` as `image`. A group needs
`data-nutbook-motion-group="true"`; video/iframe targets need their actual
elements. Declare all video/iframe IDs and flags in page capabilities. Support
flags describe the adapters the document actually supports. Preserve existing
page/target/capability declarations during normal content and motion editing.

## Verify the finished file

Register normally with `--kind presentation` and local assets as related files.
Registration validates motion data and DOM consistency; it does not prove
runtime behavior. In an offline browser verify that the initial configuration
is empty and no effects play, forward/back navigation updates the actual page
and subscribers, and managed mode hides standalone controls and stops its
keyboard navigation. Verify that text remains editable and motion-center
selection can apply and undo an effect without changing the saved source.

For native acceptance, open the file in NUTBOOK → **编辑** → **动效中心** →
select text → choose and apply an effect → save/finish → close/reopen. Confirm
that the chosen effect persists, and that undo/discard restores content and
motion together. Distinguish browser tests, native runtime checks and user
confirmation. Do not overwrite a user's configured effects when refreshing a
template or runtime.
