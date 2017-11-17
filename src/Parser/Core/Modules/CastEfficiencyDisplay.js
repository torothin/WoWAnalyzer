import React from 'react';

import SpellLink from 'common/SpellLink';
import { formatPercentage } from 'common/format';

import Analyzer from 'Parser/Core/Analyzer';
import SpellHistory from 'Parser/Core/Modules/SpellHistory';

import Tab from 'Main/Tab';
import CastEfficiencyComponent from 'Main/CastEfficiency';
import SpellTimeline from 'Main/Timeline/SpellTimeline';

import Abilities from './Abilities';
import AbilityTracker from './AbilityTracker';
import Combatants from './Combatants';
import Haste from './Haste';

const DEFAULT_MINOR_SUGGEST = 0.80;
const DEFAULT_AVERAGE_SUGGEST = 0.75;
const DEFAULT_MAJOR_SUGGEST = 0.65;

// This needs to be in own class to avoid circular dependency
// TODO rename CastEfficiency to CastInfo, and rename this to CastEfficiency
class CastEfficiencyDisplay extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
    combatants: Combatants,
    haste: Haste,
    spellHistory: SpellHistory,
    abilities: Abilities,
  };

  /*
   * Gets the number of ms the given spell has been on CD since the beginning of the fight.
   * Only works on spells entered into CastEfficiency list.
   */
  _getTimeOnCooldown(spellId) {
    const history = this.spellHistory.historyBySpellId[spellId];
    if(!history) {
      return;
    }

    let lastBeginTimestamp = null;
    const nonEndTimeOnCd = history
        .filter(event => event.type === 'updatespellusable')
        .reduce((acc, event) => {
          if(event.trigger === 'begincooldown') {
            lastBeginTimestamp = event.timestamp;
            return acc;
          } else if(event.trigger === 'endcooldown') {
            const timeOnCd = (event.timestamp - lastBeginTimestamp) || 0;
            lastBeginTimestamp = null;
            return acc + timeOnCd;
          } else {
            return acc;
          }
        }, 0);
    const endTimeOnCd = (!lastBeginTimestamp) ? 0 : this.owner.currentTimestamp - lastBeginTimestamp;
    return nonEndTimeOnCd + endTimeOnCd;
  }

  /*
   * Gets the average number of ms the given spell took to cooldown (or generate a charge)
   * Only works on spells entered into CastEfficiency list.
   */
  _getAverageCooldown(spellId) {
    const history = this.spellHistory.historyBySpellId[spellId];
    if(!history) {
      return;
    }

    let lastStartChargeTimestamp = null;
    let recharges = 0;
    const totalRechargingTime = history
        .filter(event => event.type === 'updatespellusable')
        .reduce((acc, event) => {
          if(event.trigger === 'begincooldown') {
            lastStartChargeTimestamp = event.timestamp;
            return acc;
          } else if(event.trigger === 'endcooldown') {
            const rechargingTime = (event.timestamp - lastStartChargeTimestamp) || 0;
            recharges += 1;
            lastStartChargeTimestamp = null;
            return acc + rechargingTime;
          } else if(event.trigger === 'restorecharge') { // TODO will this cause problems when there is external charge restoration?
            const rechargingTime = (event.timestamp - lastStartChargeTimestamp) || 0;
            recharges += 1;
            lastStartChargeTimestamp = event.timestamp;
            return acc + rechargingTime;
          } else {
            return acc;
          }
        }, 0);
    if(recharges === 0) {
      return null;
    } else {
      return totalRechargingTime / recharges;
    }
  }

  /*
   * Packs cast efficiency results for use by suggestions / tab
   */
  _generateCastEfficiencyInfo() {
    const castInfo = this.abilities.constructor.CPM_ABILITIES;

    const fightDurationMs = this.owner.fightDuration;
    const fightDurationMinutes = fightDurationMs / 1000 / 60;

    return castInfo
      .filter(ability => !ability.isActive || ability.isActive(this.combatants.selected))
      .map(ability => {
        const spellId = ability.spell.id;
        // TODO better way than 'cooldown === null' to detect that I shouldn't be making a suggestion
        // TODO not even sure what problems this use of getting CD from haste on pull will create...
        const cooldown = ability.getCooldown(this.combatants.hastePercentage, this.combatants.selected);
        const cooldownMs = (cooldown === null) ? null : cooldown * 1000;
        const trackedAbility = this.abilityTracker.getAbility(spellId);

        // ability.getCasts is used for special cases that show the wrong number of cast events, like Penance
        // and also for splitting up differently buffed versions of the same spell (this use has nothing to do with CastEfficiency)
        // This new CastEfficiency calculation isn't hurt by the first issue and doesn't care about the second,
        // if a cast has a getCast function it will be used to fill in the actual casts in the suggestion,
        // but it will NOT be used in the CastEfficiency calculation
        const casts = (ability.getCasts ? ability.getCasts(trackedAbility, this.owner) : trackedAbility.casts) || 0;
        if (ability.isUndetectable && casts === 0) {
          // Some spells (most notably Racials) can not be detected if a player has them. This hides those spells if they have 0 casts.
          return null;
        }
        const cpm = casts / fightDurationMinutes;

        // ability.getMaxCasts is used for special cases for spells that have a variable CD based on state, buffs, etc, like Void Bolt.
        // This same behavior should be managable using SpellUsable's interface, so getMaxCasts is deprecated.
        // Still, legacy support is offered here: if getMaxCasts is defined, the old cast efficiency calculation will be used.
        let rawMaxCasts;
        const averageCooldown = this._getAverageCooldown(spellId);
        if (ability.getMaxCasts) {
          // getMaxCasts expects cooldown in seconds, not millis
          rawMaxCasts = ability.getMaxCasts(cooldown, this.owner.fightDuration, this.abilityTracker.getAbility, this.owner);
        } else if (averageCooldown) { // no average CD if spell hasn't been cast
          // FIXME using the average effective cooldown to calculate max casts is a bit of an extrapolation when CD can be randomly reduced...
          rawMaxCasts = (this.owner.fightDuration / averageCooldown) + (ability.charges || 1) - 1;
        } else {
          rawMaxCasts = (this.owner.fightDuration / cooldownMs) + (ability.charges || 1) - 1;
        }
        const maxCasts = Math.ceil(rawMaxCasts) || 0;
        const maxCpm = (cooldown === null) ? null : maxCasts / fightDurationMinutes;

        const castEfficiency = (cooldown === null) ? null : Math.min(1, casts / rawMaxCasts);
        // let castEfficiency;
        // if(ability.getMaxCasts) { // legacy support for custom getMaxCasts
        //   castEfficiency = Math.min(1, casts / rawMaxCasts);
        // } else { // cast efficiency from SpellUsable (which doesn't use casts or maxCasts in the calculation)
        //   // FIXME this isn't truly cast efficiency... it's possible to get the maximum possible casts but still occasionally have spell off CD..
        //   //      For example, consider a 2 minute CD during a 3 minute duration fight, where player casts spell at 0:10 and 2:30...
        //   //      Spell was off CD from 0:00 to 0:10 and also from 2:10 to 2:30, which would be ~18% off CD, yet it wasn't possible for player to cast more than 2 times.
        //   //      How do we handle / display this?
        //   const timeOnCd = this._getTimeOnCooldown(spellId);
        //   castEfficiency = (timeOnCd / this.owner.fightDuration) || 0;
        // }

        const recommendedCastEfficiency = ability.recommendedCastEfficiency || DEFAULT_MINOR_SUGGEST;
        const averageIssueCastEfficiency = ability.averageIssueCastEfficiency || DEFAULT_AVERAGE_SUGGEST;
        const majorIssueCastEfficiency = ability.majorIssueCastEfficiency || DEFAULT_MAJOR_SUGGEST;

        const canBeImproved = castEfficiency !== null && castEfficiency < recommendedCastEfficiency;

        // TODO can this structure be cut down? Need to understand cast effic tab better to know for sure...
        return {
          ability,
          cpm,
          maxCpm,
          casts,
          maxCasts,
          castEfficiency,
          recommendedCastEfficiency,
          averageIssueCastEfficiency,
          majorIssueCastEfficiency,
          canBeImproved,
        };
      })
      .filter(item => item !== null);
  }

  suggestions(when) {
    const castEfficiencyInfo = this._generateCastEfficiencyInfo();
    castEfficiencyInfo.forEach(abilityInfo => {
      if(abilityInfo.ability.noSuggestion || abilityInfo.castEfficiency === null) {
        return;
      }
      const ability = abilityInfo.ability;
      when(abilityInfo.castEfficiency).isLessThan(abilityInfo.recommendedCastEfficiency)
        .addSuggestion((suggest, actual, recommended) => {
          return suggest(<span>Try to cast <SpellLink id={ability.spell.id} /> more often. {ability.extraSuggestion || ''} <a href="#spell-timeline">View timeline</a>.</span>)
            .icon(ability.spell.icon)
            .actual(`${abilityInfo.casts} out of ${abilityInfo.maxCasts} possible casts; ${formatPercentage(actual)}% cast efficiency`)
            .recommended(`>${formatPercentage(recommended)}% is recommended`)
            .details(() => (
              <div style={{ margin: '0 -22px' }}>
                <SpellTimeline
                  historyBySpellId={this.spellHistory.historyBySpellId}
                  castEfficiency={this.castEfficiency}
                  spellId={ability.spell.id}
                  start={this.owner.fight.start_time}
                  end={this.owner.currentTimestamp}
                />
              </div>
            ))
            .regular(abilityInfo.averageIssueCastEfficiency).major(abilityInfo.majorIssueCastEfficiency).staticImportance(ability.importance);
        });
    });
  }

  tab() {
    return {
      title: 'Cast efficiency',
      url: 'cast-efficiency',
      render: () => (
        <Tab title="Cast efficiency">
          <CastEfficiencyComponent
            categories={this.abilities.constructor.SPELL_CATEGORIES}
            abilities={this._generateCastEfficiencyInfo()}
          />
        </Tab>
      ),
    };
  }
}

export default CastEfficiencyDisplay;
