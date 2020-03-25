import React from 'react';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import Abilities from 'parser/core/modules/Abilities';
import calculateMaxCasts from 'parser/core/calculateMaxCasts';
import Events from 'parser/core/Events';
import ExecuteRange from './ExecuteRange';

class ExecuteOptimize extends Analyzer {
  static dependencies = {
    abilities: Abilities,
    executeRange: ExecuteRange,
  };

  mortalStrikesCasts = 0;
  slamsCasts = 0;
  whirlwindCasts = 0;
  events = [];

  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND), this._onCast);
  }

  _onCast(event) {
    //this.events.push(event);
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.MORTAL_STRIKE.id) {
      this.events.push(event);
      this.mortalStrikesCasts++;
      return;
    } 
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.SLAM.id) {
      this.events.push(event);
      this.slamsCasts++;
      return;
    }
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.WHIRLWIND.id) {
      this.events.push(event);
      this.whirlwindCasts++;
      return;
    }
      // event.meta = event.meta || {};
      // event.meta.isInefficientCast = true;
      // event.meta.inefficientCastReason = 'This Mortal Strike was used on a target in Execute range.';
  }

  // get goodMortalStrikeThresholds() {
  //   const cd = this.abilities.getAbility(SPELLS.MORTAL_STRIKE.id).cooldown;
  //   const max = calculateMaxCasts(cd, this.owner.fightDuration - this.executeRange.executionPhaseDuration());
  //   const maxCast = this.mortalStrikesOutsideExecuteRange / max > 1 ? this.mortalStrikesOutsideExecuteRange : max;

  //   return {
  //     actual: this.mortalStrikesOutsideExecuteRange / maxCast,
  //     isLessThan: {
  //       minor: 0.9,
  //       average: 0.8,
  //       major: 0.7,
  //     },
  //     style: 'percentage',
  //   };
  // }

  // get badMortalStrikeThresholds() {
  //   const cd = this.abilities.getAbility(SPELLS.MORTAL_STRIKE.id).cooldown;
  //   const max = calculateMaxCasts(cd, this.executeRange.executionPhaseDuration());
  //   const maxCast = this.mortalStrikesInExecuteRange / max > 1 ? this.mortalStrikesInExecuteRange : max;

  //   return {
  //     actual: this.mortalStrikesInExecuteRange / maxCast,
  //     isGreaterThan: {
  //       minor: 0,
  //       average: 0.05,
  //       major: 0.1,
  //     },
  //     style: 'percentage',
  //   };
  // }

//   suggestions(when) {
//     when(this.badMortalStrikeThresholds).addSuggestion((suggest, actual, recommended) => {
//       return suggest(<>Try to avoid using <SpellLink id={SPELLS.MORTAL_STRIKE.id} icon /> on a target in <SpellLink id={SPELLS.EXECUTE.id} icon /> range, as <SpellLink id={SPELLS.MORTAL_STRIKE.id} /> is less rage efficient than <SpellLink id={SPELLS.EXECUTE.id} />.</>)
//         .icon(SPELLS.MORTAL_STRIKE.icon)
//         .actual(`Mortal Strike was cast ${this.mortalStrikesInExecuteRange} times accounting for ${formatPercentage(actual)}% of the total possible casts of Mortal Strike during a time a target was in execute range.`)
//         .recommended(`${formatPercentage(recommended)}% is recommended`);
//     });
//     when(this.goodMortalStrikeThresholds).addSuggestion((suggest, actual, recommended) => {
//       return suggest(<>Try to cast <SpellLink id={SPELLS.MORTAL_STRIKE.id} icon /> more often when the target is outside execute range.</>)
//         .icon(SPELLS.MORTAL_STRIKE.icon)
//         .actual(`Mortal Strike was used ${formatPercentage(actual)}% of the time on a target outside execute range.`)
//         .recommended(`${formatPercentage(recommended)}% is recommended`);
//     });
//   }

  statistic() {
    console.log(this.events, this.slamsCasts, this.mortalStrikesCasts, this.whirlwindCasts);
    return;
  }

}


export default ExecuteOptimize;
