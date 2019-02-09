#ifndef RESULT_H
#define RESULT_H
#include "VoyageCalculator.h"

struct PackedResult
{
    float score;
    std::uint32_t crewIds[VoyageTools::SLOT_COUNT];
};

PackedResult ResultToStruct(const std::array<const VoyageTools::Crew *, VoyageTools::SLOT_COUNT> &res, float score, const VoyageTools::VoyageCalculator* pVoyageCalculator) noexcept
{
    PackedResult pkResult;
    pkResult.score = score;

    for (std::uint8_t i = 0; i < VoyageTools::SLOT_COUNT; i++)
    {
        pkResult.crewIds[i] = res[i]->id;
    }

    return pkResult;
}

#endif // RESULT_H