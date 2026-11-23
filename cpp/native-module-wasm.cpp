// JSLAB - native-module-wasm.cpp
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#include <cmath>
#include <complex>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#include "native-module-core.h"
#include "geometry-disk-core.h"
#include "control-core.h"
#include "control-margin.h"

extern "C" {

EMSCRIPTEN_KEEPALIVE
int nm_control_margin(const double* num, const double* den, int numerator_count,
    int denominator_count, double period, double tolerance, double* out) {
  if(numerator_count < 1 || denominator_count < 1) return 0;
  return control_core::Margins::compute({num, num + numerator_count}, {den, den + denominator_count},
    period, tolerance, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_fit(const double* input, const double* output, int samples,
    int poles, int zeros, double duration, double* result) {
  return control_core::Identification::fit(input, output, nullptr, samples, poles, zeros, duration, false, false, result);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_interconnect(const double* first, const double* second,
    int n1, int n2, int inputs, int intermediate, int outputs, int mode, double factor, double* result) {
  return control_core::Interconnections::connect(first, second, n1, n2, inputs, intermediate, outputs, mode, factor, result);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_ss2tf(const double* a, const double* b, const double* c, int n, double d, double* out) {
  return control_core::Models::ss2tf(a, b, c, n, d, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_frequency(const double* num, const double* den, const double* frequencies,
    int numerator_count, int denominator_count, int count, double period, double* out) {
  return control_core::Models::frequency(num, den, frequencies, numerator_count, denominator_count, count, period, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_poles(const double* a, int n, double* out) {
  return control_core::Models::poles(a, n, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_state_subspace(const double* a, const double* channels, int n, int ports,
    int observe, int rank_only, double* out) {
  return control_core::Models::stateSubspace(a, channels, n, ports, observe, rank_only, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_dcgain(const double* a, const double* b, const double* c, const double* d,
    int n, int m, int p, int discrete, double* out) {
  return control_core::Models::dcgain(a, b, c, d, n, m, p, discrete, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_discretize(const double* a, const double* b, int states, int inputs,
    double dt, int foh, double* out) {
  return control_core::Models::discretize(a, b, states, inputs, dt, foh != 0, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_simulate(const double* system, const double* initial, const double* input,
    int states, int inputs, int outputs, int samples, double* out) {
  return control_core::Models::simulate(system, initial, input, states, inputs, outputs, samples, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_place(const double* a, const double* b, const double* coefficients, int n, int m, double* out) {
  return control_core::Design::place(a, b, coefficients, n, m, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_control_lqr(const double* a, const double* b, const double* q, const double* r, const double* s,
    int n, int m, int discrete, double* out) {
  return control_core::Design::lqr(a, b, q, r, s, n, m, discrete != 0, out);
}

EMSCRIPTEN_KEEPALIVE
int nm_min_disks_distance_3d(const double* input, double* output) {
  return native_module_core::minDisksDistance3D(input, output);
}

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
