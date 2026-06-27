import Alpine from 'alpinejs';
import './styles/main.scss';
import { registerTheme } from './components/theme.js';
import { registerToggles } from './components/toggles.js';
import { registerAudio } from './components/audio.js';
import { registerFlashcard } from './components/flashcard.js';
import { registerAdminForms } from './components/admin-forms.js';

registerTheme(Alpine);
registerToggles(Alpine);
registerAudio(Alpine);
registerFlashcard(Alpine);
registerAdminForms(Alpine);

window.Alpine = Alpine;
Alpine.start();
