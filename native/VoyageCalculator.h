#ifndef VOYAGE_CALCULATOR_H
#define VOYAGE_CALCULATOR_H
#include <array>
#include <vector>
#include <algorithm>
#include <functional>
#include <chrono>
#include <set>
#include <iostream>
#include <bitset>

#include "Log.h"
#include "ThreadPool.h"
#include "json.hpp"

namespace VoyageTools
{
extern Log log;

constexpr unsigned int SKILL_COUNT = 6;
constexpr unsigned int SLOT_COUNT = SKILL_COUNT*2;

constexpr unsigned int FROZEN_BIT = SLOT_COUNT;
constexpr unsigned int ACTIVE_BIT = SLOT_COUNT + 1;
constexpr unsigned int FFFE_BIT = SLOT_COUNT + 2;

constexpr unsigned int BITMASK_SIZE = SLOT_COUNT + 3;

struct Timer
{
	using clock = std::chrono::high_resolution_clock;
	using timepoint = decltype(clock::now());
	using duration = decltype(clock::now()-clock::now());

	Timer() = delete;
	Timer(std::string name = "", bool start = true) : running(start), name(name) {}
	~Timer() { if (running) Pause(); Print(); }

	void Pause()
	{
		total += clock::now()-start;
	}

	void Resume()
	{
		start = clock::now();
	}

	struct Scope
	{
		Timer &timer;
		Scope(Timer &timer) : timer(timer) { timer.Resume(); }
		~Scope() { timer.Pause(); }
	};

	void Print()
	{
		log << name << " took " << std::chrono::duration_cast<std::chrono::milliseconds>(total).count() << " ms" << std::endl;;
	}

	bool running;
	std::string name;
	duration total{0};
	timepoint start = clock::now();
};

struct Crew
{
	std::string name;
	unsigned int id{0};
	std::array<unsigned int, SKILL_COUNT> skills;
	std::array<unsigned int, SKILL_COUNT> skillMaxProfs;
	std::array<unsigned int, SKILL_COUNT> skillMinProfs;
	std::bitset<BITMASK_SIZE> traitIds;
	// treated as a bool, but avoiding bit masking vector<bool> specialization for multithreading
	mutable std::vector<int> considered;
	const Crew *original{nullptr};
	std::array<const Crew*, SLOT_COUNT> slotCrew;
	unsigned int score{0};
	unsigned int max_rarity{0};
	bool ff100 = false;
};
using CrewArray = std::array<const Crew *, SLOT_COUNT>;

class VoyageCalculator
{
public:
	VoyageCalculator(const char* jsonInput, bool rankMode = false) noexcept;

	void SetInput(std::uint8_t primarySkill, std::uint8_t secondarySkill) noexcept
	{
		this->binaryConfig.primarySkill = primarySkill;
		this->binaryConfig.secondarySkill = secondarySkill;
	}
	void DisableTraits()
	{
		std::fill(slotTraits.begin(), slotTraits.end(), (size_t)-1);
	}

	CrewArray Calculate(
		std::function<void(const CrewArray&, float)> progressCallback,
		float& score) noexcept
	{
		progressUpdate = progressCallback;
		calculate();
		score = bestscore;
		return bestconsidered;
	}

	CrewArray GetAlternateCrew(unsigned int level) const noexcept;

	const std::vector<Crew>& GetRoster() const noexcept { return roster; }

private:
	void calculate() noexcept;
	void findBest() noexcept;
	void fillSlot(size_t slot, unsigned int minScore, size_t minDepth, size_t seedSlot, size_t thread = -1) noexcept;
	void updateSlotRosterScores() noexcept;
	void resetRosters() noexcept;
	float calculateDuration(const std::array<const Crew *, SLOT_COUNT> &complement, bool debug = false) noexcept;

	// old disused functions
	void refine() noexcept;
	unsigned int computeScore(const Crew& crew, std::uint8_t skill, size_t trait) const noexcept;

	bool rankMode; // in rank calculation mode, traits are ignored

	std::function<void(const std::array<const Crew *, SLOT_COUNT>&, float)> progressUpdate;
	std::array<size_t, SLOT_COUNT> slotTraits;
	std::vector<Crew> roster;
	std::array<std::vector<Crew>, SLOT_COUNT> slotRosters;

	std::vector<std::array<const Crew *, SLOT_COUNT>> considered; // fillSlot recursion working copy

	ThreadPool threadPool;
	std::mutex calcMutex;

	#pragma pack(push, 1)
	struct BinaryConfig
	{
		std::uint8_t searchDepth;
		std::uint8_t extendsTarget;
		std::uint16_t shipAntiMatter;
		float skillPrimaryMultiplier;
		float skillSecondaryMultiplier;
		float skillMatchingMultiplier;
		std::uint16_t traitScoreBoost;
		std::uint8_t primarySkill;
		std::uint8_t secondarySkill;
		std::uint8_t slotSkills[SLOT_COUNT];
		std::uint16_t crewSize;
	};
	#pragma pack(pop)

	#pragma pack(push, 1)
	struct EstimateBinaryConfig
	{
		std::uint8_t elapsedTimeHours;
		std::uint8_t elapsedTimeMinutes;
		std::uint16_t remainingAntiMatter;
		std::uint32_t slotCrewIds[SLOT_COUNT];
	};
	#pragma pack(pop)

	BinaryConfig binaryConfig;
	EstimateBinaryConfig estimateBinaryConfig;

	std::array<std::vector<const Crew*>, SLOT_COUNT> sortedSlotRosters;

	std::array<const Crew *, SLOT_COUNT> bestconsidered;
	float bestscore{0.0};

	Timer totalTime{"voyage calculation"};
	Timer voyageCalcTime{"actual calc", false};
	Timer scoreUpdateTime{"score update", false};
};

} //namespace VoyageTools

#endif