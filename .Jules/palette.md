## 2026-10-05 - Escape key logic for dropdown menus
**Learning:** Adding `Escape` key support to custom dropdown menus is a critical accessibility requirement, but it must be paired with returning focus back to the toggle button (`langCurrent.focus()`) so keyboard users don't lose their place in the DOM structure.
**Action:** Always verify that custom modals, lightboxes, and dropdowns not only close on Escape, but explicitly manage focus back to the triggering element.
