#ifndef VOYAGE_CREW_RANKER_H
#define VOYAGE_CREW_RANKER_H
#include <array>
#include <vector>
#include <algorithm>
#include <functional>
#include <chrono>
#include <set>
#include <iostream>

#include "VoyageCalculator.h"

namespace VoyageTools
{

struct RankedCrew {
	Crew crew;
	unsigned int score = 0;
	static constexpr unsigned int altLevels = 5; // TODO: make this configurable
	std::vector<unsigned int> altScores;
	std::vector<std::pair<size_t,size_t>> voySkills;
	std::vector<std::pair<size_t,size_t>> altVoySkills;
};

struct VoyageEstimate {
	std::uint8_t primarySkill;
	std::uint8_t secondarySkill;
	float estimate {0.0};
	std::array<Crew, SLOT_COUNT> crew {};
};

struct RankedResult {
	std::vector<RankedCrew> Crew;
	std::vector<VoyageEstimate> Estimates;
};

RankedResult RankVoyageCrew(const char *jsonInput) noexcept;

} //namespace VoyageTools

#endif