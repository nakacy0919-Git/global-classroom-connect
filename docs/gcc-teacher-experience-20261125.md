# GCC V23.5 teacher experience — 2026-11-25

Based on green PR #112. No main merge, deployment or database changes.

- Teacher Home: restore optional three-step getting-started guide below two primary action cards; retain all existing welcome illustrations and public gateway choices. Replace duplicated compact/full hosted session cards with one management list, six at a time in chronological order. Count shortcut jumps to its management section, rather than opening the create form. Initial counts show a dash until loaded. Initial optional-data warning is not immediately dismissed.
- Sidebar: direct Teacher Home, Host a Session, Find a Session and My Requests; community tools remain collapsed. Public GCC Home retained. No admin roles added.
- Find: one keyword input rather than two synchronized inputs. Preserve existing date/time, country map, school level, session format, SDG, age, compatible-school and favorites filters, sorting and reset. Keep current cards, photos, approval workflow and privacy protections.
- Responsive: touch targets, flexible filter controls, viewport-bounded dialogs, two-column primary teacher actions on tablet and one column on phone; 16px input text on narrow screens and visible keyboard focus.
- New regression tests cover markup/state integration and responsive CSS; headless public gateway checks at 390x844, 768x1024 and 1024x768. These are not physical iPad/Safari tests or authenticated teacher visual checks. Verify real school devices with consenting teachers; no synthetic production writes.
- Existing staged security and live mail delivery gates remain. Room-chart managed-PC isolated client work from #99/#103 remains separately reviewable, not included here. Do not assume worldwide release approval.
