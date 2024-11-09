// JSLAB - native-module.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef NATIVE_MODULE_H
#define NATIVE_MODULE_H

//#define DEBUG_NATIVE_MODULE
//#define DEBUG_NATIVE_MODULE_LEVEL 0
//#define PROFILE_NATIVE_MODULE

#include <napi.h>
#include <chrono>
#include <thread>
#include <Windows.h>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <string>
#include <fstream>
#include <iostream>
#include <filesystem>
#include <vector>
#include <complex>
#include <Eigen/Dense>

namespace native_module_ns {

using namespace std;
using namespace std::chrono;
using namespace Eigen;

class NativeModule : public Napi::ObjectWrap<NativeModule> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  NativeModule(const Napi::CallbackInfo& info);
  ~NativeModule();
 
  Napi::Value roots(const Napi::CallbackInfo& info);
  Napi::Value cumtrapz(const Napi::CallbackInfo& info);
  Napi::Value trapz(const Napi::CallbackInfo& info);
};

}// namespace native_module_ns

#endif // NATIVE_MODULE_H