// JSLAB - native-module-wasm.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include <cmath>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#include "native-module-core.h"

extern "C" {

EMSCRIPTEN_KEEPALIVE
int nm_roots(const double* coefficients_in, int coefficient_count,
    double* real_out, double* imag_out) {
  native_module_core::RootsResult result;
  std::vector<double> coefficients;
  int i;

  if(coefficients_in == nullptr || real_out == nullptr || imag_out == nullptr ||
      coefficient_count < 2) {
    return 0;
  }

  coefficients.resize(coefficient_count);
  for(i = 0; i < coefficient_count; ++i) {
    coefficients[i] = coefficients_in[i];
  }

  if(!native_module_core::roots(coefficients, &result)) {
    return 0;
  }

  for(i = 0; i < static_cast<int>(result.real.size()); ++i) {
    real_out[i] = result.real[i];
    imag_out[i] = result.imag[i];
  }

  return static_cast<int>(result.real.size());
}

EMSCRIPTEN_KEEPALIVE
int nm_cumtrapz(const double* y_in, int y_count, const double* x_in, int has_x,
    double* out) {
  std::vector<double> y_values;
  std::vector<double> x_values;
  std::vector<double> result;
  std::vector<double>* x_ptr = nullptr;
  int i;

  if(y_in == nullptr || out == nullptr || y_count < 0) {
    return 0;
  }

  y_values.resize(y_count);
  for(i = 0; i < y_count; ++i) {
    y_values[i] = y_in[i];
  }

  if(has_x) {
    if(x_in == nullptr) {
      return 0;
    }
    x_values.resize(y_count);
    x_ptr = &x_values;
    for(i = 0; i < y_count; ++i) {
      x_values[i] = x_in[i];
    }
  }

  if(!native_module_core::cumtrapz(y_values, x_ptr, &result)) {
    return 0;
  }
  for(i = 0; i < static_cast<int>(result.size()); ++i) {
    out[i] = result[i];
  }

  return static_cast<int>(result.size());
}

EMSCRIPTEN_KEEPALIVE
double nm_trapz(const double* y_in, int y_count, const double* x_in, int has_x) {
  std::vector<double> y_values;
  std::vector<double> x_values;
  std::vector<double>* x_ptr = nullptr;
  double result = 0.0;
  int i;

  if(y_in == nullptr || y_count < 2) {
    return 0.0;
  }

  y_values.resize(y_count);
  for(i = 0; i < y_count; ++i) {
    y_values[i] = y_in[i];
  }

  if(has_x) {
    if(x_in == nullptr) {
      return 0.0;
    }
    x_values.resize(y_count);
    x_ptr = &x_values;
    for(i = 0; i < y_count; ++i) {
      x_values[i] = x_in[i];
    }
  }

  if(!native_module_core::trapz(y_values, x_ptr, &result)) {
    return 0.0;
  }

  return result;
}

}
