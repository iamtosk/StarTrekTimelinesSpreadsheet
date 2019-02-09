#include "VoyageCalculator.h"
#include <cmath>
#include <algorithm>
#include <unordered_map>
#include <map>

#ifdef max
#undef max // cstdlib included in json.hpp
#endif

using json = nlohmann::json;

namespace VoyageTools
{
#ifndef __EMSCRIPTEN__
Log log(true /*enabled*/);
#else
Log log(false /*enabled*/);
#endif

constexpr unsigned int ANTIMATTER_FOR_SKILL_MATCH = 25;
constexpr size_t MIN_SCAN_DEPTH = 2;
constexpr size_t MAX_SCAN_DEPTH = 10; // sanity

// Various fields used in the duration estimation code
constexpr unsigned int ticksPerCycle = 28;
constexpr unsigned int secondsPerTick = 20;
constexpr unsigned int cycleSeconds = ticksPerCycle * secondsPerTick;
constexpr float cyclesPerHour = 60 * 60 / (float)cycleSeconds;
constexpr unsigned int hazPerCycle = 6;
constexpr float activityPerCycle = 18;
constexpr float dilemmasPerHour = 0.5f;
constexpr float hazPerHour = hazPerCycle * cyclesPerHour - dilemmasPerHour;
constexpr unsigned int hazSkillPerHour = 1260;
constexpr unsigned int hazAmPass = 5;
constexpr unsigned int hazAmFail = 30;
constexpr float activityAmPerHour = activityPerCycle * cyclesPerHour;
constexpr unsigned int minPerHour = 60;
constexpr float psChance = 0.35f;
constexpr float ssChance = 0.25f;
constexpr float osChance = 0.1f;
constexpr unsigned int dilPerMin = 5;

unsigned int VoyageCalculator::computeScore(const Crew& crew, std::uint8_t skill, size_t traitSlot) const noexcept
{
	if (crew.skills[skill] == 0)
		return 0;

	unsigned int score = 0;
	for (size_t iSkill = 0; iSkill < SKILL_COUNT; ++iSkill)
	{
		unsigned int skillScore = crew.skills[iSkill];
		if (iSkill == binaryConfig.primarySkill)
		{
			skillScore = lround(skillScore * binaryConfig.skillPrimaryMultiplier);
		}
		else if (iSkill == binaryConfig.secondarySkill)
		{
			skillScore = lround(skillScore * binaryConfig.skillSecondaryMultiplier);
		}
		else if (iSkill == skill)
		{
			skillScore = lround(skillScore * binaryConfig.skillMatchingMultiplier);
		}

		score += skillScore;
	};

	if (crew.traitIds.test(traitSlot))
	{
		score += binaryConfig.traitScoreBoost;
	}

	return score;
}

VoyageCalculator::VoyageCalculator(const char* jsonInput, bool rankMode) noexcept :
	rankMode(rankMode)
{
	nlohmann::json j = json::parse(jsonInput);

	bestconsidered.fill(nullptr);

	std::vector<uint8_t> temp = j["binaryConfig"];
	memcpy(&binaryConfig, temp.data(), temp.size());
	auto tempEstPos = j.find("estimateBinaryConfig");
	if (tempEstPos != j.end())
	{
		std::vector<uint8_t> tempEst = *tempEstPos;
		memcpy(&estimateBinaryConfig, tempEst.data(), tempEst.size());
	}
	else
	{
		estimateBinaryConfig.elapsedTimeHours = 0;
		estimateBinaryConfig.elapsedTimeMinutes = 0;
		estimateBinaryConfig.remainingAntiMatter = 0;
		std::fill(estimateBinaryConfig.slotCrewIds, estimateBinaryConfig.slotCrewIds + SLOT_COUNT, 0);
	}

	for (const auto &crew : j["crew"])
	{
		std::uint32_t traitBitMask = crew["traitBitMask"];
		std::bitset<BITMASK_SIZE> bitMask {traitBitMask};

		Crew c;
		c.id = crew["id"];
		c.name = crew["name"];
		c.ff100 = bitMask.test(FFFE_BIT);
		c.max_rarity = crew["max_rarity"];

		c.traitIds = bitMask;

		std::vector<std::uint16_t> skillData = crew["skillData"];

		for (size_t i = 0; i < SKILL_COUNT; i++)
		{
			c.skillMaxProfs[i] = skillData[i*3 + 2];
			c.skillMinProfs[i] = skillData[i*3 + 1];
			c.skills[i] = skillData[i*3] + (c.skillMaxProfs[i] + c.skillMinProfs[i]) / 2;
		}

		log << c.name << " " << c.skills[0] << " " << c.skills[1] << " " << c.skills[2] << " "
			<< c.skills[3] << " " << c.skills[4] << " " << c.skills[5] << " " << std::endl;

		roster.emplace_back(std::move(c));
	}

	for (std::uint8_t iSlot = 0; iSlot < SLOT_COUNT; iSlot++)
	{
		// populate per slot rosters with copies of the crew
		auto &slotRoster = slotRosters[iSlot];
		slotRoster.resize(roster.size());
		for (size_t iCrew = 0; iCrew < roster.size(); ++iCrew)
		{
			// copy
			slotRoster[iCrew] = roster[iCrew];

			// compute score - not really used anymore except for checking whether
			//	crew can fit in slot (score > 0), and perhaps for troubleshooting
			slotRoster[iCrew].score =
				computeScore(slotRoster[iCrew], binaryConfig.slotSkills[iSlot], iSlot);

			// set references
			slotRoster[iCrew].original = &roster[iCrew];
			roster[iCrew].slotCrew[iSlot] = &slotRoster[iCrew];
			sortedSlotRosters[iSlot].push_back(&slotRoster[iCrew]);
		}

		// this presort is irrelevant now except perhaps for troubleshooting
		std::sort(sortedSlotRosters[iSlot].begin(), sortedSlotRosters[iSlot].end(),
			[&](const Crew *left, const Crew *right) {
			return (left->score > right->score);
		});
	}
}

CrewArray VoyageCalculator::GetAlternateCrew(unsigned int level) const noexcept
{
	CrewArray altCrew;

	for (size_t slot = 0; slot < SLOT_COUNT; ++slot) {
		altCrew[slot] = nullptr;
		unsigned int currentLevel = 0;
		for (const Crew *crew : sortedSlotRosters[slot]) {
			bool best = false;
			if (crew->max_rarity == 0) {
				break;
			}
			for (size_t bestslot = 0; bestslot < SLOT_COUNT; ++bestslot) {
				if (bestconsidered[slot]->id == crew->id) {
					best = true;
					break;
				}
			}
			if (!best && (currentLevel++ == level)) {
				altCrew[slot] = crew;
				break;
			}
		}
	}

	return altCrew;
}

void VoyageCalculator::calculate() noexcept
{
	float elapsedHours = estimateBinaryConfig.elapsedTimeHours + estimateBinaryConfig.elapsedTimeMinutes / 60.0f;
	if (elapsedHours > 0)
	{
		CrewArray assignments;
		assignments.fill(nullptr);

		for (size_t s=0; s < SLOT_COUNT; ++s)
		{
			auto cid = estimateBinaryConfig.slotCrewIds[s];
			log << "  slot " << s << " crewid: " << cid;
			for_each(roster.begin(), roster.end(), [&](Crew &c) {
				if (c.id == cid)
				{
					assignments[s] = &c;
					log << " - " << c.name;
				}
			});
			log << std::endl;
		}

		float vt = calculateDuration(assignments, true);
		bestconsidered = assignments;
		bestscore = vt - elapsedHours;
		log << "final result: " << vt << " - est time remaining:" << bestscore << std::endl;
		progressUpdate(bestconsidered, bestscore);

		return;
	}

	for (unsigned int iteration = 1;;++iteration) {
		log << "iteration " << iteration << std::endl;

		float prevBest = bestscore;

		resetRosters();
		updateSlotRosterScores();
		findBest();

		if (bestscore > prevBest) {
			continue;
		} else {
			float vt = calculateDuration(bestconsidered, true);
			log << "final result: " << vt << std::endl;
			log << "stopping after " << iteration << " iterations" << std::endl;
			break;
		}
	}
}

void VoyageCalculator::resetRosters() noexcept
{
	for (Crew &crew : roster) {
		std::fill(crew.considered.begin(), crew.considered.end(), false);
	}
}

void VoyageCalculator::updateSlotRosterScores() noexcept
{
	// This could be more efficient, but it's not a bottleneck
	Timer::Scope timer(scoreUpdateTime);
	for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot) {
		auto &slotRoster = slotRosters[iSlot];
		for (Crew &crew : slotRoster) {
			if (crew.score == 0)
				continue;
			if (std::find(bestconsidered.begin(), bestconsidered.end(), &crew) != bestconsidered.end()) {
				crew.score = std::numeric_limits<decltype(crew.score)>::max();
				continue;
			}
			const Crew *prevCrew = bestconsidered[iSlot];
			bestconsidered[iSlot] = &crew;
			// HACK: keep using an integer score for now. Express duration estimate in seconds
			crew.score = (unsigned int)(calculateDuration(bestconsidered)*60*60);
			bestconsidered[iSlot] = prevCrew;
		}
		std::sort(sortedSlotRosters[iSlot].begin(), sortedSlotRosters[iSlot].end(),
			[&](const Crew *left, const Crew *right) {
			return (left->score > right->score);
		});
	}
}

