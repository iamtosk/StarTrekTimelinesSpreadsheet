#include "VoyageCrewRanker.h"
#include <unordered_map>

namespace VoyageTools
{

RankedResult RankVoyageCrew(const char *jsonInput) noexcept
{
	RankedResult result;

	std::unordered_map<int, RankedCrew> rankedCrew;

	// compute for all voyage skill combos
	for (std::uint8_t primarySkill = 0; primarySkill < SKILL_COUNT; ++primarySkill)
	for (std::uint8_t secondarySkill = 0; secondarySkill < SKILL_COUNT; ++secondarySkill)
	{
		if (primarySkill == secondarySkill)
			continue;

		VoyageCalculator calculator(jsonInput, true);
		calculator.SetInput(primarySkill, secondarySkill);
		calculator.DisableTraits();

		result.Estimates.emplace_back(VoyageEstimate{primarySkill, secondarySkill});
		CrewArray voyCrew =
			calculator.Calculate([](auto...){}, result.Estimates.back().estimate);
		for (size_t iCrew = 0; iCrew < SLOT_COUNT; ++iCrew) {
			result.Estimates.back().crew[iCrew] = *voyCrew[iCrew];
		}

		for (const Crew * crew : voyCrew) {
			RankedCrew &rCrew = rankedCrew[crew->id];
			rCrew.crew = *crew;
			++rCrew.score;
			rCrew.voySkills.push_back(std::make_pair(primarySkill, secondarySkill));
		}

		for (unsigned int altLevel = 0; altLevel < RankedCrew::altLevels; ++altLevel) {
			CrewArray altCrew = calculator.GetAlternateCrew(altLevel);
			for (const Crew * crew : altCrew) {
				if (crew == nullptr)
					continue;
				RankedCrew &rCrew = rankedCrew[crew->id];
				rCrew.crew = *crew;
				rCrew.altScores.resize(RankedCrew::altLevels);
				++rCrew.altScores[altLevel];
				
				bool hasAltSkills = false;
				for (auto skillPair : rCrew.altVoySkills) {
					if (skillPair.first == primarySkill && skillPair.second == secondarySkill) {
						hasAltSkills = true;
						break;
					}
				}
				if (!hasAltSkills) {
					rCrew.altVoySkills.push_back(std::make_pair(primarySkill, secondarySkill));
				}
			}
		}
	}

	// add in immortalized crew
	VoyageCalculator calculator(jsonInput);
	for (const Crew &crew : calculator.GetRoster()) {
		if (crew.ff100 && !crew.traitIds.test(FROZEN_BIT)) {
			RankedCrew &rCrew = rankedCrew[crew.id];
			rCrew.crew = crew;
		}
	}

	for (auto rankedPair : rankedCrew) {
		result.Crew.push_back(rankedPair.second);
	}
	std::sort(result.Crew.begin(), result.Crew.end(), [](const auto &left, const auto &right) {
		if (left.score != right.score)
			return left.score > right.score;
		if (left.altScores.size() != right.altScores.size())
			return left.altScores.size() > right.altScores.size();
		if (left.altScores.size()) {
			for (size_t iAlt = 0; iAlt < RankedCrew::altLevels; ++iAlt) {
				if (left.altScores[iAlt] != right.altScores[iAlt])
					return left.altScores[iAlt] > right.altScores[iAlt];
			}
		}
		if (left.crew.max_rarity != right.crew.max_rarity)
			return left.crew.max_rarity > right.crew.max_rarity;
		return left.crew.name < right.crew.name;
	});

	std::sort(result.Estimates.begin(), result.Estimates.end(), [](const auto &left, const auto &right) {
		return left.estimate > right.estimate;
	});

	return result;
}

} // namespace VoyageTools