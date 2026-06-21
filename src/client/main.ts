import Alpine from 'alpinejs';
import './styles/main.scss';

import { registerTheme } from './components/theme';
import { registerToggles } from './components/toggles';
import { registerFlashcard } from './components/flashcard';
import { registerAdminForms } from './components/admin-forms';

// Expose Alpine for debugging and inline `x-data` access.
window.Alpine = Alpine;

// Register every Alpine component / store before start.
registerTheme(Alpine);
registerToggles(Alpine);
registerFlashcard(Alpine);
registerAdminForms(Alpine);

Alpine.start();