// Used for logging only
constexpr const char* SkillName(std::uint8_t skillId) noexcept
{
	switch(skillId) {
		case 0:
			return "Command";
		case 1:
			return "Science";
		case 2:
			return "Security";
		case 3:
			return "Engineering";
		case 4:
			return "Diplomacy";
		case 5:
			return "Medicine";
		default:
			return "";
	}
}

void VoyageCalculator::findBest() noexcept
{
	// find the nth highest crew score
	std::vector<unsigned int> slotCrewScores;
	for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot) {
		for (const Crew *crew : sortedSlotRosters[iSlot])
		{
			slotCrewScores.emplace_back(crew->score);
		}
	}

	std::sort(slotCrewScores.begin(), slotCrewScores.end(), std::greater<unsigned int>());

	unsigned int minScore = slotCrewScores[std::min(slotCrewScores.size() - 1, static_cast<size_t>(binaryConfig.searchDepth * SLOT_COUNT))];
	size_t minDepth = MIN_SCAN_DEPTH;

	// find the deepest slot
	size_t deepSlot = 0;
	size_t maxDepth = 0;
	for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot)
	{
		log << SkillName(binaryConfig.slotSkills[iSlot]) << std::endl;
		size_t iCrew;
		for (iCrew = 0; iCrew < sortedSlotRosters[iSlot].size(); ++iCrew)
		{
			const auto &crew = *sortedSlotRosters[iSlot][iCrew];
			if (iCrew >= minDepth && crew.score < minScore)
			{
				break;
			}
			log << "  " << crew.score << " - " << crew.name  << std::endl;
		}
		log << std::endl;

		if (iCrew > maxDepth) {
			deepSlot = iSlot;
			maxDepth = iCrew;
		}
	}

	log << "minScore: " << minScore << std::endl;
	log << "primary: " << SkillName(binaryConfig.primarySkill) << std::endl;
	log << "secondary: " << SkillName(binaryConfig.secondarySkill) << std::endl;

	{ Timer::Scope timer(voyageCalcTime);
		for (size_t iMinDepth = minDepth; iMinDepth < MAX_SCAN_DEPTH; ++iMinDepth)
		{
			log << "depth " << iMinDepth << std::endl;

			if (maxDepth < iMinDepth)
				maxDepth = iMinDepth;
			// initialize depth vectors
			considered.resize(maxDepth);
			for (const Crew &crew : roster) {
				crew.considered.resize(maxDepth, false);
			}

			fillSlot(0, minScore, iMinDepth, deepSlot);
			threadPool.joinAll();
			if (bestscore > 0)
				break;
		}
	}
}

