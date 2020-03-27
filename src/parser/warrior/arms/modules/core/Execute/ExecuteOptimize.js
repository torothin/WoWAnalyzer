import React from 'react';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';
import StatisticsListBox from 'interface/others/StatisticsListBox';
import StatisticListBoxItem from 'interface/others/StatisticListBoxItem';
import Abilities from 'parser/core/modules/Abilities';
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

  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND), this._onCast);
  }

  _onCast(event) {
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.MORTAL_STRIKE.id) {
      this.mortalStrikesCasts++;
      return;
    } 
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.SLAM.id) {
      this.slamsCasts++;
      return;
    }
    if(this.executeRange.isTargetInExecuteRange(event) && event.ability.guid === SPELLS.WHIRLWIND.id) {
      this.whirlwindCasts++;
      return;
    }
      // event.meta = event.meta || {};
      // event.meta.isInefficientCast = true;
      // event.meta.inefficientCastReason = 'This Mortal Strike was used on a target in Execute range.';
  }

  statistic() {
    return (
      <StatisticsListBox
        title={<><SpellIcon id={SPELLS.EXECUTE.id} /> Unused Executes </>}
        tooltip={<>
          <SpellLink id={SPELLS.EXECUTE.id} /> needs to be prioritized over<br />
          <SpellLink id={SPELLS.MORTAL_STRIKE.id} />, 
          <SpellLink id={SPELLS.SLAM.id} />, and <SpellLink id={SPELLS.WHIRLWIND.id} /> <br />
          during execution phase.
        </>}
      >
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.MORTAL_STRIKE.id} /> casts</>}
          value={`${this.mortalStrikesCasts} `}
        />
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.SLAM.id} /> casts</>}
          value={`${this.slamsCasts} `}
        />
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.WHIRLWIND.id} /> casts</>}
          value={`${this.whirlwindCasts} `}
        />
      </StatisticsListBox>
    );
  }
}


export default ExecuteOptimize;
