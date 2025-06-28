#include "httplib.h"

#include <filesystem>
#include <chrono>
#include <ctime>
#include <atomic>
#include <thread>
#include <iostream>
#include <cstdlib>
#include <cstring>
#include <windows.h>
#include <shellapi.h>
#include <io.h> 
#include <fcntl.h>

namespace fs = std::filesystem;
using SteadyTime = std::chrono::steady_clock;
using SteadyTP = SteadyTime::time_point;
using namespace std::chrono;

std::string getCurrentTime() {
  auto now = system_clock::now();
  auto ms = duration_cast<milliseconds>(now.time_since_epoch()) % 1000;
  auto timer = system_clock::to_time_t(now);
  std::tm bt = *std::localtime(&timer);
  std::ostringstream oss;
  oss << std::put_time(&bt, "%H:%M:%S");
  oss << '.' << std::setfill('0') << std::setw(3) << ms.count();
  return oss.str();
}

// Function to console log data
int consoleLog(const char* format, ...) {
  printf("[%s] ", getCurrentTime().c_str());
  va_list vl;
  va_start(vl, format);
  auto ret = vprintf(format, vl);
  va_end(vl);
  printf("\n");
  return ret;
}

static fs::path exe_dir() {
  char buf[MAX_PATH];
  GetModuleFileNameA(nullptr, buf, MAX_PATH);
  return fs::path(buf).parent_path();
}

static void open_browser(const std::string& url) {
  ShellExecuteA(nullptr, "open", url.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
}

static bool launched_from_existing_console() {
  DWORD pids[2];
  DWORD count = GetConsoleProcessList(pids, 2);
  return count > 1;
}

static void add_cors_headers(httplib::Response &res) {
  res.set_header("Access-Control-Allow-Origin",  "*");
  res.set_header("Access-Control-Allow-Headers", "Content-Type");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

int main(int argc, char* argv[]) {
  bool show_console = false;
  bool prog_mode = false;
  
  for(int i = 1; i < argc; ++i) {
    if(std::strcmp(argv[i], "--prog") == 0 || std::strcmp(argv[i], "-p") == 0) {
      prog_mode = true;
    } else if(std::strcmp(argv[i], "--console") == 0 || std::strcmp(argv[i], "-c") == 0) {
      show_console = true;
    }
  }
  const bool verbose = show_console;

  bool had_console_already = launched_from_existing_console();
  HWND hwnd = nullptr;
  if(!prog_mode && !had_console_already) {
    AllocConsole();
    freopen("CONOUT$", "w", stdout);
    freopen("CONOUT$", "w", stderr);
    freopen("CONIN$",  "r", stdin);
  }
  hwnd = GetConsoleWindow();
  if(!prog_mode && !had_console_already && hwnd) {
    ShowWindow(hwnd, show_console ? SW_SHOW : SW_HIDE);
  }

  constexpr auto IDLE_TIMEOUT = std::chrono::seconds(30);
  const auto THREADS       = std::max( 8U,
        std::thread::hardware_concurrency() * 2U );
  const auto QUEUE_LIMIT   = 100U;

  fs::path wwwroot = exe_dir();
  std::atomic<SteadyTP> last_hit{ SteadyTime::now() };

  httplib::Server srv;
  
  srv.new_task_queue = [&] {
    return new httplib::ThreadPool(THREADS, QUEUE_LIMIT);
  };

  srv.set_keep_alive_max_count(20);
  srv.set_keep_alive_timeout(15);
  
  srv.set_post_routing_handler([&](const httplib::Request &, httplib::Response &res) {
    add_cors_headers(res);
    return httplib::Server::HandlerResponse::Unhandled;
  });

  srv.Options(R"(.*)", [&](const httplib::Request &, httplib::Response &res) {
    add_cors_headers(res);
    res.status = 204;
  });
    
  if(!srv.set_mount_point("/", wwwroot.string().c_str())) {
    if(hwnd) ShowWindow(hwnd, SW_SHOW);
    consoleLog("ERROR: Cannot mount %s", wwwroot.string().c_str());
    return 1;
  }

  srv.Get("/keepalive", [verbose](const httplib::Request&, httplib::Response& res) {
    if(verbose) {
      consoleLog("Got keepalive!");
    }
    res.status = 204;
  });
  srv.set_logger([&](const httplib::Request&, const httplib::Response&) {
    last_hit.store(SteadyTime::now(), std::memory_order_relaxed);
  });

  std::thread([&]{
    using namespace std::chrono_literals;
    for(;;) {
      std::this_thread::sleep_for(5s);
      if(SteadyTime::now() - last_hit.load(std::memory_order_relaxed) > IDLE_TIMEOUT) {
        srv.stop();
        break;
      }
    }
  }).detach();

  int port = srv.bind_to_any_port("127.0.0.1");
  if(port < 0) {
    if(hwnd) ShowWindow(hwnd, SW_SHOW);
    consoleLog("ERROR: No free ports");
    return 2;
  }

  std::string url = "http://localhost:" + std::to_string(port) + '/';

  if(prog_mode) {
    const std::string line = "url:" + url + "\n";
    DWORD written = 0;
    WriteFile(GetStdHandle(STD_OUTPUT_HANDLE),
              line.data(),
              static_cast<DWORD>(line.size()),
              &written,
              nullptr);
  } else {
    open_browser(url);
    if(verbose) {
      consoleLog("Serving %s", wwwroot.string().c_str());
      consoleLog("URL: %s", url.c_str());
      consoleLog("Timeout: %d s idle", IDLE_TIMEOUT.count());
    }
  }
  
  if(!srv.listen_after_bind()) {
    if(hwnd) ShowWindow(hwnd, SW_SHOW);
    consoleLog("ERROR: Server error after bind.");
    return 3;
  }
}