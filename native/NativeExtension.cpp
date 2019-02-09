#include "NativeExtension.h"
#include "VoyageCalculator.h"
#include "VoyageCrewRanker.h"
#include "Result.h"

using v8::FunctionTemplate;

class VoyageWorker : public Nan::AsyncProgressWorkerBase<PackedResult>
{
  public:
	VoyageWorker(Nan::Callback *callback, Nan::Callback *progressCallback, const char *input)
		: Nan::AsyncProgressWorkerBase<PackedResult>(callback), progressCallback(progressCallback)
	{
		voyageCalculator = std::unique_ptr<VoyageTools::VoyageCalculator>(new VoyageTools::VoyageCalculator(input));
	}

	~VoyageWorker()
	{
		// Apparently this is needed for proper resource cleanup
		delete progressCallback;
	}

	void Execute(const Nan::AsyncProgressWorkerBase<PackedResult>::ExecutionProgress &progress) override
	{
		float finalScore;
		auto finalResult = voyageCalculator->Calculate([&](const VoyageTools::CrewArray &bestSoFar, float bestScore) {
			resultSoFar = ResultToStruct(bestSoFar, bestScore, voyageCalculator.get());
			progress.Send(&resultSoFar, 1);
		}, finalScore);

		result = ResultToStruct(finalResult, finalScore, voyageCalculator.get());
	}

	void HandleOKCallback() override
	{
		Nan::HandleScope scope;
		
		Nan::MaybeLocal<v8::Object> newBuf = PackBuffer(&result);
		v8::Local<v8::Value> argv[] = {newBuf.ToLocalChecked()};
		callback->Call(1, argv, async_resource);
	}

	void HandleProgressCallback(const PackedResult *data, size_t size) override
	{
		Nan::HandleScope scope;

		Nan::MaybeLocal<v8::Object> newBuf = PackBuffer(data);
		v8::Local<v8::Value> argv[] = {newBuf.ToLocalChecked()};
		progressCallback->Call(1, argv, async_resource);
	}

  private:
	Nan::Callback *progressCallback;
	PackedResult result;
	PackedResult resultSoFar;
	std::unique_ptr<VoyageTools::VoyageCalculator> voyageCalculator;

	Nan::MaybeLocal<v8::Object> PackBuffer(const PackedResult *data)
	{
		return Nan::CopyBuffer(reinterpret_cast<const char*>(data), sizeof(PackedResult) / sizeof(char));
	}
};

class VoyageCrewRankWorker : public Nan::AsyncProgressWorker
{
  public:
	VoyageCrewRankWorker(Nan::Callback *callback, Nan::Callback *progressCallback, const char *input)
		: Nan::AsyncProgressWorker(callback), progressCallback(progressCallback), input(input)
	{
	}

	~VoyageCrewRankWorker()
	{
		// Apparently this is needed for proper resource cleanup
		delete progressCallback;
	}

	void Execute(const Nan::AsyncProgressWorker::ExecutionProgress &progress) override
	{
		using namespace VoyageTools;
		RankedResult result = RankVoyageCrew(input.c_str());

		{ // stringify crew ranking
			const std::vector<RankedCrew> &rankedCrew = result.Crew;

			std::stringstream ss;
			ss << "Score,";
			for (unsigned int iAlt = 0; iAlt < RankedCrew::altLevels; ++iAlt)
			{
				ss << "Alt " << iAlt + 1 << ",";
			}
			ss << "Status,Crew,Voyages\n";

			for (const RankedCrew &crew : rankedCrew)
			{
				ss << crew.score << ",";
				for (unsigned int iAlt = 0; iAlt < RankedCrew::altLevels; ++iAlt)
				{
					ss << (crew.altScores.empty() ? 0 : crew.altScores[iAlt]) << ",";
				}
				std::string status;
				if (crew.crew.traitIds.test(FROZEN_BIT))
				{
					status = "F";
				}
				else if (crew.crew.ff100)
				{
					status = "I?";
				}
				else
				{
					status = '0' + crew.crew.max_rarity;
				}
				ss << status << "," << crew.crew.name << ",";
				for (auto skills : crew.voySkills)
				{
					ss << skillNames[skills.first] << "/" << skillNames[skills.second] << " ";
				}
				for (auto altSkills : crew.altVoySkills)
				{
					ss << altSkillNames[altSkills.first] << "/" << altSkillNames[altSkills.second] << " ";
				}
				ss << "\n";
			}

			rankResult = ss.str();
		}

		{ // stringify voyage estimates
			std::stringstream ss;
			ss << "Primary,Secondary,Estimate,Crew\n";

			for (const VoyageEstimate &estimate : result.Estimates)
			{
				ss << skillNames[estimate.primarySkill] << "," << skillNames[estimate.secondarySkill] << ","
				   << std::setprecision(2) << estimate.estimate << ",";
				for (const Crew &crew : estimate.crew)
				{
					if (&crew != &estimate.crew[0])
						ss << " | ";
					ss << crew.name;
				}
				ss << "\n";
			}

			estimateResult = ss.str();
		}
	}

