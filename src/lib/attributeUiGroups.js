/** All 40 attributes grouped for pickers (matches plan categories + leftovers). */
export const ATTRIBUTE_UI_GROUPS = [
  {
    id: 'inside',
    label: 'Finishing & inside',
    keys: [
      'layup',
      'close_shot',
      'driving_dunk',
      'standing_dunk',
      'hands',
      'draw_foul',
      'post_control',
      'post_hook',
      'post_fade',
    ],
  },
  {
    id: 'outside',
    label: 'Shooting',
    keys: ['three_point', 'moving_three', 'mid_range', 'moving_mid', 'free_throw', 'shot_iq', 'ocnst'],
  },
  {
    id: 'playmaking',
    label: 'Playmaking',
    keys: ['ball_handle', 'pass_accuracy', 'pass_iq', 'pass_vision', 'speed_with_ball'],
  },
  {
    id: 'defense',
    label: 'Defense & rebounding',
    keys: [
      'perimeter_defense',
      'interior_defense',
      'block',
      'steal',
      'dreb',
      'oreb',
      'help_defense_iq',
      'dcnst',
      'pass_perception',
      'lateral_quickness',
    ],
  },
  {
    id: 'athleticism',
    label: 'Athleticism',
    keys: ['speed', 'acceleration', 'agility', 'vertical', 'strength', 'stamina', 'durability', 'hustle'],
  },
  {
    id: 'intangibles',
    label: 'Intangibles',
    keys: ['intangibles'],
  },
]
