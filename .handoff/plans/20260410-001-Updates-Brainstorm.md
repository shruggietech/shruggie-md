# Shruggie Markdown Change Requests (20260410-001)

- On Windows 11 > rightclick tooltip > "Open With ..." > Shruggie Markdown
  - The program starts up (as expected) but the file to be opened is NOT displayed.
  - The default welcome doc is displayed instead.
  - The only way to get the intended document to appear is to manually use the in-app "Open" dialogue.
- In Settings > Markdown Engine
  - It does not appear as if anything is changing when this dropdown is altered.
  - NOTE: Just because I don't see changes doesn't mean something is wrong, however I feel like we should check on this (I find it hard to believe that literally nothing is changing in a large document when adjusting the rendering engine).
  - Additionally, the default rendering does not align with the usual Github-looking default style. We need to give users a predictable experience (most of whom are regularly working with Github markdown docs).
- In the "View" and "Edit" views
  - Bulitized list items do not have any bullet symbols in front of them (it's just an indented wall of text).
  - We need to add a "Refresh" button to the right of the "Save" button (along with an appropriate glyph). Pressing this should logically force a refresh what is displayed.
    - Ideally we want to present a live-rendering of the current document at all times. Adding this button is a fallback for if we missed something along the way. We might take it out later once consistent live-display functionality can reliably be produced.
    - We need to add a popup modal that triggers if refresh is pressed before un-saved edits are saved. Allow the user to "Refresh" or "Cancel" from that modal.
- For single back-tick enclosed in-line code items, the font is the same color as the normal paragraph font. We need to give this some default code color (no syntax hilighting, as that's reserved for use in full code blocks). Perhaps a muted blue or an on-brand green would look nice (the muted Shruggie green variant).
- In Settings > Preview > Font family
  - Don't allow this field to be a free-for-all text field.
  - It should be a dropdown with logical alphabetical font names that are human friendly to read with a sensible default font selected on first-run.
  - Make sure this setting is tracked across sessions.
- In the main UI, the spacing between the Export, Workspaces, and Settings buttons is larger than the spacing between other buttons on the same UI strip. Clean this up and make it more uniform (reduce the spacing to be more in line with the other buttons).

Use the above notes to write up a fresh Updates doc to use in the project `./.handoff/plans` directory.