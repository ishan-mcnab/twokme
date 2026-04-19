/** Attribute combine sections (Stages 3–8). Order matches global stage offset. */
export const ATTRIBUTE_SECTIONS = [
  {
    id: 'athleticism',
    title: 'ATHLETICISM',
    description:
      'Speed, bounce, motor, and how long you can run hot before you fade.',
    colorVar: '--neon-green',
    glowVar: '--glow-green',
  },
  {
    id: 'inside_scoring',
    title: 'INSIDE SCORING',
    description:
      'Finishing through contact, touch around the rim, and paint presence.',
    colorVar: '--neon-blue',
    glowVar: '--glow-blue',
  },
  {
    id: 'outside_scoring',
    title: 'OUTSIDE SCORING',
    description:
      'Range, rhythm, and the discipline to take the shots that win games.',
    colorVar: '--neon-purple',
    glowVar: '0 0 20px rgba(123, 47, 255, 0.45)',
  },
  {
    id: 'playmaking',
    title: 'PLAYMAKING',
    description:
      'Handle pressure, see the floor, and put teammates in scoring spots.',
    colorVar: '--neon-orange',
    glowVar: '--glow-orange',
  },
  {
    id: 'defense',
    title: 'DEFENSE',
    description:
      'Guarding the ball, protecting the paint, and hunting turnovers.',
    colorVar: '--neon-red',
    glowVar: '--glow-red',
  },
  {
    id: 'intangibles',
    title: 'INTANGIBLES',
    description:
      'Clutch nerves, consistency, and the quiet stuff that swings games.',
    colorVar: '--neon-gold',
    glowVar: '--glow-gold',
  },
]

export const POSITION_OPTIONS = [
  { code: 'PG', name: 'Point Guard' },
  { code: 'SG', name: 'Shooting Guard' },
  { code: 'SF', name: 'Small Forward' },
  { code: 'PF', name: 'Power Forward' },
  { code: 'C', name: 'Center' },
]
