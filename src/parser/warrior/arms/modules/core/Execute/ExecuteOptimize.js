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
import DamageDone from 'parser/shared/modules/throughput/DamageDone';
import HIT_TYPES from 'game/HIT_TYPES';

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
    damageDone: DamageDone,
  };

  hasFevorOfBattle = this.selectedCombatant.hasTalent(SPELLS.FERVOR_OF_BATTLE_TALENT);
  hasCrushingAssault = this.selectedCombatant.hasTrait(SPELLS.CRUSHING_ASSAULT_TRAIT.id);
  
  eventArray = [];

  castsDuringExecute = {
    mortalStrike: 0,
    mortalStrikeHits: 0,
    slam: 0,
    slamHits: 0,
    whirlwind: 0,
    whirlwindHits: 0,
    whirlwindCrushingAssault: 0,
    whirlwindCrushingAssaultHits: 0,
  }

  castTotals = {
    mortalStrike: 0,
    slam: 0,
    whirlwind: 0,
    execute: 0,
  }

  damage = {
    mortalStrike: 0,
    slam: 0,
    whirlwind: 0,
    execute: 0,
  }

  damageEvents = {
    mortalStrike: 0,
    slam: 0,
    whirlwind: 0,
    execute: 0,
  }
  
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
    this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.EXECUTE_GLYPHED), this._onExecuteDamage);
    //this.addEventListener(Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SWEEPING_STRIKES_EXECUTE), this._onSweepingStrikesExecuteDamage);
    
  }

  _addEvent(event) {
    this.eventArray.push(event);
  }
  
  _onExecuteCast(event) {
    this.executeRage += event.classResources[0].cost/10*.8;
    this.castTotals.execute++;
  }

  _onExecuteDamage(event) {
    //this.eventArray.push(event);
      
    if(event.hitType === HIT_TYPES.NORMAL || event.hitType === HIT_TYPES.CRIT) {
      this.damage.execute += event.amount;
      this.damageEvents.execute++;
      return;
    }
    if(event.hitType === HIT_TYPES.ABSORB) {
      this.damage.execute += event.absorbed;
      this.damageEvents.execute++;
      return;
    }
  }
  _onSweepingStrikesExecuteDamage(event) {
    this._onExecuteDamage(event);
  }

  _onMortalStrikeDamage(event) {
    if(this.executeRange.isTargetInExecuteRange(event)) {
      this.castsDuringExecute.mortalStrikeHits++;
      this._addEvent(event);
    }
    if(event.hitType === HIT_TYPES.NORMAL || event.hitType === HIT_TYPES.CRIT) {
      this.damage.mortalStrike += event.amount;
      this.damageEvents.mortalStrike++;
      return;
    }
    if(event.hitType === HIT_TYPES.ABSORB) {
      this.damage.mortalStrike += event.absorbed;
      this.damageEvents.mortalStrike++;
      return;
    }
    
  }

  _onSlamDamage(event) {
    if(this.executeRange.isTargetInExecuteRange(event)) {
      this.castsDuringExecute.slamHits++;
      this._addEvent(event);
    }
    if(event.hitType === HIT_TYPES.NORMAL || event.hitType === HIT_TYPES.CRIT) {
      this.damage.slam += event.amount;
      this.damageEvents.slam++;
      return;
    }
    if(event.hitType === HIT_TYPES.ABSORB) {
      this.damage.slam += event.absorbed;
      this.damageEvents.slam++;
      return;
    }
  }

  _onWhirlWindDamage(event) {
    if(this.executeRange.isTargetInExecuteRange(event)) {
      this.castsDuringExecute.whirlwindHits++;
      this._addEvent(event);
    }
    if(event.hitType === HIT_TYPES.NORMAL || event.hitType === HIT_TYPES.CRIT) {
      this.damage.whirlwind += event.amount;
      this.damageEvents.whirlwind++;
      return;
    }
    if(event.hitType === HIT_TYPES.ABSORB) {
      this.damage.whirlwind += event.absorbed;
      this.damageEvents.whirlwind++;
      return;
    }
  }

  _onMortalStrikeCast(event) {
    if(!this.executeRange.isTargetInExecuteRange(event)) {
      return;
    }
    this.castsDuringExecute.mortalStrike++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Mortal Strike was used on a target in Execute range.';
    this._addEvent(event);
    return;
  }

  _onSlamCast(event) {
    // this.castTotals.slam++;
    const hasCrushingAssaultBuff = this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp);

    if(!this.executeRange.isTargetInExecuteRange(event)) { // || this.hasFevorOfBattle
      return;
    } 
    // free slam casts due to crushing assault buff does not count against casts during execute
    // will need to remove the check for crushing assault when azerite traits go away
    if(hasCrushingAssaultBuff) {
      this._addEvent(event);
    }

    // full rage cost slam
    if(!hasCrushingAssaultBuff) {
      this.castsDuringExecute.slam++;
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = 'This Slam was used on a target in Execute range.';
      this._addEvent(event);
      return;
    }
  }

  _onWhirlWindCast(event) {
    const hasCrushingAssaultBuff = this.selectedCombatant.hasBuff(SPELLS.CRUSHING_ASSAULT_BUFF.id, event.timestamp);

    if(!this.executeRange.isTargetInExecuteRange(event)) {
      return;
    }

    // reduced rage cost WW during execute
    if(this.executeRange.isTargetInExecuteRange(event) && hasCrushingAssaultBuff) {
      this.castsDuringExecute.whirlwindCrushingAssault++;
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = 'This Whirlwind(Crushing Assault) was used on a target in Execute range.';
      this._addEvent(event);
      return;
    }

    // full rage cost WW during execute
    this.castsDuringExecute.whirlwind++;
    event.meta = event.meta || {};
    event.meta.isInefficientCast = true;
    event.meta.inefficientCastReason = 'This Whirlwind was used on a target in Execute range.';
    this._addEvent(event);
  }

  // this function calculates how many executes would be gained if MS/WW/Slam were not casted 
  // during execute based on rage usage.  Casts are used because casts use rage regardless of doing
  // damage or not and is still wasted
  //
  // assumes: 
  // execute costs X amount rage based on an average usage over the fight
  // MS costs 30 rage
  // WW costs 30 rage
  // WW with Crushing Assault costs 10 rage
  // Slam costs 20 rage
  // does not factor in the amount of time for casting executes vs other rage burners

  _unusedExecutes() {
    const avgRagePerExecute = this.executeRage / this.castTotals.execute;
    const { mortalStrike,whirlwind,whirlwindCrushingAssault,slam } = this.castsDuringExecute;
    const executes = 1/avgRagePerExecute * ( 30 * mortalStrike
                            + 30 * whirlwind
                            + 10 * whirlwindCrushingAssault
                            + 20 * slam);
      
      //console.log("_unusedExecutes",this.castsDuringExecute,executes,avgRagePerExecute);
      return executes;
  }

  // calculates averaged damage per cast for MS, WW, Slam, Execute
  // return an object containing damage per casts
  _damagePerCast() {
    const damagePerCastObject = {
      mortalStrike: 0,
      slam: 0,
      whirlwind: 0,
      execute: 0,
    };

    if(this.castTotals.mortalStrike > 0) {
      damagePerCastObject.mortalStrike = this.damage.mortalStrike/this.damageEvents.mortalStrike;
    }
    if(this.castTotals.slam > 0) {
      damagePerCastObject.slam = this.damage.slam/this.damageEvents.slam;
    }
    if(this.castTotals.whirlwind > 0) {
      damagePerCastObject.whirlwind = this.damage.whirlwind/this.damageEvents.whirlwind;
    }
    if(this.castTotals.execute > 0) {
      damagePerCastObject.execute = this.damage.execute/this.damageEvents.execute;
    }
    // console.log(damagePerCastObject,this.damage.execute,this.castTotals.execute);
    return damagePerCastObject;
  }

  // calculates a delta between the damage gained during execute from spells that did damage
  // (MS/Slam/WW) and damage gained by using execute in place of MS/Slam/WW
  // uses a number of "Hits" because damage is only gained on hits not on casts
  // assumes all executes would have hit
  _calculateExecutePotentialDamageLost() {
    const damages = this._damagePerCast();
    const executes = this._unusedExecutes();

    const { mortalStrikeHits,whirlwindHits,whirlwindCrushingAssaultHits,slamHits } = this.castsDuringExecute;

    // all the damage lost due to using MS/Slam/WW
    const improperDamage = mortalStrikeHits * damages.mortalStrike +
                           slamHits * damages.slam +
                           whirlwindHits * damages.whirlwind +
                           whirlwindCrushingAssaultHits * damages.whirlwind;

    // estimated damage done by unused executes
    const executeDamage = executes * damages.execute;

    const deltaDamage = executeDamage - improperDamage;
    // console.log(deltaDamage);
    return deltaDamage;
  }

  statistic() {
    const damageLost = formatNumber(this._calculateExecutePotentialDamageLost());
    
    console.log(this.eventArray, this.castTotals, this.castsDuringExecute, this.damage, this.damageEvents);
    return (
      <StatisticsListBox
        title={<><SpellIcon id={SPELLS.EXECUTE.id} /> Execute Phase </>}
        tooltip={<>
          <SpellLink id={SPELLS.EXECUTE.id} /> needs to be prioritized over<br />
          <SpellLink id={SPELLS.MORTAL_STRIKE.id} />, 
          <SpellLink id={SPELLS.SLAM.id} />, and <SpellLink id={SPELLS.WHIRLWIND.id} /> <br />
          during execution phase.
        </>}
      >
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.EXECUTE.id} /> hits</>}
          value={`${this.damageEvents.execute} `}
        />
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.MORTAL_STRIKE.id} /> casts</>}
          value={`${this.castsDuringExecute.mortalStrike} `}
        />
        {
          ( !this.hasFevorOfBattle || this.hasCrushingAssault )
          && 
          <StatisticListBoxItem
            title={<><SpellLink id={SPELLS.SLAM.id} /> casts</>}
            value={`${this.castsDuringExecute.slam} `}
          />
        }
        <StatisticListBoxItem
          title={<><SpellLink id={SPELLS.WHIRLWIND.id} /> casts</>}
          value={`${this.castsDuringExecute.whirlwind + this.castsDuringExecute.whirlwindCrushingAssault} `}
        />
        {
          damageLost <= 0 ? null :
          <StatisticListBoxItem
            title={<>Estimated Damage Lost</>}
            value={`${damageLost} `}
          />
        }
      </StatisticsListBox>
    );
  }
}

export default ExecuteOptimize;
