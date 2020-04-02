import React from 'react';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';
import { formatNumber } from 'common/format';
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
  whirlwindCastsDuringExecuteCrushingAssault = 0;
  mortalStrikesCastsTotal = 0;
  slamsCastsTotal = 0;
  whirlwindCastsTotal = 0;
  eventArray = [];
  mortalStrikeDamage = 0;
  whirlwindDamage = 0;
  slamDamage = 0;
  executeCasts = 0;
  executeDamage = 0;
  executeRage = 0;

  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onMortalStrikeCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onSlamCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND), this._onWhirlWindCast);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.MORTAL_STRIKE), this._onMortalStrikeDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SLAM), this._onSlamDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_1), this._onWhirlWindDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.WHIRLWIND_DAMAGE_2_3), this._onWhirlWindDamage);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.EXECUTE), this._onExecuteCast);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.EXECUTE_GLYPHED), this._onExecuteCast);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.EXECUTE_DAMAGE), this._onExecuteDamage);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SWEEPING_STRIKES_EXECUTE), this._onSweepingStrikesExecuteDamage);
    
  }
  
  _onExecuteCast(event) {
    //this.eventArray.push(event);
    //this.eventArray.push(event.classResources[0].cost/10*.8);
    this.executeRage += event.classResources[0].cost/10*.8;
    this.executeCasts++;
  }
  _onExecuteDamage(event) {
    this.eventArray.push(event);
    this.executeDamage += event.amount;
  }
  _onSweepingStrikesExecuteDamage(event) {
    //this.eventArray.push("SS execute damage");
    this.executeDamage += event.amount;
  }

  _onMortalStrikeDamage(event) {
    this.eventArray.push(event);
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
    // free slam casts due to crushing assault buff do not count against casts during execute
    // will need to remove the check for crushing assault when azerite traits go away
    if(!this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp)) {
      this.slamsCastsDuringExecute++;
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = 'This Slam was used on a target in Execute range.';
      return;
    }
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
    if(this.executeRange.isTargetInExecuteRange(event) && 
        this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp)) {
      this.whirlwindCastsDuringExecuteCrushingAssault++;
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = 'This Whirlwind was used on a target in Execute range.';
      return;
    }
    this.whirlwindCastsDuringExecute++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Whirlwind was used on a target in Execute range.';
    return;
  }

  // this function calculates how many executes would be gained if MS/WW/Slam were not casted 
  // during execute based on rage usage
  //
  // assumes: 
  // execute costs 16 rage
  // MS costs 30 rage
  // WW costs 30 rage
  // WW with Crushing Assault costs 10 rage
  // Slam costs 20 rage
  // does not factor in the amount of time for casting executes vs other rage burners

  _unusedExecutes() {
    const avgRagePerExecute = this.executeRage / this.executeCasts;
    const executes = 1/avgRagePerExecute * ( 30 * this.mortalStrikesCastsDuringExecute
                            + 30 * this.whirlwindCastsDuringExecute
                            + 10 * this.whirlwindCastsDuringExecuteCrushingAssault
                            + 20 * this.slamsCastsDuringExecute);
      
      console.log(executes);
      return executes;
  }

  // calculates damage per cast for MS, WW, Slam, Execute
  // return an object containing damage per casts
  _damagePerCast() {
    const damagePerCastObject = {
      mortalStrike: 0,
      slam: 0,
      whirlwind: 0,
      execute: 0,
    };

    if(this.mortalStrikesCastsTotal > 0) {
      damagePerCastObject.mortalStrike = this.mortalStrikeDamage/this.mortalStrikesCastsTotal;
    }
    if(this.slamsCastsTotal > 0) {
      damagePerCastObject.slam = this.slamDamage/this.slamsCastsTotal;
    }
    if(this.whirlwindCastsTotal > 0) {
      damagePerCastObject.whirlwind = this.whirlwindDamage/this.whirlwindCastsTotal;
    }
    if(this.executeCasts > 0) {
      //damagePerCastObject.execute = this.executeDamage/this.executeCasts;
      damagePerCastObject.execute = 30673.1647;
    }
    console.log(damagePerCastObject,this.executeDamage,this.executeCasts);
    return damagePerCastObject;
  }

  _calculateExecutePotentialDPS() {
    const damages = this._damagePerCast();
    const executes = this._unusedExecutes();

    const improperDamage = this.mortalStrikesCastsDuringExecute * damages.mortalStrike +
                           this.slamsCastsDuringExecute * damages.slam +
                           this.whirlwindCastsDuringExecute * damages.whirlwind +
                           this.whirlwindCastsDuringExecuteCrushingAssault * damages.whirlwind;
    const executeDamage = executes * damages.execute;

    const deltaDPS = (executeDamage - improperDamage)/this.owner.fightDuration*1000;
    console.log(deltaDPS);
    return deltaDPS;
  }

  statistic() {
    const dpsLost = formatNumber(this._calculateExecutePotentialDPS());
    console.log(this.eventArray);
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
          value={`${this.whirlwindCastsDuringExecute + this.whirlwindCastsDuringExecuteCrushingAssault} `}
        />
        {/* {
          dpsLost <= 0 ? null : */}
          <StatisticListBoxItem
            title={<>Estimated DPS Lost</>}
            value={`${dpsLost} `}
          />
        {/* } */}
      </StatisticsListBox>
    );
  }
}

export default ExecuteOptimize;