	void HandleOKCallback() override
	{
		Nan::HandleScope scope;
		v8::Local<v8::Value> argv[] = {
			Nan::New(rankResult.c_str(), rankResult.size()).ToLocalChecked(),
			Nan::New(estimateResult.c_str(), estimateResult.size()).ToLocalChecked()};
		callback->Call(2, argv, async_resource);
	};

	void HandleProgressCallback(const char *data, size_t size) override
	{
		Nan::HandleScope scope;
		v8::Local<v8::Value> argv[] = {Nan::New(data, size).ToLocalChecked()};
		progressCallback->Call(1, argv, async_resource);
	}

  private:
	static constexpr std::array<const char *, VoyageTools::SKILL_COUNT> skillNames = {"CMD", "SCI", "SEC", "ENG", "DIP", "MED"};
	static constexpr std::array<const char *, VoyageTools::SKILL_COUNT> altSkillNames = {"cmd", "sci", "sec", "eng", "dip", "med"};

	Nan::Callback *progressCallback;
	std::string input;
	std::string rankResult;
	std::string estimateResult;
	std::unique_ptr<VoyageTools::VoyageCalculator> voyageCalculator;
};

constexpr std::array<const char *, VoyageTools::SKILL_COUNT> VoyageCrewRankWorker::skillNames;
constexpr std::array<const char *, VoyageTools::SKILL_COUNT> VoyageCrewRankWorker::altSkillNames;

NAN_METHOD(calculateVoyageRecommendations)
{
	if (info.Length() != 3)
	{
		Nan::ThrowTypeError("Wrong number of arguments; 3 expected");
		return;
	}

	if (!info[0]->IsString())
	{
		Nan::ThrowTypeError("Wrong argument (string expected)");
		return;
	}

	if (!info[1]->IsFunction())
	{
		Nan::ThrowTypeError("Wrong argument (callback expected)");
		return;
	}

	if (!info[2]->IsFunction())
	{
		Nan::ThrowTypeError("Wrong argument (callback expected)");
		return;
	}

	v8::Local<v8::Function> callbackHandle = info[1].As<v8::Function>();
	v8::Local<v8::Function> progressCallbackHandle = info[2].As<v8::Function>();

	Nan::Utf8String utf8_value(info[0]);
	std::string input(*utf8_value, utf8_value.length());

	Nan::AsyncQueueWorker(new VoyageWorker(new Nan::Callback(callbackHandle), new Nan::Callback(progressCallbackHandle), input.c_str()));

	//return undefined
}

NAN_METHOD(calculateVoyageCrewRank)
{
	if (info.Length() != 3)
	{
		Nan::ThrowTypeError("Wrong number of arguments; 3 expected");
		return;
	}

	if (!info[0]->IsString())
	{
		Nan::ThrowTypeError("Wrong argument (string expected)");
		return;
	}

	if (!info[1]->IsFunction())
	{
		Nan::ThrowTypeError("Wrong argument (callback expected)");
		return;
	}

	if (!info[2]->IsFunction())
	{
		Nan::ThrowTypeError("Wrong argument (callback expected)");
		return;
	}

	v8::Local<v8::Function> callbackHandle = info[1].As<v8::Function>();
	v8::Local<v8::Function> progressCallbackHandle = info[2].As<v8::Function>();

	Nan::Utf8String utf8_value(info[0]);
	std::string input(*utf8_value, utf8_value.length());

	Nan::AsyncQueueWorker(new VoyageCrewRankWorker(new Nan::Callback(callbackHandle), new Nan::Callback(progressCallbackHandle), input.c_str()));

	//return undefined
}

NAN_MODULE_INIT(InitAll)
{
	Nan::Set(target, Nan::New("calculateVoyageRecommendations").ToLocalChecked(),
			 Nan::GetFunction(Nan::New<FunctionTemplate>(calculateVoyageRecommendations)).ToLocalChecked());

	Nan::Set(target, Nan::New("calculateVoyageCrewRank").ToLocalChecked(),
			 Nan::GetFunction(Nan::New<FunctionTemplate>(calculateVoyageCrewRank)).ToLocalChecked());
}

NODE_MODULE(NativeExtension, InitAll)
