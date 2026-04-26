// JSLAB - native-module-core.h
// Author: Milos Petrasinovic <mpetrasinovic@prdc.rs>
// PR-DC, Republic of Serbia
// info@prdc.rs
// --------------------

#ifndef NATIVE_MODULE_CORE_H
#define NATIVE_MODULE_CORE_H

#include <cmath>
#include <complex>
#include <vector>

#include <Eigen/Dense>

namespace native_module_core {

using namespace Eigen;

struct RootsResult {
  std::vector<double> real;
  std::vector<double> imag;
};

inline bool roots(const std::vector<double>& coefficients_in,
    RootsResult* result) {
  const double TOLERANCE = 1e-10;
  int degree;
  VectorXd coefficients;
  MatrixXd companion_matrix;
  EigenSolver<MatrixXd> solver;
  VectorXcd roots_values;
  int i;
  double imag_part;

  if(result == nullptr || coefficients_in.size() < 2) {
    return false;
  }

  degree = static_cast<int>(coefficients_in.size()) - 1;
  coefficients.resize(degree + 1);
  for(i = 0; i <= degree; ++i) {
    coefficients(i) = coefficients_in[i];
  }

  companion_matrix = MatrixXd::Zero(degree, degree);
  for(i = 1; i < degree; ++i) {
    companion_matrix(i, i - 1) = 1.0;
  }
  for(i = 0; i < degree; ++i) {
    companion_matrix(i, degree - 1) = -coefficients(degree - i) /
      coefficients(0);
  }

  solver = EigenSolver<MatrixXd>(companion_matrix);
  roots_values = solver.eigenvalues();

  result->real.resize(degree);
  result->imag.resize(degree);
  for(i = 0; i < degree; ++i) {
    imag_part = roots_values(i).imag();
    if(std::abs(imag_part) < TOLERANCE || std::isnan(imag_part)) {
      imag_part = 0.0;
    }
    result->real[i] = roots_values(i).real();
    result->imag[i] = imag_part;
  }

  return true;
}

inline bool cumtrapz(const std::vector<double>& y_in,
    const std::vector<double>* x_in, std::vector<double>* result) {
  std::size_t i;
  double x0;
  double x1;
  double dx;
  double dy;

  if(result == nullptr) {
    return false;
  }
  if(x_in != nullptr && x_in->size() != y_in.size()) {
    return false;
  }

  result->clear();
  if(y_in.empty()) {
    return true;
  }

  result->resize(y_in.size());
  (*result)[0] = 0.0;
  for(i = 1; i < y_in.size(); ++i) {
    x0 = x_in ? (*x_in)[i - 1] : static_cast<double>(i - 1);
    x1 = x_in ? (*x_in)[i] : static_cast<double>(i);
    dx = x1 - x0;
    dy = 0.5 * (y_in[i] + y_in[i - 1]);
    (*result)[i] = (*result)[i - 1] + dx * dy;
  }

  return true;
}

inline bool trapz(const std::vector<double>& y_in,
    const std::vector<double>* x_in, double* result) {
  std::size_t i;
  double x0;
  double x1;
  double dx;
  double dy;
  double total = 0.0;

  if(result == nullptr || y_in.size() < 2) {
    return false;
  }
  if(x_in != nullptr && x_in->size() != y_in.size()) {
    return false;
  }

  for(i = 1; i < y_in.size(); ++i) {
    x0 = x_in ? (*x_in)[i - 1] : static_cast<double>(i - 1);
    x1 = x_in ? (*x_in)[i] : static_cast<double>(i);
    dx = x1 - x0;
    dy = 0.5 * (y_in[i] + y_in[i - 1]);
    total += dx * dy;
  }

  *result = total;
  return true;
}

} // namespace native_module_core

#endif // NATIVE_MODULE_CORE_H
