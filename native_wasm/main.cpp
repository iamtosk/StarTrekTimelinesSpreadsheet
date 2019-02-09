#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "VoyageCalculator.h"
#include "Result.h"

// TO BUILD:
// em++ ..\native\VoyageCalculator.cpp main.cpp -o out\voymod.js --bind -O3 -std=c++1y -s DISABLE_EXCEPTION_CATCHING=0 -s NO_EXIT_RUNTIME=1 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME="VoyMod" -I "." -I "..\native"

emscripten::val calculate(std::string input, emscripten::val callback)
{
	std::unique_ptr<VoyageTools::VoyageCalculator> voyageCalculator = std::unique_ptr<VoyageTools::VoyageCalculator>(new VoyageTools::VoyageCalculator(input.c_str()));

	float finalScore;
	auto finalResult = voyageCalculator->Calculate([&](const VoyageTools::CrewArray &bestSoFar, float bestScore) {
		auto resultSoFar = ResultToStruct(bestSoFar, bestScore, voyageCalculator.get());

		size_t size = sizeof(resultSoFar) / sizeof(std::uint8_t);
		std::uint8_t *first = reinterpret_cast<std::uint8_t *>(&resultSoFar);
		std::uint8_t *last = first + size;

		std::vector<std::uint8_t> buffer{first, last};

		callback(emscripten::val::array(buffer));
	}, finalScore);

	auto resultSoFar = ResultToStruct(finalResult, finalScore, voyageCalculator.get());

	size_t size = sizeof(resultSoFar) / sizeof(std::uint8_t);
	std::uint8_t *first = reinterpret_cast<std::uint8_t *>(&resultSoFar);
	std::uint8_t *last = first + size;

	std::vector<std::uint8_t> buffer{first, last};

	// TODO: the data is copied twice, first into the std::vector, then into the emscripten array, see if there's a more efficient way
	return emscripten::val::array(buffer);
}

EMSCRIPTEN_BINDINGS(my_module)
{
	emscripten::function("calculate", &calculate);

	emscripten::register_vector<std::uint8_t>("BufferData");
}