void VoyageCalculator::fillSlot(size_t iSlot, unsigned int minScore, size_t minDepth, size_t seedSlot, size_t thread) noexcept
{
	size_t slot;
	if (iSlot == 0) {
		slot = seedSlot;
	} else if (iSlot == seedSlot) {
		slot = 0;
	} else {
		slot = iSlot;
	}

	for (size_t iCrew = 0; iCrew < sortedSlotRosters[slot].size(); ++iCrew)
	{
		const auto &crew = *sortedSlotRosters[slot][iCrew];
		if (iCrew >= minDepth && minScore > crew.score)
		{
			break;
		}

		if (slot == seedSlot) {
			thread = iCrew;
		} else
		if (crew.original->considered[thread])
			continue;

		considered[thread][slot] = &crew;
		crew.original->considered[thread] = true;

		if (iSlot < SLOT_COUNT - 1)
		{
			auto fRecurse = [=]{fillSlot(iSlot + 1, minScore, minDepth, seedSlot, thread);};
			if (slot == seedSlot) {
				threadPool.add(fRecurse);
			} else {
				fRecurse();
			}
		}
		else
		{
			auto crewToConsider = considered[thread];
			// we have a complete crew complement, compute score
			float score = calculateDuration(crewToConsider);

			if (score > bestscore)
			{
				std::lock_guard<std::mutex> guard(calcMutex);
				if (score > bestscore) { // check again within the lock to resolve race condition
					log << "new best found: " << score << std::endl;
					// sanity
					for (size_t i = 0; i < crewToConsider.size(); ++i) {
						for (size_t j = i+1; j < crewToConsider.size(); ++j) {
							if (crewToConsider[i]->original == crewToConsider[j]->original) {
								log << "ERROR - DUPE CREW IN RESULT" << std::endl;
							}
						}
					}
					bestconsidered = crewToConsider;
					bestscore = score;
					progressUpdate(bestconsidered, bestscore);
					calculateDuration(crewToConsider, true); // debug
				}
			}
		}

		if (slot != seedSlot)
			crew.original->considered[thread] = false;
	}
}

