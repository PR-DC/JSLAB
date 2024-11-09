// JSLAB - native-module.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include "native-module.h"

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

// Function to get currebt time
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
  const double TOLERANCE = 1e-10;
  
  // Ensure the input is an array
  if(!info[0].IsArray()) {
    Napi::TypeError::New(env, "Expected an array of coefficients").ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }

  // Extract the polynomial coefficients from the input
  Napi::Array coefficientsArray = info[0].As<Napi::Array>();
  int degree = coefficientsArray.Length() - 1;
  
  // Create an Eigen vector for the coefficients
  VectorXd coefficients(degree + 1);
  for(int i = 0; i <= degree; ++i) {
    coefficients(i) = coefficientsArray.Get(i).As<Napi::Number>().DoubleValue();
  }

  // Create the companion matrix
  MatrixXd companionMatrix = MatrixXd::Zero(degree, degree);
  for(int i = 1; i < degree; ++i) {
    companionMatrix(i, i - 1) = 1.0;
  }
  for(int i = 0; i < degree; ++i) {
    companionMatrix(i, degree - 1) = -coefficients(degree - i) / coefficients(0);
  }

  // Use Eigen's eigenvalue solver to find the roots
  EigenSolver<MatrixXd> solver(companionMatrix);
  VectorXcd roots = solver.eigenvalues();

  // Convert the result to a JavaScript array
  Napi::Array result = Napi::Array::New(env, degree);
  for (int i = 0; i < degree; ++i) {
    double realPart = roots(i).real();
    double imagPart = roots(i).imag();

    if(abs(imagPart) < TOLERANCE || isnan(imagPart)) {
      // If the imaginary part is close to zero, return as a real number
      result[i] = Napi::Number::New(env, realPart);
    } else {
      // Otherwise, return as a complex number object
      Napi::Object complexRoot = Napi::Object::New(env);
      complexRoot.Set("real", Napi::Number::New(env, realPart));
      complexRoot.Set("imag", Napi::Number::New(env, imagPart));
      result[i] = complexRoot;
    }
  }

  return result;
}

// cumtrapz() function
// --------------------
Napi::Value NativeModule::cumtrapz(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

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

  // Initialize Eigen vectors
  Eigen::VectorXd y(n);
  Eigen::VectorXd x(n);
  Eigen::VectorXd result(n);

  // Load y values from JavaScript array
  for(uint32_t i = 0; i < n; ++i) {
    Napi::Value val = yInput.Get(i);
    if(!val.IsNumber()) {
      Napi::TypeError::New(env, "y array must contain only numbers").ThrowAsJavaScriptException();
      return env.Null();
    }
    y[i] = val.As<Napi::Number>().DoubleValue();
  }

  // If x is provided, load x values; otherwise, assume uniform spacing
  if(hasX) {
    for(uint32_t i = 0; i < n; ++i) {
      Napi::Value val = xInput.Get(i);
      if (!val.IsNumber()) {
        Napi::TypeError::New(env, "x array must contain only numbers").ThrowAsJavaScriptException();
        return env.Null();
      }
      x[i] = val.As<Napi::Number>().DoubleValue();
    }
  } else {
    // Uniform spacing: x = [0, 1, 2, ..., n-1]
    for(uint32_t i = 0; i < n; ++i) {
      x[i] = static_cast<double>(i);
    }
  }

  // Initialize result: first value is always 0
  result[0] = 0.0;

  // Cumulative trapezoidal integration
  for(uint32_t i = 1; i < n; ++i) {
    double dx = x[i] - x[i - 1];  // Difference in x
    double dy = 0.5 * (y[i] + y[i - 1]);  // Average height (trapezoid rule)
    result[i] = result[i - 1] + dx * dy;
  }

  // Convert Eigen vector back to JavaScript array
  Napi::Array jsResult = Napi::Array::New(env, n);
  for(uint32_t i = 0; i < n; ++i) {
    jsResult.Set(i, Napi::Number::New(env, result[i]));
  }

  return jsResult;
}

// trapz() function
// --------------------
Napi::Value NativeModule::trapz(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

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

  // Initialize Eigen vectors
  Eigen::VectorXd y(n);
  Eigen::VectorXd x(n);

  // Load y values from JavaScript array
  for(uint32_t i = 0; i < n; ++i) {
    Napi::Value val = yInput.Get(i);
    if(!val.IsNumber()) {
      Napi::TypeError::New(env, "y array must contain only numbers").ThrowAsJavaScriptException();
      return env.Null();
    }
    y[i] = val.As<Napi::Number>().DoubleValue();
  }

  // If x is provided, load x values; otherwise, assume uniform spacing
  if(hasX) {
    for(uint32_t i = 0; i < n; ++i) {
      Napi::Value val = xInput.Get(i);
      if (!val.IsNumber()) {
        Napi::TypeError::New(env, "x array must contain only numbers").ThrowAsJavaScriptException();
        return env.Null();
      }
      x[i] = val.As<Napi::Number>().DoubleValue();
    }
  } else {
    // Uniform spacing: x = [0, 1, 2, ..., n-1]
    for(uint32_t i = 0; i < n; ++i) {
      x[i] = static_cast<double>(i);
    }
  }

  // Perform trapezoidal integration
  double total = 0.0;
  for(uint32_t i = 1; i < n; ++i) {
    double dx = x[i] - x[i - 1];
    double dy = 0.5 * (y[i] + y[i - 1]);
    total += dx * dy;
  }

  return Napi::Number::New(env, total);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return NativeModule::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

}  // namespace native_module_ns
