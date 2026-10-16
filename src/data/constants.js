// src/data/constants.js — Centralized Project Constants
// Single source of truth for dimensions, palette, subjects, and gameplay rules.

export const VIEWPORT = {
  LOGICAL_WIDTH: 320,
  LOGICAL_HEIGHT: 240,
  TILE_SIZE: 16,
  MIN_TOUCH_TARGET: 48, // Minimum 48x48px for WCAG 2.5.5
};

export const PALETTE = {
  // Canvas & UI Surfaces
  BG_DARK: '#0F172A',         // Slate 900
  SURFACE: '#1E293B',         // Slate 800
  SURFACE_ELEVATED: '#334155',// Slate 700
  SURFACE_ACCENT: '#475569',  // Slate 600
  BORDER_SUBTLE: '#334155',   // Slate 700
  BORDER_FOCUS: '#38BDF8',    // Sky 400
  PARCHMENT: '#FEF3C7',       // Amber 100
  PARCHMENT_BORDER: '#D97706',// Amber 600

  // Text Tokens
  TEXT_PRIMARY: '#F8FAFC',    // Slate 50
  TEXT_SECONDARY: '#94A3B8',  // Slate 400
  TEXT_DARK: '#0F172A',       // Slate 900

  // Feedback Tokens
  SUCCESS: '#10B981',         // Emerald 500
  WARNING: '#F59E0B',         // Amber 500
  ERROR: '#EF4444',           // Red 500
  GOLD: '#FBBF24',            // Amber 400

  // KAAC Governor's Cup Subjects
  MATH: '#2563EB',            // Blue 600 (Cipher Caverns)
  SCIENCE: '#059669',         // Emerald 600 (Verdant Wilds)
  SOCIAL_STUDIES: '#D97706',  // Amber 600 (Kingdoms of Time)
  LANGUAGE_ARTS: '#7C3AED',   // Violet 600 (Whispering Archives)
  ARTS_HUMANITIES: '#DB2777', // Pink 600 (Gallery of Wonders)
};

export const SUBJECTS = {
  MATH: {
    id: 'math',
    name: 'Mathematics',
    color: PALETTE.MATH,
    realm: 'Cipher Caverns',
    boss: 'Number Golem',
  },
  SCIENCE: {
    id: 'science',
    name: 'Science',
    color: PALETTE.SCIENCE,
    realm: 'Verdant Wilds',
    boss: 'Overgrown Guardian',
  },
  SOCIAL_STUDIES: {
    id: 'social_studies',
    name: 'Social Studies',
    color: PALETTE.SOCIAL_STUDIES,
    realm: 'Kingdoms of Time',
    boss: 'Chrono Warden',
  },
  LANGUAGE_ARTS: {
    id: 'language_arts',
    name: 'Language Arts',
    color: PALETTE.LANGUAGE_ARTS,
    realm: 'Whispering Archives',
    boss: 'Wordweaver',
  },
  ARTS_HUMANITIES: {
    id: 'arts_humanities',
    name: 'Arts and Humanities',
    color: PALETTE.ARTS_HUMANITIES,
    realm: 'Gallery of Wonders',
    boss: 'Living Masterpiece',
  },
};

export const SPACED_REPETITION = {
  INTERVALS_DAYS: [1, 3, 7, 14, 30],
  VERIFICATION_MIN_COUNT: 3, // Requires 3 distinct questions to verify mastery
};

export const TARGET_GRADE_BAND = '6-8'; // Middle Grades focus
