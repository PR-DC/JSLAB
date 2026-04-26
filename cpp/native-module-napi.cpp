// JSLAB - native-module-napi.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include "native-module-napi.h"

namespace native_module_ns {

#ifdef PROFILE_NATIVE_MODULE
// Function to start the timer and return the start time
time_point<steady_clock> tic() {
    return steady_clock::now();
}

// Function to stop the timer and return the elapsed time
long toc(const time_point<steady_clock>& startTime) {
    return duration_cast<milliseconds>(steady_clock::now() - startTime).count();
}
#endif

// Function to get current time
std::string getCurrentTime() {
  // get current time
  auto now = system_clock::now();

  // get number of milliseconds for the current second
  // (remainder after division into seconds)
  auto ms = duration_cast<milliseconds>(now.time_since_epoch()) % 1000;

  // convert to std::time_t in order to convert to std::tm (broken time)
  auto timer = system_clock::to_time_t(now);

  // convert to broken time
  std::tm bt = *std::localtime(&timer);

  std::ostringstream oss;

  oss << std::put_time(&bt, "%H:%M:%S"); // HH:MM:SS
  oss << '.' << std::setfill('0') << std::setw(3) << ms.count();

  return oss.str();
}

// Function to console log data
int consoleLog(uint8_t level, const char* format, ...) {
#ifdef DEBUG_NATIVE_MODULE_LEVEL
  if(level <= DEBUG_NATIVE_MODULE_LEVEL) {
    printf("\033[0;33m[%s NativeModule]\033[0m ", getCurrentTime().c_str());
    va_list vl;
    va_start(vl, format);
    auto ret = vprintf(format, vl);
    va_end(vl);
    printf("\n");
    return ret;
  }
#endif
  return 0;
}

// NativeModule()
// Object constructor
// --------------------
NativeModule::NativeModule(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<NativeModule>(info) {
#ifdef DEBUG_NATIVE_MODULE
  consoleLog(0, "Called constructor");
#endif

}

// ~NativeModule()
// Object destructor
// --------------------
NativeModule::~NativeModule() {
}

// Init() function
// --------------------
Napi::Object NativeModule::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func =
      DefineClass(env,
                  "NativeModule", {
                     InstanceMethod("roots", &NativeModule::roots),
                     InstanceMethod("cumtrapz", &NativeModule::cumtrapz),
                     InstanceMethod("trapz", &NativeModule::trapz),
                     InstanceMethod("listSubprocesses", &NativeModule::listSubprocesses),
                   });
                   
  Napi::FunctionReference* constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);
  env.SetInstanceData(constructor);

  exports.Set("NativeModule", func);
  return exports;
}

// roots() function
// --------------------
Napi::Value NativeModule::roots(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  native_module_core::RootsResult roots_result;
  std::vector<double> coefficients;
  int degree;
  int i;
  
  // Ensure the input is an array
  if(!info[0].IsArray()) {
    Napi::TypeError::New(env, "Expected an array of coefficients").ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }

  // Extract the polynomial coefficients from the input
  Napi::Array coefficientsArray = info[0].As<Napi::Array>();
  degree = static_cast<int>(coefficientsArray.Length()) - 1;
  coefficients.resize(degree + 1);
  for(i = 0; i <= degree; ++i) {
    coefficients[i] = coefficientsArray.Get(i).As<Napi::Number>().DoubleValue();
  }

  if(!native_module_core::roots(coefficients, &roots_result)) {
    Napi::TypeError::New(env, "Expected at least two polynomial coefficients").ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }

  // Convert the result to a JavaScript array
  Napi::Array result = Napi::Array::New(env, degree);
  for(i = 0; i < degree; ++i) {
    if(roots_result.imag[i] == 0.0) {
      result[i] = Napi::Number::New(env, roots_result.real[i]);
    } else {
      Napi::Object complexRoot = Napi::Object::New(env);
      complexRoot.Set("real", Napi::Number::New(env, roots_result.real[i]));
      complexRoot.Set("imag", Napi::Number::New(env, roots_result.imag[i]));
      result[i] = complexRoot;
    }
  }

  return result;
}

