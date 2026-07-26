# Working art (not shipped)

Raw generations kept because a later pass wants them, not because anything
loads them — only `art/sprites/` is globbed into the game.

- `kit.png` — the `create_ui_asset` kit sheet the menu chrome came from
  (`elements: ["icon_button", "button", "tab"]`), and `kit_1/2/3.png`, its
  pieces as separated by `art/tools/split.mjs`.
- `kit_2` (the socket) shipped as `ui_slot` after `scale.mjs --to 40` and
  `hollow.mjs --inset 9 --fade 2`. `kit_1` (button) and `kit_3` (tab) are
  unused: menu buttons and tabs are still flat by choice.

Keeping the sheet means a future button/tab pass matches the frames already in
the game without re-rolling and hoping the style lands in the same place.
