# Design Advisor
## Overview
A senior-level design advisor skill that provides industry-specific UI/UX recommendations before building. Searches comprehensive design data files to give actionable recommendations with hex codes, font pairings, layout patterns, accessibility guidance, and anti-pattern warnings. Covers 30+ industries and 2024-2026 design trends.
## Workflow
1. Identify the industry/product type from the user's request
2. Search relevant CSV data files in .claude/skills/design/data/
3. Cross-reference multiple files (e.g., match color palette with typography mood and style)
4. Check accessibility requirements from ux-guidelines.csv
5. If the product involves Arabic/RTL, pull RTL-specific guidance
6. Search 21st.dev for real component examples (if MCP available)
7. Present structured recommendations with implementation details
## Data Files
Search these CSV files based on what the user needs:
- colors.csv — 34 industry color palettes with full design system tokens (primary, secondary, CTA, accent, background, text, border, success, warning, error, gradient, surface, muted)
- typography.csv — 15 font pairings with weights, line-height, letter-spacing, scale ratios, mood, and Google Fonts links. Includes Arabic typography pairings
- styles.csv — 13 visual design styles (Antigravity, Glassmorphism, Bento Grid, Aurora, Neomorphism, Mesh Gradient, Dark Luxe, Swiss Grid, Liquid, Retro Futurism, Organic Minimalism, Kinetic Typography, Editorial Brutalism) with era, CSS variables, and implementation code
- ui-reasoning.csv — 18 industry-specific design reasoning maps with recommended style combos, effects, layout patterns, anti-patterns (with severity), and accessibility notes. Includes Abaya/Modest Fashion and Arabic Luxury Brand
- landing.csv — 10 landing page patterns (Premium Service, Luxury Product, SaaS, App Launch, Portfolio, Event, Newsletter, E-commerce, Real Estate, Dashboard Onboarding) with section order, CTA strategy, mobile strategy, and conversion tips
- ux-guidelines.csv — 30 UX rules across Animation, Typography, Interaction, Color, Layout, Forms, Navigation, Performance, Accessibility, and RTL Support. Each with do/don't code examples and WCAG levels
- charts.csv — 17 data visualization types with library recommendations, color strategies, animation specs, anti-patterns, accessibility requirements, and implementation tips
## Output Format
Structure your response as:
### Style Direction
Recommended visual style combo and why it fits this industry (reference styles.csv)
### Color Palette
Full hex code system with roles (primary, secondary, CTA, accent, states, gradients) from colors.csv
### Typography
Font pairing with weights, spacing, scale ratio, and Google Fonts link from typography.csv
### Page Structure
Section order, CTA placement strategy, and mobile adaptation from landing.csv
### Key Effects
Animations and interactions with CSS implementation from styles.csv + ux-guidelines.csv
### Anti-Patterns
What to avoid with severity levels from ui-reasoning.csv
### Accessibility
WCAG compliance requirements and implementation from ux-guidelines.csv
### Data Visualization (if applicable)
Chart recommendations with implementation from charts.csv
### 21st.dev Examples
Real components if MCP server is available
### Next Step
A /ui command to start building
