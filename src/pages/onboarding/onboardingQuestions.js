/**
 * Returns visible questions for an attribute section (computed, not scattered conditionals).
 * @param {number} sectionIndex 0..5
 * @param {{ answers: Record<string, unknown>, position: string, heightInches: number|null }} ctx
 */
export function getVisibleAttributeQuestions(sectionIndex, ctx) {
  const { answers, position, heightInches } = ctx
  const h = heightInches ?? 0
  const pos = (position || '').toUpperCase()
  const ex = typeof answers.ath_explosiveness === 'number' ? answers.ath_explosiveness : 0

  switch (sectionIndex) {
    case 0:
      return [
        {
          id: 'ath_speed_agility',
          type: 'slider',
          label: 'OFF-BALL SPEED & AGILITY',
        },
        {
          id: 'ath_explosiveness',
          type: 'slider',
          label: 'EXPLOSIVENESS & VERTICAL',
        },
        {
          id: 'ath_strength',
          type: 'slider',
          label: 'STRENGTH',
        },
        {
          id: 'ath_stamina',
          type: 'slider',
          label: 'STAMINA & DURABILITY',
        },
        {
          id: 'ath_hustle',
          type: 'slider',
          label: 'HUSTLE',
        },
      ]
    case 1: {
      const q = [
        {
          id: 'ins_finishing_rim',
          type: 'slider',
          label: 'FINISHING AT THE RIM',
        },
        {
          id: 'ins_draw_contact',
          type: 'slider',
          label: 'DRAWING CONTACT',
        },
        {
          id: 'ins_hands',
          type: 'slider',
          label: 'HANDS & CATCHING',
        },
      ]
      if (h >= 72 || pos === 'PF' || pos === 'C') {
        q.push({
          id: 'ins_post_game',
          type: 'mcq',
          label: 'POST GAME',
          options: [
            { id: 'none', text: 'Not my game at all' },
            { id: 'hold', text: 'I can hold my own' },
            { id: 'comfortable', text: "I'm comfortable in the post" },
            { id: 'home', text: 'The post is my home' },
          ],
        })
      }
      if (h >= 68 || ex > 60) {
        q.push({
          id: 'ins_dunk_ability',
          type: 'mcq',
          label: 'DUNKING ABILITY',
          options: [
            { id: 'no', text: 'No' },
            { id: 'easy', text: 'Only standing/easy dunks' },
            { id: 'traffic', text: 'I can dunk in traffic' },
            { id: 'everyone', text: "I'm throwing it down on everybody" },
          ],
        })
      }
      return q
    }
    case 2:
      return [
        {
          id: 'out_three',
          type: 'slider',
          label: 'THREE-POINT SHOOTING',
        },
        {
          id: 'out_mid',
          type: 'slider',
          label: 'MID-RANGE GAME',
        },
        {
          id: 'out_ft',
          type: 'slider',
          label: 'FREE THROW SHOOTING',
        },
        {
          id: 'out_shot_iq',
          type: 'mcq',
          label: 'SHOT IQ',
          options: [
            { id: 'open', text: "I shoot whenever I'm open" },
            { id: 'selective', text: "I'm pretty selective" },
            { id: 'rare_bad', text: 'I rarely take bad shots' },
            { id: 'right_shot', text: 'I always take the right shot' },
          ],
        },
      ]
    case 3: {
      const role = answers.pm_ball_role
      const showHandle =
        !!role &&
        role !== 'offball' &&
        (pos === 'PG' || pos === 'SG' || role === 'primary')
      const items = [
        {
          id: 'pm_ball_role',
          type: 'mcq',
          label: 'BALL-HANDLING ROLE',
          options: [
            { id: 'primary', text: 'Primary (I bring it up)' },
            { id: 'secondary', text: 'Secondary (I can handle when needed)' },
            { id: 'offball', text: "Off-ball (I'm mostly without the ball)" },
          ],
        },
      ]
      if (showHandle) {
        items.push(
          {
            id: 'pm_handle',
            type: 'slider',
            label: 'BALL HANDLING',
          },
          {
            id: 'pm_vision',
            type: 'slider',
            label: 'COURT VISION',
          },
        )
      }
      items.push({
        id: 'pm_pass_acc',
        type: 'slider',
        label: 'PASSING ACCURACY',
      })
      return items
    }
    case 4: {
      const items = [
        {
          id: 'def_perimeter',
          type: 'slider',
          label: 'PERIMETER DEFENSE',
        },
      ]
      if (pos === 'PF' || pos === 'C' || h >= 74) {
        items.push({
          id: 'def_interior',
          type: 'slider',
          label: 'INTERIOR DEFENSE & SHOT BLOCKING',
        })
      }
      items.push(
        {
          id: 'def_iq',
          type: 'mcq',
          label: 'DEFENSIVE IQ',
          options: [
            { id: 'react', text: 'I mostly react' },
            { id: 'some', text: 'I read some plays' },
            { id: 'ahead', text: "I'm usually a step ahead" },
            { id: 'everything', text: 'I see everything before it happens' },
          ],
        },
        {
          id: 'def_steals',
          type: 'slider',
          label: 'STEALS & DEFLECTIONS',
        },
        {
          id: 'def_dreb',
          type: 'slider',
          label: 'DEFENSIVE REBOUNDING',
        },
        {
          id: 'def_oreb',
          type: 'mcq',
          label: 'OFFENSIVE REBOUNDING',
          options: [
            { id: 'never', text: 'Never — I get back on D' },
            { id: 'sometimes', text: "Sometimes if I'm in position" },
            { id: 'always', text: 'I always crash' },
            { id: 'relentless', text: "I'm a relentless offensive rebounder" },
          ],
        },
      )
      return items
    }
    case 5:
      return [
        {
          id: 'int_clutch',
          type: 'mcq',
          label: 'CLUTCH FACTOR',
          options: [
            { id: 'shrink', text: 'I tend to shrink' },
            { id: 'same', text: "I'm about the same" },
            { id: 'rise', text: 'I rise to the occasion' },
            { id: 'want_ball', text: 'I want the ball in big moments' },
          ],
        },
        {
          id: 'int_impact',
          type: 'slider',
          label: 'OVERALL GAME IMPACT',
        },
      ]
    default:
      return []
  }
}
