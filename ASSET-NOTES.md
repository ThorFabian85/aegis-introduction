# Scratch shield and space scene

Image editing used the built-in ImageGen tool. No image-generation SDK or CLI was used. Uploaded originals are preserved. The existing site emblem is unchanged; CSS turns its silhouette white and supplies the neon glow.

## Final project assets

Project root: `/workspace/scratch/6c964316cde0/aegis-introduction/`.

- `assets/robot-with-shield.svg`: the earlier photo-based robot, now framed at 760 × 1254 so its lowered arm has room. The SVG embeds its photograph and silhouette matte. Native geometry positions the scratch layer inside the shield face.
- `assets/voyage-galaxy.jpg`: the unchanged supplied Depositphotos_674689978_XL.jpg.
- `assets/cockpit-clean.png`: a complete opaque cockpit image edited from the supplied Depositphotos_184401930_XL.jpg. Both windshield columns are intact; isolated dark fragments beneath the central monitors were removed. Its pixels are used unchanged in the repaired SVG foreground.
- `assets/cockpit-foreground.svg`: the cleaned photograph with explicit SVG window boundaries. Columns, their inner edges, cables, monitors and mounts stay opaque.
- `assets/cockpit-planet.png`: the existing complete planet background, restored as the independent distant layer.
- `moments.css` and `moments.js`: manual scratch coating, white neon reveal, galaxy-to-cockpit transition and independent cockpit/planet parallax. The UFO sprite and flight timer remain removed.

## Cockpit cleanup prompt

Built-in ImageGen was used with Depositphotos_184401930_XL.jpg as the edit target. The final asset is `assets/cockpit-clean.png`.

“Use case: precise-object-edit. Asset type: full-screen website cockpit photograph. The attached ORIGINAL intact cockpit photograph is the edit target. Make a very small cleanup edit: remove the isolated dark rock/metal-looking fragments in the CENTRAL windshield just BELOW the left and right groups of small floating instrument monitors, immediately above the main dashboard (the noticeable curled dark chunk below the left monitor cluster and tiny stray chunks below the right cluster). Fill those small areas with the continuous distant blue planet/atmospheric horizon behind them. Keep the actual instrument monitors and their stands, all chairs, consoles, roof and ALL columns completely intact. In particular retain the full inner vertical edges, wires and cyan light strips of the two major windshield support columns, from roof to dashboard: no erased gaps or jagged cutouts. Preserve the original camera, wide framing, materials, blue lighting, planet composition and every other object. Output a single complete opaque photograph including the planet and cockpit together, edge to edge at the same wide aspect ratio. Do not extract the background or make anything transparent. No UFO, no spacecraft outside, no new objects, no text.”

## Restoring parallax

The clean photograph remains unchanged. Built-in ImageGen produced a draft window matte as a geometric guide, using this prompt:

“Use case: precise-object-edit. Asset type: an exact black-and-white opacity mask for the attached cockpit image. The attached image is the geometric reference; output ONLY its matching binary mask at the identical aspect ratio and aligned composition. Paint the ENTIRE image pure WHITE except for the three actual outside-view WINDOW OPENINGS, which must be pure BLACK. All ceiling, floor, consoles, chairs, monitor screens and stands, wires, windshield support pillars and the complete inner edges of both central columns (including cyan light strips) must remain SOLID WHITE. Keep every part of the supports from ceiling to dashboard fully opaque; do not thin or nibble their edges. The center window's black silhouette must bend around the white monitors, white chairs and their stands in front. There must be only THREE connected black regions, one for each window view. No other black holes, internal line drawings, shading, gray machinery, checkerboard, texture or text. A flat white cockpit silhouette with accurate black window holes, suitable as a luminance alpha matte. All objects outside the window, including planet, stars and rocks, are black. Match the source positions precisely.”

The final `assets/cockpit-foreground.svg` uses explicit native SVG paths refined against the clean photograph, rather than the approximate generated matte edges. This preserves the entire columns and avoids isolated leftover patches. Pointer movement restores the previous independent depth offsets: the planet moves up to 11 pixels horizontally and 7 vertically opposite the foreground's 5 and 3 pixels. Overscan keeps image edges outside the viewport.

The three short original crossbars linking the outboard monitors to the two mounted monitors are also retained in the SVG mask. All five screens form a connected silhouette with the dashboard. The photograph itself remains unchanged.

## Scene behavior and checks

The galaxy fades in first, followed by the full-viewport cockpit. The Why section retains 1.5 viewport heights after the essay so ordinary scrolling can leave the entire cockpit unobstructed. The reading veil fades with the last text and returns when scrolling back. There is no UFO. Scene timing stops offscreen and in hidden tabs; reduced motion presents a static cockpit. The piano recording remains downloadable as M4A alongside the MIDI, including in the standalone preview.

Native left/center/right parallax compositions were reviewed. Alpha checks confirm transparent window and residue locations, opaque columns/monitors/mounts, and continuous inner column edges. Controlled DOM/clock checks cover the scene timing and scroll-away behavior. Actual Canvas checks preserve fully manual scratching. Browser and physical-device rendering were not tested.

## Hero shield background

The native Canvas renderer and SVG fallback have no background stars or broad background glow. Only the shield, its orbit lines and attached light effects remain on transparency. The circular reset button restores its front-facing position using the existing reset animation; it stays hidden when the interactive renderer is unavailable.