void VoyageCalculator::refine() noexcept
{
	log << "refining" << std::endl;

	// reset considered state
	for (const Crew &crew : roster) {
		std::fill(crew.considered.begin(), crew.considered.end(), false);
	}

	auto considered = bestconsidered;
	for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot) {
		considered[iSlot]->original->considered[0] = true;
	}

	// refinement loops
	for (;;) {
		bool refinementFound = false;

		auto fUpdateBest = [&,this]{
			refinementFound = true;
			float score = calculateDuration(considered);
			log << "new best found: " << score << std::endl;
			// sanity
			for (size_t i = 0; i < considered.size(); ++i) {
				for (size_t j = i+1; j < considered.size(); ++j) {
					if (considered[i]->original == considered[j]->original) {
						log << "ERROR - DUPE CREW IN RESULT" << std::endl;
					}
				}
			}
			bestconsidered = considered;
			bestscore = score;
			progressUpdate(bestconsidered, bestscore);
			calculateDuration(bestconsidered, true); // log details
		};

		for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot) {
			// slotted vs unslotted
			for (const Crew *crew : sortedSlotRosters[iSlot]) {
				if (crew->original->considered[0])
					continue;
				/*if (crew.score < considered[iSlot]->score/2)
					break;*/

				// try swapping
				const Crew *prevCrew = considered[iSlot];
				considered[iSlot] = crew;
				float score = calculateDuration(considered, false);

				if (score <= bestscore) {
					considered[iSlot] = prevCrew;
					continue;
				}

				// found a better result!
				fUpdateBest();

				prevCrew->original->considered[0] = false;
				crew->original->considered[0] = true;
			}

			// slotted vs slotted
			for (size_t jSlot = 0; jSlot < SLOT_COUNT; ++jSlot) {
				if (jSlot == iSlot)
					continue;

				// slot differences are only due to trait bonuses, so if the crew
				//	score improves, then the duration is guaranteed to improve
				if (considered[iSlot]->score + considered[jSlot]->score
					< considered[iSlot]->original->slotCrew[jSlot]->score
						+ considered[jSlot]->original->slotCrew[iSlot]->score)
				{
					const Crew *prevI = considered[iSlot];
					considered[iSlot] = considered[jSlot]->original->slotCrew[iSlot];
					considered[jSlot] = prevI->original->slotCrew[jSlot];

					fUpdateBest();
				}
			}
		}
		if (!refinementFound)
			break;
	}
}

