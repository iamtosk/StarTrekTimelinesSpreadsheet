#ifndef THREAD_POOL_H
#define THREAD_POOL_H

#include <functional>

#ifndef __EMSCRIPTEN__
#include <mutex>
#include <thread>
#include <list>
#include <vector>
#endif

namespace VoyageTools
{

// a very simple "thread pool"
// tasks can be added to be run on a new thread
// if the current thread count is at the limit, tasks will be queued and taken up
//	by next available thread.
// threads will exit if no more tasks are available
class ThreadPool
{
public:
	~ThreadPool() { joinAll(); }

	using task = std::function<void()>;

#ifdef __EMSCRIPTEN__
	// Emscripten doesn't support multiple threads yet, so executing everything synchronously instead
	ThreadPool(size_t size = 0) {}
	void add(task f) { f(); }
    void joinAll() {}

#else
    ThreadPool(size_t size = 0);
	void add(task f);
    void joinAll();

private:
	size_t maxThreads;
	std::mutex lock;
	using lockScope = std::lock_guard<std::mutex>;
    std::list<std::shared_ptr<std::thread>> threads;
	std::vector<task> tasks;
#endif
};

} //namespace VoyageTools

#endif