// cumtrapz() function
// --------------------
Napi::Value NativeModule::cumtrapz(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::vector<double> y_values;
  std::vector<double> x_values;
  std::vector<double> result_values;
  std::vector<double>* x_ptr = nullptr;
  uint32_t i;

  // Ensure at least one argument is provided
  if(info.Length() < 1) {
    Napi::TypeError::New(env, "cumtrapz expects at least one argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Ensure the first argument is an array
  if(!info[0].IsArray()) {
    Napi::TypeError::New(env, "First argument must be an array").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array yInput = info[0].As<Napi::Array>();
  Napi::Array xInput;
  bool hasX = info.Length() > 1;

  // If x is provided, ensure it's an array
  if(hasX) {
    if(!info[1].IsArray()) {
      Napi::TypeError::New(env, "Second argument must be an array").ThrowAsJavaScriptException();
      return env.Null();
    }
    xInput = info[1].As<Napi::Array>();
  }

  // Get the length of yInput
  uint32_t n = yInput.Length();

  // If x is provided, its length must match yInput
  if(hasX && xInput.Length() != n) {
    Napi::RangeError::New(env, "x and y arrays must have the same length").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Handle empty array
  if(n == 0) {
    return Napi::Array::New(env, 0);
  }

  y_values.resize(n);
  for(i = 0; i < n; ++i) {
    Napi::Value val = yInput.Get(i);
    if(!val.IsNumber()) {
      Napi::TypeError::New(env, "y array must contain only numbers").ThrowAsJavaScriptException();
      return env.Null();
    }
    y_values[i] = val.As<Napi::Number>().DoubleValue();
  }

  if(hasX) {
    x_values.resize(n);
    x_ptr = &x_values;
    for(i = 0; i < n; ++i) {
      Napi::Value val = xInput.Get(i);
      if (!val.IsNumber()) {
        Napi::TypeError::New(env, "x array must contain only numbers").ThrowAsJavaScriptException();
        return env.Null();
      }
      x_values[i] = val.As<Napi::Number>().DoubleValue();
    }
  }

  if(!native_module_core::cumtrapz(y_values, x_ptr, &result_values)) {
    Napi::RangeError::New(env, "x and y arrays must have the same length").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array jsResult = Napi::Array::New(env, n);
  for(i = 0; i < n; ++i) {
    jsResult.Set(i, Napi::Number::New(env, result_values[i]));
  }

  return jsResult;
}

// trapz() function
// --------------------
Napi::Value NativeModule::trapz(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::vector<double> y_values;
  std::vector<double> x_values;
  std::vector<double>* x_ptr = nullptr;
  double total = 0.0;
  uint32_t i;

  // Ensure at least one argument is provided
  if(info.Length() < 1) {
    Napi::TypeError::New(env, "trapz expects at least one argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Ensure the first argument is an array
  if(!info[0].IsArray()) {
    Napi::TypeError::New(env, "First argument must be an array").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array yInput = info[0].As<Napi::Array>();
  Napi::Array xInput;
  bool hasX = info.Length() > 1;

  // If x is provided, ensure it's an array
  if(hasX) {
    if(!info[1].IsArray()) {
      Napi::TypeError::New(env, "Second argument must be an array").ThrowAsJavaScriptException();
      return env.Null();
    }
    xInput = info[1].As<Napi::Array>();
  }

  // Get the length of yInput
  uint32_t n = yInput.Length();

  // If x is provided, its length must match yInput
  if(hasX && xInput.Length() != n) {
    Napi::RangeError::New(env, "x and y arrays must have the same length").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Handle cases with fewer than 2 points
  if(n < 2) {
    Napi::RangeError::New(env, "trapz requires at least two data points").ThrowAsJavaScriptException();
    return env.Null();
  }

  y_values.resize(n);
  for(i = 0; i < n; ++i) {
    Napi::Value val = yInput.Get(i);
    if(!val.IsNumber()) {
      Napi::TypeError::New(env, "y array must contain only numbers").ThrowAsJavaScriptException();
      return env.Null();
    }
    y_values[i] = val.As<Napi::Number>().DoubleValue();
  }

  if(hasX) {
    x_values.resize(n);
    x_ptr = &x_values;
    for(i = 0; i < n; ++i) {
      Napi::Value val = xInput.Get(i);
      if (!val.IsNumber()) {
        Napi::TypeError::New(env, "x array must contain only numbers").ThrowAsJavaScriptException();
        return env.Null();
      }
      x_values[i] = val.As<Napi::Number>().DoubleValue();
    }
  }

  if(!native_module_core::trapz(y_values, x_ptr, &total)) {
    Napi::RangeError::New(env, "x and y arrays must have the same length").ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Number::New(env, total);
}

// listSubprocesses() function
// --------------------
Napi::Value NativeModule::listSubprocesses(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Ensure at least one argument is provided
  if(info.Length() < 1) {
    Napi::TypeError::New(env, "listSubprocesses expects at least one argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Ensure the first argument is an number
  if(!info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be an number").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  uint32_t parent_pid = info[0].As<Napi::Number>().Uint32Value();
  uint32_t i = 0;
  Napi::Array jsResult = Napi::Array::New(env);

  // Create a snapshot of all processes in the system.
  HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if(hSnapshot == INVALID_HANDLE_VALUE) {
    Napi::Error::New(env, "Unable to create process snapshot.").ThrowAsJavaScriptException();
    return jsResult;
  }

  PROCESSENTRY32 pe;
  pe.dwSize = sizeof(PROCESSENTRY32);

  // Retrieve the first process.
  if(Process32First(hSnapshot, &pe)) {
    do {
      if(pe.th32ParentProcessID == parent_pid) {
        jsResult.Set(i, Napi::Number::New(env, pe.th32ProcessID));
        i = i+1;
      }
    } while(Process32Next(hSnapshot, &pe));
  } else {
    Napi::Error::New(env, "Unable to retrieve process information").ThrowAsJavaScriptException();
  }

  CloseHandle(hSnapshot);
  return jsResult;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return NativeModule::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

}  // namespace native_module_ns