float VoyageCalculator::calculateDuration(const std::array<const Crew *, SLOT_COUNT> &complement, bool debug) noexcept
{
	unsigned int shipAM = binaryConfig.shipAntiMatter;
	Crew totals;
	totals.skills.fill(0);

	std::array<unsigned int, SKILL_COUNT> totalProfRange;
	for (size_t iSkill = 0; iSkill < SKILL_COUNT; ++iSkill)
	{
		totalProfRange[iSkill] = 0;
	}
	unsigned int totalSkill = 0;

	for (size_t iSlot = 0; iSlot < SLOT_COUNT; ++iSlot)
	{
		if (!complement[iSlot])
			continue;

		const auto &crew = complement[iSlot];

		// NOTE: this is not how the game client displays totals
		//	the game client seems to add all profs first, then divide by 2,
		//	which is slightly more precise.
		for (size_t iSkill = 0; iSkill < SKILL_COUNT; ++iSkill)
		{
			totals.skills[iSkill] += crew->skills[iSkill];
			// apparently it's possible for min to be higher than max:
			// https://forum.disruptorbeam.com/stt/discussion/4078/guinan-is-so-awesome-her-min-prof-roll-is-higher-than-her-max-prof-roll
			totalProfRange[iSkill] +=
				std::max(crew->skillMaxProfs[iSkill], crew->skillMinProfs[iSkill]) -
				crew->skillMinProfs[iSkill];
		}

		if (crew->traitIds.test(iSlot))
		{
			shipAM += ANTIMATTER_FOR_SKILL_MATCH;
		}
	}

	for (size_t iSkill = 0; iSkill < SKILL_COUNT; ++iSkill)
	{
		totalSkill += totals.skills[iSkill];
	}

	if (debug)
	{
		log << shipAM << " "
			<< totals.skills[0] << " " << totals.skills[1] << " " << totals.skills[2] << " "
			<< totals.skills[3] << " " << totals.skills[4] << " " << totals.skills[5] << std::endl;
	}

	//unsigned int PrimarySkill = totals.skills[binaryConfig.primarySkill];
	//unsigned int SecondarySkill = totals.skills[binaryConfig.secondarySkill];
	float MaxSkill = 0;

	std::array<float, SKILL_COUNT> hazSkillVariance;
	for (size_t iSkill = 0; iSkill < SKILL_COUNT; ++iSkill)
	{
		hazSkillVariance[iSkill] = ((float)totalProfRange[iSkill]) / 2 / totals.skills[iSkill];
		if (totals.skills[iSkill] == 0)
			hazSkillVariance[iSkill] = 0;
		if (totals.skills[iSkill] > MaxSkill)
			MaxSkill = totals.skills[iSkill];
	}

	// Code translated from Chewable C++'s JS implementation from https://codepen.io/somnivore/pen/Nabyzw
	// TODO: make this prettier

	if (debug)
	{
		log << "primary skill prof variance: " << hazSkillVariance[binaryConfig.primarySkill] << std::endl;
	}

	float elapsedHours = estimateBinaryConfig.elapsedTimeHours + estimateBinaryConfig.elapsedTimeMinutes / 60.0f;
	float elapsedHazSkill = elapsedHours * hazSkillPerHour;
	unsigned int elapsedShipAM = estimateBinaryConfig.remainingAntiMatter;
	if (elapsedShipAM <= 0)
		elapsedShipAM = shipAM;

	if (debug && elapsedHours > 0)
	{
		log << "  elapsed time: " << (int)estimateBinaryConfig.elapsedTimeHours << ":" << (int)estimateBinaryConfig.elapsedTimeMinutes
			 << " = " << elapsedHours << std::endl
			 << "  shipAM: " << (int)shipAM << " elapsedAM: " << (int)elapsedShipAM << " ? " << (int)estimateBinaryConfig.remainingAntiMatter << std::endl;
	}

	MaxSkill = std::max(0.0f, MaxSkill - elapsedHazSkill);
	float endVoySkill = MaxSkill * (1 + hazSkillVariance[binaryConfig.primarySkill]);

	const std::array<unsigned int, SKILL_COUNT> &skills = totals.skills;
	std::array<float, 6> skillChances;
	skillChances.fill(osChance);

	for (size_t iSkill = 0; iSkill < skills.size(); iSkill++)
	{
		if (iSkill == binaryConfig.primarySkill)
		{
			skillChances[iSkill] = psChance;
			if (debug)
			{
				log << "pri: " << skills[iSkill] << std::endl;
			}
		}
		else if (iSkill == binaryConfig.secondarySkill)
		{
			skillChances[iSkill] = ssChance;
			if (debug)
			{
				log << "sec: " << skills[iSkill] << std::endl;
			}
		}
	}

	//float totalRefillCost = 0;
	float voyTime = 0;

	// converging loop - refine calculation based on voyage time every iteration
	unsigned int tries = 0;
	for (;;)
	{
		tries++;
		if (tries == 100)
		{
			log << "something went wrong!" << std::endl;
			assert(false);
			break;
		}

		//test.text += Math.floor(endVoySkill) + " "
		float am = (float)(elapsedShipAM + (float)shipAM * binaryConfig.extendsTarget);
		for (size_t iSkill = 0; iSkill < SKILL_COUNT; iSkill++)
		{
			float skill = skills[iSkill];
			skill = std::max(0.0f, skill - elapsedHazSkill);
			float chance = skillChances[iSkill];

			// skill amount for 100% pass
			float passSkill = std::min(endVoySkill, skill*(1 - hazSkillVariance[iSkill]));

			// skill amount for RNG pass
			// (compute passing proportion of triangular RNG area - integral of x)
			float skillRngRange = skill * hazSkillVariance[iSkill] * 2;
			float lostRngProportion = 0;
			if (skillRngRange > 0)
			{ // avoid division by 0
				lostRngProportion = std::max(0.0f, std::min(1.0f, (skill*(1 + hazSkillVariance[iSkill]) - endVoySkill) / skillRngRange));
			}
			float skillPassRngProportion = 1 - lostRngProportion * lostRngProportion;
			passSkill += skillRngRange * skillPassRngProportion / 2;

			// am gained for passing hazards
			am += passSkill * chance / hazSkillPerHour * hazPerHour * hazAmPass;

			// skill amount for 100% hazard fail
			float failSkill = std::max(0.0f, endVoySkill - skill * (1 + hazSkillVariance[iSkill]));
			// skill amount for RNG fail
			float skillFailRngProportion = (1 - lostRngProportion)*(1 - lostRngProportion);
			failSkill += skillRngRange * skillFailRngProportion / 2;

			// am lost for failing hazards
			am -= failSkill * chance / hazSkillPerHour * hazPerHour * hazAmFail;
		}

		float amLeft = am - endVoySkill / hazSkillPerHour * activityAmPerHour;
		float timeLeft = amLeft / (hazPerHour*hazAmFail + activityAmPerHour);

		voyTime = endVoySkill / hazSkillPerHour + timeLeft + elapsedHours;

		if (std::abs(timeLeft) > 0.001f)
		{
			endVoySkill = (voyTime - elapsedHours)*hazSkillPerHour;
			continue;
		}
		else
		{
			break;
		}
	}

	// compute other results
/*	float safeTime = voyTime*0.95f;
	float saferTime = voyTime*0.90f;
	float refillTime = shipAM / (hazPerHour*hazAmFail + activityAmPerHour);
	float refillCost = std::ceil(voyTime*60/dilPerMin);*/

	assert(std::isfinite(voyTime));
	return voyTime;
}

} // namespace VoyageTools