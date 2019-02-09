#ifndef LOG_H
#define	LOG_H

#include <type_traits>
#include <iostream>
#include <iomanip>
#include <chrono>
#include <ctime>
#include <string>

class Log
{
	using endl_type = std::ostream&(std::ostream&);

public:
	Log(bool enabled, std::ostream& out_stream = std::clog) noexcept :
		outStream(out_stream),
		newLine(true),
		enabled(enabled)
	{}

	// overload for std::endl
	Log& operator<<(endl_type endl) noexcept
	{
		if (enabled)
		{
			newLine = true;
			outStream << endl;
		}

		return *this;
	}

	// overload for anything else
	template<typename T>
	Log& operator<<(const T& data) noexcept
	{
		if (enabled)
		{
			auto now = std::chrono::system_clock::now();
			auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
			auto now_time_t = std::chrono::system_clock::to_time_t(now);
			auto now_tm = std::localtime(&now_time_t);

			if (newLine)
				outStream << "STT (" << now_tm->tm_hour << ":" << now_tm->tm_min << ":" << now_tm->tm_sec << "." << std::setfill('0') << std::setw(3) << ms.count() << "): " << data;
			else
				outStream << data;

			newLine = false;
		}

		return *this;
	}

private:
	std::ostream& outStream;
	bool newLine;
	bool enabled;
};

#endif	/* LOG_H */
