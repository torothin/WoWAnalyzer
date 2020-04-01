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

/**
 * 
 * 0 missed executes w/o FoB: 
 *    https://www.warcraftlogs.com/reports/wzYPfTRkCjDa1VMG/#fight=83&source=1130
 * 0 missed executes w/ FoB: 
 *    https://www.warcraftlogs.com/reports/QAfR39Ngj2MrvXp1#fight=1&type=damage-done&source=26
 * 4 missed execute (2 MS/2 Slams) w/o FoB:
 *    https://www.warcraftlogs.com/reports/xzP61McwZ8tpXdbA#fight=15&type=damage-done&source=306
 * 1 missed execute (MS cast) w/ FoB: 
 *    https://www.warcraftlogs.com/reports/wnJ79gfmvy6kB8Zd/#fight=4&source=20
 * 6 missed execute (MS cast) w/ FoB:
 *    https://www.warcraftlogs.com/reports/hqtM6ZxTzV813DdG#fight=1&type=damage-done&source=21
 * 
 */

class ExecuteOptimize extends Analyzer {
  static dependencies = {
    abilities: Abilities,
    executeRange: ExecuteRange,
  };

  hasFevorOfBattle = this.selectedCombatant.hasTalent(SPELLS.FERVOR_OF_BATTLE_TALENT);
  mortalStrikesCastsDuringExecute = 0;
  slamsCastsDuringExecute = 0;
  whirlwindCastsDuringExecute = 0;
  mortalStrikesCastsTotal = 0;
  slamsCastsTotal = 0;
  whirlwindCastsTotal = 0;
  eventArray = [];
  mortalStrikeDamage = 0;
  whirlwindDamage = 0;
  slamDamage = 0;

  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onMortalStrikeCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onSlamCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND), this._onWhirlWindCast);
    //this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_1), this._onWhirlWindCast);
    //this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_2_3), this._onWhirlWindCast);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onMortalStrikeDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onSlamDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_1), this._onWhirlWindDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_2_3), this._onWhirlWindDamage);
    //this.addEventListener(Events.applybuff.by(SELECTED_PLAYER),this._addEvent);
    //this.addEventListener(Events.removebuff.by(SELECTED_PLAYER),this._addEvent);
    //this.addEventListener(Events.energize.by(SELECTED_PLAYER),this._addEnergize);
  }

  _addEvent(event) {
    if(event.ability.guid === 278826 || event.ability.guid === 278751) this.eventArray.push(event);
  }
  _addEnergize(event) {
    this.eventArray.push(event);
  }

  _onMortalStrikeDamage(event) {
    //this.eventArray.push(event);
    this.mortalStrikeDamage += event.amount;
  }

  _onSlamDamage(event) {
    //this.eventArray.push(event);
    this.slamDamage += event.amount;
  }

  _onWhirlWindDamage(event) {
    //this.eventArray.push(event);
    this.whirlwindDamage += event.amount;
  }

  _onMortalStrikeCast(event) {
    this.mortalStrikesCastsTotal++;
    //this.eventArray.push(event);
    if(!this.executeRange.isTargetInExecuteRange(event)) {
      return;
    }
    //this.eventArray.push(event);
    this.mortalStrikesCastsDuringExecute++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Mortal Strike was used on a target in Execute range.';
    return;
  }

  _onSlamCast(event) {
    this.slamsCastsTotal++;
    if(this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp)) {
      this.eventArray.push(event);
    }
    if(!this.executeRange.isTargetInExecuteRange(event) || this.hasFevorOfBattle) {
      return;
    } 
    this.slamsCastsDuringExecute++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Slam was used on a target in Execute range.';
    return;
    
  }

  _onWhirlWindCast(event) {
    this.whirlwindCastsTotal++;
    //this.eventArray.push(event);
    if(this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp)) {
      this.eventArray.push(event);
    }
    if(!this.executeRange.isTargetInExecuteRange(event)) {
      return;
    }
    this.whirlwindCastsDuringExecute++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Whirlwind was used on a target in Execute range.';
    return;
  }

  // assumes: 
  // execute costs 16 rage
  // MS costs 30 rage
  // WW costs 30 rage
  // Slam costs 30 rage

  _unusedExecutes() {
    //const executes = 1/16 * ()
  }

  statistic() {
    const mortalStrikeDamagePerCast = this.mortalStrikeDamage/this.mortalStrikesCastsTotal;
    const slamDamagePerCast = this.slamDamage/this.slamsCastsTotal;
    const whirlwindDamagePerCast = this.whirlwindDamage/this.whirlwindCastsTotal;
    
    console.log(mortalStrikeDamagePerCast,slamDamagePerCast,whirlwindDamagePerCast,this.eventArray);
    
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
          value={`${this.mortalStrikesCastsDuringExecute} `}
        />
        {
          !this.hasFevorOfBattle
          && 
          <StatisticListBoxItem
            title={<><SpellLink id={SPELLS.SLAM.id} /> casts</>}
            value={`${this.slamsCastsDuringExecute} `}
          />
        }
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.WHIRLWIND.id} /> casts</>}
          value={`${this.whirlwindCastsDuringExecute} `}
        />
        <StatisticListBoxItem
          title={"Total:"}
          value={`${this.whirlwindCastsDuringExecute + this.slamsCastsDuringExecute + this.mortalStrikesCastsDuringExecute} `}
        />
      </StatisticsListBox>
    );
  }
}

export default ExecuteOptimize;
