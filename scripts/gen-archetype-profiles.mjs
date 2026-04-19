import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const raw = {
  '2 Way 3 Level Board Hunter': {
    positions: ['PF', 'C'],
    primaryAttributes: ['three_point', 'dreb', 'oreb', 'interior_defense'],
    secondaryAttributes: ['block', 'strength', 'mid_range'],
  },
  '2-Way 3-Level Combo Guard': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'ball_handle', 'perimeter_defense', 'mid_range'],
    secondaryAttributes: ['pass_accuracy', 'steal', 'layup'],
  },
  '2-Way 3-Level Combo Forward': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['three_point', 'mid_range', 'perimeter_defense', 'layup'],
    secondaryAttributes: ['ball_handle', 'steal', 'dreb'],
  },
  '2 Way 3 Level Facilitator': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['pass_vision', 'pass_iq', 'three_point', 'perimeter_defense'],
    secondaryAttributes: ['ball_handle', 'pass_accuracy', 'steal'],
  },
  '2 Way 3 Level Interior Force': {
    positions: ['PF', 'C'],
    primaryAttributes: ['three_point', 'interior_defense', 'strength', 'block'],
    secondaryAttributes: ['dreb', 'post_control', 'layup'],
  },
  '2 Way 3 Level Phenom': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['three_point', 'ball_handle', 'perimeter_defense', 'layup'],
    secondaryAttributes: ['pass_vision', 'steal', 'mid_range'],
  },
  '2 Way 3 Level Playmaker': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'three_point', 'perimeter_defense'],
    secondaryAttributes: ['pass_iq', 'steal', 'speed_with_ball'],
  },
  '2 Way 3 Level Point Forward': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['three_point', 'pass_vision', 'perimeter_defense', 'ball_handle'],
    secondaryAttributes: ['layup', 'steal', 'mid_range'],
  },
  '2 Way 3 Level Scorer': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['three_point', 'mid_range', 'layup', 'perimeter_defense'],
    secondaryAttributes: ['ball_handle', 'steal', 'shot_iq'],
  },
  '2 Way 3 Level Shot Creator': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['ball_handle', 'three_point', 'mid_range', 'perimeter_defense'],
    secondaryAttributes: ['shot_iq', 'steal', 'layup'],
  },
  '2 Way 3 Level Threat': {
    positions: ['PG', 'SG', 'SF', 'PF'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'mid_range', 'layup'],
    secondaryAttributes: ['ball_handle', 'steal', 'pass_vision'],
  },
  '2 Way 3 PT Facilitator': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'pass_vision', 'pass_iq', 'perimeter_defense'],
    secondaryAttributes: ['ball_handle', 'steal', 'pass_accuracy'],
  },
  '2 Way 3 PT Playmaker': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'ball_handle', 'pass_vision', 'perimeter_defense'],
    secondaryAttributes: ['steal', 'pass_iq', 'speed_with_ball'],
  },
  '2 Way 3 PT Shot Creator': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['three_point', 'ball_handle', 'mid_range', 'perimeter_defense'],
    secondaryAttributes: ['shot_iq', 'steal', 'layup'],
  },
  '2 Way Balanced Scorer': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['mid_range', 'three_point', 'layup', 'perimeter_defense'],
    secondaryAttributes: ['shot_iq', 'steal', 'ball_handle'],
  },
  '2 Way Slasher': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['layup', 'driving_dunk', 'speed', 'perimeter_defense'],
    secondaryAttributes: ['agility', 'steal', 'draw_foul'],
  },
  '2 Way Sharpshooter': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'shot_iq', 'free_throw'],
    secondaryAttributes: ['mid_range', 'steal', 'lateral_quickness'],
  },
  '2 Way Playmaker': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'pass_iq', 'perimeter_defense'],
    secondaryAttributes: ['steal', 'speed_with_ball', 'pass_accuracy'],
  },
  '2 Way Shot Creator': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['ball_handle', 'mid_range', 'three_point', 'perimeter_defense'],
    secondaryAttributes: ['shot_iq', 'steal', 'layup'],
  },
  '2 Way Finisher': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['layup', 'driving_dunk', 'interior_defense', 'strength'],
    secondaryAttributes: ['draw_foul', 'block', 'hustle'],
  },
  '3 & D Guard': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'steal', 'lateral_quickness'],
    secondaryAttributes: ['shot_iq', 'free_throw', 'pass_accuracy'],
  },
  '3 & D Wing': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'steal', 'lateral_quickness'],
    secondaryAttributes: ['shot_iq', 'dreb', 'block'],
  },
  '3 & D Point': {
    positions: ['PG'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'steal', 'pass_accuracy'],
    secondaryAttributes: ['shot_iq', 'lateral_quickness', 'ball_handle'],
  },
  '3 Level Scorer': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['three_point', 'mid_range', 'layup', 'shot_iq'],
    secondaryAttributes: ['ball_handle', 'draw_foul', 'ocnst'],
  },
  '3 Level Playmaker': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'three_point', 'mid_range'],
    secondaryAttributes: ['pass_iq', 'layup', 'shot_iq'],
  },
  'Floor General': {
    positions: ['PG'],
    primaryAttributes: ['pass_vision', 'pass_iq', 'ball_handle', 'pass_accuracy'],
    secondaryAttributes: ['speed_with_ball', 'shot_iq', 'perimeter_defense'],
  },
  'Lockdown Defender': {
    positions: ['PG', 'SG', 'SF', 'PF'],
    primaryAttributes: ['perimeter_defense', 'steal', 'lateral_quickness', 'dcnst'],
    secondaryAttributes: ['help_defense_iq', 'pass_perception', 'hustle'],
  },
  'Glass Cleaner': {
    positions: ['PF', 'C'],
    primaryAttributes: ['dreb', 'oreb', 'strength', 'vertical'],
    secondaryAttributes: ['hustle', 'interior_defense', 'block'],
  },
  Sharpshooter: {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['three_point', 'free_throw', 'shot_iq', 'mid_range'],
    secondaryAttributes: ['ocnst', 'lateral_quickness', 'pass_accuracy'],
  },
  Slasher: {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['layup', 'driving_dunk', 'speed', 'agility'],
    secondaryAttributes: ['draw_foul', 'vertical', 'ball_handle'],
  },
  'Paint Beast': {
    positions: ['PF', 'C'],
    primaryAttributes: ['post_control', 'strength', 'layup', 'interior_defense'],
    secondaryAttributes: ['dreb', 'draw_foul', 'hands'],
  },
  'Stretch Four': {
    positions: ['PF'],
    primaryAttributes: ['three_point', 'mid_range', 'perimeter_defense', 'shot_iq'],
    secondaryAttributes: ['dreb', 'block', 'pass_accuracy'],
  },
  'Stretch Five': {
    positions: ['C'],
    primaryAttributes: ['three_point', 'mid_range', 'block', 'interior_defense'],
    secondaryAttributes: ['dreb', 'strength', 'shot_iq'],
  },
  'Point Forward': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['pass_vision', 'ball_handle', 'layup', 'three_point'],
    secondaryAttributes: ['pass_iq', 'mid_range', 'perimeter_defense'],
  },
  'Shot Creator': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['ball_handle', 'mid_range', 'shot_iq', 'three_point'],
    secondaryAttributes: ['layup', 'pass_vision', 'ocnst'],
  },
  'Iso King': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['ball_handle', 'mid_range', 'shot_iq', 'layup'],
    secondaryAttributes: ['draw_foul', 'three_point', 'ocnst'],
  },
  'Walking Bucket': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['shot_iq', 'mid_range', 'layup', 'three_point'],
    secondaryAttributes: ['ball_handle', 'draw_foul', 'ocnst'],
  },
  'Playmaking Shot Creator': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'mid_range', 'shot_iq'],
    secondaryAttributes: ['pass_iq', 'three_point', 'layup'],
  },
  'Inside Out Scorer': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['layup', 'mid_range', 'three_point', 'post_control'],
    secondaryAttributes: ['draw_foul', 'shot_iq', 'strength'],
  },
  'Stretch Playmaker': {
    positions: ['PF', 'C'],
    primaryAttributes: ['three_point', 'pass_vision', 'pass_iq', 'mid_range'],
    secondaryAttributes: ['ball_handle', 'shot_iq', 'dreb'],
  },
  'Post Playmaker': {
    positions: ['PF', 'C'],
    primaryAttributes: ['post_control', 'pass_vision', 'pass_iq', 'strength'],
    secondaryAttributes: ['post_hook', 'post_fade', 'layup'],
  },
  'Interior Force': {
    positions: ['PF', 'C'],
    primaryAttributes: ['strength', 'post_control', 'interior_defense', 'block'],
    secondaryAttributes: ['dreb', 'layup', 'draw_foul'],
  },
  'Defensive Anchor': {
    positions: ['PF', 'C'],
    primaryAttributes: ['interior_defense', 'block', 'dreb', 'strength'],
    secondaryAttributes: ['help_defense_iq', 'dcnst', 'hustle'],
  },
  'High Flyer': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['vertical', 'driving_dunk', 'layup', 'speed'],
    secondaryAttributes: ['agility', 'oreb', 'hustle'],
  },
  'Mid Range Assassin': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['mid_range', 'shot_iq', 'ball_handle', 'ocnst'],
    secondaryAttributes: ['free_throw', 'layup', 'three_point'],
  },
  'Facilitating Shooter': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'pass_vision', 'pass_iq', 'shot_iq'],
    secondaryAttributes: ['pass_accuracy', 'ball_handle', 'free_throw'],
  },
  'Swat King': {
    positions: ['PF', 'C'],
    primaryAttributes: ['block', 'vertical', 'interior_defense', 'strength'],
    secondaryAttributes: ['dreb', 'help_defense_iq', 'agility'],
  },
  'Scoring Machine': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['shot_iq', 'mid_range', 'three_point', 'layup'],
    secondaryAttributes: ['ocnst', 'ball_handle', 'draw_foul'],
  },
  'All Around Star': {
    positions: ['PG', 'SG', 'SF', 'PF'],
    primaryAttributes: ['intangibles', 'shot_iq', 'pass_vision', 'perimeter_defense'],
    secondaryAttributes: ['ball_handle', 'three_point', 'layup'],
  },
  'Swiss Army Knife': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['intangibles', 'hustle', 'perimeter_defense', 'mid_range'],
    secondaryAttributes: ['pass_vision', 'dreb', 'three_point'],
  },
  'Versatile Star': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['three_point', 'perimeter_defense', 'pass_vision', 'layup'],
    secondaryAttributes: ['mid_range', 'steal', 'dreb'],
  },
  Hibachi: {
    positions: ['PG', 'SG'],
    primaryAttributes: ['mid_range', 'three_point', 'shot_iq', 'ocnst'],
    secondaryAttributes: ['ball_handle', 'free_throw', 'layup'],
  },
  'Transition Maestro': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['speed', 'layup', 'pass_vision', 'agility'],
    secondaryAttributes: ['ball_handle', 'driving_dunk', 'hustle'],
  },
  'Perimeter Lockdown': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['perimeter_defense', 'steal', 'lateral_quickness', 'dcnst'],
    secondaryAttributes: ['pass_perception', 'agility', 'help_defense_iq'],
  },
  'Paint Protector': {
    positions: ['PF', 'C'],
    primaryAttributes: ['block', 'interior_defense', 'strength', 'vertical'],
    secondaryAttributes: ['dreb', 'help_defense_iq', 'dcnst'],
  },
  'Playmaking Glass Cleaner': {
    positions: ['PF', 'C'],
    primaryAttributes: ['dreb', 'oreb', 'pass_vision', 'strength'],
    secondaryAttributes: ['pass_iq', 'hustle', 'interior_defense'],
  },
  'Stretch Glass Cleaner': {
    positions: ['PF', 'C'],
    primaryAttributes: ['three_point', 'dreb', 'oreb', 'strength'],
    secondaryAttributes: ['mid_range', 'interior_defense', 'hustle'],
  },
  'Complete Guard': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'three_point', 'perimeter_defense', 'pass_vision'],
    secondaryAttributes: ['mid_range', 'steal', 'pass_iq'],
  },
  'Stat Sheet Stuffer': {
    positions: ['PG', 'SF', 'PF'],
    primaryAttributes: ['intangibles', 'hustle', 'pass_vision', 'dreb'],
    secondaryAttributes: ['steal', 'layup', 'ocnst'],
  },
  Visionary: {
    positions: ['PG'],
    primaryAttributes: ['pass_vision', 'pass_iq', 'pass_accuracy', 'ball_handle'],
    secondaryAttributes: ['speed_with_ball', 'shot_iq', 'intangibles'],
  },
  Sigma: {
    positions: ['SG', 'SF'],
    primaryAttributes: ['shot_iq', 'intangibles', 'mid_range', 'perimeter_defense'],
    secondaryAttributes: ['three_point', 'ball_handle', 'dcnst'],
  },
  'Jack of All Trades': {
    positions: ['SF', 'PF'],
    primaryAttributes: ['hustle', 'intangibles', 'perimeter_defense', 'mid_range'],
    secondaryAttributes: ['dreb', 'pass_vision', 'layup'],
  },
  'Scrappy Point': {
    positions: ['PG'],
    primaryAttributes: ['hustle', 'steal', 'ball_handle', 'perimeter_defense'],
    secondaryAttributes: ['pass_accuracy', 'agility', 'dcnst'],
  },
  'Tempo Pushing Guard': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['speed', 'ball_handle', 'layup', 'pass_vision'],
    secondaryAttributes: ['speed_with_ball', 'agility', 'driving_dunk'],
  },
  'Poster Maker': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['driving_dunk', 'vertical', 'strength', 'layup'],
    secondaryAttributes: ['agility', 'speed', 'draw_foul'],
  },
  'Lob Threat': {
    positions: ['PF', 'C'],
    primaryAttributes: ['vertical', 'hands', 'layup', 'speed'],
    secondaryAttributes: ['driving_dunk', 'agility', 'oreb'],
  },
  Shooter: {
    positions: ['SG', 'SF'],
    primaryAttributes: ['three_point', 'free_throw', 'shot_iq', 'mid_range'],
    secondaryAttributes: ['ocnst', 'lateral_quickness', 'perimeter_defense'],
  },
  'Diming Sharpshooter': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'pass_vision', 'pass_iq', 'shot_iq'],
    secondaryAttributes: ['pass_accuracy', 'free_throw', 'ball_handle'],
  },
  '2 Way Diming Sharpshooter': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['three_point', 'pass_vision', 'perimeter_defense', 'shot_iq'],
    secondaryAttributes: ['pass_iq', 'steal', 'free_throw'],
  },
  'Ball Hawk': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['steal', 'pass_perception', 'perimeter_defense', 'agility'],
    secondaryAttributes: ['hustle', 'lateral_quickness', 'help_defense_iq'],
  },
  Rebounder: {
    positions: ['PF', 'C'],
    primaryAttributes: ['dreb', 'oreb', 'strength', 'hustle'],
    secondaryAttributes: ['vertical', 'interior_defense', 'block'],
  },
  'Rugged Playmaker': {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'strength', 'pass_vision', 'layup'],
    secondaryAttributes: ['draw_foul', 'pass_iq', 'hustle'],
  },
  'Finesse Finisher': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['layup', 'close_shot', 'agility', 'draw_foul'],
    secondaryAttributes: ['speed', 'ball_handle', 'hands'],
  },
  'Athletic Finisher': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['driving_dunk', 'vertical', 'layup', 'speed'],
    secondaryAttributes: ['agility', 'draw_foul', 'strength'],
  },
  'Low-Post Luminary': {
    positions: ['PF', 'C'],
    primaryAttributes: ['post_control', 'post_hook', 'post_fade', 'strength'],
    secondaryAttributes: ['layup', 'draw_foul', 'close_shot'],
  },
  'Back to Basket Big': {
    positions: ['PF', 'C'],
    primaryAttributes: ['post_control', 'strength', 'layup', 'draw_foul'],
    secondaryAttributes: ['post_hook', 'interior_defense', 'dreb'],
  },
  'Face Up Four': {
    positions: ['PF'],
    primaryAttributes: ['mid_range', 'three_point', 'shot_iq', 'ball_handle'],
    secondaryAttributes: ['layup', 'perimeter_defense', 'pass_vision'],
  },
  'Dynamic Point': {
    positions: ['PG'],
    primaryAttributes: ['ball_handle', 'speed', 'layup', 'pass_vision'],
    secondaryAttributes: ['three_point', 'agility', 'pass_iq'],
  },
  'Highlight Reel': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['driving_dunk', 'vertical', 'layup', 'agility'],
    secondaryAttributes: ['speed', 'hustle', 'intangibles'],
  },
  'Sky Fortress': {
    positions: ['PF', 'C'],
    primaryAttributes: ['block', 'vertical', 'interior_defense', 'dreb'],
    secondaryAttributes: ['strength', 'help_defense_iq', 'standing_dunk'],
  },
  Magician: {
    positions: ['PG', 'SG'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'pass_iq', 'shot_iq'],
    secondaryAttributes: ['speed_with_ball', 'layup', 'intangibles'],
  },
  'Dunk Magician': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['driving_dunk', 'vertical', 'ball_handle', 'agility'],
    secondaryAttributes: ['layup', 'speed', 'intangibles'],
  },
  'Pesky Defender': {
    positions: ['PG', 'SG', 'SF'],
    primaryAttributes: ['steal', 'perimeter_defense', 'hustle', 'agility'],
    secondaryAttributes: ['pass_perception', 'lateral_quickness', 'dcnst'],
  },
  'Secondary Ball Handler': {
    positions: ['SG', 'SF'],
    primaryAttributes: ['ball_handle', 'pass_vision', 'speed_with_ball', 'layup'],
    secondaryAttributes: ['pass_iq', 'three_point', 'mid_range'],
  },
  'Airborne Ace': {
    positions: ['SG', 'SF', 'PF'],
    primaryAttributes: ['vertical', 'driving_dunk', 'layup', 'agility'],
    secondaryAttributes: ['speed', 'oreb', 'hustle'],
  },
  Steamroller: {
    positions: ['PF', 'C'],
    primaryAttributes: ['strength', 'driving_dunk', 'post_control', 'draw_foul'],
    secondaryAttributes: ['layup', 'interior_defense', 'standing_dunk'],
  },
  Prospect: {
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    primaryAttributes: ['intangibles', 'hustle', 'agility', 'speed'],
    secondaryAttributes: ['stamina', 'durability', 'vertical'],
  },
}

const header = `/** Auto-generated list of archetype scoring profiles (Phase 3). */\nexport const ARCHETYPE_PROFILES = `
const body = JSON.stringify(raw, null, 2)
const file = header + body + '\n'
fs.writeFileSync(path.join(root, 'src/lib/archetypeProfilesData.js'), file)
